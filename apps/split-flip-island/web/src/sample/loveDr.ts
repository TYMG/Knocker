// The Love Dr.'s head: reads a team's scores and decides which phrases are true.
//
// The Love Dr. is the league's coach. It talks in dating terms, and every phrase stands for one
// real thing in the numbers, so the advice is fun to read and still true. The full phrase book,
// with what each phrase means, is on the Screens page in Notion (Features > The Love Dr.).
//
// Rules the Dr. follows:
//   - It only uses scores everyone can already see.
//   - It helps a team play better. It never suggests a challenge.
//   - Nothing here changes points or standings.
//
// Pages ask three questions:
//   machineStatuses(league, teamId)   a phrase for every machine: "Godzilla: It's a keeper"
//   prescription(league, teamId)      tonight's prescription: the one machine to play next, and why
//   doctorsOrders(league, teamId)     the short pep talk for the pop-up after check-in

import {
  countedMachines,
  currentWeek,
  lineFor,
  linesView,
  machine as machineOf,
  machineBoard,
  nightStatus,
  placeInLine,
  playedWeeks,
  season,
  shortScore,
  teamsIn,
  teamTonight
} from './league';
import { ordinal } from './time';
import type { SampleState, SMachine } from './types';

/** With this many minutes left, an unplayed machine becomes urgent ("Cold feet"). */
export const LATE_MINUTES = 20;

// ---- A team's history on each machine ----

export interface MachineNight {
  week: number;
  /** Place on the machine that night, and the points it earned. */
  rank: number;
  points: number;
  /** How many teams were in the league that week. 1st place earns this many points. */
  teamCount: number;
  /** Every game the team played on it that night, in the order played. */
  scores: number[];
  best: number;
  /** Which game was the best one: 1 = the first game. */
  bestGame: number;
}

export interface MachineHistory {
  machine: SMachine;
  /** Nights the team posted a score on this machine while it counted, oldest first. Includes tonight. */
  nights: MachineNight[];
  /** Weeks the machine was in the lineup and counted, whether or not the team played it. */
  lineupWeeks: number[];
  averagePoints: number;
  /** The team's best score ever on this machine, 0 if none. */
  bestEver: number;
}

const historyCache = new WeakMap<SampleState, Map<string, MachineHistory[]>>();

/** Everything a team has done on every machine it has met, from the scores. */
export function machineHistory(s: SampleState, teamId: string): MachineHistory[] {
  let byTeam = historyCache.get(s);
  if (!byTeam) historyCache.set(s, (byTeam = new Map()));
  const cached = byTeam.get(teamId);
  if (cached) return cached;

  const out: MachineHistory[] = [];
  for (const m of s.machines) {
    const nights: MachineNight[] = [];
    const lineupWeeks: number[] = [];
    for (const w of playedWeeks(s)) {
      if (!countedMachines(s, w).includes(m.machineId)) continue;
      lineupWeeks.push(w.week);
      const row = machineBoard(s, w.week, m.machineId).find((r) => r.team.teamId === teamId);
      if (!row) continue;
      const scores = s.scores
        .filter((x) => x.week === w.week && x.machineId === m.machineId && x.teamId === teamId && x.status === 'active')
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((x) => x.score);
      const best = Math.max(...scores);
      nights.push({ week: w.week, rank: row.rank, points: row.points, teamCount: teamsIn(s, w.week).length, scores, best, bestGame: scores.indexOf(best) + 1 });
    }
    if (lineupWeeks.length === 0) continue;
    const total = nights.reduce((sum, n) => sum + n.points, 0);
    out.push({
      machine: m,
      nights,
      lineupWeeks,
      averagePoints: nights.length ? Math.round((total / nights.length) * 10) / 10 : 0,
      bestEver: nights.length ? Math.max(...nights.map((n) => n.best)) : 0
    });
  }
  byTeam.set(teamId, out);
  return out;
}

// ---- Relationship status: one phrase per machine ----

export interface MachineStatus {
  machine: SMachine;
  /** The phrase from the phrase book. */
  phrase: string;
  /** The reason, in plain words, with the numbers behind it. */
  why: string;
  /** What the Dr. tells you to do about it. */
  advice: string;
  /** good = keep doing this, work = needs attention, plain = neither. Picks the tag's color. */
  tone: 'good' | 'work' | 'plain';
}

