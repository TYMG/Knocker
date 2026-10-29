// Setting up the season and starting over, from the admin League setup page (and league.sh).
//   POST /api/admin/league/setup       any admin, only when there is no league: creates the season
//   POST /api/admin/league/start-over  the owner only, with the words START OVER: deletes it all
// Pausing is an ordinary admin rule (setPaused) through POST /api/league/action.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateBackupCommand } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { newLeague } from '../../shared/league/new.js';
import { requireAdmin } from './admin.js';
import { ddb, keys, leagueId, queryAll, table } from './db.js';
import { createLeagueState, loadLeagueState } from './leagueStore.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

export const START_OVER_WORDS = 'START OVER';

const slug = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const clockOk = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export interface LeagueSetupRequest { firstNight: string; opensAt: string; closesAt: string; machines: string[]; teamCap?: number }

export async function setupLeague(event: APIGatewayProxyEventV2): Promise<{ ok: true }> {
  const admin = await requireAdmin(event);
  const body = parseBody<LeagueSetupRequest>(event);
  const firstNight = text(body.firstNight);
  const opensAt = text(body.opensAt);
  const closesAt = text(body.closesAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstNight) || Number.isNaN(Date.parse(`${firstNight}T12:00:00Z`))) throw new HttpError(400, 'Pick the date of the first league night.');
  if (!clockOk(opensAt) || !clockOk(closesAt) || closesAt <= opensAt) throw new HttpError(400, 'Give the night a start and an end time, the end after the start.');
  const names = (Array.isArray(body.machines) ? body.machines : []).map((m) => text(m).trim()).filter(Boolean);
  if (names.length === 0 || names.length > 30) throw new HttpError(400, 'Add at least one machine.');
  const ids = names.map(slug);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Two machines have the same name.');
  const teamCap = Number(body.teamCap ?? 12);
  if (!Number.isInteger(teamCap) || teamCap < 2 || teamCap > 40) throw new HttpError(400, 'The team limit is 2 to 40.');
  if (await loadLeagueState()) throw new HttpError(409, 'There is already a league. The owner can start it over first.');
  const league = newLeague({ firstNight, opensAt, closesAt, teamCap, machines: names.map((name, i) => ({ machineId: ids[i]!, name })) }, nowIso());
  try {
    await createLeagueState(league, admin.name);
  } catch (err) {
    if ((err as Error).name === 'TransactionCanceledException') throw new HttpError(409, 'Someone set the league up just now. Refresh.');
    throw err;
  }
  return { ok: true };
}

/**
 * Deletes the league record, its history, every team's name claim and private item (PINs,
 * phones), tonight's reminder marker, and anything left from before Oct 27. Admin accounts are
 * kept. Photos are left for the bucket's own cleanup. Returns how many records went.
 */
export async function clearLeague(league = leagueId()): Promise<number> {
  const all = (pk: string) => queryAll<{ PK: string; SK: string; type?: string; date?: string }>({ KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': pk } });
  const mine = await all(keys.league(league));
  const oldNights = mine.filter((i) => i.type === 'night' && i.date).map((i) => `NIGHT#${league}#${i.date}`);
  const doomed = [...mine, ...(await all(`HISTORY#${league}`)), ...(await all(`AUDIT#${league}`)), ...(await all(`PUSH#${league}`))];
  for (const pk of oldNights) doomed.push(...(await all(pk)));
  for (let i = 0; i < doomed.length; i += 25) {
    let requests: Record<string, unknown> | undefined = { [table()]: doomed.slice(i, i + 25).map((k) => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } })) };
    // When DynamoDB is busy it hands some deletes back undone; send those again until none are left.
    for (let tries = 0; requests && Object.keys(requests).length > 0; tries++) {
      if (tries > 0) await new Promise((r) => setTimeout(r, Math.min(1000, 50 * 2 ** tries)));
      if (tries > 8) throw new Error('Could not finish deleting the league; run Start over again.');
      const out: { UnprocessedItems?: Record<string, unknown> } = await ddb.send(new BatchWriteCommand({ RequestItems: requests as never }));
      requests = out.UnprocessedItems;
    }
  }
  return doomed.length;
}

export async function startOver(event: APIGatewayProxyEventV2): Promise<{ deleted: number }> {
  const admin = await requireAdmin(event);
  if (!admin.owner) throw new HttpError(403, 'Only the league owner can start the league over.');
  if (text(parseBody<{ confirm?: string }>(event).confirm).trim().toUpperCase() !== START_OVER_WORDS) {
    throw new HttpError(400, `Type ${START_OVER_WORDS} to confirm.`);
  }
  // A full backup of the table first, kept in AWS (DynamoDB backups), so a mistaken Start over
  // can be undone. If the backup can't be made, nothing is deleted.
  const backup = await backupTable(`before-start-over-${admin.name}`);
  const deleted = await clearLeague();
  console.log('League started over', JSON.stringify({ by: admin.name, deleted, backup }));
  return { deleted };
}

/** An on-demand backup of the whole table. Returns its name. */
export async function backupTable(reason: string): Promise<string> {
  const name = `${table()}-${reason}-${new Date().toISOString().replace(/[:.]/g, '-')}`.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 255);
  try {
    await ddb.send(new CreateBackupCommand({ TableName: table(), BackupName: name }));
  } catch (err) {
    console.error('Backup failed', (err as Error).name);
    throw new HttpError(503, "Couldn't make a backup first, so nothing was deleted. Try again in a minute.");
  }
  return name;
}
