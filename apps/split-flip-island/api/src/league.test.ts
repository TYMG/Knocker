// The league engine: one rule book on the server. Run through the real request handler against
// an in-memory database.
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
const { createLeagueState, applyAction, loadLeagueState } = await import('./leagueStore.js');
const { newLeague } = await import('../../shared/league/new.js');

const L = 'LEAGUE#sfi-s1';

async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
  const event = {
    rawPath: path, headers: { 'x-origin-verify': 'test-origin-secret', ...opts.headers }, isBase64Encoded: false,
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

function team(teamId: string, teamName: string, status: 'approved' | 'pending' = 'approved') {
  return {
    teamId, teamName, players: ['Riley', 'Sam'] as [string, string], pronouns: ['she/her', ''] as [string, string], phone1: '', phone2: '',
    texts: [true, false] as [boolean, boolean], photo: '', status, createdAt: '2026-11-01T00:00:00.000Z', firstWeek: 1
  };
}

// League night: Thursday Nov 5, 2026, 7 PM Eastern (midnight UTC).
async function setUp() {
  const league = newLeague({ firstNight: '2026-11-05', opensAt: '19:00', closesAt: '21:00', machines: [{ machineId: 'godzilla', name: 'Godzilla' }, { machineId: 'venom', name: 'Venom' }] }, '2026-11-01T12:00:00.000Z');
  league.teams = [team('aaaa1111', 'Left & Right'), team('bbbb2222', 'Tilt Me Tender'), team('cccc3333', 'Waiting Room', 'pending')];
  await createLeagueState(league, 'test');
  fake.table.put({ PK: L, SK: 'TEAM#aaaa1111#PRIVATE', type: 'private', pinHash: 'x', phone1: '2025550101', phone2: '2025550102' });
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T23:40:00.000Z')); // 6:40 PM, check-in is open
  fake.table.items.clear();
  fake.table.put({ PK: 'ADMIN#sfi-s1', SK: 'ADMIN#matt', type: 'admin', name: 'Matt', passHash: hashPassword('correct horse battery'), tokenVersion: 1, createdAt: '2026-10-06T00:00:00.000Z' });
  await setUp();
});
afterEach(() => vi.useRealTimers());

describe('the league on the server', () => {
  it('serves the league, with private details only for those allowed to see them', async () => {
    const visitor = await call('GET', '/api/league');
    expect(visitor.status).toBe(200);
    expect(visitor.body.version).toBe(1);
    expect(visitor.body.league.role).toBe('visitor');
    expect(visitor.body.league.teams.every((t: any) => t.phone1 === '' && t.texts === undefined)).toBe(true);

    const mine = await call('GET', '/api/league', asTeam('aaaa1111'));
    expect(mine.body.league.myTeamId).toBe('aaaa1111');
    expect(mine.body.league.teams.find((t: any) => t.teamId === 'aaaa1111').texts).toEqual([true, false]);
    expect(mine.body.league.teams.find((t: any) => t.teamId === 'bbbb2222').texts).toBeUndefined();

    const admin = await call('GET', '/api/league', await asAdmin());
    expect(admin.body.league.role).toBe('admin');
    expect(admin.body.league.teams.find((t: any) => t.teamId === 'aaaa1111').phone1).toBe('2025550101');
  });

  it('applies a rule as the logged-in team, saves it in order, and refuses one that breaks the rules', async () => {
    const admin = await asAdmin();
    expect((await act('openNight', undefined, admin)).body.version).toBe(2);
    const asked = await act('requestCheckIn', { teamId: 'bbbb2222' }, asTeam('aaaa1111')); // teamId is ignored: always your own team
    expect(asked.status).toBe(200);
    expect(Object.keys(asked.body.league.checkInRequests)).toEqual(['aaaa1111']);
    expect((await act('checkIn', 'aaaa1111', admin)).status).toBe(200);
    const joined = await act('joinLine', { machineId: 'godzilla', notify: false }, asTeam('aaaa1111'));
    expect(joined.body.league.lines[0].teamIds).toEqual(['aaaa1111']);
    // Not checked in: the rule changes nothing, so it's refused.
    expect((await act('joinLine', { machineId: 'godzilla', notify: false }, asTeam('bbbb2222'))).status).toBe(409);

    const saved = await loadLeagueState();
    expect(saved!.version).toBe(5);
    expect(saved!.league.role).toBe('visitor'); // no viewer is ever saved
    expect(fake.table.all('HISTORY#sfi-s1').map((h) => (h.action as { type: string }).type)).toEqual(['setup', 'openNight', 'requestCheckIn', 'checkIn', 'joinLine']);
  });

  it('keeps teams and admins to their own actions', async () => {
    expect((await act('closeNight', undefined, asTeam('aaaa1111'))).status).toBe(403);
    expect((await act('signUp', {}, await asAdmin())).status).toBe(403);
    expect((await act('requestCheckIn', undefined, asTeam('cccc3333'))).status).toBe(403); // not approved yet
    expect((await act('openNight', undefined, { headers: {} })).status).toBe(401);
  });

  it('never loses a change when two phones save at the same moment', async () => {
    await applyAction({ kind: 'admin', name: 'Matt' }, { type: 'openNight' });
    await Promise.all([
      applyAction({ kind: 'team', teamId: 'aaaa1111' }, { type: 'requestCheckIn' }),
      applyAction({ kind: 'team', teamId: 'bbbb2222' }, { type: 'requestCheckIn' })
    ]);
    const saved = await loadLeagueState();
    expect(Object.keys(saved!.league.checkInRequests ?? {}).sort()).toEqual(['aaaa1111', 'bbbb2222']);
    expect(saved!.version).toBe(4);
  });

  it('opens the night only on its date and close to its time', async () => {
    vi.setSystemTime(new Date('2026-11-04T23:40:00.000Z')); // the day before
    await expect(applyAction({ kind: 'league' }, { type: 'openNight' })).rejects.toThrow();
    vi.setSystemTime(new Date('2026-11-05T22:00:00.000Z')); // 5 PM: too early
    await expect(applyAction({ kind: 'league' }, { type: 'openNight' })).rejects.toThrow();
    vi.setSystemTime(new Date('2026-11-05T23:31:00.000Z'));
    const opened = await applyAction({ kind: 'league' }, { type: 'openNight' });
    expect(opened.league.weeks[0].state).toBe('open');
  });
});