const weeksWord = (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`;
const spread = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return mean === 0 ? 0 : Math.sqrt(variance) / mean;
};

/**
 * The pattern rules, strongest first. The first one that fits a machine is its status.
 * Each needs enough nights to be fair: nobody is a "soulmate" after one good week.
 */
function patternFor(h: MachineHistory, s: SampleState): Omit<MachineStatus, 'machine'> | undefined {
  const n = h.nights;
  const played = n.length;
  if (played === 0) return undefined;
  const teams = n[played - 1]!.teamCount;
  const top3 = n.filter((x) => x.rank <= 3).length;
  const games = n.flatMap((x) => x.scores);

  if (played >= 2 && n.every((x) => x.rank === 1)) {
    return { phrase: 'Soulmate', why: `1st on it every week you have played it (${weeksWord(played)}).`, advice: 'Bank it first, every night.', tone: 'good' };
  }
  if (played >= 2 && top3 / played >= 0.75) {
    return { phrase: "It's a keeper", why: `Top 3 in ${top3} of your ${weeksWord(played)} on it.`, advice: 'Bank a score early, then spend your time elsewhere.', tone: 'good' };
  }
  // Ghosted: you used to play it, and skipped it the last two finished weeks it was in.
  const finished = h.lineupWeeks.filter((w) => s.weeks.find((x) => x.week === w)?.state === 'final');
  const lastTwo = finished.slice(-2);
  if (played >= 2 && lastTwo.length === 2 && lastTwo.every((w) => !n.some((x) => x.week === w))) {
    return { phrase: 'Ghosted', why: `You played it ${weeksWord(played)}, then skipped it the last two weeks it was in.`, advice: 'Give it another chance.', tone: 'work' };
  }
  if (played >= 4 && n.slice(-4).every((x, i, a) => i === 0 || x.points < a[i - 1]!.points)) {
    return { phrase: 'The ex', why: 'Your points on it have dropped three weeks running.', advice: 'One game for the points, then move on.', tone: 'work' };
  }
  if (played >= 4 && n[0]!.rank <= 3 && n[1]!.rank <= 3) {
    const early = (n[0]!.rank + n[1]!.rank) / 2;
    const later = n.slice(2).reduce((a, x) => a + x.rank, 0) / (played - 2);
    if (later - early >= 2) {
      return { phrase: 'Honeymoon phase', why: `Two great weeks to start (${ordinal(n[0]!.rank)} and ${ordinal(n[1]!.rank)}), cooling since.`, advice: 'The easy part is over. Give it an extra game.', tone: 'work' };
    }
  }
  if (played >= 3 && n.every((x, i) => i === 0 || x.points >= n[i - 1]!.points) && n[played - 1]!.points - n[0]!.points >= 2) {
    return { phrase: 'Slow burn', why: `A little better every week: ${n.map((x) => x.points).join(', ')} points.`, advice: 'Keep going. This one is heading somewhere.', tone: 'good' };
  }
  const ranks = n.map((x) => x.rank);
  if (played >= 2 && Math.min(...ranks) <= 2 && Math.max(...ranks) >= teams - 1) {
    return { phrase: "It's complicated", why: `${ordinal(Math.min(...ranks))} one week, ${ordinal(Math.max(...ranks))} another.`, advice: 'Play it early, so there is time to go back if it goes badly.', tone: 'plain' };
  }
  // The rest look at how the games go within a night, so they need nights with more than one game.
  const multi = n.filter((x) => x.scores.length >= 2);
  if (multi.length >= 2) {
    const improved = multi.filter((x) => x.bestGame > 1).length;
    const lateBest = multi.filter((x) => x.bestGame >= 4).length;
    if (lateBest / multi.length >= 0.5) {
      return { phrase: 'High maintenance', why: `Your best score came on game four or later in ${lateBest} of ${weeksWord(multi.length)}.`, advice: 'Start here and leave time for it.', tone: 'work' };
    }
    if (improved / multi.length >= 0.75) {
      return { phrase: 'Love takes work', why: `You beat your first game in ${improved} of the ${weeksWord(multi.length)} you played it more than once.`, advice: 'Do not stop at one game.', tone: 'plain' };
    }
    if ((multi.length - improved) / multi.length >= 0.75) {
      return { phrase: 'Low maintenance', why: `Your first game was your best in ${multi.length - improved} of ${weeksWord(multi.length)}.`, advice: 'One and done. Spend the time elsewhere.', tone: 'good' };
    }
  }
  if (games.length >= 4) {
    const swing = spread(games);
    if (swing >= 0.6) return { phrase: 'Hot and cold', why: `Your scores on it swing from ${shortScore(Math.min(...games))} to ${shortScore(Math.max(...games))}.`, advice: 'Slow down and play for control.', tone: 'work' };
    if (swing <= 0.2) return { phrase: 'Going steady', why: `Your ${games.length} games on it are all close to ${shortScore(Math.round(games.reduce((a, b) => a + b, 0) / games.length))}.`, advice: 'Reliable. Lean on it when you need a sure score.', tone: 'good' };
  }
  return undefined;
}

/**
 * A phrase for every machine the team has met. Pattern rules come first. Then the team's best
 * machine is "True love" and its worst is "Tough love". A machine in play tonight with no score
 * yet is "Playing hard to get" (or "Cold feet" late in the night).
 */
export function machineStatuses(s: SampleState, teamId: string): MachineStatus[] {
  const history = machineHistory(s, teamId);
  const night = nightStatus(s);
  const waiting = night.open ? new Set(teamTonight(s, teamId).toPlay.map((m) => m.machineId)) : new Set<string>();
  const withScores = history.filter((h) => h.nights.length > 0);
  const byAverage = [...withScores].sort((a, b) => b.averagePoints - a.averagePoints);
  const best = withScores.length >= 3 ? byAverage[0] : undefined;
  const worst = withScores.length >= 3 ? byAverage[byAverage.length - 1] : undefined;
  const pts = (x: number) => `${x} ${x === 1 ? 'point' : 'points'}`;

  const out: MachineStatus[] = [];
  for (const h of history) {
    const pattern = patternFor(h, s);
    if (waiting.has(h.machine.machineId) && !pattern) {
      const late = night.minutesLeft <= LATE_MINUTES;
      out.push({
        machine: h.machine,
        phrase: late ? 'Cold feet' : 'Playing hard to get',
        why: late ? `${night.minutesLeft} minutes left and you have not played it tonight.` : 'You have not played it yet tonight.',
        advice: late ? 'Go now. No score means no points.' : 'Go say hello before the night closes. No score means no points.',
        tone: 'work'
      });
      continue;
    }
    if (pattern) out.push({ machine: h.machine, ...pattern });
    else if (h.nights.length === 0) continue;
    else if (best && h === best) out.push({ machine: h.machine, phrase: 'True love', why: `Your best machine: ${pts(h.averagePoints)} a night.`, advice: 'Keep it going.', tone: 'good' });
    else if (worst && h === worst) out.push({ machine: h.machine, phrase: 'Tough love', why: `Your hardest machine: ${pts(h.averagePoints)} a night.`, advice: 'Give it two extra games this week.', tone: 'work' });
    else out.push({ machine: h.machine, phrase: 'Still getting to know each other', why: `${pts(h.averagePoints)} a night over ${weeksWord(h.nights.length)}. No pattern yet.`, advice: 'Keep playing it and the Dr. will have more to say.', tone: 'plain' });
  }
  return out;
}

// ---- Tonight's prescription ----

export interface Prescription {
  /** The phrase from the phrase book that heads the card. */
  phrase: string;
  machine: SMachine;
  /** What the Dr. says, in one or two sentences. */
  says: string;
  /** "2 teams in line", "Nobody in line", "You are next". */
  lineNote: string;
  /** Where the button goes, if there is something to do. */
  action?: { label: string; to: string };
  /** A second choice, for when the line is long. */
  second?: { machine: SMachine; phrase: string };
}

interface Candidate {
  machine: SMachine;
  phrase: string;
  says: string;
  /** Bigger is better. Places gained, points on offer, and how long the line is all go into it. */
  weight: number;
}

const times = (k: number) => (k === 1 ? 'once' : k === 2 ? 'twice' : `${k} times`);

/**
 * The one machine to play next, and why. Undefined when the night is closed, or the team is not
 * playing this week.
 *
 * How it picks (these are a first set of rules, meant to be tuned):
 *   1. For every machine in play, find how many places the team would climb with a score it
 *      has already proven it can get there (its best ever on that machine).
 *   2. A machine the team has not played tonight always counts, because it is worth nothing
 *      until they do.
 *   3. A long line counts against a machine.
 *   4. In the last 20 minutes, unplayed machines go to the top.
 *   5. The best one is the prescription. The runner-up is the second choice.
 */
export function prescription(s: SampleState, teamId: string): Prescription | undefined {
  const night = nightStatus(s);
  if (!night.open) return undefined;
  const tonight = teamTonight(s, teamId);
  if (!tonight.row) return undefined;

  const history = machineHistory(s, teamId);
  const lines = linesView(s);
  const myLine = lineFor(s, teamId);
  const late = night.minutesLeft <= LATE_MINUTES;
  const candidates: Candidate[] = [];
  let closest: { machine: SMachine; gap: number } | undefined;

  for (const machineId of countedMachines(s, night.week)) {
    const m = machineOf(s, machineId);
    const h = history.find((x) => x.machine.machineId === machineId);
    const board = machineBoard(s, night.week.week, machineId);
    const mine = board.find((r) => r.team.teamId === teamId);
    const others = board.filter((r) => r.team.teamId !== teamId);
    const inLine = lines.find((l) => l.machine.machineId === machineId)?.teams.filter((t) => t.teamId !== teamId).length ?? 0;
    const linePenalty = inLine * 0.5;
    const proven = h?.bestEver ?? 0;

    if (!mine) {
      // Worth nothing until they play it. If they have history, say how it usually goes.
      const usual = h && h.nights.length > 0 ? ` You average ${h.averagePoints} points a night on it.` : '';
      candidates.push({
        machine: m,
        phrase: late ? 'Cold feet' : 'Playing hard to get',
        says: late
          ? `Cold feet? ${night.minutesLeft} minutes left and ${m.name} still has not heard from you. No score means no points.`
          : `${m.name} is playing hard to get. Go say hello. Even last place there is a point.${usual}`,
        weight: (late ? 100 : 3) + (h?.averagePoints ?? 1) - linePenalty
      });
      continue;
    }

    const above = others.filter((r) => r.best.score > mine.best.score).sort((a, b) => a.best.score - b.best.score);
    const next = above[0];
    if (next) {
      const gap = next.best.score - mine.best.score;
      if (!closest || gap / mine.best.score < closest.gap) closest = { machine: m, gap: gap / mine.best.score };
      // Would their proven best pass anyone?
      const passed = above.filter((r) => proven > r.best.score).length;
      if (passed > 0) {
        const newRank = mine.rank - passed;
        const target = above[passed - 1]!.best.score;
        const done = h ? h.nights.flatMap((x) => x.scores).filter((x) => x > target).length : 0;
        candidates.push({
          machine: m,
          phrase: 'Swipe right',
          says: `Swipe right on ${m.name}. Beat ${shortScore(target)} and you are ${ordinal(newRank)} there, and you have done that ${times(done)} this season.`,
          weight: passed - linePenalty
        });
      } else if (gap / mine.best.score <= 0.1) {
        candidates.push({
          machine: m,
          phrase: 'The one that got away',
          says: `${m.name} is the one that got away: ${shortScore(gap)} short of ${ordinal(mine.rank - 1)}. One more try and it is yours.`,
          weight: 0.75 - linePenalty
        });
      }
    } else if (others.length > 0) {
      // They hold 1st. Is anyone close enough to take it?
      const chaser = [...others].sort((a, b) => b.best.score - a.best.score)[0]!;
      const lead = mine.best.score - chaser.best.score;
      if (lead / mine.best.score <= 0.1) {
        candidates.push({
          machine: m,
          phrase: "It's a keeper",
          says: `${m.name} is a keeper, but ${chaser.team.teamName} is only ${shortScore(lead)} back. One more good game locks it in.`,
          weight: 0.9 - linePenalty
        });
      }
    }
  }

  const lineNoteFor = (machineId: string) => {
    if (myLine?.machine.machineId === machineId) return `You are ${placeInLine(myLine.position)}.`;
    const count = lines.find((l) => l.machine.machineId === machineId)?.teams.length ?? 0;
    return count === 0 ? 'Nobody in line.' : `${count} ${count === 1 ? 'team' : 'teams'} in line.`;
  };

  candidates.sort((a, b) => b.weight - a.weight);
  const pick = candidates[0];

  if (!pick) {
    // Every machine played and nothing they have proven would move them up.
    const m = closest?.machine ?? tonight.played[0]?.machine;
    if (!m) return undefined;
    return {
      phrase: 'Doctor says relax',
      machine: m,
      says: closest
        ? `You have done the rounds. Play for fun, or go back to ${m.name}, the one that got away.`
        : 'You have done the rounds, and you are on top everywhere you played. Play for fun.',
      lineNote: lineNoteFor(m.machineId),
      action: myLine?.machine.machineId === m.machineId ? undefined : { label: `Get in line for ${m.name}`, to: `/lines/join/${m.machineId}` }
    };
  }

  let says = pick.says;
  let phrase = pick.phrase;
  let action: Prescription['action'] = { label: `Get in line for ${pick.machine.name}`, to: `/lines/join/${pick.machine.machineId}` };
  if (myLine?.machine.machineId === pick.machine.machineId) {
    // Already in the right line.
    phrase = 'Going steady';
    says = `Stay put. You are ${placeInLine(myLine.position)} for ${pick.machine.name}, and that is the one I would pick. ${pick.says}`;
    action = undefined;
  } else if (myLine) {
    says = `${pick.says} That means leaving the ${myLine.machine.name} line: you can only be in one.`;
    action = { label: `Switch to the ${pick.machine.name} line`, to: `/lines/join/${pick.machine.machineId}` };
  }
  const second = candidates.find((c) => c.machine.machineId !== pick.machine.machineId);
  return {
    phrase,
    machine: pick.machine,
    says,
    lineNote: lineNoteFor(pick.machine.machineId),
    action,
    second: second ? { machine: second.machine, phrase: second.phrase } : undefined
  };
}

// ---- Doctor's orders: the pep talk after check-in ----

export interface DoctorsOrders {
  /** "Week 5" */
  heading: string;
  /** Two to four short lines of advice for tonight, most useful first. */
  lines: string[];
}

/**
 * What the Dr. tells a team as the night starts, from how it has played in earlier weeks.
 * Undefined when the night is closed or the team has nothing to go on yet.
 */
export function doctorsOrders(s: SampleState, teamId: string): DoctorsOrders | undefined {
  const night = nightStatus(s);
  if (!night.open) return undefined;
  const inPlay = new Set(countedMachines(s, night.week));
  const statuses = machineStatuses(s, teamId).filter((x) => inPlay.has(x.machine.machineId));
  const find = (...phrases: string[]) => statuses.find((x) => phrases.includes(x.phrase));
  const lines: string[] = [];

  // Where they stand in the season, and who is in the way.
  const table = season(s).option1;
  const me = table.find((r) => r.team.teamId === teamId);
  if (me) {
    const cut = table.find((r) => r.rank === 4);
    if (me.rank <= 4) lines.push(`You are ${ordinal(me.rank)} in the season. Top 4 make the finals, so protect it.`);
    else if (cut) {
      const gap = cut.points - me.points;
      const wheel = table.find((r) => r.rank === me.rank - 1);
      lines.push(`You are ${ordinal(me.rank)}, ${gap} ${gap === 1 ? 'point' : 'points'} off the top 4.${wheel && me.rank === 5 ? ` ${wheel.team.teamName} is your third wheel.` : ''}`);
    }
  }

  const sure = find('Soulmate', "It's a keeper", 'True love', 'Low maintenance', 'Going steady');
  if (sure) lines.push(`${sure.machine.name}: ${sure.phrase.toLowerCase()}. Bank that one first.`);
  const work = find('Love takes work', 'High maintenance', 'Slow burn');
  if (work) lines.push(`${work.machine.name}: ${work.phrase.toLowerCase()}. ${work.advice}`);
  const hard = find('Tough love', 'Hot and cold', 'The ex', 'Honeymoon phase', "It's complicated", 'Ghosted');
  if (hard && hard.machine.machineId !== work?.machine.machineId) lines.push(`${hard.machine.name}: ${hard.phrase.toLowerCase()}. ${hard.advice}`);

  if (lines.length === 0) return undefined;
  lines.push('Play every machine in the lineup. No score means no points.');
  return { heading: `Week ${currentWeek(s).week}`, lines: lines.slice(0, 4) };
}
