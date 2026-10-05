// League scoring. Pure functions, no AWS calls, so they're easy to test.
//
// Machine points: each team's best score per machine per night is ranked.
// 1st place earns as many points as there are teams, down to 1. Ties share the
// higher points. No score on a machine = 0.
//
// Option 1 (machine points add up): season total = sum of machine points.
// Option 2 (rank the night): each night's machine-point totals are ranked the
// same way, and that rank earns league points. Teams with no scores that night get 0.

export interface ScoreInput {
  teamId: string;
  machineId: string;
  score: number;
}

export interface BoardEntry {
  teamId: string;
  best: number;
  bestScore: ScoreInput;
  attempts: number;
  points: number;
}

export interface NightResult<S extends ScoreInput> {
  boards: Map<string, (BoardEntry & { bestScore: S })[]>; // machineId -> rows, best first
  machinePoints: Map<string, number>; // teamId -> tonight's machine points (option 1)
  nightPoints: Map<string, number>; // teamId -> tonight's league points (option 2)
}

/** Competition ranking: points = teamCount minus the number of strictly better values. */
export function rankPoints(values: Map<string, number>, teamCount: number): Map<string, number> {
  const all = [...values.values()];
  const out = new Map<string, number>();
  for (const [teamId, value] of values) {
    const better = all.filter((v) => v > value).length;
    out.set(teamId, Math.max(teamCount - better, 1));
  }
  return out;
}

export function scoreNight<S extends ScoreInput>(scores: S[], machineIds: string[], teamCount: number): NightResult<S> {
  const boards = new Map<string, (BoardEntry & { bestScore: S })[]>();
  const machinePoints = new Map<string, number>();

  for (const machineId of machineIds) {
    const byTeam = new Map<string, { best: S; attempts: number }>();
    for (const s of scores) {
      if (s.machineId !== machineId) continue;
      const current = byTeam.get(s.teamId);
      if (!current) byTeam.set(s.teamId, { best: s, attempts: 1 });
      else {
        current.attempts += 1;
        if (s.score > current.best.score) current.best = s;
      }
    }
    const bests = new Map([...byTeam].map(([teamId, v]) => [teamId, v.best.score]));
    const points = rankPoints(bests, teamCount);
    const rows = [...byTeam].map(([teamId, v]) => ({
      teamId,
      best: v.best.score,
      bestScore: v.best,
      attempts: v.attempts,
      points: points.get(teamId) ?? 0
    }));
    rows.sort((a, b) => b.best - a.best);
    boards.set(machineId, rows);
    for (const row of rows) machinePoints.set(row.teamId, (machinePoints.get(row.teamId) ?? 0) + row.points);
  }

  const nightPoints = rankPoints(machinePoints, teamCount);
  return { boards, machinePoints, nightPoints };
}

/** Turns team totals into ranked standings (ties share a rank). Teams with no points still appear. */
export function rankTotals(totals: Map<string, number>, teamIds: string[]) {
  const rows = teamIds.map((teamId) => ({ teamId, points: totals.get(teamId) ?? 0 }));
  rows.sort((a, b) => b.points - a.points);
  return rows.map((row) => ({ ...row, rank: 1 + rows.filter((r) => r.points > row.points).length }));
}