describe('league setup, pause and start over', () => {
  const owner = async () => {
    fake.table.put({ PK: 'ADMIN#sfi-s1', SK: 'ADMIN#matt', type: 'admin', name: 'Matt', passHash: hashPassword('correct horse battery'), tokenVersion: 1, createdAt: '2026-10-06T00:00:00.000Z', owner: true });
    return asAdmin();
  };
  const setupBody = { firstNight: '2027-01-14', opensAt: '19:00', closesAt: '21:00', machines: ['Godzilla', 'Venom'], teamCap: 10 };

  it('pausing stops the night opening by itself and new sign-ups, and resuming brings them back', async () => {
    const admin = await asAdmin();
    expect((await act('setPaused', true, admin)).body.league.paused).toBe(true);
    await expect(applyAction({ kind: 'league' }, { type: 'openNight' })).rejects.toThrow();
    expect((await act('setPaused', true, admin)).status).toBe(409); // already paused
    expect((await act('setPaused', false, asTeam('aaaa1111'))).status).toBe(403);
    expect((await act('setPaused', false, admin)).status).toBe(200);
    expect((await applyAction({ kind: 'league' }, { type: 'openNight' })).league.weeks[0]!.state).toBe('open');
    const log = (await loadLeagueState())!.league.log.map((l) => l.action);
    expect(log).toEqual(expect.arrayContaining(['Admin paused the league', 'Admin resumed the league']));
  });

  it('only the owner can start over, with the words, and it keeps the admin accounts', async () => {
    const notOwner = await asAdmin();
    expect((await call('POST', '/api/admin/league/start-over', { ...notOwner, body: { confirm: 'START OVER' } })).status).toBe(403);
    const me = await owner();
    expect((await call('GET', '/api/league', me)).body.league.adminIsOwner).toBe(true);
    expect((await call('POST', '/api/admin/league/start-over', { ...me, body: { confirm: 'start' } })).status).toBe(400);
    const done = await call('POST', '/api/admin/league/start-over', { ...me, body: { confirm: 'start over' } });
    expect(done.status).toBe(200);
    expect(done.body.deleted).toBeGreaterThan(0);
    expect(await loadLeagueState()).toBeNull();
    expect(fake.table.get(L, 'TEAM#aaaa1111#PRIVATE')).toBeUndefined();
    expect(fake.table.all('HISTORY#sfi-s1')).toHaveLength(0);
    expect(fake.table.get('ADMIN#sfi-s1', 'ADMIN#matt')).toBeDefined();
    const none = await call('GET', '/api/league', me);
    expect(none.body.league).toBeNull();
    expect(none.body.viewer).toEqual({ role: 'admin', adminName: 'Matt', adminIsOwner: true });
  });

  it('sets up a season only when there is none, from the admin page', async () => {
    const me = await owner();
    expect((await call('POST', '/api/admin/league/setup', { ...me, body: setupBody })).status).toBe(409); // one exists
    await call('POST', '/api/admin/league/start-over', { ...me, body: { confirm: 'START OVER' } });
    expect((await call('POST', '/api/admin/league/setup', { ...me, body: { ...setupBody, machines: [] } })).status).toBe(400);
    expect((await call('POST', '/api/admin/league/setup', { ...me, body: { ...setupBody, closesAt: '18:00' } })).status).toBe(400);
    expect((await call('POST', '/api/admin/league/setup', { body: setupBody })).status).toBe(401);
    expect((await call('POST', '/api/admin/league/setup', { ...me, body: setupBody })).status).toBe(201);
    const l = (await loadLeagueState())!.league;
    expect(l.weeks.map((w) => w.date).slice(0, 3)).toEqual(['2027-01-14', '2027-01-21', '2027-01-28']);
    expect(l.machines.map((m) => m.machineId)).toEqual(['godzilla', 'venom']);
    expect(l.teamCap).toBe(10);
    expect(l.night).toEqual({ opensAt: '19:00', closesAt: '21:00', extraMinutes: 0 });
  });
});

