// The league clock. A schedule runs this every 5 minutes (see infra/sms.tf), and it does two things:
//   1. Opens tonight's league night at its opening time (the same rule an admin can use).
//   2. About 5 minutes before the night starts, texts the check-in reminder:
//      - claims the night first, so the reminders go out once even if a run repeats
//      - texts each opted-in phone on teams in the running that haven't tapped "I'm here"
//      - adds a line with the counts (no names or numbers) to the league log
// Off-nights and the off-season do nothing: there's no league night today, so it stops.
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { SMS_TEMPLATES } from '../../shared/sms.js';
import { inTheRunning } from '../../shared/league/league.js';
import { at, easternDate } from '../../shared/league/time.js';
import type { SWeek } from '../../shared/league/types.js';
import { ddb, keys, leagueId, table } from './db.js';
import { loadPrivates } from './handlers.js';
import { applyAction, loadLeagueState, RuleRefused, type League } from './leagueStore.js';
import { e164, sendText, textingOn } from './textsender.js';
import { nowIso } from './util.js';

/** Send when the start is this many minutes away or less (the schedule runs every 5). */
export const REMIND_WINDOW_MINUTES = 6;

export interface ReminderResult { sent: number; failed: number; teams: number; skipped?: string }

/** Tonight's league night: the week dated today (Eastern) that hasn't been played yet. */
export function tonight(league: League, now: Date): SWeek | undefined {
  const today = easternDate(now.toISOString());
  return league.weeks.find((w) => w.date === today && w.state !== 'final');
}

/** Opens tonight's night when it's time. Quietly does nothing when it isn't. */
export async function openNightIfTime(): Promise<boolean> {
  try {
    await applyAction({ kind: 'league' }, { type: 'openNight' });
    return true;
  } catch (err) {
    if (err instanceof RuleRefused) return false;
    throw err;
  }
}

export async function sendCheckInReminders(now = new Date()): Promise<ReminderResult> {
  const none = (skipped: string): ReminderResult => ({ sent: 0, failed: 0, teams: 0, skipped });
  if (!textingOn()) return none('texting is off');

  const state = await loadLeagueState();
  if (!state) return none('no league yet');
  const league = state.league;
  if (league.paused) return none('the league is paused');
  const week = tonight(league, now);
  if (!week) return none('no league night today');
  const minutes = (Date.parse(at(week.date, league.night.opensAt)) - now.getTime()) / 60_000;
  if (minutes <= 0 || minutes > REMIND_WINDOW_MINUTES) return none('not time yet');

  // Claim tonight first. If another run already did, it has sent (or is sending) them.
  try {
    await ddb.send(new PutCommand({
      TableName: table(),
      Item: { PK: keys.league(leagueId()), SK: keys.remindersSent(week.date), type: 'reminders', date: week.date, at: nowIso() },
      ConditionExpression: 'attribute_not_exists(PK)'
    }));
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return none('already sent tonight');
    throw e;
  }

  const here = new Set([...Object.keys(league.checkIns ?? {}), ...Object.keys(league.checkInRequests ?? {})]);
  const privates = await loadPrivates();
  const mins = Math.max(1, Math.round(minutes));
  let sent = 0;
  let failed = 0;
  let teamCount = 0;
  for (const team of league.teams.filter(inTheRunning)) {
    if (here.has(team.teamId)) continue;
    const priv = privates.get(team.teamId);
    if (!priv) continue;
    // Only phones that said yes and were confirmed with a code.
    const phones = [priv.smsOptIn1 && priv.smsVerified1 ? priv.phone1 : '', priv.smsOptIn2 && priv.smsVerified2 ? priv.phone2 : ''].filter(Boolean);
    if (phones.length === 0) continue;
    teamCount += 1;
    const body = SMS_TEMPLATES.checkInReminder.body({ partnerName: '', teamName: team.teamName, machineName: '', minutes: mins, week: week.week, noShows: 0 });
    for (const phone of phones) {
      try {
        await sendText(e164(phone), body);
        sent += 1;
      } catch (e) {
        // One bad number (or a STOP) must not stop the rest. Never log the number itself.
        failed += 1;
        console.error('Reminder text failed', (e as Error).name);
      }
    }
  }

  if (sent + failed > 0) {
    const note = `Check-in reminders texted to ${sent} phone${sent === 1 ? '' : 's'} on ${teamCount} team${teamCount === 1 ? '' : 's'}${failed ? ` (${failed} didn't go through)` : ''}`;
    await applyAction({ kind: 'league' }, { type: 'leagueNote', payload: note });
  }
  return { sent, failed, teams: teamCount };
}
