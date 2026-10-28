// The turn clock on the server: a team that's up has 5 minutes to start, or forfeits its turn.
// Nothing runs every second. Instead the server checks whenever anyone looks at the league or
// does something in it (phones refresh every 10 seconds while the app is open), and the
// 5-minute league clock checks too, as a backstop.
import { TURN_MS } from '../../shared/league/rules.js';
import { applyAction, loadLeagueState, RuleRefused, type League } from './leagueStore.js';

/** Turns whose 5 minutes ran out without a start. None while the league is paused. */
export function expiredTurns(league: League, now = Date.now()): { machineId: string; teamId: string }[] {
  if (league.paused) return [];
  return league.lines
    .filter((l) => l.teamIds[0] && l.started === false && l.upAt && now - l.upAt >= TURN_MS)
    .map((l) => ({ machineId: l.machineId, teamId: l.teamIds[0]! }));
}

/** Forfeits every turn that ran out. Returns how many. Passing the league skips a read when nothing is due. */
export async function runTurnClock(known?: League): Promise<number> {
  const league = known ?? (await loadLeagueState())?.league;
  if (!league) return 0;
  let forfeited = 0;
  for (const turn of expiredTurns(league)) {
    try {
      await applyAction({ kind: 'league' }, { type: 'forfeitTurn', payload: { ...turn, by: 'clock' } });
      forfeited++;
    } catch (err) {
      // Someone else's request got there first, or the team started just in time.
      if (!(err instanceof RuleRefused)) throw err;
    }
  }
  return forfeited;
}
