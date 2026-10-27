// Check-in on the server, night start times, and the check-in reminder text, run through the real
// request handler against an in-memory database. Texts go to a stand-in, never to a phone.
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => {
  process.env.TOKEN_SECRET = 'test-token-secret-test-token-secret';
  process.env.ORIGIN_SECRET = 'test-origin-secret';
  process.env.PHOTOS_BUCKET = 'photos';
  process.env.TABLE_NAME = 'test';
  process.env.LEAGUE_ID = 'sfi-s1';
  const { FakeBucket, FakeTable } = await import('./testing/fake-aws.js');
  return { table: new FakeTable(), bucket: new FakeBucket(), texts: [] as { to: string; body: string }[], failFor: new Set<string>() };
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

vi.mock('./textsender.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./textsender.js')>();
  return {
    ...real,
    sendText: async (to: string, body: string) => {
      if (fake.failFor.has(to)) throw Object.assign(new Error('opted out'), { name: 'ValidationException' });
      fake.texts.push({ to, body });
    }
  };
});

const { handler } = await import('./index.js');
const { hashPassword, issueToken } = await import('./auth.js');
const { localDate, zonedIso } = await import('./leagueTime.js');

const L = 'LEAGUE#sfi-s1';
// Thursday Nov 5, 2026, 7:00 PM Eastern (standard time) = midnight UTC.
const NIGHT = '2026-11-05';
const STARTS = '2026-11-06T00:00:00.000Z';
const at = (iso: string) => vi.setSystemTime(new Date(iso));

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

function team(teamId: string, teamName: string, texts: [boolean, boolean], status: 'approved' | 'pending' = 'approved') {
  const n = fake.table.items.size;
  fake.table.put({ PK: L, SK: `TEAM#${teamId}`, type: 'team', teamId, teamName, photoKey: 'x.jpg', createdAt: '2026-10-01T00:00:00.000Z', status });
  fake.table.put({
    PK: L, SK: `TEAM#${teamId}#PRIVATE`, type: 'private', pinHash: 'x', phone1: `20255501${String(n).padStart(2, '0')}`, phone2: `20255502${String(n).padStart(2, '0')}`,
    smsOptIn1: texts[0], smsOptIn2: texts[1]
  });
}

function night(startsAt: string | undefined = STARTS) {
  fake.table.put({ PK: L, SK: `NIGHT#${NIGHT}`, type: 'night', date: NIGHT, week: 4, machineIds: [], open: true, ...(startsAt ? { startsAt } : {}) });
}

const runReminders = () => handler({ task: 'reminders' } as never) as Promise<Record<string, unknown>>;
const auditActions = () => fake.table.all('AUDIT#sfi-s1').map((a) => a.action as string);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  fake.table.items.clear();
  fake.texts.length = 0;
  fake.failFor.clear();
  process.env.SMS_ORIGINATION = 'arn:aws:sms-voice:us-east-1:1:phone-number/phone-test';
  fake.table.put({ PK: 'ADMIN#sfi-s1', SK: 'ADMIN#matt', type: 'admin', name: 'Matt', passHash: hashPassword('correct horse battery'), tokenVersion: 1, createdAt: '2026-10-06T00:00:00.000Z' });
});
afterEach(() => vi.useRealTimers());

describe('league time', () => {
  it('turns an Eastern start time into the right moment, in winter and summer', () => {
    expect(zonedIso('2026-11-05', '19:00')).toBe('2026-11-06T00:00:00.000Z');
    expect(zonedIso('2026-10-14', '19:00')).toBe('2026-10-14T23:00:00.000Z');
    // 9 PM Eastern on Nov 5 is already Nov 6 in UTC, but still Nov 5 for the league.
    expect(localDate(new Date('2026-11-06T02:00:00.000Z'))).toBe('2026-11-05');
  });
});

describe('night start time', () => {
  it('lets an admin set it in league time', async () => {
    night(undefined);
    const admin = await asAdmin();
    const res = await call('POST', `/api/admin/nights/${NIGHT}/start`, { ...admin, body: { startTime: '19:30' } });
    expect(res.body).toEqual({ date: NIGHT, startsAt: '2026-11-06T00:30:00.000Z' });
    expect((await call('POST', `/api/admin/nights/${NIGHT}/start`, { ...admin, body: { startTime: '7pm' } })).status).toBe(400);
    expect((await call('POST', '/api/admin/nights/2026-12-31/start', { ...admin, body: { startTime: '19:00' } })).status).toBe(404);
    expect((await call('POST', `/api/admin/nights/${NIGHT}/start`, { body: { startTime: '19:00' } })).status).toBe(401);
  });
});

