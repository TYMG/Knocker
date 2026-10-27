// The check-in reminder text. A schedule runs this every 5 minutes (see infra/sms.tf). It only
// acts in the few minutes before tonight's league night starts:
//   1. Claims the night, so the reminders go out once even if a run repeats.
//   2. Texts each opted-in phone on approved teams that haven't tapped "I'm here".
//   3. Adds a line with the counts (no names or numbers) to the league log.
// Off-nights and the off-season do nothing: there's no league night today, so it stops.
import { PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SMS_TEMPLATES } from '../../shared/sms.js';
import { tonightOf } from './checkin.js';
import { ddb, keys, leagueId, table } from './db.js';
import { auditPut, loadLeague } from './handlers.js';
import { e164, sendText, textingOn } from './textsender.js';
import { nowIso } from './util.js';

/** Send when the start is this many minutes away or less (the schedule runs every 5). */
export const REMIND_WINDOW_MINUTES = 6;

export interface ReminderResult { sent: number; failed: number; teams: number; skipped?: string }

export async function sendCheckInReminders(now = new Date()): Promise<ReminderResult> {
  const none = (skipped: string): ReminderResult => ({ sent: 0, failed: 0, teams: 0, skipped });
  if (!textingOn()) return none('texting is off');

  const { teams, privates, nights, checkIns } = await loadLeague();
  const night = tonightOf(nights, now);
  if (!night?.startsAt) return none('no league night with a start time today');
  const minutes = (Date.parse(night.startsAt) - now.getTime()) / 60_000;
  if (minutes <= 0 || minutes > REMIND_WINDOW_MINUTES) return none('not time yet');

  // Claim tonight first. If another run already did, it has sent (or is sending) them.
  try {
    await ddb.send(new PutCommand({
      TableName: table(),
      Item: { PK: keys.league(leagueId()), SK: keys.remindersSent(night.date), type: 'reminders', date: night.date, at: nowIso() },
      ConditionExpression: 'attribute_not_exists(PK)'
    }));
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return none('already sent tonight');
    throw e;
  }

  const here = new Set(checkIns.filter((c) => c.date === night.date && (c.state === 'requested' || c.state === 'confirmed')).map((c) => c.teamId));
  const mins = Math.max(1, Math.round(minutes));
  let sent = 0;
  let failed = 0;
  let teamCount = 0;
  for (const team of teams) {
    if (here.has(team.teamId)) continue;
    const priv = privates.get(team.teamId);
    if (!priv) continue;
    const phones = [priv.smsOptIn1 ? priv.phone1 : '', priv.smsOptIn2 ? priv.phone2 : ''].filter(Boolean);
    if (phones.length === 0) continue;
    teamCount += 1;
    const body = SMS_TEMPLATES.checkInReminder.body({ teamName: team.teamName, machineName: '', minutes: mins, week: night.week, noShows: 0 });
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
    await ddb.send(new TransactWriteCommand({ TransactItems: [auditPut(note, 'league')] }));
  }
  return { sent, failed, teams: teamCount };
}
