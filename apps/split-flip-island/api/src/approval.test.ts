// End-to-end tests of sign-up approval and admin access, run through the real request handler
// against an in-memory database and photo bucket.
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const { hashPassword } = await import('./auth.js');
const { testTotp, testCode } = await import('./testing/twoStep.js');
const { createLeagueState, loadLeagueState } = await import('./leagueStore.js');
const { newLeague } = await import('../../shared/league/new.js');
const { easternDate } = await import('../../shared/league/time.js');
const { gunzipSync, gzipSync } = await import('node:zlib');

const L = 'LEAGUE#sfi-s1';
const HOUR = 3_600_000;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff]);

interface Res { status: number; body: Record<string, any> }

let addressCounter = 0;
async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; origin?: string | null } = {}): Promise<Res> {
  // Each call from its own address unless a test says so (per-address limits are tested on their own).
  const headers: Record<string, string> = { 'x-viewer-ip': `10.0.1.${++addressCounter}`, ...opts.headers };
  if (opts.origin !== null) headers['x-origin-verify'] = opts.origin ?? 'test-origin-secret';
  const event = {
    rawPath: path, headers, isBase64Encoded: false,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: { http: { method } }
  } as unknown as APIGatewayProxyEventV2;
  const out = (await handler(event)) as APIGatewayProxyStructuredResultV2;
  return { status: out.statusCode!, body: JSON.parse(out.body as string) };
}

let photoCount = 0;
function uploadedPhoto(folder = 'pending') {
  photoCount += 1;
  const key = `leagues/sfi-s1/${folder}/00000000-0000-4000-8000-${String(photoCount).padStart(12, '0')}.jpg`;
  fake.bucket.objects.set(key, JPEG);
  return key;
}

async function signUp(teamName: string, extra: Record<string, unknown> = {}) {
  const n = String(photoCount).padStart(3, '0');
  return call('POST', '/api/teams', {
    body: { teamName, players: [{ name: 'Riley', pronouns: 'she/her' }, { name: 'Sam' }], phone1: `2025550${n}`, phone2: `2025551${n}`, pin: '4821', photoKey: uploadedPhoto(), ...extra }
  });
}

function addAdmin(name: string, password: string, tokenVersion = 1, twoStep = true) {
  fake.table.put({ PK: 'ADMIN#sfi-s1', SK: `ADMIN#${name.toLowerCase()}`, type: 'admin', name, passHash: hashPassword(password), tokenVersion, createdAt: '2026-10-06T00:00:00.000Z', ...(twoStep ? { totp: testTotp() } : {}) });
}

/** Lets the test admin's current code be used again (each code works once; tests log in a lot). */
const freshCode = (name = 'Matt') => {
  const item = fake.table.get('ADMIN#sfi-s1', `ADMIN#${name.toLowerCase()}`);
  if (item) delete item.totpStep;
  return testCode();
};

