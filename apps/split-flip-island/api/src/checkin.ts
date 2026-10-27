// Check-in on the league server: a team taps "I'm here" and the admin confirms or declines.
// Also the night's start time, which check-in and the reminder text both hang off.
//
// "Tonight" is the league night whose date is today in league time (Eastern).
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { AdminCheckInsResponse, CheckInResponse, CheckInState, NightStartRequest } from '../../shared/types.js';
import { requireAdmin } from './admin.js';
import { requireTeam } from './auth.js';
import { ddb, keys, leagueId, table } from './db.js';
import { loadLeague, type CheckInItem, type NightItem } from './handlers.js';
import { isClockTime, LEAGUE_TZ, localDate, zonedIso } from './leagueTime.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

/** Teams can check in from this many minutes before the night starts. */
export const CHECK_IN_EARLY_MINUTES = 30;

export const tonightOf = (nights: NightItem[], now: Date) => nights.find((n) => n.date === localDate(now)) ?? null;

const nightInfo = (n: NightItem | null) => (n ? { date: n.date, week: n.week, ...(n.startsAt ? { startsAt: n.startsAt } : {}) } : null);

const clock = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: LEAGUE_TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

const stateOf = (checkIns: CheckInItem[], date: string, teamId: string): CheckInItem | undefined =>
  checkIns.find((c) => c.date === date && c.teamId === teamId);

// ---------- GET / POST /api/me/check-in ----------

export async function myCheckIn(event: APIGatewayProxyEventV2): Promise<CheckInResponse> {
  const { teamId } = requireTeam(event);
  const { nights, checkIns } = await loadLeague();
  const night = tonightOf(nights, new Date());
  const mine = night ? stateOf(checkIns, night.date, teamId) : undefined;
  return { night: nightInfo(night), state: mine?.state ?? 'none', ...(mine ? { at: mine.at } : {}) };
}

export async function checkIn(event: APIGatewayProxyEventV2): Promise<CheckInResponse> {
  const { teamId } = requireTeam(event);
  const { teams, nights, checkIns } = await loadLeague();
  if (!teams.some((t) => t.teamId === teamId)) throw new HttpError(403, 'Your team is waiting for the league admin to approve it.');
  const now = new Date();
  const night = tonightOf(nights, now);
  if (!night) throw new HttpError(409, "There's no league night today.");
  if (night.startsAt) {
    const opensAt = Date.parse(night.startsAt) - CHECK_IN_EARLY_MINUTES * 60_000;
    if (now.getTime() < opensAt) throw new HttpError(409, `Check-in opens at ${clock(new Date(opensAt).toISOString())}.`);
    if (!night.open && now.getTime() > Date.parse(night.startsAt)) throw new HttpError(409, "Tonight's league night is over.");
  }
  const mine = stateOf(checkIns, night.date, teamId);
  if (mine?.state === 'confirmed' || mine?.state === 'requested') return { night: nightInfo(night), state: mine.state, at: mine.at };

  const at = nowIso();
  const item: CheckInItem = { type: 'checkin', date: night.date, teamId, state: 'requested', at };
  await ddb.send(new PutCommand({ TableName: table(), Item: { PK: keys.league(leagueId()), SK: keys.checkIn(night.date, teamId), ...item } }));
  return { night: nightInfo(night), state: 'requested', at };
}

// ---------- Admin: GET /api/admin/check-ins, POST /api/admin/check-ins/{teamId}/confirm|decline ----------

export async function adminCheckIns(event: APIGatewayProxyEventV2): Promise<AdminCheckInsResponse> {
  await requireAdmin(event);
  const { teams, nights, checkIns } = await loadLeague();
  const night = tonightOf(nights, new Date());
  return {
    night: nightInfo(night),
    teams: teams
      .map((t) => {
        const c = night ? stateOf(checkIns, night.date, t.teamId) : undefined;
        return { teamId: t.teamId, teamName: t.teamName, state: (c?.state ?? 'none') as CheckInState, ...(c ? { at: c.at } : {}) };
      })
      .sort((a, b) => a.teamName.localeCompare(b.teamName))
  };
}

export async function answerCheckIn(event: APIGatewayProxyEventV2, teamId: string, answer: 'confirm' | 'decline'): Promise<CheckInResponse> {
  const admin = await requireAdmin(event);
  const { teams, nights } = await loadLeague();
  if (!teams.some((t) => t.teamId === teamId)) throw new HttpError(404, 'That team is not in the league.');
  const night = tonightOf(nights, new Date());
  if (!night) throw new HttpError(409, "There's no league night today.");
  const at = nowIso();
  const state = answer === 'confirm' ? 'confirmed' : 'declined';
  const item: CheckInItem = { type: 'checkin', date: night.date, teamId, state, at, by: admin.name };
  await ddb.send(new PutCommand({ TableName: table(), Item: { PK: keys.league(leagueId()), SK: keys.checkIn(night.date, teamId), ...item } }));
  return { night: nightInfo(night), state, at };
}

// ---------- Admin: POST /api/admin/nights/{date}/start ----------

export async function setNightStart(event: APIGatewayProxyEventV2, date: string): Promise<{ date: string; startsAt: string }> {
  await requireAdmin(event);
  const startTime = text(parseBody<NightStartRequest>(event).startTime);
  if (!isClockTime(startTime)) throw new HttpError(400, 'Give the start time as HH:MM, 24-hour, league time (for example 19:00).');
  const startsAt = zonedIso(date, startTime);
  await ddb.send(new UpdateCommand({
    TableName: table(),
    Key: { PK: keys.league(leagueId()), SK: keys.night(date) },
    UpdateExpression: 'SET startsAt = :s',
    ConditionExpression: 'attribute_exists(PK)',
    ExpressionAttributeValues: { ':s': startsAt }
  })).catch((e: Error) => {
    if (e.name === 'ConditionalCheckFailedException') throw new HttpError(404, 'There is no league night on that date.');
    throw e;
  });
  return { date, startsAt };
}
