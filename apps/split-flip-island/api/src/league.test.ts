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