async function adminToken(name = 'Matt', password = 'correct horse battery') {
  const res = await call('POST', '/api/admin/login', { body: { name, password, code: freshCode(name) } });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

// Every request also carries a fresh authenticator code, as the app sends for a hard change.
const asAdmin = (token: string) => {
  const headers: Record<string, string> = { 'x-admin-token': token };
  Object.defineProperty(headers, 'x-admin-code', { enumerable: true, get: () => freshCode() });
  return { headers };
};
const asTeam = (token: string) => ({ headers: { 'x-team-token': token } });
// The league record, read and edited directly (as a test would set up a scene).
const league = async () => (await loadLeagueState())!.league;
const teamOf = async (id: string) => (await league()).teams.find((t) => t.teamId === id);
const auditActions = async () => (await league()).log.map((a) => a.action).filter((a) => !a.startsWith('The season was set up'));
type LeagueState = Awaited<ReturnType<typeof league>>;
function editLeague(change: (l: LeagueState) => void) {
  const item = fake.table.get(L, 'STATE')!;
  const l = JSON.parse(gunzipSync(item.data as Uint8Array).toString('utf8')) as LeagueState;
  change(l);
  fake.table.put({ ...item, version: (item.version as number) + 1, data: gzipSync(JSON.stringify(l)) });
}

/** Tonight is week 1's night and it is open; the teams given are checked in. */
function openNight(...checkedIn: string[]) {
  editLeague((l) => {
    l.weeks[0]!.date = easternDate(new Date().toISOString());
    l.weeks[0]!.state = 'open';
    for (const id of checkedIn) l.checkIns[id] = new Date().toISOString();
  });
}

function scorePhotos(teamId: string) {
  const base = `leagues/sfi-s1/scores/${easternDate(new Date().toISOString())}/${teamId}-0f8fad5b-d9cb-469f-a165-70867728950e`;
  fake.bucket.objects.set(`${base}.jpg`, JPEG);
  fake.bucket.objects.set(`${base}-thumb.jpg`, JPEG);
  return { photoKey: `${base}.jpg`, thumbKey: `${base}-thumb.jpg` };
}

beforeEach(async () => {
  fake.table.items.clear();
  fake.bucket.objects.clear();
  delete process.env.MAX_PENDING_TEAMS;
  delete process.env.PENDING_TEAM_HOURS;
  fake.bucket.failPuts = false;
  addAdmin('Matt', 'correct horse battery');
  // A season that starts in a week, with one machine.
  const firstNight = easternDate(new Date(Date.now() + 7 * 24 * HOUR).toISOString());
  await createLeagueState(newLeague({ firstNight, opensAt: '19:00', closesAt: '21:00', machines: [{ machineId: 'godzilla', name: 'Godzilla' }] }, new Date().toISOString()), 'test');
});

describe('requests that skip the front door', () => {
  it('are refused when the secret header is missing or wrong', async () => {
    expect((await call('GET', '/api/league', { origin: null })).status).toBe(403);
    expect((await call('GET', '/api/league', { origin: 'guess' })).status).toBe(403);
    expect((await call('POST', '/api/teams', { origin: null, body: {} })).status).toBe(403);
    expect((await call('GET', '/api/league')).status).toBe(200);
  });
});

describe('signing up', () => {
  it('creates a team that waits for approval and expires in 24 hours', async () => {
    const before = Date.now();
    const res = await signUp('Left & Right');
    expect(res.status).toBe(201);
    expect(res.body.team.status).toBe('pending');
    const wait = Date.parse(res.body.team.expiresAt) - before;
    expect(wait).toBeGreaterThan(24 * HOUR - 5000);
    expect(wait).toBeLessThan(24 * HOUR + 5000);
    // The name stays out of the public log until an admin approves the team.
    expect(await auditActions()).toEqual(['A new team signed up and is waiting for approval']);
    expect(JSON.stringify((await league()).log)).not.toContain('Left & Right');
  });

  it('uses the configured waiting time', async () => {
    process.env.PENDING_TEAM_HOURS = '6';
    const res = await signUp('Short Wait');
    expect(Date.parse(res.body.team.expiresAt) - Date.now()).toBeLessThan(6 * HOUR + 5000);
  });

  it('only accepts a photo uploaded for a sign-up', async () => {
    const kept = uploadedPhoto('teams');
    expect((await signUp('Sneaky', { photoKey: kept })).status).toBe(400);
    expect((await signUp('Sneaky', { photoKey: 'leagues/sfi-s1/pending/../teams/x.jpg' })).status).toBe(400);
    expect((await signUp('Sneaky', { photoKey: 'leagues/sfi-s1/pending/00000000-0000-4000-8000-999999999999.jpg' })).status).toBe(400);
  });

  it('saves both players with their pronouns, and each phone\'s own text choice', async () => {
    const res = await signUp('Pair Up', { players: [{ name: ' Riley ', pronouns: 'she/her' }, { name: 'Sam', pronouns: '' }], texts: [true, false] });
    expect(res.status).toBe(201);
    expect(res.body.team.players).toEqual([{ name: 'Riley', pronouns: 'she/her' }, { name: 'Sam' }]);
    const priv = fake.table.get(L, `TEAM#${res.body.team.teamId}#PRIVATE`)!;
    expect([priv.smsOptIn1, priv.smsOptIn2]).toEqual([true, false]);
    expect(priv.smsChangedAt1).toBeTruthy();

    const token = res.body.token as string;
    expect((await call('GET', '/api/me/texts', asTeam(token))).body.texts).toEqual([true, false]);
    const on = await call('POST', '/api/me/texts', { ...asTeam(token), body: { player: 1, optIn: true } });
    expect(on.body.texts).toEqual([true, true]);
    const off = await call('POST', '/api/me/texts', { ...asTeam(token), body: { player: 0, optIn: false } });
    expect(off.body.texts).toEqual([false, true]);
    expect((await call('POST', '/api/me/texts', { ...asTeam(token), body: { player: 2, optIn: true } })).status).toBe(400);
    expect((await call('GET', '/api/me/texts')).status).toBe(401);
  });

  it('needs a name for each player, and keeps pronouns short', async () => {
    expect((await signUp('No Names', { players: undefined })).status).toBe(400);
    expect((await signUp('No Names', { players: [{ name: '' }, { name: 'Sam' }] })).status).toBe(400);
    expect((await signUp('No Names', { players: [{ name: 'Riley', pronouns: 'x'.repeat(21) }, { name: 'Sam' }] })).status).toBe(400);
  });

  it('says the name is taken when an old sign-up still holds it', async () => {
    fake.table.put({ PK: L, SK: 'TEAMNAME#left & right', type: 'teamName', teamId: 'old-left-and-right' });
    const res = await signUp('Left & Right');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('That team name is taken. Try another.');
    expect((await league()).teams).toHaveLength(0);
  });

  it('stops taking sign-ups when too many are waiting', async () => {
    process.env.MAX_PENDING_TEAMS = '2';
    expect((await signUp('One')).status).toBe(201);
    expect((await signUp('Two')).status).toBe(201);
    const third = await signUp('Three');
    expect(third.status).toBe(409);
    expect(fake.table.get(L, 'TEAMNAME#three')).toBeUndefined();
  });
});

describe('team log in', () => {
  it('locks after ten wrong PINs, even in a burst, and never crashes on odd input', async () => {
    await signUp('Left & Right');
    const burst = await Promise.all(Array.from({ length: 30 }, (_, i) => call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: String(1000 + i) } })));
    expect(burst.filter((r) => r.status === 401)).toHaveLength(10);
    expect(burst.filter((r) => r.status === 429)).toHaveLength(20);
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '4821' } })).status).toBe(429);

    for (const body of [null, 7, [], { teamName: 5, pin: 4821 }, { teamName: { a: 1 } }]) {
      expect((await call('POST', '/api/login', { body })).status).toBe(401);
      expect((await call('POST', '/api/admin/login', { body })).status).toBe(401);
    }
    expect((await call('POST', '/api/teams', { body: { teamName: 5, phone1: 2025550142, phone2: null, pin: 4821 } })).status).toBe(400);
    expect((await call('POST', '/api/teams', { body: null })).status).toBe(400);
  });

  it('works with the right PIN and clears earlier wrong guesses', async () => {
    await signUp('Left & Right');
    await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '0000' } });
    const ok = await call('POST', '/api/login', { body: { teamName: ' left &  right ', pin: '4821' } });
    expect(ok.status).toBe(200);
    const id = ok.body.team.teamId;
    expect(fake.table.get(L, `TEAM#${id}#PRIVATE`)!.failures).toBeUndefined();
  });
});

