// Phone notifications: the encryption a phone can read, subscribing, and who gets told what.
import { createCipheriv, createDecipheriv, createECDH, createHmac, createPublicKey, generateKeyPairSync, randomBytes, verify } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => {
  process.env.TOKEN_SECRET = 'test-token-secret-test-token-secret';
  process.env.ORIGIN_SECRET = 'test-origin-secret';
  process.env.PHOTOS_BUCKET = 'photos';
  process.env.TABLE_NAME = 'test';
  process.env.LEAGUE_ID = 'sfi-s1';
  const { FakeBucket, FakeTable } = await import('./testing/fake-aws.js');
  return { table: new FakeTable(), bucket: new FakeBucket() };
});
vi.mock('./db.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./db.js')>();
  return {
    ...real,
    ddb: { send: fake.table.send },
    s3: { send: fake.bucket.send },
    queryAll: async (input: { ExpressionAttributeValues: Record<string, string> }) => fake.table.all(input.ExpressionAttributeValues[':pk'])
  };
});

const { handler } = await import('./index.js');
const { hashPassword, issueToken } = await import('./auth.js');
const { createLeagueState, applyAction } = await import('./leagueStore.js');
const { newLeague } = await import('../../shared/league/new.js');
const { encryptPayload, resetVapidCache, vapidAuthorization } = await import('./webpush.js');

let addressCounter = 0;
async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
  const event = {
    rawPath: path, headers: { 'x-origin-verify': 'test-origin-secret', 'x-viewer-ip': `10.0.0.${++addressCounter}`, ...opts.headers }, // each call from its own address unless a test says so isBase64Encoded: false,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: { http: { method } }
  } as unknown as APIGatewayProxyEventV2;
  const out = (await handler(event)) as APIGatewayProxyStructuredResultV2;
  return { status: out.statusCode!, body: JSON.parse(out.body as string) as Record<string, any> };
}
const asTeam = (teamId: string) => ({ headers: { 'x-team-token': issueToken(teamId, 'sfi-s1') } });
async function asAdmin() {
  const res = await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'correct horse battery' } });
  return { headers: { 'x-admin-token': res.body.token as string } };
}
const act = (type: string, payload: unknown, who: { headers: Record<string, string> }) => call('POST', '/api/league/action', { ...who, body: { type, payload } });

/** A phone: its own keys, so the test can read what the server sends it, exactly as a phone would. */
function phone(n: number) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, sub: { endpoint: `https://fcm.googleapis.com/fcm/send/phone-${n}`, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } } };
}
const hmac = (k: Buffer, d: Buffer) => createHmac('sha256', k).update(d).digest();
const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, n: number) => hmac(hmac(salt, ikm), Buffer.concat([info, Buffer.from([1])])).subarray(0, n);
/** Decrypts an aes128gcm push body the way the phone's browser does (RFC 8291). */
function open(p: ReturnType<typeof phone>, body: Buffer) {
  const salt = body.subarray(0, 16);
  const idlen = body[20]!;
  const asPublic = body.subarray(21, 21 + idlen);
  const ct = body.subarray(21 + idlen);
  const shared = p.ecdh.computeSecret(asPublic);
  const ikm = hkdf(p.auth, shared, Buffer.concat([Buffer.from('WebPush: info\0'), p.ecdh.getPublicKey(), asPublic]), 32);
  const d = createDecipheriv('aes-128-gcm', hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12));
  d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return plain.subarray(0, plain.lastIndexOf(2)).toString();
}

const sent: { endpoint: string; body: Buffer; headers: Record<string, string> }[] = [];
let gone = new Set<string>();
const phones = [phone(1), phone(2), phone(3)];
const readSent = () => sent.map((s) => ({ endpoint: s.endpoint, ...JSON.parse(open(phones.find((p) => p.sub.endpoint === s.endpoint)!, s.body)) }));

beforeEach(async () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.VAPID_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'sec1' }).toString();
  resetVapidCache();
  sent.length = 0;
  gone = new Set();
  vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string>; body: Uint8Array }) => {
    sent.push({ endpoint: url, body: Buffer.from(init.body), headers: init.headers });
    return { ok: !gone.has(url), status: gone.has(url) ? 410 : 201 };
  });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T23:20:00.000Z'));
  fake.table.items.clear();
  fake.table.put({ PK: 'ADMIN#sfi-s1', SK: 'ADMIN#matt', type: 'admin', name: 'Matt', passHash: hashPassword('correct horse battery'), tokenVersion: 1, createdAt: '2026-10-06T00:00:00.000Z' });
  const league = newLeague({ firstNight: '2026-11-05', opensAt: '19:00', closesAt: '21:00', machines: [{ machineId: 'godzilla', name: 'Godzilla' }] }, '2026-11-01T12:00:00.000Z');
  const team = (teamId: string, teamName: string) => ({ teamId, teamName, players: ['Riley', 'Sam'] as [string, string], phone1: '', phone2: '', photo: '', status: 'approved' as const, createdAt: '2026-11-01T00:00:00.000Z', firstWeek: 1 });
  league.teams = [team('aaaa1111', 'Left & Right'), team('bbbb2222', 'Tilt Me Tender')];
  await createLeagueState(league, 'test');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); delete process.env.VAPID_PRIVATE_KEY; });

