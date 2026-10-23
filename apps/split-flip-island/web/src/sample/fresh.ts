// The guided story: a brand-new league on the evening of week 1, before anyone has signed up.
// It shows the whole loop in order: sign up, approval, the night opening, checking in, playing,
// and closing the night. A few made-up couples ("helpers") sign up, arrive and play on cue, so
// the room fills up around you. See layout/StoryCard.tsx for the steps.

import { teamPhoto } from './art';
import { at } from './time';
import type { SampleState, SScore, STeam, SWeek } from './types';

export const STORY_WEEK1 = '2026-10-14';

/** The couples who join alongside you. id, name, players, how strong (1 is average). */
export const HELPERS: [string, string, [string, string], number][] = [
  ['tilt-me-tender', 'Tilt Me Tender', ['Ava', 'Jonah'], 1.25],
  ['nudge-nudge', 'Nudge Nudge', ['Priya', 'Sam'], 1.15],
  ['outlane-lovers', 'Outlane Lovers', ['Dee', 'Marcus'], 1.05],
  ['flip-city', 'Flip City', ['Nico', 'Tess'], 0.95]
];

/** Typical scores, for the helpers' games. */
export const TYPICAL: Record<string, number> = { godzilla: 40_000_000, 'pulp-fiction': 15_000_000, 'south-park': 24_000_000, venom: 95_000_000, jaws: 30_000_000 };

const LATER = ['2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09'];

export function buildFreshLeague(): SampleState {
  const four = ['godzilla', 'pulp-fiction', 'south-park', 'venom'];
  const weeks: SWeek[] = [STORY_WEEK1, ...LATER].map((date, i) => ({ week: i + 1, date, state: 'upcoming', machineIds: four, out: {} }));
  return {
    now: at(STORY_WEEK1, '18:30'),
    role: 'visitor',
    myTeamId: '',
    adminOnTeam: false,
    adminName: 'Matt',
    teamCap: 12,
    teams: [],
    locations: [{ locationId: 'lymans', name: "Lyman's" }],
    machines: Object.keys(TYPICAL).map((machineId) => ({
      machineId,
      name: { godzilla: 'Godzilla', 'pulp-fiction': 'Pulp Fiction', 'south-park': 'South Park', venom: 'Venom', jaws: 'Jaws' }[machineId]!,
      locationId: 'lymans',
      removed: false
    })),
    weeks,
    skippedDates: [],
    scores: [],
    lines: [],
    checkIns: {},
    checkInRequests: {},
    message: null,
    challenges: [],
    log: [{ id: 'l1', at: at(STORY_WEEK1, '12:00'), kind: 'league', action: 'Sign-ups opened for the new season' }],
    feed: [],
    waitlist: [],
    night: { opensAt: '19:00', closesAt: '21:00', extraMinutes: 0 },
    finals: {
      championship: { title: 'Championship', teamIds: [], games: [] },
      secondChance: { title: 'Second-chance final', teamIds: [], games: [] }
    },
    seq: 1,
    story: { step: 0 }
  };
}

export function helperTeam([teamId, teamName, players]: (typeof HELPERS)[number], now: string, firstWeek: number, i: number): STeam {
  return {
    teamId, teamName, players, phone1: `(202) 555-02${10 + i * 2}`, phone2: `(202) 555-02${11 + i * 2}`,
    photo: teamPhoto(teamName), status: 'pending', createdAt: now, firstWeek, smsOptIn: i % 2 === 0
  };
}

/** One helper game: a believable score for that team on that machine. */
export function helperScore(seq: () => string, week: number, teamId: string, machineId: string, skill: number, now: string, rand: number): SScore {
  const swing = Math.exp((rand - 0.5) * 1.4);
  const score = Math.max(Math.round((TYPICAL[machineId] ?? 20_000_000) * skill * swing / 10) * 10, 250_000);
  return {
    scoreId: seq(), week, teamId, machineId, score, at: now, enteredBy: 'team', photoSource: 'camera',
    check: 'unchecked', status: 'active', history: [{ at: now, text: `Submitted ${score.toLocaleString('en-US')}` }]
  };
}
