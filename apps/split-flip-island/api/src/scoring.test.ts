import { describe, expect, it } from 'vitest';
import { rankChange, rankPoints, rankTotals, runningRanks, scoreNight } from './scoring.js';

describe('rankPoints', () => {
  it('gives 1st place as many points as there are teams', () => {
    const pts = rankPoints(new Map([['a', 300], ['b', 200], ['c', 100]]), 5);
    expect(pts.get('a')).toBe(5);
    expect(pts.get('b')).toBe(4);
    expect(pts.get('c')).toBe(3);
  });

  it('lets tied teams share the higher points', () => {
    const pts = rankPoints(new Map([['a', 100], ['b', 100], ['c', 50]]), 3);
    expect(pts.get('a')).toBe(3);
    expect(pts.get('b')).toBe(3);
    expect(pts.get('c')).toBe(1);
  });
});

describe('scoreNight', () => {
  const scores = [
    { teamId: 'a', machineId: 'm1', score: 100 },
    { teamId: 'a', machineId: 'm1', score: 900 }, // best of two counts
    { teamId: 'b', machineId: 'm1', score: 500 },
    { teamId: 'b', machineId: 'm2', score: 50 },
    { teamId: 'a', machineId: 'm3', score: 999 } // m3 is broken tonight: ignored
  ];
  const result = scoreNight(scores, ['m1', 'm2'], 3);

  it('counts each team best score per machine', () => {
    const m1 = result.boards.get('m1')!;
    expect(m1[0]).toMatchObject({ teamId: 'a', best: 900, attempts: 2, points: 3 });
    expect(m1[1]).toMatchObject({ teamId: 'b', best: 500, points: 2 });
  });

  it('drops machines that are out for the night', () => {
    expect(result.boards.has('m3')).toBe(false);
  });

  it('computes both scoring options', () => {
    expect(result.machinePoints.get('a')).toBe(3); // m1 only
    expect(result.machinePoints.get('b')).toBe(2 + 3); // m1 2nd + m2 1st
    expect(result.nightPoints.get('b')).toBe(3); // won the night
    expect(result.nightPoints.get('a')).toBe(2);
  });
});

describe('rankTotals', () => {
  it('includes teams with no points and shares ranks on ties', () => {
    const rows = rankTotals(new Map([['a', 10], ['b', 10]]), ['a', 'b', 'c']);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(rows[2]).toMatchObject({ teamId: 'c', points: 0 });
  });
});

describe('runningRanks', () => {
  const teams = ['a', 'b', 'c'];
  const ranks = runningRanks(
    [
      new Map([['a', 10], ['b', 6], ['c', 2]]),
      new Map([['a', 1], ['b', 8]]), // c missed the night
      new Map([['c', 20]])
    ],
    teams
  );

  it('ranks teams on their running total after each night', () => {
    expect(Object.fromEntries(ranks[0])).toEqual({ a: 1, b: 2, c: 3 });
    expect(Object.fromEntries(ranks[1])).toEqual({ a: 2, b: 1, c: 3 }); // 11 vs 14 vs 2
    expect(Object.fromEntries(ranks[2])).toEqual({ a: 3, b: 2, c: 1 }); // 11 vs 14 vs 22
  });

  it('shares a rank when running totals tie', () => {
    const tied = runningRanks([new Map([['a', 5], ['b', 3]]), new Map([['b', 2]])], teams);
    expect(Object.fromEntries(tied[1])).toEqual({ a: 1, b: 1, c: 3 });
  });
});

describe('rankChange', () => {
  it('is positive when a team moves up and negative when it drops', () => {
    const lastWeek = new Map([['a', 1], ['b', 4], ['c', 3]]);
    expect(rankChange(lastWeek, 'b', 2)).toBe(2);
    expect(rankChange(lastWeek, 'a', 3)).toBe(-2);
    expect(rankChange(lastWeek, 'c', 3)).toBe(0);
  });

  it('is undefined with no earlier night to compare against', () => {
    expect(rankChange(undefined, 'a', 1)).toBeUndefined();
  });
});
