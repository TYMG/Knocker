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
const { createLeagueState, applyAction, loadLeagueState } = await import('./leagueStore.js');
const { newLeague } = await import('../../shared/league/new.js');
const { localDate, zonedIso } = await import('./leagueTime.js');

const L = 'LEAGUE#sfi-s1';
// Thursday Nov 5, 2026, 7 PM Eastern (standard time) = midnight UTC.
const at = (iso: string) => vi.setSystemTime(new Date(iso));

const runClock = () => handler({ task: 'reminders' } as never) as Promise<Record<string, unknown>>;
const logActions = async () => (await loadLeagueState())!.league.log.map((a) => a.action);

/** A team in the league record, and its private item with two phones and its text choices. */
function team(teamId: string, teamName: string, texts: [boolean, boolean], status: 'approved' | 'pending' = 'approved') {
  const n = String(fake.table.items.size).padStart(2, '0');
  // Phones that said yes are confirmed with a code here; one test unconfirms one.
  fake.table.put({ PK: L, SK: `TEAM#${teamId}#PRIVATE`, type: 'private', pinHash: 'x', phone1: `20255501${n}`, phone2: `20255502${n}`, smsOptIn1: texts[0], smsOptIn2: texts[1], smsVerified1: texts[0], smsVerified2: texts[1] });
  return { teamId, teamName, players: ['A', 'B'] as [string, string], phone1: '', phone2: '', texts, photo: '', status, createdAt: '2026-11-01T00:00:00.000Z', firstWeek: 1 };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-11-05T12:00:00.000Z');
  fake.table.items.clear();
  fake.texts.length = 0;
  fake.failFor.clear();
  process.env.SMS_ORIGINATION = 'arn:aws:sms-voice:us-east-1:1:phone-number/phone-test';
  const league = newLeague({ firstNight: '2026-11-05', opensAt: '19:00', closesAt: '21:00', machines: [{ machineId: 'godzilla', name: 'Godzilla' }] }, '2026-11-01T12:00:00.000Z');
  league.teams = [
    team('left-and-right', 'Left & Right', [true, true]), // not checked in: both phones
    team('tilt-me-tender', 'Tilt Me Tender', [true, false]), // checked in: nothing
    team('ball-hogs', 'Ball Hogs', [false, false]), // not opted in: nothing
    team('waiting-room', 'Waiting Room', [true, true], 'pending'), // not approved: nothing
    team('shoot-again', 'Shoot Again', [false, true]) // not checked in: Player 2's phone only
  ];
  await createLeagueState(league, 'test');
});
afterEach(() => vi.useRealTimers());

describe('league time', () => {
  it('turns an Eastern start time into the right moment, in winter and summer', () => {
    expect(zonedIso('2026-11-05', '19:00')).toBe('2026-11-06T00:00:00.000Z');
    expect(zonedIso('2026-10-14', '19:00')).toBe('2026-10-14T23:00:00.000Z');
    expect(zonedIso('2027-03-18', '19:00')).toBe('2027-03-18T23:00:00.000Z'); // after the March switch
    // 9 PM Eastern on Nov 5 is already Nov 6 in UTC, but still Nov 5 for the league.
    expect(localDate(new Date('2026-11-06T02:00:00.000Z'))).toBe('2026-11-05');
  });
});

describe('the league clock', () => {
  it('opens tonight\'s night by itself, from 30 minutes before it starts', async () => {
    at('2026-11-05T23:20:00.000Z'); // 6:20 PM
    await runClock();
    expect((await loadLeagueState())!.league.weeks[0]!.state).toBe('upcoming');
    at('2026-11-05T23:31:00.000Z');
    await runClock();
    expect((await loadLeagueState())!.league.weeks[0]!.state).toBe('open');
    expect(await logActions()).toContain('Week 1 opened');
  });
});

describe('the check-in reminder text', () => {
  it('waits until about 5 minutes before the start', async () => {
    at('2026-11-05T23:45:00.000Z'); // 15 minutes before
    expect((await runClock()).skipped).toBe('not time yet');
    at('2026-11-06T00:01:00.000Z'); // already started
    expect((await runClock()).skipped).toBe('not time yet');
    expect(fake.texts).toEqual([]);
  });

  it('texts only opted-in phones on approved teams that have not checked in, once', async () => {
    at('2026-11-05T23:35:00.000Z');
    await applyAction({ kind: 'league' }, { type: 'openNight' });
    await applyAction({ kind: 'team', teamId: 'tilt-me-tender' }, { type: 'requestCheckIn' }); // waiting for the admin counts

    at('2026-11-05T23:55:30.000Z'); // 4.5 minutes before
    expect(await runClock()).toEqual({ sent: 3, failed: 0, teams: 2 });
    expect(fake.texts.map((t) => t.body.match(/(Left & Right|Shoot Again)/)![1]).sort()).toEqual(['Left & Right', 'Left & Right', 'Shoot Again']);
    expect(fake.texts[0]!.body).toContain('starts in 5 min');
    expect(fake.texts.every((t) => /^\+1202555\d{4}$/.test(t.to))).toBe(true);
    expect(await logActions()).toContain('Check-in reminders texted to 3 phones on 2 teams');

    // The next run (or a retry) sends nothing more.
    at('2026-11-05T23:57:00.000Z');
    expect((await runClock()).skipped).toBe('already sent tonight');
    expect(fake.texts).toHaveLength(3);
  });

  it('never texts a phone that was not confirmed with a code', async () => {
    delete fake.table.get(L, 'TEAM#left-and-right#PRIVATE')!.smsVerified1;
    at('2026-11-05T23:56:00.000Z');
    expect((await runClock()).sent).toBe(3); // Left & Right's second phone, Tilt Me Tender, Shoot Again
  });

  it('keeps going when one phone cannot be texted, and never logs the number', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.failFor.add(`+1${fake.table.get(L, 'TEAM#left-and-right#PRIVATE')!.phone1}`);
    at('2026-11-05T23:56:00.000Z');
    const result = await runClock();
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(3); // Left & Right's other phone, Tilt Me Tender (not checked in here), Shoot Again
    expect((await logActions()).some((a) => a.includes("(1 didn't go through)"))).toBe(true);
    expect(JSON.stringify(errors.mock.calls)).not.toContain('2025550');
    errors.mockRestore();
  });

  it('does nothing while texting is turned off, or on a day with no league night', async () => {
    delete process.env.SMS_ORIGINATION;
    at('2026-11-05T23:56:00.000Z');
    expect((await runClock()).skipped).toBe('texting is off');
    process.env.SMS_ORIGINATION = 'arn:aws:sms-voice:us-east-1:1:phone-number/phone-test';
    at('2026-11-06T23:56:00.000Z');
    expect((await runClock()).skipped).toBe('no league night today');
    expect(fake.texts).toEqual([]);
  });
});