describe('web push', () => {
  it('encrypts so only that phone can read it, and signs for the push service', () => {
    const p = phones[0]!;
    const body = encryptPayload({ p256dh: p.sub.keys.p256dh, auth: p.sub.keys.auth }, Buffer.from('{"title":"hi"}'));
    expect(open(p, body)).toBe('{"title":"hi"}');
    expect(() => open(phones[1]!, body)).toThrow();
    const auth = vapidAuthorization(p.sub.endpoint);
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(auth)!;
    const [h, c, sig] = jwt!.split('.');
    expect(JSON.parse(Buffer.from(c!, 'base64url').toString())).toMatchObject({ aud: 'https://fcm.googleapis.com' });
    const pub = Buffer.from(k!, 'base64url');
    const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
    expect(verify('sha256', Buffer.from(`${h}.${c}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig!, 'base64url'))).toBe(true);
    void createCipheriv;
  });

  it('only takes real push services, and needs someone logged in', async () => {
    expect((await call('GET', '/api/push/key')).body.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect((await call('POST', '/api/push/subscribe', { body: phones[0]!.sub })).status).toBe(401);
    expect((await call('POST', '/api/push/subscribe', { ...asTeam('aaaa1111'), body: { ...phones[0]!.sub, endpoint: 'https://evil.example.com/x' } })).status).toBe(400);
    expect((await call('POST', '/api/push/subscribe', { ...asTeam('aaaa1111'), body: { ...phones[0]!.sub, endpoint: 'http://fcm.googleapis.com/x' } })).status).toBe(400);
    expect((await call('POST', '/api/push/subscribe', { ...asTeam('aaaa1111'), body: phones[0]!.sub })).status).toBe(200);
  });

  it('tells a team the night is on, that they are checked in, and that it is their turn; and every team the message', async () => {
    await call('POST', '/api/push/subscribe', { ...asTeam('aaaa1111'), body: phones[0]!.sub });
    await call('POST', '/api/push/subscribe', { ...asTeam('bbbb2222'), body: phones[1]!.sub });
    const admin = await asAdmin();
    await act('openNight', { by: 'admin' }, admin);
    expect(readSent().map((m) => m.title)).toEqual(['League night is on: week 1', 'League night is on: week 1']);
    sent.length = 0;
    await act('checkIn', 'aaaa1111', admin);
    await act('joinLine', { machineId: 'godzilla', notify: false }, asTeam('aaaa1111'));
    expect(readSent().map((m) => [m.endpoint.slice(-7), m.title, m.url])).toEqual([
      ['phone-1', "You're checked in", '/'],
      ['phone-1', 'Your turn on Godzilla!', '/lines']
    ]);
    sent.length = 0;
    gone.add(phones[1]!.sub.endpoint); // that phone turned notifications off
    await act('postMessage', 'Venom is down tonight', admin);
    expect(readSent().map((m) => [m.endpoint.slice(-7), m.body])).toEqual([['phone-1', 'Venom is down tonight'], ['phone-2', 'Venom is down tonight']]);
    expect(fake.table.get('PUSH#sfi-s1', 'team:bbbb2222')).toBeUndefined(); // forgotten
  });

  it('tells solo players about a match and a request, then moves their phones to their new team', async () => {
    const traits = { why: 'win', energy: 'loud', experience: 'some', style: 'coach' };
    const join = async (name: string, phoneNumber: string) => (await call('POST', '/api/waitlist', { body: { name, phone: phoneNumber, pin: '4826', traits, wants: 'anyone' } })).body;
    const ana = await join('Ana', '2025550111');
    const bea = await join('Bea', '2025550112');
    const solo = (s: any) => ({ headers: { 'x-solo-token': s.token } });
    await call('POST', '/api/push/subscribe', { ...solo(ana), body: phones[0]!.sub });
    await call('POST', '/api/push/subscribe', { ...solo(bea), body: phones[1]!.sub });
    await call('POST', '/api/solo/swipe', { ...solo(ana), body: { toId: bea.soloId, like: true } });
    expect(sent).toHaveLength(0); // a swipe tells nobody
    await call('POST', '/api/solo/swipe', { ...solo(bea), body: { toId: ana.soloId, like: true } });
    expect(readSent().map((m) => [m.endpoint.slice(-7), m.title, m.body])).toEqual([
      ['phone-1', "It's a match!", 'You and Bea both want to team up. Ask to pair, or keep swiping.'],
      ['phone-2', "It's a match!", 'You and Ana both want to team up. Ask to pair, or keep swiping.']
    ]);
    sent.length = 0;
    await call('POST', '/api/solo/ask', { ...solo(ana), body: { toId: bea.soloId } });
    expect(readSent().map((m) => [m.endpoint.slice(-7), m.title])).toEqual([['phone-2', 'Ana wants to pair up with you']]);
    sent.length = 0;
    const made = (await call('POST', '/api/solo/answer', { ...solo(bea), body: { fromId: ana.soloId, accept: true } })).body;
    expect(readSent().map((m) => [m.endpoint.slice(-7), m.title, m.url])).toEqual([['phone-1', "You're a team!", '/team/setup'], ['phone-2', "You're a team!", '/team/setup']]);
    expect((fake.table.get('PUSH#sfi-s1', `team:${made.teamId}`)!.subs as unknown[]).length).toBe(2);
    expect(fake.table.get('PUSH#sfi-s1', `solo:${ana.soloId}`)).toBeUndefined();
  });

  it('sends nothing when notifications are not set up', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await applyAction({ kind: 'admin', name: 'Matt' }, { type: 'openNight', payload: { by: 'admin' } });
    expect(sent).toHaveLength(0);
  });
});