describe('check-in', () => {
  it('opens 30 minutes early, and the admin confirms or declines', async () => {
    night();
    team('aaaa1111', 'Left & Right', [false, false]);
    team('bbbb2222', 'Waiting Room', [false, false], 'pending');

    at('2026-11-05T23:20:00.000Z'); // 6:20 PM
    const early = await call('POST', '/api/me/check-in', asTeam('aaaa1111'));
    expect(early.status).toBe(409);
    expect(early.body.error).toBe('Check-in opens at 6:30 PM.');

    at('2026-11-05T23:35:00.000Z');
    expect((await call('POST', '/api/me/check-in', asTeam('aaaa1111'))).body.state).toBe('requested');
    expect((await call('GET', '/api/me/check-in', asTeam('aaaa1111'))).body.state).toBe('requested');
    expect((await call('POST', '/api/me/check-in', asTeam('bbbb2222'))).status).toBe(403);

    const admin = await asAdmin();
    const list = await call('GET', '/api/admin/check-ins', admin);
    expect(list.body.teams).toEqual([{ teamId: 'aaaa1111', teamName: 'Left & Right', state: 'requested', at: '2026-11-05T23:35:00.000Z' }]);
    expect((await call('POST', '/api/admin/check-ins/aaaa1111/decline', admin)).body.state).toBe('declined');
    // Declined: the team can ask again.
    expect((await call('POST', '/api/me/check-in', asTeam('aaaa1111'))).body.state).toBe('requested');
    expect((await call('POST', '/api/admin/check-ins/aaaa1111/confirm', admin)).body.state).toBe('confirmed');
    expect((await call('POST', '/api/me/check-in', asTeam('aaaa1111'))).body.state).toBe('confirmed');
    expect((await call('GET', '/api/admin/check-ins')).status).toBe(401);
  });

  it('says so when there is no league night today', async () => {
    team('aaaa1111', 'Left & Right', [false, false]);
    at('2026-11-05T23:35:00.000Z');
    expect((await call('POST', '/api/me/check-in', asTeam('aaaa1111'))).status).toBe(409);
  });
});

describe('the check-in reminder text', () => {
  beforeEach(() => {
    night();
    team('aaaa1111', 'Left & Right', [true, true]); // not checked in: both phones
    team('bbbb2222', 'Tilt Me Tender', [true, false]); // checked in: nothing
    team('cccc3333', 'Ball Hogs', [false, false]); // not opted in: nothing
    team('dddd4444', 'Waiting Room', [true, true], 'pending'); // not approved: nothing
    team('eeee5555', 'Shoot Again', [false, true]); // not checked in: Player 2's phone only
  });

  it('waits until about 5 minutes before the start', async () => {
    at('2026-11-05T23:45:00.000Z'); // 15 minutes before
    expect((await runReminders()).skipped).toBe('not time yet');
    at('2026-11-06T00:01:00.000Z'); // already started
    expect((await runReminders()).skipped).toBe('not time yet');
    expect(fake.texts).toEqual([]);
  });

  it('texts only opted-in phones on approved teams that have not checked in, once', async () => {
    at('2026-11-05T23:35:00.000Z');
    await call('POST', '/api/me/check-in', asTeam('bbbb2222'));

    at('2026-11-05T23:55:30.000Z'); // 4.5 minutes before
    expect(await runReminders()).toEqual({ sent: 3, failed: 0, teams: 2 });
    expect(fake.texts.map((t) => t.body.match(/(Left & Right|Shoot Again)/)![1]).sort()).toEqual(['Left & Right', 'Left & Right', 'Shoot Again']);
    expect(fake.texts[0].body).toContain('starts in 5 min');
    expect(fake.texts.every((t) => /^\+1202555\d{4}$/.test(t.to))).toBe(true);
    expect(auditActions()).toEqual(['Check-in reminders texted to 3 phones on 2 teams']);

    // The next run (or a retry) sends nothing more.
    at('2026-11-05T23:57:00.000Z');
    expect((await runReminders()).skipped).toBe('already sent tonight');
    expect(fake.texts).toHaveLength(3);
  });

  it('keeps going when one phone cannot be texted, and never logs the number', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.failFor.add(`+1${fake.table.get(L, 'TEAM#aaaa1111#PRIVATE')!.phone1}`); // Left & Right, Player 1
    at('2026-11-05T23:56:00.000Z');
    const result = await runReminders();
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(3);
    expect(auditActions()[0]).toContain("(1 didn't go through)");
    expect(JSON.stringify(errors.mock.calls)).not.toContain('2025550');
    errors.mockRestore();
  });

  it('does nothing while texting is turned off', async () => {
    delete process.env.SMS_ORIGINATION;
    at('2026-11-05T23:56:00.000Z');
    expect((await runReminders()).skipped).toBe('texting is off');
    expect(fake.texts).toEqual([]);
  });
});
