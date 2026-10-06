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

const L = 'LEAGUE#sfi-s1';
const HOUR = 3_600_000;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff]);

interface Res { status: number; body: Record<string, any> }

async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; origin?: string | null } = {}): Promise<Res> {
  const headers: Record<string, string> = { ...opts.headers };
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
    body: { teamName, phone1: `2025550${n}`, phone2: `2025551${n}`, pin: '4821', photoKey: uploadedPhoto(), ...extra }
  });
}

function addAdmin(name: string, password: string, tokenVersion = 1) {
  fake.table.put({ PK: 'ADMIN#sfi-s1', SK: `ADMIN#${name.toLowerCase()}`, type: 'admin', name, passHash: hashPassword(password), tokenVersion, createdAt: '2026-10-06T00:00:00.000Z' });
}

async function adminToken(name = 'Matt', password = 'correct horse battery') {
  const res = await call('POST', '/api/admin/login', { body: { name, password } });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

const asAdmin = (token: string) => ({ headers: { 'x-admin-token': token } });
const asTeam = (token: string) => ({ headers: { 'x-team-token': token } });
const auditActions = () => fake.table.all('AUDIT#sfi-s1').map((a) => a.action as string);

function openNight() {
  fake.table.put({ PK: L, SK: 'MACHINE#godzilla', type: 'machine', machineId: 'godzilla', name: 'Godzilla', order: 0 });
  fake.table.put({ PK: L, SK: 'NIGHT#2026-10-14', type: 'night', date: '2026-10-14', week: 1, machineIds: ['godzilla'], open: true });
  fake.table.put({ PK: L, SK: 'META', type: 'meta', activeNight: '2026-10-14' });
}

function scorePhotos(teamId: string) {
  const base = `leagues/sfi-s1/scores/2026-10-14/${teamId}-abc`;
  fake.bucket.objects.set(`${base}.jpg`, JPEG);
  fake.bucket.objects.set(`${base}-thumb.jpg`, JPEG);
  return { photoKey: `${base}.jpg`, thumbKey: `${base}-thumb.jpg` };
}

beforeEach(() => {
  fake.table.items.clear();
  fake.bucket.objects.clear();
  delete process.env.MAX_PENDING_TEAMS;
  delete process.env.PENDING_TEAM_HOURS;
  addAdmin('Matt', 'correct horse battery');
});

describe('requests that skip the front door', () => {
  it('are refused when the secret header is missing or wrong', async () => {
    expect((await call('GET', '/api/standings', { origin: null })).status).toBe(403);
    expect((await call('GET', '/api/standings', { origin: 'guess' })).status).toBe(403);
    expect((await call('POST', '/api/teams', { origin: null, body: {} })).status).toBe(403);
    expect((await call('GET', '/api/standings')).status).toBe(200);
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
    expect(auditActions()).toEqual(['Left & Right signed up and is waiting for approval']);
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

  it('stops taking sign-ups when too many are waiting', async () => {
    process.env.MAX_PENDING_TEAMS = '2';
    expect((await signUp('One')).status).toBe(201);
    expect((await signUp('Two')).status).toBe(201);
    const third = await signUp('Three');
    expect(third.status).toBe(409);
    expect(fake.table.get(L, 'TEAMNAME#three')).toBeUndefined();
  });
});

describe('a team that is not approved yet', () => {
  it('can log in and see that it is waiting, but cannot score and is not in the standings', async () => {
    openNight();
    const { body } = await signUp('Left & Right');
    const team = asTeam(body.token);

    const me = await call('GET', '/api/me', team);
    expect(me.status).toBe(200);
    expect(me.body.team.status).toBe('pending');

    const score = await call('POST', '/api/scores', { ...team, body: { machineId: 'godzilla', score: 1000, ...scorePhotos(body.team.teamId) } });
    expect(score.status).toBe(403);
    expect((await call('POST', '/api/uploads', { ...team, body: { purpose: 'score' } })).status).toBe(403);

    const standings = await call('GET', '/api/standings');
    expect(standings.body.teamCount).toBe(0);
    expect(JSON.stringify(standings.body)).not.toContain('Left & Right');
  });
});

describe('admin log in', () => {
  it('needs the right name and password', async () => {
    expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'wrong password' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: 'Nobody', password: 'correct horse battery' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: '', password: '' } })).status).toBe(401);
    expect((await call('POST', '/api/admin/login', { body: { name: { $ne: '' }, password: ['x'] } })).status).toBe(401);
    const ok = await call('POST', '/api/admin/login', { body: { name: ' matt ', password: 'correct horse battery' } });
    expect(ok.status).toBe(200);
    expect(ok.body.admin).toEqual({ name: 'Matt' });
  });

  it('locks an account for a while after ten wrong passwords', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: `wrong ${i}` } })).status).toBe(401);
    }
    expect((await call('POST', '/api/admin/login', { body: { name: 'Matt', password: 'correct horse battery' } })).status).toBe(429);
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
      expect((await call('GET', '/api/admin/teams', opts)).status).toBe(401);
      expect((await call('POST', `/api/admin/teams/${id}/approve`, opts)).status).toBe(401);
      expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...opts, body: { reason: 'spam sign-up' } })).status).toBe(401);
    }
    expect(fake.table.get(L, `TEAM#${id}`)!.status).toBe('pending');
  });

  it('an admin token does not work as a team token', async () => {
    const token = await adminToken();
    expect((await call('GET', '/api/me', asTeam(token))).status).toBe(401);
    expect((await call('GET', '/api/me', asTeam(`admin:${token}`))).status).toBe(401);
  });

  it('stop working at once when the password is reset or the account is removed', async () => {
    const token = await adminToken();
    expect((await call('GET', '/api/admin/teams', asAdmin(token))).status).toBe(200);
    addAdmin('Matt', 'a different password', 2);
    expect((await call('GET', '/api/admin/teams', asAdmin(token))).status).toBe(401);

    const fresh = await adminToken('Matt', 'a different password');
    fake.table.items.delete('ADMIN#sfi-s1|ADMIN#matt');
    expect((await call('GET', '/api/admin/teams', asAdmin(fresh))).status).toBe(401);
  });

  it('list waiting and approved teams with phone numbers, which no public page shows', async () => {
    const a = await signUp('Left & Right');
    await signUp('Tilt Me Tender');
    const token = await adminToken();
    await call('POST', `/api/admin/teams/${a.body.team.teamId}/approve`, asAdmin(token));

    const list = await call('GET', '/api/admin/teams', asAdmin(token));
    expect(list.body.pending.map((t: any) => t.teamName)).toEqual(['Tilt Me Tender']);
    expect(list.body.approved.map((t: any) => t.teamName)).toEqual(['Left & Right']);
    expect(list.body.pending[0].phone1).toMatch(/^2025550\d{3}$/);
    expect(list.body.pendingHours).toBe(24);
    expect(JSON.stringify(list.body)).not.toContain('pinHash');

    for (const res of [await call('GET', '/api/standings'), await call('GET', '/api/audit'), await call('GET', '/api/me', asTeam(a.body.token))]) {
      expect(JSON.stringify(res.body)).not.toMatch(/202555\d{4}/);
    }
  });
});