describe('a team that is not approved yet', () => {
  it('can log in and see that it is waiting, but cannot score and is not in the standings', async () => {
    const { body } = await signUp('Left & Right');
    openNight(body.team.teamId);
    const team = asTeam(body.token);

    const me = await call('GET', '/api/league', team);
    expect(me.status).toBe(200);
    expect(me.body.league.teams.find((t: any) => t.teamId === body.team.teamId).status).toBe('pending');

    const score = await call('POST', '/api/scores', { ...team, body: { machineId: 'godzilla', score: 1000, ...scorePhotos(body.team.teamId) } });
    expect(score.status).toBe(403);
    expect((await call('POST', '/api/uploads', { ...team, body: { purpose: 'score' } })).status).toBe(403);

    expect((await league()).scores).toHaveLength(0);
  });
});

describe('admin log in', () => {
  it('needs the right name and password', async () => {
    expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'wrong password' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: 'Nobody', password: 'correct horse battery' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: '', password: '' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: { $ne: '' }, password: ['x'] } })).status).toBe(401);
    // The right password alone isn't enough: it asks for the code from the authenticator app.
    const half = await call('POST', '/api/admin/login', { body: { name: ' matt ', password: 'correct horse battery' } });
    expect(half.body).toEqual({ needsCode: true });
    const ok = await call('POST', '/api/admin/login', { body: { name: ' matt ', password: 'correct horse battery', code: freshCode() } });
    expect(ok.status).toBe(200);
    expect(ok.body.admin).toEqual({ name: 'Matt' });
  });

  it('refuses a wrong code, and a code that was already used', async () => {
    const body = { name: 'Matt', password: 'correct horse battery' };
    expect((await call('POST', '/api/admin/login', { body: { ...body, code: '000000' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { ...body, code: testCode(5) } })).status).toBe(401); // too far ahead
    const code = freshCode();
    expect((await call('POST', '/api/admin/login', { body: { ...body, code } })).status).toBe(200);
    expect((await call('POST', '/api/admin/login', { body: { ...body, code } })).status).toBe(401); // replayed
    expect((await call('POST', '/api/admin/login', { body: { ...body, code: testCode(-1) } })).status).toBe(401); // older than one used
  });

  it('an admin with no authenticator gets a setup token, good only for adding one', async () => {
    addAdmin('Jen', 'correct horse battery', 1, false);
    const first = await call('POST', '/api/admin/login', { body: { name: 'Jen', password: 'correct horse battery' } });
    expect(first.status).toBe(200);
    expect(first.body.token).toBeUndefined();
    const setup = asAdmin(first.body.setupToken);
    expect((await call('GET', '/api/admin/sms', setup)).status).toBe(401);
    expect((await call('GET', '/api/league', setup)).status).toBe(401);

    const started = await call('POST', '/api/admin/2fa/start', setup);
    expect(started.status).toBe(200);
    expect(started.body.link).toMatch(/^otpauth:\/\/totp\/Split%20Flipper%20Island%3AJen\?secret=/);
    const secret = started.body.key.replace(/ /g, '');
    // Kept sealed: the secret itself never sits in the table.
    expect(JSON.stringify(fake.table.get('ADMIN#sfi-s1', 'ADMIN#jen'))).not.toContain(secret);

    expect((await call('POST', '/api/admin/2fa/confirm', { ...setup, body: { code: '123456' } })).status).toBe(401);
    const done = await call('POST', '/api/admin/2fa/confirm', { ...setup, body: { code: testCode(0, secret) } });
    expect(done.status).toBe(200);
    expect((await call('GET', '/api/admin/sms', asAdmin(done.body.token))).status).toBe(200);
    expect((await call('POST', '/api/admin/2fa/start', setup)).status).toBe(409); // can't swap it from the website

    // From now on the password alone isn't enough.
    expect((await call('POST', '/api/admin/login', { body: { name: 'Jen', password: 'correct horse battery' } })).body).toEqual({ needsCode: true });
  });

  it('locks an account for a while after ten wrong passwords', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: `wrong ${i}` } })).status).toBe(401);
    }
    expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'correct horse battery' } })).status).toBe(429);
  });

  it('holds the limit against a burst of guesses sent at the same moment', async () => {
    const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => call('POST', '/api/admin/login', { body: { name: 'Matt', password: `wrong ${i}` } })));
    expect(burst.filter((r) => r.status === 401)).toHaveLength(10);
    expect(burst.filter((r) => r.status === 429)).toHaveLength(30);
    expect(fake.table.get('ADMIN#sfi-s1', 'ADMIN#matt')!.failures).toBe(10);
  });

  it('unlocks after 15 minutes, and a correct password clears the count', async () => {
    for (let i = 0; i < 10; i++) await call('POST', '/api/admin/login', { body: { name: 'Matt', password: `wrong ${i}` } });
    vi.useFakeTimers({ now: Date.now() + 16 * 60_000, toFake: ['Date'] });
    try {
      expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'correct horse battery', code: freshCode() } })).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
    expect(fake.table.get('ADMIN#sfi-s1', 'ADMIN#matt')!.failures).toBeUndefined();
  });

  it('does not create an account when someone guesses a name', async () => {
    await call('POST', '/api/admin/login', { body: { name: 'Ghost', password: 'whatever it is' } });
    expect(fake.table.all('ADMIN#sfi-s1')).toHaveLength(1);
  });
});

