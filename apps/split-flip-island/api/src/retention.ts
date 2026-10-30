// Keeping personal details only as long as the season needs them (decided Oct 30, Matt: "delete
// the numbers 30 days after the finals... keep team names, scores, league log as a season record").
//
// Thirty days after the finals night, the scheduled task (every 15 minutes, with the sign-up
// purge) removes, once:
//   - phone numbers and text settings from every team's private item (the PIN stays, so teams
//     can still log in and look back at their season);
//   - the solo waitlist's private items (phone, PIN, codes), its phone lookups and hand-offs;
//   - every saved phone for push notifications;
//   - the rate-limit counters (they hold scrambled addresses and phone numbers; TTL would get
//     them anyway).
// Team names, scores, photos and the league log stay as the record of the season.

import { BatchWriteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { League } from './leagueStore.js';
import { loadLeagueState } from './leagueStore.js';
import { ddb, keys, leagueId, queryAll, table } from './db.js';

export const KEEP_DAYS_AFTER_FINALS = 30;

/** When the details go: noon (UTC) on the finals night's date, plus 30 days. Null with no finals night. */
export function forgetAt(league: Pick<League, 'weeks'>): number | null {
  const finals = league.weeks.find((w) => w.week === 9) ?? league.weeks.at(-1);
  if (!finals) return null;
  const t = Date.parse(`${finals.date}T12:00:00.000Z`);
  return Number.isNaN(t) ? null : t + KEEP_DAYS_AFTER_FINALS * 86_400_000;
}

const doneKey = () => ({ PK: keys.league(leagueId()), SK: 'RETENTION#DONE' });

const TEXT_FIELDS = 'phone1, phone2, smsOptIn1, smsOptIn2, smsVerified1, smsVerified2, smsCode1, smsCode2, smsChangedAt1, smsChangedAt2';

async function deleteAll(items: { PK: string; SK: string }[]) {
  for (let i = 0; i < items.length; i += 25) {
    let requests: Record<string, unknown> | undefined = { [table()]: items.slice(i, i + 25).map((k) => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } })) };
    for (let tries = 0; requests && Object.keys(requests).length > 0; tries++) {
      if (tries > 8) throw new Error('Could not finish forgetting personal details; it tries again next run.');
      if (tries > 0) await new Promise((r) => setTimeout(r, Math.min(1000, 50 * 2 ** tries)));
      const out: { UnprocessedItems?: Record<string, unknown> } = await ddb.send(new BatchWriteCommand({ RequestItems: requests as never }));
      requests = out.UnprocessedItems;
    }
  }
}

/** Runs the clean-up if it's due and hasn't run. Returns what it did, or why it didn't. */
export async function forgetAfterSeason(now = Date.now()): Promise<{ skipped: string } | { teams: number; deleted: number }> {
  const state = await loadLeagueState();
  if (!state) return { skipped: 'no league' };
  const at = forgetAt(state.league);
  if (at === null || now < at) return { skipped: 'not yet' };
  if ((await ddb.send(new GetCommand({ TableName: table(), Key: doneKey() }))).Item) return { skipped: 'already done' };

  const league = keys.league(leagueId());
  const mine = await queryAll<{ PK: string; SK: string }>({ KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': league } });
  const teamPrivates = mine.filter((i) => /^TEAM#.+#PRIVATE$/.test(i.SK));
  for (const item of teamPrivates) {
    await ddb.send(new UpdateCommand({ TableName: table(), Key: { PK: item.PK, SK: item.SK }, UpdateExpression: `REMOVE ${TEXT_FIELDS}` }));
  }
  const soloItems = mine.filter((i) => /^(WAITLIST#.+#PRIVATE|SOLOPHONE#|SOLOTEAM#)/.test(i.SK));
  const all = (pk: string) => queryAll<{ PK: string; SK: string }>({ KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': pk } });
  const doomed = [...soloItems, ...(await all(`PUSH#${leagueId()}`)), ...(await all(`RATE#${leagueId()}`))];
  await deleteAll(doomed);
  await ddb.send(new PutCommand({ TableName: table(), Item: { ...doneKey(), type: 'retention', doneAt: new Date(now).toISOString(), teams: teamPrivates.length, deleted: doomed.length } }));
  return { teams: teamPrivates.length, deleted: doomed.length };
}
