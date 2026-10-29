// The league's clock on the server: the night opens and closes on its own, and a team that's up
// has 5 minutes to start or forfeits its turn. Nothing runs every second. Instead the server checks
// whenever anyone looks at the league or does something in it (phones refresh every 10 seconds
// while the app is open), and the 5-minute league clock checks too, as a backstop. All of it stops
// while the league is paused.
import { at, easternDate } from '../../shared/league/time.js';
import { TURN_MS } from '../../shared/league/rules.js';
import { applyAction, loadLeagueState, RuleRefused, type League, type LeagueAction } from './leagueStore.js';

/** Turns whose 5 minutes ran out without a start. None while the league is paused. */
export function expiredTurns(league: League, now = Date.now()): { machineId: string; teamId: string }[] {
  if (league.paused) return [];
  return league.lines
    .filter((l) => l.teamIds[0] && l.started === false && l.upAt && now - l.upAt >= TURN_MS)
    .map((l) => ({ machineId: l.machineId, teamId: l.teamIds[0]! }));
}

/** Tonight's night should open now: its date, from 30 minutes before it starts, none open yet. */
export function nightDueToOpen(league: League, now = Date.now()): boolean {
  if (league.paused || league.weeks.some((w) => w.state === 'open')) return false;
  const next = league.weeks.find((w) => w.state === 'upcoming');
  if (!next || easternDate(new Date(now).toISOString()) !== next.date) return false;
  return now >= Date.parse(at(next.date, league.night.opensAt)) - 30 * 60_000;
}

/** The open night has reached its closing time (plus any minutes the admin added). */
export function nightDueToClose(league: League, now = Date.now()): boolean {
  const open = league.weeks.find((w) => w.state === 'open');
  if (league.paused || !open) return false;
  return now >= Date.parse(at(open.date, league.night.closesAt)) + league.night.extraMinutes * 60_000;
}

/**
 * Does whatever is due: closes the night, forfeits run-out turns, opens tonight's night. Returns
 * how many changes it made. Passing the league skips a read when nothing is due.
 */
export async function runLeagueClock(known?: League): Promise<number> {
  const league = known ?? (await loadLeagueState())?.league;
  if (!league) return 0;
  const due: LeagueAction[] = [];
  if (nightDueToClose(league)) due.push({ type: 'closeNight', payload: { by: 'league' } });
  else for (const turn of expiredTurns(league)) due.push({ type: 'forfeitTurn', payload: { ...turn, by: 'clock' } });
  if (nightDueToOpen(league)) due.push({ type: 'openNight' });
  let changed = 0;
  for (const action of due) {
    try {
      await applyAction({ kind: 'league' }, action);
      changed++;
    } catch (err) {
      // Someone else's request got there first (or the team started just in time).
      if (!(err instanceof RuleRefused)) throw err;
    }
  }
  return changed;
}