describe('an admin entering a score for a team', () => {
  it('works with a reason, with or without a photo, only on an open night', async () => {
    const admin = await asAdmin();
    const body = { teamId: 'aaaa1111', machineId: 'godzilla', score: 1_250_000, reason: 'phone died', noPhoto: true };
    expect((await call('POST', '/api/admin/scores', { ...admin, body })).status).toBe(409); // night not open yet
    await act('openNight', undefined, admin);
    expect((await call('POST', '/api/admin/scores', { ...admin, body: { ...body, reason: 'x' } })).status).toBe(400);
    expect((await call('POST', '/api/admin/scores', { ...admin, body: { ...body, teamId: 'cccc3333' } })).status).toBe(400); // pending team
    expect((await call('POST', '/api/admin/scores', { ...admin, body: { ...body, noPhoto: false } })).status).toBe(400); // photo needed
    expect((await call('POST', '/api/admin/scores', { ...asTeam('aaaa1111'), body })).status).toBe(401);
    expect((await call('POST', '/api/admin/scores', { ...admin, body })).status).toBe(201);

    const key = 'leagues/sfi-s1/scores/2026-11-05/aaaa1111-abc';
    fake.bucket.objects.set(`${key}.jpg`, new Uint8Array([1]));
    fake.bucket.objects.set(`${key}-thumb.jpg`, new Uint8Array([1]));
    expect((await call('POST', '/api/admin/scores', { ...admin, body: { ...body, score: 900, noPhoto: false, photoKey: `${key}.jpg`, thumbKey: `${key}-thumb.jpg` } })).status).toBe(201);

    const scores = (await loadLeagueState())!.league.scores;
    expect(scores.map((x) => [x.score, x.enteredBy, x.photo ?? null, x.check])).toEqual([[1_250_000, 'admin', null, 'checked'], [900, 'admin', `${key}.jpg`, 'checked']]);
    expect((await call('GET', '/api/league')).body.league.scores[1].photo).toBe(`/${key}.jpg`);
  });
});

describe('solo players', () => {
  const join = (body: Record<string, unknown>) => call('POST', '/api/waitlist', { body });

  it('join the waitlist with their phone kept private, and an admin pairs them into a team', async () => {
    expect((await join({ name: '', phone: '2025550199' })).status).toBe(400);
    expect((await join({ name: 'Jo', phone: '555' })).status).toBe(400);
    expect((await join({ name: 'Jo', pronouns: 'they/them', phone: '(202) 555-0199', texts: true })).status).toBe(201);
    expect((await join({ name: 'Kai', phone: '2025550188' })).status).toBe(201);

    const visitor = (await call('GET', '/api/league')).body.league;
    expect(visitor.waitlist.map((w: any) => [w.name, w.pronouns ?? ''])).toEqual([['Jo', 'they/them'], ['Kai', '']]);
    expect(JSON.stringify(visitor)).not.toContain('555');
    const ids = visitor.waitlist.map((w: any) => w.id);

    expect((await call('POST', '/api/admin/waitlist/pair', { body: { ids } })).status).toBe(401);
    const admin = await asAdmin();
    expect((await call('POST', '/api/admin/waitlist/pair', { ...admin, body: { ids: [ids[0], ids[0]] } })).status).toBe(400);
    const paired = await call('POST', '/api/admin/waitlist/pair', { ...admin, body: { ids } });
    expect(paired.status).toBe(201);
    expect(paired.body.teamName).toBe('Jo & Kai');
    expect(paired.body.pin).toMatch(/^\d{4}$/);

    const l = (await loadLeagueState())!.league;
    const team = l.teams.find((t) => t.teamName === 'Jo & Kai')!;
    expect([team.status, team.players, team.pronouns, team.texts]).toEqual(['approved', ['Jo', 'Kai'], ['they/them', ''], [true, false]]);
    expect(l.waitlist).toHaveLength(0);
    const priv = fake.table.get(L, `TEAM#${team.teamId}#PRIVATE`)!;
    expect([priv.phone1, priv.phone2, priv.smsOptIn1, priv.smsOptIn2]).toEqual(['2025550199', '2025550188', true, false]);
    expect(fake.table.all(L).some((i) => String(i.SK).startsWith('WAITLIST#'))).toBe(false);
    expect((await call('POST', '/api/login', { body: { teamName: 'Jo & Kai', pin: paired.body.pin } })).status).toBe(200);
  });

  it('cannot pair into a name another team already has', async () => {
    await join({ name: 'Left', phone: '2025550101' });
    await join({ name: 'Right', phone: '2025550102' });
    // An existing team named "Left & Right" (aaaa1111) is in the league from the set-up.
    const ids = (await call('GET', '/api/league')).body.league.waitlist.map((w: any) => w.id);
    const res = await call('POST', '/api/admin/waitlist/pair', { ...(await asAdmin()), body: { ids } });
    expect(res.status).toBe(409);
    expect((await loadLeagueState())!.league.waitlist).toHaveLength(2);
  });
});

