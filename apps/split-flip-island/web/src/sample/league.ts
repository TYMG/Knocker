// Questions the pages ask about the sample league. Every function takes the whole sample state
// and works the answer out from the scores, so numbers on different pages always agree.
//
// In a page:   const league = useLeague();   const rows = tonightRows(league);

import { rankChange, rankTotals, runningRanks, scoreNight, type NightResult } from '../../../shared/scoring';
import { addMinutes, at, minutesBetween, ordinal } from './time';
import type { SChallenge, SFinal, SMachine, SScore, STeam, SWeek, SampleState } from './types';

export type SeasonOption = 'option1' | 'option2';

// ---- Looking things up ----

const UNKNOWN_TEAM: STeam = { teamId: 'unknown', teamName: 'Unknown team', players: ['', ''], phone1: '', phone2: '', photo: '', status: 'approved', createdAt: '', firstWeek: 1 };

export const team = (s: SampleState, teamId: string): STeam => s.teams.find((t) => t.teamId === teamId) ?? UNKNOWN_TEAM;
export const findTeam = (s: SampleState, teamId: string | undefined): STeam | undefined => s.teams.find((t) => t.teamId === teamId);
export const findTeamByName = (s: SampleState, name: string): STeam | undefined =>
  s.teams.find((t) => t.teamName.toLowerCase() === name.trim().replace(/\s+/g, ' ').toLowerCase());
export const machine = (s: SampleState, machineId: string): SMachine =>
  s.machines.find((m) => m.machineId === machineId) ?? { machineId, name: 'Unknown machine', locationId: '', removed: true };
export const findMachine = (s: SampleState, machineId: string | undefined): SMachine | undefined => s.machines.find((m) => m.machineId === machineId);
export const findScore = (s: SampleState, scoreId: string | undefined): SScore | undefined => s.scores.find((x) => x.scoreId === scoreId);
export const weekOf = (s: SampleState, week: number): SWeek | undefined => s.weeks.find((w) => w.week === week);
export const myTeam = (s: SampleState): STeam => team(s, s.myTeamId);
export const location = (s: SampleState) => s.locations[0]!;
/** Machines at a location that have not been removed. */
export const machinesAt = (s: SampleState, locationId: string) => s.machines.filter((m) => m.locationId === locationId && !m.removed);

/** "Week 5" or "Finals". */
export const weekLabel = (week: number) => (week >= 9 ? 'Finals' : `Week ${week}`);

export const approvedTeams = (s: SampleState) => s.teams.filter((t) => t.status === 'approved');
export const pendingTeams = (s: SampleState) => s.teams.filter((t) => t.status === 'pending');
/** Teams that count in a given week. A team approved mid-season starts the week after. */
export const teamsIn = (s: SampleState, week: number) => approvedTeams(s).filter((t) => t.firstWeek <= week);

/** The week that is open now. If none is open: the latest finished week. */
export function currentWeek(s: SampleState): SWeek {
  return s.weeks.find((w) => w.state === 'open') ?? [...s.weeks].reverse().find((w) => w.state === 'final') ?? s.weeks[0]!;
}

/** Machines whose scores count that week: picked and not broken. */
export const countedMachines = (s: SampleState, week: SWeek) => week.machineIds.filter((id) => !week.out[id]);

// ---- The night's clock ----

export interface NightStatus {
  week: SWeek;
  open: boolean;
  opensAt: string;
  closesAt: string;
  /** Minutes until it closes. 0 when it is not open. */
  minutesLeft: number;
}

export function nightStatus(s: SampleState): NightStatus {
  const week = currentWeek(s);
  const opensAt = at(week.date, s.night.opensAt);
  const closesAt = addMinutes(at(week.date, s.night.closesAt), s.night.extraMinutes);
  const open = week.state === 'open';
  return { week, open, opensAt, closesAt, minutesLeft: open ? Math.max(minutesBetween(s.now, closesAt), 0) : 0 };
}

// ---- Scoring ----

interface WeekResult extends NightResult<SScore> {
  teamIds: string[];
}

const resultCache = new WeakMap<SampleState, Map<string, WeekResult>>();

