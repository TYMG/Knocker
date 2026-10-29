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

const sms = vi.hoisted(() => ({ texts: [] as { to: string; body: string }[] }));
vi.mock('./textsender.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./textsender.js')>();
  return { ...real, sendText: async (to: string, body: string) => { sms.texts.push({ to, body }); } };
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
  vi.setSystemTime(new Date('2026-11-05T23:20:00.000Z')); // 6:20 PM, before the night opens on its own
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
    expect((await act('openNight', { by: 'admin' }, admin)).body.version).toBe(2);
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
    await applyAction({ kind: 'admin', name: 'Matt' }, { type: 'openNight', payload: { by: 'admin' } });
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
    vi.setSystemTime(new Date('2026-11-05T23:31:00.000Z'));
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
    await act('openNight', { by: 'admin' }, admin);
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

describe('solo players and the matchmaker', () => {
  const traits = { why: 'win', energy: 'loud', experience: 'some', style: 'coach' };
  const join = (body: Record<string, unknown>) => call('POST', '/api/waitlist', { body: { pin: '4826', traits, wants: 'anyone', ...body } });
  const asSolo = (token: string) => ({ headers: { 'x-solo-token': token } });
  const pick = (token: string, toId: string, picked = true) => call('POST', '/api/solo/pick', { ...asSolo(token), body: { toId, picked } });

  it('join with phone, PIN and answers kept private; others see only how many are waiting', async () => {
    expect((await join({ name: '', phone: '2025550199' })).status).toBe(400);
    expect((await join({ name: 'Jo', phone: '555' })).status).toBe(400);
    expect((await join({ name: 'Jo', phone: '2025550199', pin: '1234' })).status).toBe(400);
    expect((await join({ name: 'Jo', phone: '2025550199', traits: { ...traits, why: 'nap' } })).status).toBe(400);
    expect((await join({ name: 'Jo', phone: '2025550199', wants: 'robots' })).status).toBe(400);
    const jo = await join({ name: 'Jo', pronouns: 'they/them', phone: '(202) 555-0199', texts: true });
    expect(jo.status).toBe(201);
    expect(jo.body.token).toBeTruthy();
    expect((await join({ name: 'Joanne', phone: '2025550199' })).status).toBe(409); // that phone is already waiting
    await join({ name: 'Kai', phone: '2025550188', wants: 'women' });

    const visitor = (await call('GET', '/api/league')).body.league;
    expect(visitor.waitlist).toHaveLength(2);
    expect(visitor.waitlist.every((w: any) => w.name === '' && !w.traits && !w.pronouns)).toBe(true);
    expect(JSON.stringify(visitor)).not.toContain('555');

    const admin = (await call('GET', '/api/league', await asAdmin())).body.league;
    expect(admin.waitlist.map((w: any) => [w.name, w.traits?.why, w.wants, w.likes, w.fitsWith])).toEqual([
      ['Jo', 'win', undefined, undefined, []], ['Kai', 'win', undefined, undefined, []] // Kai wants women; Jo is they/them
    ]);
  });

  it('log back in with phone number and PIN', async () => {
    await join({ name: 'Jo', phone: '2025550199' });
    expect((await call('POST', '/api/solo/login', { body: { phone: '202-555-0199', pin: '0000' } })).status).toBe(401);
    expect((await call('POST', '/api/solo/login', { body: { phone: '2025550100', pin: '4826' } })).status).toBe(401);
    const ok = await call('POST', '/api/solo/login', { body: { phone: '(202) 555-0199', pin: '4826' } });
    expect(ok.status).toBe(200);
    const me = (await call('GET', '/api/league', asSolo(ok.body.token))).body.league;
    expect(me.mySoloId).toBe(ok.body.soloId);
    expect(me.waitlist[0].name).toBe('Jo');
  });

  it('swipe on nameless players who fit them; a match shows names; pairing needs both to say yes', async () => {
    const ana = (await join({ name: 'Ana', pronouns: 'she/her', phone: '2025550111', wants: 'women', texts: true })).body;
    const bea = (await join({ name: 'Bea', pronouns: 'she/they', phone: '2025550112', texts: true })).body;
    const cal = (await join({ name: 'Cal', pronouns: 'he/him', phone: '2025550113' })).body;
    const seen = async (who: any) => (await call('GET', '/api/league', asSolo(who.token))).body.league.waitlist;
    const swipe = (who: any, toId: string, like: boolean) => call('POST', '/api/solo/swipe', { ...asSolo(who.token), body: { toId, like } });
    const ask = (who: any, toId: string) => call('POST', '/api/solo/ask', { ...asSolo(who.token), body: { toId } });
    const answer = (who: any, fromId: string, accept: boolean) => call('POST', '/api/solo/answer', { ...asSolo(who.token), body: { fromId, accept } });

    expect((await seen(ana)).map((w: any) => [w.id, w.name, w.pronouns, w.wants])).toEqual([[ana.soloId, 'Ana', 'she/her', 'women'], [bea.soloId, '', undefined, undefined]]);
    expect((await seen(cal)).map((w: any) => w.id)).toEqual([bea.soloId, cal.soloId]); // not Ana: she asked for women

    expect((await swipe(ana, cal.soloId, true)).body).toEqual({}); // doesn't fit: nothing happens
    await swipe(ana, bea.soloId, true);
    await swipe(cal, bea.soloId, true);
    // Bea can't tell who swiped right on her.
    expect(JSON.stringify(await seen(bea))).not.toMatch(/likes":\["w/);
    expect((await ask(ana, bea.soloId)).body).toEqual({}); // not a match yet: refused quietly
    await swipe(bea, cal.soloId, false); // a pass: Cal never finds out
    expect((await seen(cal)).find((w: any) => w.id === bea.soloId)).toEqual(expect.objectContaining({ name: '' }));
    await swipe(bea, ana.soloId, true); // a match
    const match = (await seen(ana)).find((w: any) => w.id === bea.soloId);
    expect([match.name, match.pronouns, match.matched, match.askedMe]).toEqual(['Bea', 'she/they', true, false]);

    // Ana asks; Bea is told, and says not now; the request is gone. Ana asks again; Bea says yes.
    await ask(ana, bea.soloId);
    expect((await seen(bea)).find((w: any) => w.id === ana.soloId).askedMe).toBe(true);
    expect((await answer(bea, ana.soloId, false)).body).toEqual({});
    expect((await seen(bea)).find((w: any) => w.id === ana.soloId).askedMe).toBe(false);
    expect((await loadLeagueState())!.league.teams).toHaveLength(3);
    await ask(ana, bea.soloId);
    process.env.SMS_ORIGINATION = '+18555550100';
    sms.texts.length = 0;
    const made = await answer(bea, ana.soloId, true);
    delete process.env.SMS_ORIGINATION;
    expect(made.body.teamName).toBe('Ana & Bea');
    // Both had said yes to texts: each is told who their partner is.
    expect(sms.texts.map((t) => [t.to, t.body.includes('you and Bea') || t.body.includes('you and Ana')])).toEqual([['+12025550111', true], ['+12025550112', true]]);
    expect(sms.texts[0]!.body).toContain('you and Bea are a team');

    const l = (await loadLeagueState())!.league;
    const team = l.teams.find((t) => t.teamName === 'Ana & Bea')!;
    expect([team.status, team.needsSetup, team.texts]).toEqual(['approved', true, [true, true]]);
    expect(l.waitlist.map((w) => [w.name, w.likes])).toEqual([['Cal', []]]); // Cal's like of Bea is gone with her
    expect(fake.table.all(L).filter((i) => /^(WAITLIST|SOLOPHONE)#/.test(String(i.SK)))).toHaveLength(2); // Cal's only

    // Ana's phone switches over to the team by itself, then the two finish setting up.
    const handoff = (await call('GET', '/api/league', asSolo(ana.token))).body;
    expect(handoff.league.myTeamId).toBe(team.teamId);
    const asTeamNow = { headers: { 'x-team-token': handoff.teamToken } };
    expect((await call('POST', '/api/me/pin', { ...asTeamNow, body: { currentPin: '', newPin: '5830' } })).status).toBe(409);
    expect((await call('POST', '/api/me/setup', { ...asTeamNow, body: { teamName: 'Left & Right', pin: '5830' } })).status).toBe(409); // taken
    expect((await call('POST', '/api/me/setup', { ...asTeamNow, body: { teamName: 'Bumper Crop', pin: '1234' } })).status).toBe(400); // easy PIN
    const setUp = await call('POST', '/api/me/setup', { ...asTeamNow, body: { teamName: 'Bumper Crop', pin: '5830' } });
    expect(setUp.status).toBe(200);
    const after = (await loadLeagueState())!.league.teams.find((t) => t.teamId === team.teamId)!;
    expect([after.teamName, after.needsSetup]).toEqual(['Bumper Crop', undefined]);
    expect((await call('POST', '/api/login', { body: { teamName: 'Bumper Crop', pin: '5830' } })).status).toBe(200);
    expect((await call('POST', '/api/login', { body: { teamName: 'Ana & Bea', pin: '5830' } })).status).toBe(401); // the old name is free
    expect((await call('POST', '/api/me/setup', { ...asTeamNow, body: { pin: '6941' } })).status).toBe(409); // only once
  });

  it('when both ask each other, that counts as both saying yes', async () => {
    const ana = (await join({ name: 'Ana', phone: '2025550111' })).body;
    const bea = (await join({ name: 'Bea', phone: '2025550112' })).body;
    for (const [who, to] of [[ana, bea], [bea, ana]] as const) await call('POST', '/api/solo/swipe', { ...asSolo(who.token), body: { toId: to.soloId, like: true } });
    await call('POST', '/api/solo/ask', { ...asSolo(ana.token), body: { toId: bea.soloId } });
    const made = await call('POST', '/api/solo/ask', { ...asSolo(bea.token), body: { toId: ana.soloId } });
    expect(made.body.teamName).toBe('Ana & Bea');
  });

  it('an admin pairs them, with a temporary PIN; a taken name gets a number', async () => {
    const left = (await join({ name: 'Left', phone: '2025550101' })).body;
    await join({ name: 'Right', phone: '2025550102' });
    const admin = await asAdmin();
    const ids = (await call('GET', '/api/league', admin)).body.league.waitlist.map((w: any) => w.id);
    expect((await call('POST', '/api/admin/waitlist/pair', { body: { ids } })).status).toBe(401);
    expect((await call('POST', '/api/admin/waitlist/pair', { ...admin, body: { ids: [ids[0], ids[0]] } })).status).toBe(400);
    const paired = await call('POST', '/api/admin/waitlist/pair', { ...admin, body: { ids } });
    expect(paired.body.teamName).toBe('Left & Right 2'); // "Left & Right" is already a team
    expect((await call('POST', '/api/login', { body: { teamName: 'Left & Right 2', pin: paired.body.pin } })).status).toBe(200);
    const priv = fake.table.get(L, `TEAM#${paired.body.teamId}#PRIVATE`)!;
    expect([priv.phone1, priv.phone2]).toEqual(['2025550101', '2025550102']);
    expect((await call('GET', '/api/league', asSolo(left.token))).body.teamToken).toBeTruthy();
  });

  it('leave the waitlist, or an admin takes them off', async () => {
    const jo = (await join({ name: 'Jo', phone: '2025550199' })).body;
    const kai = (await join({ name: 'Kai', phone: '2025550188' })).body;
    expect((await call('POST', '/api/solo/leave', asSolo(jo.token))).status).toBe(200);
    expect((await call('GET', '/api/league', asSolo(jo.token))).body.soloGone).toBe(true);
    expect((await join({ name: 'Jo', phone: '2025550199' })).status).toBe(201); // the phone is free again
    expect((await call('POST', '/api/admin/waitlist/remove', { ...(await asAdmin()), body: { id: kai.soloId } })).status).toBe(200);
    expect((await loadLeagueState())!.league.waitlist.map((w) => w.name)).toEqual(['Jo']);
  });
});

describe('the turn clock on the server', () => {
  const at = (iso: string) => vi.setSystemTime(new Date(iso));
  async function bothInLine() {
    const admin = await asAdmin();
    await act('openNight', { by: 'admin' }, admin);
    await act('checkIn', 'aaaa1111', admin);
    await act('checkIn', 'bbbb2222', admin);
    await act('joinLine', { machineId: 'godzilla', notify: false }, asTeam('aaaa1111'));
    await act('joinLine', { machineId: 'godzilla', notify: false }, asTeam('bbbb2222'));
    return admin;
  }
  const godzilla = (body: Record<string, any>) => body.league.lines.find((l: any) => l.machineId === 'godzilla');

  it('forfeits a turn not started within 5 minutes, the next time anyone looks', async () => {
    await bothInLine();
    at('2026-11-05T23:24:30.000Z'); // 4.5 minutes in
    expect(godzilla((await call('GET', '/api/league')).body).teamIds[0]).toBe('aaaa1111');
    at('2026-11-05T23:25:01.000Z');
    const seen = await call('GET', '/api/league');
    expect(godzilla(seen.body).teamIds).toEqual(['bbbb2222']);
    expect(seen.body.league.forfeits).toMatchObject([{ teamId: 'aaaa1111', machineId: 'godzilla', by: 'clock' }]);
    // Looking again forfeits nothing more: the next team has its own 5 minutes.
    expect((await call('GET', '/api/league')).body.league.forfeits).toHaveLength(1);
  });

  it("won't let a team start a turn that already ran out", async () => {
    await bothInLine();
    at('2026-11-05T23:26:00.000Z');
    expect((await act('startTurn', 'godzilla', asTeam('aaaa1111'))).status).toBe(409);
    expect(godzilla((await call('GET', '/api/league')).body).teamIds).toEqual(['bbbb2222']);
  });

  it('stops while the league is paused, and gives a fresh 5 minutes on resume', async () => {
    const admin = await bothInLine();
    await act('setPaused', true, admin);
    at('2026-11-05T23:35:00.000Z'); // well past 5 minutes, but paused
    expect(godzilla((await call('GET', '/api/league')).body).teamIds[0]).toBe('aaaa1111');
    await act('setPaused', false, admin);
    at('2026-11-05T23:39:00.000Z');
    expect(godzilla((await call('GET', '/api/league')).body).teamIds[0]).toBe('aaaa1111');
    at('2026-11-05T23:40:01.000Z');
    expect(godzilla((await call('GET', '/api/league')).body).teamIds).toEqual(['bbbb2222']);
  });

  it('is checked by the 5-minute league clock too', async () => {
    await bothInLine();
    at('2026-11-05T23:26:00.000Z');
    await handler({ task: 'reminders' } as never);
    expect((await loadLeagueState())!.league.forfeits).toHaveLength(1);
  });
});

describe('the night opens and closes on its own', () => {
  const at = (iso: string) => vi.setSystemTime(new Date(iso));
  const week1 = async () => (await loadLeagueState())!.league.weeks[0]!;

  it('opens the next time anyone looks, from 30 minutes before; an admin can open it early that day', async () => {
    at('2026-11-05T22:00:00.000Z'); // 5 PM: too early on its own
    await call('GET', '/api/league');
    expect((await week1()).state).toBe('upcoming');
    expect((await act('openNight', { by: 'admin' }, await asAdmin())).status).toBe(200);
    expect((await week1()).state).toBe('open');
    expect((await loadLeagueState())!.league.log[0]!.action).toBe('Admin opened week 1');
  });

  it('closes on its own at closing time (plus added minutes), but not while paused', async () => {
    at('2026-11-05T23:35:00.000Z');
    await call('GET', '/api/league'); // opens on its own
    expect((await week1()).state).toBe('open');
    const admin = await asAdmin();
    expect((await act('addMinutes', 15, admin)).status).toBe(200);
    expect((await act('addMinutes', 500, admin)).status).toBe(409);
    at('2026-11-06T02:05:00.000Z'); // 9:05 PM: past 9, but 15 minutes were added
    await call('GET', '/api/league');
    expect((await week1()).state).toBe('open');
    await act('setPaused', true, admin);
    at('2026-11-06T02:20:00.000Z');
    await call('GET', '/api/league');
    expect((await week1()).state).toBe('open'); // paused: nothing happens on its own
    await act('setPaused', false, admin);
    // A late score is refused: the night closes first.
    const late = await call('POST', '/api/scores', { ...asTeam('aaaa1111'), body: { machineId: 'godzilla', score: 1000 } });
    expect(late.status).toBe(409);
    expect((await week1()).state).toBe('final');
    expect((await loadLeagueState())!.league.log.some((l) => l.action.startsWith('Week 1 closed'))).toBe(true);
  });

  it('is checked by the 5-minute league clock too', async () => {
    at('2026-11-05T23:31:00.000Z');
    await handler({ task: 'reminders' } as never);
    expect((await week1()).state).toBe('open');
    at('2026-11-06T02:01:00.000Z');
    await handler({ task: 'reminders' } as never);
    expect((await week1()).state).toBe('final');
  });

  it('refuses admin input that makes no sense', async () => {
    const admin = await asAdmin();
    expect((await act('postMessage', '   ', admin)).status).toBe(409);
    expect((await act('postMessage', 'x'.repeat(281), admin)).status).toBe(409);
    expect((await act('setNightTimes', { opensAt: '21:00', closesAt: '19:00' }, admin)).status).toBe(409);
    expect((await act('setNightTimes', { opensAt: '25:00' }, admin)).status).toBe(409);
    expect((await act('setNightTimes', { opensAt: '18:30' }, admin)).status).toBe(200);
    expect((await act('addMachine', { name: 'Godzilla', locationId: 'main' }, admin)).status).toBe(409); // already there
    expect((await act('addMachine', { name: 'Jaws', locationId: 'nowhere' }, admin)).status).toBe(409);
    expect((await act('addLocation', 'x'.repeat(41), admin)).status).toBe(409);
    const log = (await loadLeagueState())!.league.log.map((l) => l.action);
    expect(log.some((l) => l.startsWith('Admin set league nights to run 6:30'))).toBe(true);
  });
});