describe('admin pages', () => {
  it('are closed without an admin token, and a team token does not open them', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    for (const opts of [{}, asTeam(body.token), asAdmin(body.token), asAdmin('abc.def'), asAdmin('')]) {
      expect((await call('GET', '/api/admin/sms', opts)).status).toBe(401);
      expect((await call('POST', `/api/admin/teams/${id}/approve`, opts)).status).toBe(401);
      expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...opts, body: { reason: 'spam sign-up' } })).status).toBe(401);
    }
    expect((await teamOf(id))!.status).toBe('pending');
  });

  it('an admin token does not work as a team token', async () => {
    const token = await adminToken();
    expect((await call('GET', '/api/me/texts', asTeam(token))).status).toBe(401);
    expect((await call('GET', '/api/me/texts', asTeam(`admin:${token}`))).status).toBe(401);
  });

  it('stop working at once when the password is reset or the account is removed', async () => {
    const token = await adminToken();
    expect((await call('GET', '/api/admin/sms', asAdmin(token))).status).toBe(200);
    addAdmin('Matt', 'a different password', 2);
    // Re-creating an account with the same name must not revive the old token either.
    expect((await call('GET', '/api/admin/sms', asAdmin(token))).status).toBe(401);
    expect((await call('GET', '/api/admin/sms', asAdmin(token))).status).toBe(401);

    const fresh = await adminToken('Matt', 'a different password');
    fake.table.items.delete('ADMIN#sfi-s1|ADMIN#matt');
    expect((await call('GET', '/api/admin/sms', asAdmin(fresh))).status).toBe(401);
  });

  it('list waiting and approved teams with phone numbers, which no public page shows', async () => {
    const a = await signUp('Left & Right');
    await signUp('Tilt Me Tender');
    const token = await adminToken();
    await call('POST', `/api/admin/teams/${a.body.team.teamId}/approve`, asAdmin(token));

    const list = (await call('GET', '/api/league', asAdmin(token))).body.league;
    expect(list.teams.filter((t: any) => t.status === 'pending').map((t: any) => t.teamName)).toEqual(['Tilt Me Tender']);
    expect(list.teams.filter((t: any) => t.status === 'approved').map((t: any) => t.teamName)).toEqual(['Left & Right']);
    expect(list.teams.find((t: any) => t.status === 'pending').phone1).toMatch(/^2025550\d{3}$/);
    expect(JSON.stringify(list)).not.toContain('pinHash');

    for (const res of [await call('GET', '/api/league'), await call('GET', '/api/league', asTeam(a.body.token))]) {
      expect(JSON.stringify(res.body)).not.toMatch(/202555\d{4}/);
    }
  });
});