describe('approving a sign-up', () => {
  it('lets the team play, keeps its photo and records who approved it', async () => {
    openNight();
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const pendingPhoto = fake.table.get(L, `TEAM#${id}`)!.photoKey as string;
    const token = await adminToken();

    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(200);

    const stored = fake.table.get(L, `TEAM#${id}`)!;
    expect(stored.status).toBe('approved');
    expect(stored.expiresAt).toBeUndefined();
    expect(stored.approvedBy).toBe('Matt');
    expect(stored.photoKey).toBe(`leagues/sfi-s1/teams/${id}.jpg`);
    expect(fake.bucket.objects.has(`leagues/sfi-s1/teams/${id}.jpg`)).toBe(true);
    expect(fake.bucket.objects.has(pendingPhoto)).toBe(false);
    expect(auditActions()).toContain('Matt approved Left & Right');

    const standings = await call('GET', '/api/standings');
    expect(standings.body.teamCount).toBe(1);
    const score = await call('POST', '/api/scores', { ...asTeam(body.token), body: { machineId: 'godzilla', score: 1000, ...scorePhotos(id) } });
    expect(score.status).toBe(201);
  });

  it('is safe to press twice, and an approved team cannot be removed or purged', async () => {
    const { body } = await signUp('Left & Right');
    const id = body.team.teamId;
    const token = await adminToken();
    await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token));
    expect((await call('POST', `/api/admin/teams/${id}/approve`, asAdmin(token))).status).toBe(200);
    expect(auditActions().filter((a) => a.includes('approved'))).toHaveLength(1);

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: 'changed my mind' } })).status).toBe(409);
    const { purgeExpired } = await import('./admin.js');
    expect(await purgeExpired(Date.now() + 1000 * HOUR)).toEqual({ purged: 0, failed: 0 });
    expect(fake.table.get(L, `TEAM#${id}`)!.status).toBe('approved');
  });

  it('still approves when the photo has gone missing', async () => {
    const { body } = await signUp('No Photo');
    fake.bucket.objects.clear();
    const token = await adminToken();
    expect((await call('POST', `/api/admin/teams/${body.team.teamId}/approve`, asAdmin(token))).status).toBe(200);
    expect((await call('GET', '/api/me', asTeam(body.token))).body.team.photoUrl).toBeNull();
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
    const photo = fake.table.get(L, `TEAM#${id}`)!.photoKey as string;
    const token = await adminToken();

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: {} })).status).toBe(400);
    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: ' ' } })).status).toBe(400);
    expect(fake.table.get(L, `TEAM#${id}`)).toBeDefined();

    expect((await call('POST', `/api/admin/teams/${id}/remove`, { ...asAdmin(token), body: { reason: 'not a real team' } })).status).toBe(200);
    expect(fake.table.get(L, `TEAM#${id}`)).toBeUndefined();
    expect(fake.table.get(L, `TEAM#${id}#PRIVATE`)).toBeUndefined();
    expect(fake.table.get(L, 'TEAMNAME#spam team')).toBeUndefined();
    expect(fake.bucket.objects.has(photo)).toBe(false);
    const entry = fake.table.all('AUDIT#sfi-s1').find((a) => String(a.action).includes('removed'))!;
    expect(entry.action).toBe("Matt removed Spam Team's sign-up");
    expect(entry.reason).toBe('not a real team');

    expect((await call('POST', '/api/login', { body: { teamName: 'Spam Team', pin: '4821' } })).status).toBe(401);
    expect((await call('GET', '/api/me', asTeam(body.token))).status).toBe(401);
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
    const pendingPhoto = fake.table.get(L, `TEAM#${old.body.team.teamId}`)!.photoKey as string;

    // Run through the handler the way the schedule does, 24 hours and a bit after the first sign-up.
    vi.useFakeTimers({ now: now + 24 * HOUR + 60_000, toFake: ['Date'] });
    try {
      expect(await handler({ task: 'purge' })).toEqual({ purged: 1, failed: 0 });
    } finally {
      vi.useRealTimers();
    }

    expect(fake.table.get(L, `TEAM#${old.body.team.teamId}`)).toBeUndefined();
    expect(fake.table.get(L, `TEAM#${old.body.team.teamId}#PRIVATE`)).toBeUndefined();
    expect(fake.table.get(L, 'TEAMNAME#old sign-up')).toBeUndefined();
    expect(fake.bucket.objects.has(pendingPhoto)).toBe(false);
    expect(fake.table.get(L, `TEAM#${fresh.body.team.teamId}`)).toBeDefined();
    expect(fake.table.get(L, `TEAM#${approved.body.team.teamId}`)!.status).toBe('approved');
    expect(auditActions()).toContain("Old Sign-up's sign-up expired without approval");
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