/** Points for one week. `upTo` leaves out scores posted after that time (for "20 minutes ago"). */
export function weekResult(s: SampleState, weekNumber: number, upTo?: string): WeekResult {
  let cache = resultCache.get(s);
  if (!cache) resultCache.set(s, (cache = new Map()));
  const key = `${weekNumber}|${upTo ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const week = weekOf(s, weekNumber);
  const teamIds = teamsIn(s, weekNumber).map((t) => t.teamId);
  const scores = s.scores.filter((x) => x.week === weekNumber && x.status === 'active' && teamIds.includes(x.teamId) && (!upTo || x.at <= upTo));
  const result = { ...scoreNight(scores, week ? countedMachines(s, week) : [], teamIds.length), teamIds };

  cache.set(key, result);
  return result;
}

export interface TonightRow {
  team: STeam;
  rank: number;
  points: number;
  /** Places moved in the last 20 minutes. Only while the night is open. */
  change?: number;
  games: number;
  /** Checked in tonight. */
  here: boolean;
}

/** One week's points, best first. Every team in the league that week appears, even with 0. */
export function tonightRows(s: SampleState, weekNumber = currentWeek(s).week): TonightRow[] {
  const result = weekResult(s, weekNumber);
  const ranked = rankTotals(result.machinePoints, result.teamIds);
  const week = weekOf(s, weekNumber);
  const live = week?.state === 'open';
  const earlier = live ? new Map(rankTotals(weekResult(s, weekNumber, addMinutes(s.now, -20)).machinePoints, result.teamIds).map((r) => [r.teamId, r.rank])) : undefined;
  return ranked.map((r) => ({
    team: team(s, r.teamId),
    rank: r.rank,
    points: r.points,
    change: rankChange(earlier, r.teamId, r.rank),
    games: s.scores.filter((x) => x.week === weekNumber && x.teamId === r.teamId && x.status === 'active').length,
    here: live ? !!s.checkIns[r.teamId] : (result.machinePoints.get(r.teamId) ?? 0) > 0
  }));
}

export interface BoardRow {
  team: STeam;
  rank: number;
  /** The team's best score on this machine that week. */
  best: SScore;
  points: number;
  games: number;
}

/** One machine's leaderboard for one week. A broken machine still lists its scores, with 0 points. */
export function machineBoard(s: SampleState, weekNumber: number, machineId: string): BoardRow[] {
  const result = weekResult(s, weekNumber);
  let rows = result.boards.get(machineId);
  if (!rows) {
    const scores = s.scores.filter((x) => x.week === weekNumber && x.machineId === machineId && x.status === 'active');
    rows = (scoreNight(scores, [machineId], result.teamIds.length).boards.get(machineId) ?? []).map((r) => ({ ...r, points: 0 }));
  }
  return rows.map((r) => ({
    team: team(s, r.teamId),
    rank: 1 + rows.filter((o) => o.best > r.best).length,
    best: r.bestScore,
    points: r.points,
    games: r.attempts
  }));
}

/**
 * The highest score that counts on a machine all season, or undefined if nobody has one.
 * A score from a night the machine was out does not count, and neither does a voided one.
 */
export function seasonHigh(s: SampleState, machineId: string): SScore | undefined {
  let top: SScore | undefined;
  for (const x of s.scores) {
    if (x.machineId !== machineId || x.status !== 'active') continue;
    const week = weekOf(s, x.week);
    if (!week || !week.machineIds.includes(machineId) || week.out[machineId]) continue;
    if (!top || x.score > top.score) top = x;
  }
  return top;
}

/** Holding the season high score on a machine when the season ends is worth this many extra points. */
export const SEASON_HIGH_BONUS = 10;

/** The league nights (weeks 1 to 8) are all finished. Finals are separate. */
export const seasonOver = (s: SampleState) => s.weeks.filter((w) => w.week <= 8).every((w) => w.state === 'final');

export interface SeasonHighBonus {
  machine: SMachine;
  team: STeam;
  score: SScore;
}

/** Who holds the season high on each machine right now. Each one earns the bonus if it still stands at the end. */
export function seasonHighBonuses(s: SampleState): SeasonHighBonus[] {
  const out: SeasonHighBonus[] = [];
  for (const m of s.machines) {
    const top = seasonHigh(s, m.machineId);
    if (top && team(s, top.teamId).status === 'approved') out.push({ machine: m, team: team(s, top.teamId), score: top });
  }
  return out;
}

/** Weeks that have points: finished ones and the open one. */
export const playedWeeks = (s: SampleState) => s.weeks.filter((w) => w.week <= 8 && w.state !== 'upcoming');

export interface SeasonRow {
  team: STeam;
  rank: number;
  points: number;
  /** Places moved since the week before. Undefined in week 1. */
  change?: number;
}

export interface NightPoints {
  week: number;
  option1: Record<string, number>;
  option2: Record<string, number>;
  /** Season rank after this week, per scoring option. */
  ranks: { option1: Record<string, number>; option2: Record<string, number> };
}

export interface Season {
  option1: SeasonRow[]; // machine points add up
  option2: SeasonRow[]; // rank the night
  byNight: NightPoints[];
  nightsPlayed: number;
}

const seasonCache = new WeakMap<SampleState, Season>();

/**
 * Season standings under both scoring options, including tonight so far. On top of the points
 * earned playing, a team's total includes challenge points won or lost and, once the season is
 * over, 10 points for each machine it holds the season high on.
 */
export function season(s: SampleState): Season {
  const hit = seasonCache.get(s);
  if (hit) return hit;
  const weeks = playedWeeks(s);
  const teamIds = approvedTeams(s).map((t) => t.teamId);
  const results = weeks.map((w) => weekResult(s, w.week));
  const bonuses = seasonOver(s) ? seasonHighBonuses(s) : [];
  const build = (pick: (r: WeekResult) => Map<string, number>) => {
    // A team's season total is what it earned playing, plus or minus what it won or lost in
    // challenges. A challenge is paid from the points a team has at that moment, so `have`
    // tracks the running total and a team can never pay more than it has.
    const have = new Map<string, number>();
    const nightly = results.map((r, i) => {
      const night = new Map(pick(r));
      for (const [teamId, points] of night) have.set(teamId, (have.get(teamId) ?? 0) + points);
      for (const c of s.challenges) {
        if (c.week !== weeks[i]!.week || c.status !== 'settled' || !c.winnerTeamId) continue;
        const loserId = c.winnerTeamId === c.fromTeamId ? c.toTeamId : c.fromTeamId;
        const paid = Math.min(c.stake, Math.max(have.get(loserId) ?? 0, 0));
        if (paid <= 0) continue;
        for (const [teamId, delta] of [[loserId, -paid], [c.winnerTeamId, paid]] as const) {
          night.set(teamId, (night.get(teamId) ?? 0) + delta);
          have.set(teamId, (have.get(teamId) ?? 0) + delta);
        }
      }
      return night;
    });
    // The season-high bonus lands with the last league night, once every night is final.
    const last = nightly[nightly.length - 1];
    if (last) for (const b of bonuses) last.set(b.team.teamId, (last.get(b.team.teamId) ?? 0) + SEASON_HIGH_BONUS);
    const ranks = runningRanks(nightly, teamIds);
    const totals = new Map<string, number>();
    for (const night of nightly) for (const [teamId, points] of night) totals.set(teamId, (totals.get(teamId) ?? 0) + points);
    const rows: SeasonRow[] = rankTotals(totals, teamIds).map((r) => ({
      team: team(s, r.teamId), rank: r.rank, points: r.points, change: rankChange(ranks[ranks.length - 2], r.teamId, r.rank)
    }));
    return { nightly, ranks, rows };
  };
  const one = build((r) => r.machinePoints);
  const two = build((r) => r.nightPoints);
  const out: Season = {
    option1: one.rows,
    option2: two.rows,
    nightsPlayed: weeks.length,
    byNight: weeks.map((w, i) => ({
      week: w.week,
      option1: Object.fromEntries(one.nightly[i]!),
      option2: Object.fromEntries(two.nightly[i]!),
      ranks: { option1: Object.fromEntries(one.ranks[i]!), option2: Object.fromEntries(two.ranks[i]!) }
    }))
  };
  seasonCache.set(s, out);
  return out;
}

// ---- One team ----

export interface PlayedMachine {
  machine: SMachine;
  games: number;
  best: SScore;
  points: number;
  rank: number;
}

export interface TeamTonight {
  team: STeam;
  row: TonightRow | undefined;
  teamCount: number;
  checkedInAt: string | undefined;
  /** Machines in play that the team has no score on yet. */
  toPlay: SMachine[];
  played: PlayedMachine[];
}

export function teamTonight(s: SampleState, teamId: string, weekNumber = currentWeek(s).week): TeamTonight {
  const week = weekOf(s, weekNumber)!;
  const rows = tonightRows(s, weekNumber);
  const played: PlayedMachine[] = [];
  const toPlay: SMachine[] = [];
  for (const machineId of countedMachines(s, week)) {
    const row = machineBoard(s, weekNumber, machineId).find((r) => r.team.teamId === teamId);
    if (row) played.push({ machine: machine(s, machineId), games: row.games, best: row.best, points: row.points, rank: row.rank });
    else toPlay.push(machine(s, machineId));
  }
  return { team: team(s, teamId), row: rows.find((r) => r.team.teamId === teamId), teamCount: rows.length, checkedInAt: week.state === 'open' ? s.checkIns[teamId] : undefined, toPlay, played };
}

export interface TeamSeason {
  team: STeam;
  row: SeasonRow | undefined;
  games: number;
  bestNight: { week: number; rank: number } | undefined;
  /** Times the team finished 1st on a machine in a week. */
  machineWins: number;
  badges: string[];
  bests: { machine: SMachine; week: number; score: SScore }[];
  weeks: { week: number; rank: number; points: number; open: boolean; played: boolean }[];
}

export function teamSeason(s: SampleState, teamId: string, option: SeasonOption = 'option1'): TeamSeason {
  const mine = s.scores.filter((x) => x.teamId === teamId && x.status === 'active');
  const weeks = playedWeeks(s)
    .filter((w) => team(s, teamId).firstWeek <= w.week)
    .map((w) => {
      const row = tonightRows(s, w.week).find((r) => r.team.teamId === teamId);
      return { week: w.week, rank: row?.rank ?? 0, points: row?.points ?? 0, open: w.state === 'open', played: mine.some((x) => x.week === w.week) };
    });
  const finished = weeks.filter((w) => w.played && w.rank > 0);
  const bestNight = finished.length ? finished.reduce((a, b) => (b.rank < a.rank ? b : a)) : undefined;

  let machineWins = 0;
  for (const w of playedWeeks(s)) for (const id of countedMachines(s, w)) if (machineBoard(s, w.week, id)[0]?.team.teamId === teamId) machineWins += 1;

  const bests = s.machines
    .map((m) => {
      const top = mine.filter((x) => x.machineId === m.machineId).sort((a, b) => b.score - a.score)[0];
      return top ? { machine: m, week: top.week, score: top } : undefined;
    })
    .filter((b) => b !== undefined);

  const badges: string[] = [];
  for (const w of playedWeeks(s)) if (w.state === 'final' && tonightRows(s, w.week)[0]?.team.teamId === teamId) badges.push(`Won week ${w.week}`);
  for (const m of s.machines) if (seasonHigh(s, m.machineId)?.teamId === teamId) badges.push(`${m.name} season high`);
  const gamesBy = (scores: SScore[]) => {
    const counts = new Map<string, number>();
    for (const x of scores) counts.set(x.teamId, (counts.get(x.teamId) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const active = s.scores.filter((x) => x.status === 'active');
  if (gamesBy(active) === teamId) badges.push('The Grinders: most games this season');
  for (const w of playedWeeks(s)) if (w.state === 'final' && gamesBy(active.filter((x) => x.week === w.week)) === teamId) badges.push(`Most games, week ${w.week}`);

  return {
    team: team(s, teamId),
    row: season(s)[option].find((r) => r.team.teamId === teamId),
    games: mine.length,
    bestNight: bestNight && { week: bestNight.week, rank: bestNight.rank },
    machineWins,
    badges,
    bests,
    weeks
  };
}

/** "5th this season, 122 points", or what to say for a team with no standing yet. */
export function seasonLine(s: SampleState, teamId: string, option: SeasonOption = 'option1'): string {
  const t = team(s, teamId);
  if (t.status === 'pending') return 'Waiting for a league admin to approve this team';
  if (t.firstWeek > currentWeek(s).week) return `New team. Starts in week ${t.firstWeek}`;
  const row = season(s)[option].find((r) => r.team.teamId === teamId);
  if (!row) return 'No points yet';
  return `${ordinal(row.rank)} this season, ${row.points} ${row.points === 1 ? 'point' : 'points'}`;
}

// ---- Scores, for the admin pages ----

/** What an admin sees next to a score. */
export function checkLabel(x: SScore): string {
  if (x.status === 'voided') return `Voided: ${x.reason ?? 'no reason given'}`;
  if (x.check === 'flagged') return `Needs a look: ${x.flag ? x.flag.charAt(0).toLowerCase() + x.flag.slice(1) : 'flagged'}`;
  if (x.check === 'checked') return `Checked by ${x.checkedBy ?? 'an admin'}`;
  return 'Not checked';
}

export interface ScoreFilter {
  week?: number;
  teamId?: string;
  machineId?: string;
  /** 'flagged' = needs a look, 'unchecked' = nobody has looked yet. Both leave out voided scores. */
  check?: 'flagged' | 'unchecked';
}

/** Scores matching the filter, newest first. Voided scores are included unless filtering by check. */
export function scoreList(s: SampleState, filter: ScoreFilter = {}): SScore[] {
  return s.scores
    .filter(
      (x) =>
        (filter.week === undefined || x.week === filter.week) &&
        (!filter.teamId || x.teamId === filter.teamId) &&
        (!filter.machineId || x.machineId === filter.machineId) &&
        (!filter.check || (x.status === 'active' && x.check === filter.check))
    )
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function scoreCounts(s: SampleState, week: number, teamId?: string) {
  const all = scoreList(s, { week, teamId });
  const active = all.filter((x) => x.status === 'active');
  return {
    all: all.length,
    unchecked: active.filter((x) => x.check === 'unchecked').length,
    flagged: active.filter((x) => x.check === 'flagged').length,
    teams: new Set(all.map((x) => x.teamId)).size
  };
}

// ---- Lines ----

export interface LineView {
  machine: SMachine;
  /** Set when the machine is out tonight. An out machine has no line. */
  out?: { at: string; reason: string };
  teams: STeam[];
  playing: STeam | undefined;
  waiting: STeam[];
}

/** Every machine picked for the open week, with its line. Empty when no night is open. */
export function linesView(s: SampleState): LineView[] {
  const week = currentWeek(s);
  if (week.state !== 'open') return [];
  return week.machineIds.map((machineId) => {
    const teams = week.out[machineId] ? [] : (s.lines.find((l) => l.machineId === machineId)?.teamIds ?? []).map((id) => team(s, id));
    return { machine: machine(s, machineId), out: week.out[machineId], teams, playing: teams[0], waiting: teams.slice(1) };
  });
}

export interface MyLine {
  machine: SMachine;
  /** 1 = playing now, 2 = next, 3 = third in line... */
  position: number;
  joinedAt: string;
  ahead: STeam[];
  notify: boolean;
}

/** The line a team is in, if any. A team can be in one line at a time. */
export function lineFor(s: SampleState, teamId = s.myTeamId): MyLine | undefined {
  for (const line of s.lines) {
    const index = line.teamIds.indexOf(teamId);
    if (index === -1) continue;
    return {
      machine: machine(s, line.machineId),
      position: index + 1,
      joinedAt: line.joinedAt[teamId] ?? s.now,
      ahead: line.teamIds.slice(0, index).map((id) => team(s, id)),
      notify: line.notify.includes(teamId)
    };
  }
  return undefined;
}

/** "playing now", "next", "3rd in line" */
export const placeInLine = (position: number) => (position === 1 ? 'playing now' : position === 2 ? 'next' : `${ordinal(position)} in line`);

/** "Nobody in line", "1 team in line", "3 teams in line" */
export const lineCount = (count: number) => (count === 0 ? 'Nobody in line' : `${count} ${count === 1 ? 'team' : 'teams'} in line`);

// ---- Challenges ----

export interface ChallengeView {
  challenge: SChallenge;
  machine: SMachine;
  from: STeam;
  to: STeam;
  fromBest: number | undefined;
  toBest: number | undefined;
  /** Who is ahead right now (live) or who won (settled). */
  leader: STeam | undefined;
}

export function challengeView(s: SampleState, c: SChallenge): ChallengeView {
  const best = (teamId: string) => {
    const scores = s.scores.filter((x) => x.week === c.week && x.machineId === c.machineId && x.teamId === teamId && x.status === 'active');
    return scores.length ? Math.max(...scores.map((x) => x.score)) : undefined;
  };
  const fromBest = best(c.fromTeamId);
  const toBest = best(c.toTeamId);
  let leaderId = c.winnerTeamId;
  if (c.status === 'live' && (fromBest ?? 0) !== (toBest ?? 0)) leaderId = (fromBest ?? 0) > (toBest ?? 0) ? c.fromTeamId : c.toTeamId;
  return { challenge: c, machine: machine(s, c.machineId), from: team(s, c.fromTeamId), to: team(s, c.toTeamId), fromBest, toBest, leader: leaderId ? team(s, leaderId) : undefined };
}

export function challenges(s: SampleState, teamId = s.myTeamId) {
  const views = s.challenges.map((c) => challengeView(s, c));
  return {
    /** Someone challenged this team and is waiting for an answer. */
    waitingOnMe: views.filter((v) => v.challenge.status === 'waiting' && v.to.teamId === teamId),
    /** This team challenged someone who has not answered. */
    sentByMe: views.filter((v) => v.challenge.status === 'waiting' && v.from.teamId === teamId),
    live: views.filter((v) => v.challenge.status === 'live'),
    settled: views.filter((v) => v.challenge.status === 'settled').sort((a, b) => b.challenge.week - a.challenge.week)
  };
}

// ---- Finals ----

export interface FinalRow {
  seed: number;
  team: STeam;
  /** Points per game: 4 for 1st down to 1 for 4th. Undefined until the game is played. */
  games: (number | undefined)[];
  total: number;
}

export function finalTable(s: SampleState, final: SFinal): FinalRow[] {
  return final.teamIds.map((teamId, i) => {
    const games = final.games.map((g) => (g.places ? 5 - (g.places[teamId] ?? 5) : undefined));
    return { seed: i + 1, team: team(s, teamId), games, total: games.reduce<number>((sum, g) => sum + (g ?? 0), 0) };
  });
}

/** Who would play in each final if the season ended now. */
export function finalsPreview(s: SampleState, option: SeasonOption = 'option1') {
  const rows = season(s)[option];
  return { championship: rows.slice(0, 4), secondChance: rows.slice(4, 8) };
}

// ---- Counts for the admin home page ----

export function adminSummary(s: SampleState) {
  const week = currentWeek(s);
  const counts = scoreCounts(s, week.week);
  const lines = linesView(s);
  const inPlay = countedMachines(s, week);
  return {
    week,
    teams: teamsIn(s, week.week).length,
    here: teamsIn(s, week.week).filter((t) => s.checkIns[t.teamId]).length,
    scores: counts,
    lineTeams: lines.reduce((sum, l) => sum + l.teams.length, 0),
    lineMachines: lines.filter((l) => l.teams.length > 0).length,
    machinesIn: inPlay.map((id) => machine(s, id)),
    machinesOut: Object.keys(week.out).map((id) => machine(s, id)),
    pending: pendingTeams(s).length,
    waitlist: s.waitlist.length
  };
}

/** Week numbers a machine was or is picked for, e.g. [1, 2, 3, 4, 5]. */
export const machineWeeks = (s: SampleState, machineId: string) =>
  s.weeks.filter((w) => w.week <= 8 && w.state !== 'upcoming' && w.machineIds.includes(machineId)).map((w) => w.week);

// ---- Charts ----

/** 61,204,880 -> "61M"; 2,500,000 -> "2.5M"; 850,000 -> "850K". For chart axes, where the full number will not fit. */
export function shortScore(n: number): string {
  const trim = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

export interface ScoreSpreadRow {
  /** A week number, or 'all' for every week added together. */
  week: number | 'all';
  label: string;
  /** Games that landed in each score range, in the same order as `bands`. */
  counts: number[];
  games: number;
  average: number;
}

export interface ScoreSpread {
  /** The width of one score range, e.g. 10,000,000. */
  step: number;
  bands: { from: number; to: number; label: string }[];
  /** One row per week the machine has scores in, oldest first, then the 'all' row. */
  rows: ScoreSpreadRow[];
  /** The largest count in any single week's range. The 'all' row can go higher. */
  biggest: number;
}

/**
 * Where scores land on one machine across the season. Pinball scores almost never repeat
 * exactly, so they are grouped into ranges ("60M to 70M") and each range counts the games that
 * landed in it. Every game counts once, including a team's second and third tries. Voided
 * scores are left out.
 */
export function scoreSpread(s: SampleState, machineId: string): ScoreSpread | undefined {
  const scores = s.scores.filter((x) => x.machineId === machineId && x.status === 'active');
  if (scores.length === 0) return undefined;
  const top = Math.max(...scores.map((x) => x.score));
  // A round range width that gives about eight ranges: 1, 2, 2.5 or 5 times a power of ten.
  const rough = top / 8;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((w) => w >= rough) ?? 10 * power;
  const count = Math.floor(top / step) + 1;
  const bands = Array.from({ length: count }, (_, i) => ({ from: i * step, to: (i + 1) * step, label: `${shortScore(i * step)} to ${shortScore((i + 1) * step)}` }));
  const row = (week: number | 'all', label: string, list: SScore[]): ScoreSpreadRow => {
    const counts = bands.map(() => 0);
    for (const x of list) counts[Math.min(Math.floor(x.score / step), count - 1)]! += 1;
    return { week, label, counts, games: list.length, average: list.length ? Math.round(list.reduce((sum, x) => sum + x.score, 0) / list.length) : 0 };
  };
  const weeks = [...new Set(scores.map((x) => x.week))].sort((a, b) => a - b);
  const rows = weeks.map((w) => row(w, `Wk ${w}`, scores.filter((x) => x.week === w)));
  const biggest = Math.max(...rows.flatMap((r) => r.counts));
  rows.push(row('all', 'All', scores));
  return { step, bands, rows, biggest };
}

export interface MachineForm {
  machine: SMachine;
  /** Average machine points per night on this machine, over the nights the team played it and it counted. */
  average: number;
  nights: number;
  games: number;
}

/**
 * How a team does on each machine, for its own coaching card. Points are already on the same
 * scale for every machine (1st earns as many points as there are teams), so machines compare fairly.
 */
export function teamForm(s: SampleState, teamId: string): MachineForm[] {
  const out: MachineForm[] = [];
  for (const m of s.machines) {
    let points = 0;
    let nights = 0;
    let games = 0;
    for (const w of playedWeeks(s)) {
      if (!countedMachines(s, w).includes(m.machineId)) continue;
      const row = machineBoard(s, w.week, m.machineId).find((r) => r.team.teamId === teamId);
      if (!row) continue;
      points += row.points;
      nights += 1;
      games += row.games;
    }
    if (nights > 0) out.push({ machine: m, average: Math.round((points / nights) * 10) / 10, nights, games });
  }
  return out;
}

/**
 * The most a team can put on a challenge right now: 10, or every point it has if that is fewer.
 * "Has" means its season total as it stands this minute, tonight included. A team wagers points
 * it already holds, never points it hopes to win later.
 */
export function maxStake(s: SampleState, teamId = s.myTeamId): number {
  const mine = season(s).option1.find((r) => r.team.teamId === teamId)?.points ?? 0;
  return Math.min(10, Math.max(mine, 0));
}

/** True if these two teams already have a challenge this week, whoever sent it and however it went. One a night. */
export function alreadyChallenged(s: SampleState, a: string, b: string, week = currentWeek(s).week): boolean {
  return s.challenges.some((c) => c.week === week && ((c.fromTeamId === a && c.toTeamId === b) || (c.fromTeamId === b && c.toTeamId === a)));
}