describe('approving a sign-up', () => {
  it('lets the team play, keeps its photo and records who approved it', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const pendingPhoto = (await teamOf(id))!.photo;
    const token = await adminToken();

    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(200);

    const stored = (await teamOf(id))!;
    expect(stored.status).toBe('approved');
    expect(stored.expiresAt).toBeUndefined();
    expect(stored.photo).toBe(`leagues/sfi-s1/teams/${id}.jpg`);
    expect(fake.bucket.objects.has(`leagues/sfi-s1/teams/${id}.jpg`)).toBe(true);
    expect(fake.bucket.objects.has(pendingPhoto)).toBe(false);
    expect(await auditActions()).toContain('Admin approved a new team: Left & Right');
    expect((fake.table.all('HISTORY#sfi-s1').at(-1)!.actor as { name: string }).name).toBe('Matt'); // who did it is on record

    openNight(id);
    const score = await call('POST', '/api/scores', { ...asTeam(body.token), body: { machineId: 'godzilla', score: 1000, ...scorePhotos(id) } });
    expect(score.status).toBe(201);
  });

  it('is safe to press twice, and an approved team cannot be removed or purged', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const token = await adminToken();
    await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token));
    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(200);
    expect((await auditActions()).filter((a) => a.includes('approved'))).toHaveLength(1);

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: 'changed my mind' } })).status).toBe(409);
    const { purgeExpired } = await import('./admin.js');
    expect(await purgeExpired(Date.now() + 1000 * HOUR)).toEqual({ purged: 0, failed: 0 });
    expect((await teamOf(id))!.status).toBe('approved');
  });

  it('keeps the photo when two approvals arrive at the same moment', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const token = await adminToken();
    const both = await Promise.all([1, 2].map(() => call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))));
    expect(both.map((r) => r.status)).toEqual([200, 200]);
    expect((await teamOf(id))!.status).toBe('approved');
    expect(fake.bucket.objects.has(`leagues/sfi-s1/teams/${id}.jpg`)).toBe(true);
    expect((await auditActions()).filter((a) => a.includes('approved'))).toHaveLength(1);
  });

  it('changes nothing when the photo cannot be saved, so the admin can try again', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const pendingPhoto = (await teamOf(id))!.photo;
    const token = await adminToken();
    fake.bucket.failPuts = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // the failure is expected; keep the output clean
    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(503);
    vi.mocked(console.error).mockRestore();
    expect((await teamOf(id))!.status).toBe('pending');
    expect(fake.bucket.objects.has(pendingPhoto)).toBe(true);
    fake.bucket.failPuts = false;
    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(200);
    expect(fake.bucket.objects.has(`leagues/sfi-s1/teams/${id}.jpg`)).toBe(true);
  });

  it('still approves when the photo has gone missing', async () => {
    const { body } = await signUp('No Photo');
    fake.bucket.objects.clear();
    const token = await adminToken();
    expect((await call('POST', `/api/admin/teams/${body.team.teamId}/approve`, asAdmin(token))).status).toBe(200);
    expect((await teamOf(body.team.teamId))!.photo).toBe('');
  });

  it('reports a sign-up that no longer exists', async () => {
    const token = await adminToken();
    expect((await call('POST', '/api/admin/teams/0123abcd/approve', asAdmin(token))).status).toBe(404);
    expect((await call('POST', '/api/admin/teams/not-an-id/approve', asAdmin(token))).status).toBe(404);
  });
});

