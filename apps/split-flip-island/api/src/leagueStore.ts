// The league on the server, run by the one rule book (shared/league/rules.ts).
//
// The whole league is one record (LEAGUE#<id> / STATE), compressed, with a version number.
// Every change is also saved as its own numbered history entry (HISTORY#<id> / <version>), in a
// partition of its own so reading the league never reads its whole history.
// A change is written only if the version hasn't moved since it was read; if two phones change
// the league at the same moment, one write is refused and that request starts again from the
// newer league. So nothing is lost, and nobody gets the same spot in a line twice.
import { gunzipSync, gzipSync } from 'node:zlib';
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { current, produce } from 'immer';
import { makeLeagueRules, type Current, type LeagueActionName } from '../../shared/league/rules.js';
import type { SampleState } from '../../shared/league/types.js';
import { ddb, keys, leagueId, table } from './db.js';
import { HttpError, nowIso } from './util.js';

export type League = SampleState;

/** Who is making a change. 'league' is the server itself (opening the night, the turn clock). */
export type Actor =
  | { kind: 'team'; teamId: string }
  | { kind: 'admin'; name: string }
  | { kind: 'league' };

export interface LeagueAction { type: LeagueActionName; payload?: unknown }

const rules = makeLeagueRules(current as Current);

const stateKey = () => ({ PK: keys.league(leagueId()), SK: 'STATE' });
const historyKey = (version: number) => ({ PK: `HISTORY#${leagueId()}`, SK: String(version).padStart(10, '0') });

export async function loadLeagueState(): Promise<{ version: number; league: League } | null> {
  const item = (await ddb.send(new GetCommand({ TableName: table(), Key: stateKey() }))).Item;
  if (!item) return null;
  const data = item.data as Uint8Array;
  return { version: item.version as number, league: JSON.parse(gunzipSync(data).toString('utf8')) as League };
}

/** The viewer fields the rules read to know who is acting, set fresh for each change. */
function withActor(league: League, actor: Actor, now: string): League {
  return {
    ...league,
    now,
    role: actor.kind === 'admin' ? 'admin' : actor.kind === 'team' ? 'team' : 'visitor',
    myTeamId: actor.kind === 'team' ? actor.teamId : '',
    adminName: actor.kind === 'admin' ? actor.name : 'League',
    adminOnTeam: false
  };
}

/** Saved leagues never keep a viewer: those fields are set per request. */
const neutral = (league: League): League => ({ ...league, role: 'visitor', myTeamId: '', adminName: '', adminOnTeam: false });

/**
 * Saves a league for the first time (season setup). Refuses if one already exists, so a setup
 * script can never wipe a league by accident.
 */
export async function createLeagueState(league: League, by: string): Promise<void> {
  const at = nowIso();
  await ddb.send(new TransactWriteCommand({
    TransactItems: [
      { Put: { TableName: table(), Item: { ...stateKey(), type: 'state', version: 1, data: gzipSync(JSON.stringify(neutral(league))), updatedAt: at }, ConditionExpression: 'attribute_not_exists(PK)' } },
      { Put: { TableName: table(), Item: { ...historyKey(1), type: 'history', version: 1, at, actor: { kind: 'setup', by }, action: { type: 'setup' } } } }
    ]
  }));
}

export class RuleRefused extends HttpError {
  constructor(message = "That can't be done right now.") { super(409, message); }
}

/**
 * Applies one action as the actor and saves it. `extra` runs on the same draft after the rule
 * (for server-only details such as a photo path), and its writes go in the same transaction.
 * Returns the new version and league.
 */
export async function applyAction(
  actor: Actor,
  action: LeagueAction,
  options: { refusal?: string; extraWrites?: (league: League) => unknown[]; after?: (draft: League) => void; tries?: number } = {}
): Promise<{ version: number; league: League }> {
  const rule = rules[action.type] as ((s: League, a: { payload: unknown }) => League | void) | undefined;
  if (!rule) throw new HttpError(400, 'Unknown action.');
  for (let attempt = 0; attempt < (options.tries ?? 4); attempt++) {
    const loaded = await loadLeagueState();
    if (!loaded) throw new HttpError(409, 'The league has not been set up yet.');
    const now = nowIso();
    const base = withActor(loaded.league, actor, now);
    const ruled = produce(base, (draft) => rule(draft as League, { payload: action.payload }));
    // A rule that changes nothing was refused (not allowed now, or already done).
    if (ruled === base) throw new RuleRefused(options.refusal);
    const next = options.after ? produce(ruled, (draft) => { options.after!(draft as League); }) : ruled;
    const version = loaded.version + 1;
    try {
      await ddb.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: table(),
              Item: { ...stateKey(), type: 'state', version, data: gzipSync(JSON.stringify(neutral(next))), updatedAt: now },
              ConditionExpression: 'version = :v',
              ExpressionAttributeValues: { ':v': loaded.version }
            }
          },
          {
            Put: {
              TableName: table(),
              Item: { ...historyKey(version), type: 'history', version, at: now, actor, action },
              ConditionExpression: 'attribute_not_exists(PK)'
            }
          },
          ...((options.extraWrites?.(next) ?? []) as never[])
        ]
      }));
      return { version, league: neutral(next) };
    } catch (err) {
      if ((err as Error).name === 'TransactionCanceledException') {
        const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
        // Someone else saved the league first: start again from their version.
        if (reasons[0]?.Code === 'ConditionalCheckFailed' || reasons.length === 0) continue;
        // One of the extra writes was refused (a name already claimed, a record that's gone).
        if (reasons.some((r) => r.Code === 'ConditionalCheckFailed')) throw new RuleRefused(options.refusal);
      }
      throw err;
    }
  }
  throw new HttpError(503, 'The league is busy. Try again in a moment.');
}

/** The newest history entries, newest first (for the admin's own record and debugging). */
export async function recentHistory(limit = 50) {
  const out = await ddb.send(new QueryCommand({
    TableName: table(),
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `HISTORY#${leagueId()}` },
    ScanIndexForward: false,
    Limit: limit
  }));
  return out.Items ?? [];
}