describe('removing a sign-up', () => {
  it('needs a reason, deletes everything about the team and logs who did it', async () => {
    const { body } = await signUp('Spam Team');
    const id = body.team.teamId;
    const photo = (await teamOf(id))!.photo;
    const token = await adminToken();

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: {} })).status).toBe(400);
    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: ' ' } })).status).toBe(400);
    expect(await teamOf(id)).toBeDefined();

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: 'not a real team' } })).status).toBe(200);
    expect(await teamOf(id)).toBeUndefined();
    expect(fake.table.get(L, `TEAM#${id}#PRIVATE`)).toBeUndefined();
    expect(fake.table.get(L, 'TEAMNAME#spam team')).toBeUndefined();
    expect(fake.bucket.objects.has(photo)).toBe(false);
    const entry = (await league()).log.find((a) => a.action.includes('removed'))!;
    expect(entry.action).toBe('Admin removed a sign-up');
    expect(entry.reason).toBe('not a real team');
    expect(JSON.stringify((await league()).log)).not.toContain('Spam Team');

    expect((await call('POST', '/api/login', { body: { teamName: 'Spam Team', pin: '4821' } })).status).toBe(401);
    expect((await call('GET', '/api/me/texts', asTeam(body.token))).status).toBe(401);
    expect((await signUp('Spam Team')).status).toBe(201); // the name is free again
  });
});

describe('sign-ups nobody approves', () => {
  it('are deleted after the waiting time, and only those', async () => {
    const { purgeExpired } = await import('./admin.js');
    const old = await signUp('Old Sign-up');
    const approved = await signUp('Approved In Time');
    await call('POST', `/api/admin/teams/${approved.body.team.teamId}/approve`, asAdmin(await adminToken()));
    const now = Date.now();

    expect(await purgeExpired(now + 23 * HOUR)).toEqual({ purged: 0, failed: 0 });
    // A second team signs up 23 hours after the first.
    vi.useFakeTimers({ now: now + 23 * HOUR, toFake: ['Date'] });
    const fresh = await signUp('Fresh Sign-up').finally(() => vi.useRealTimers());
    const pendingPhoto = (await teamOf(old.body.team.teamId))!.photo;

    // Run through the handler the way the schedule does, 24 hours and a bit after the first sign-up.
    vi.useFakeTimers({ now: now + 24 * HOUR + 60_000, toFake: ['Date'] });
    try {
      expect(await handler({ task: 'purge' })).toMatchObject({ purged: 1, failed: 0 });
    } finally {
      vi.useRealTimers();
    }

    expect(await teamOf(old.body.team.teamId)).toBeUndefined();
    expect(fake.table.get(L, `TEAM#${old.body.team.teamId}#PRIVATE`)).toBeUndefined();
    expect(fake.table.get(L, 'TEAMNAME#old sign-up')).toBeUndefined();
    expect(fake.bucket.objects.has(pendingPhoto)).toBe(false);
    expect(await teamOf(fresh.body.team.teamId)).toBeDefined();
    expect((await teamOf(approved.body.team.teamId))!.status).toBe('approved');
    expect(await auditActions()).toContain('A sign-up expired without approval');
    expect(JSON.stringify((await league()).log)).not.toContain('Old Sign-up');
  });

  it('cannot be triggered from the web', async () => {
    await signUp('Old Sign-up');
    vi.useFakeTimers({ now: Date.now() + 48 * HOUR, toFake: ['Date'] });
    try {
      const res = await call('POST', '/api/teams', { body: { task: 'purge' } });
      expect(res.status).toBe(400);
      const sneaky = { task: 'purge', requestContext: { http: { method: 'GET' } }, rawPath: '/api/health', headers: {} } as unknown as APIGatewayProxyEventV2;
      expect(((await handler(sneaky)) as APIGatewayProxyStructuredResultV2).statusCode).toBe(403);
    } finally {
      vi.useRealTimers();
    }
    expect(fake.table.get(L, 'TEAMNAME#old sign-up')).toBeDefined();
  });
});

describe('PINs', () => {
  it('refuses obvious PINs at sign-up', async () => {
    for (const pin of ['1234', '0000', '9876', '2580', '12a4']) expect((await signUp(`Easy ${pin}`, { pin })).status).toBe(400);
    expect((await signUp('Fine Pin', { pin: '4821' })).status).toBe(201);
  });

  it('lets a team change its PIN with the current one', async () => {
    const a = await signUp('Left & Right');
    const token = a.body.token as string;
    const change = (body: Record<string, string>) => call('POST', '/api/me/pin', { ...asTeam(token), body });
    expect((await change({ currentPin: '1111', newPin: '7391' })).status).toBe(401);
    expect((await change({ currentPin: '4821', newPin: '4444' })).status).toBe(400);
    expect((await change({ currentPin: '4821', newPin: '4821' })).status).toBe(400);
    expect((await change({ currentPin: '4821', newPin: '7391' })).status).toBe(200);
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '4821' } })).status).toBe(401);
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '7391' } })).status).toBe(200);
    expect((await call('POST', '/api/me/pin', { body: { currentPin: '7391', newPin: '5730' } })).status).toBe(401);
  });

  it('lets an admin set a temporary PIN, shown once, which clears a lockout', async () => {
    const a = await signUp('Left & Right');
    const teamId = a.body.team.teamId as string;
    for (let i = 0; i < 10; i++) await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '0101' } });
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: '4821' } })).status).toBe(429);

    const token = await adminToken();
    const res = await call('POST', `/api/admin/teams/${teamId}/reset-pin`, asAdmin(token));
    expect(res.status).toBe(200);
    expect(res.body.pin).toMatch(/^\d{4}$/);
    expect(JSON.stringify(fake.table.all(L))).not.toContain(`"${res.body.pin}"`);
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right', pin: res.body.pin } })).status).toBe(200);
    expect(await auditActions()).toContain("Admin reset Left & Right's PIN");
    expect((await call('POST', `/api/admin/teams/${teamId}/reset-pin`)).status).toBe(401);
    expect((await call('POST', '/api/admin/teams/no-such-team/reset-pin', asAdmin(token))).status).toBe(404);
  });
});

