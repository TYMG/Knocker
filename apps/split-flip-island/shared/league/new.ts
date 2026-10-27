// A brand-new, empty league: the starting point the server saves when a season is set up
// (api/scripts/league-init.ts). Weeks 1-8 are league nights a week apart; week 9 is finals.
import type { SampleState, SWeek } from './types.js';
import { at } from './time.js';

export interface NewLeagueOptions {
  /** Week 1's date, YYYY-MM-DD. */
  firstNight: string;
  /** Bar-clock times, 24-hour, Eastern: "19:00" and "21:00". */
  opensAt: string;
  closesAt: string;
  teamCap?: number;
  location?: { locationId: string; name: string };
  machines?: { machineId: string; name: string }[];
}

const plusDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function newLeague(o: NewLeagueOptions, now: string): SampleState {
  const location = o.location ?? { locationId: 'lymans', name: "Lyman's" };
  const machines = (o.machines ?? []).map((m) => ({ ...m, locationId: location.locationId, removed: false }));
  const weeks: SWeek[] = Array.from({ length: 9 }, (_, i) => ({
    week: i + 1, date: plusDays(o.firstNight, i * 7), state: 'upcoming', machineIds: machines.map((m) => m.machineId), out: {}
  }));
  return {
    now,
    role: 'visitor',
    myTeamId: '',
    adminOnTeam: false,
    adminName: '',
    teamCap: o.teamCap ?? 12,
    teams: [],
    locations: [location],
    machines,
    weeks,
    skippedDates: [],
    scores: [],
    lines: [],
    forfeits: [],
    noShows: [],
    subs: [],
    pendingSubs: {},
    lineEvents: [],
    checkIns: {},
    checkInRequests: {},
    message: null,
    challenges: [],
    log: [{ id: 'l1', at: now, kind: 'league', action: `The season was set up: week 1 is ${o.firstNight}, nights run ${o.opensAt} to ${o.closesAt}` }],
    feed: [],
    waitlist: [],
    night: { opensAt: o.opensAt, closesAt: o.closesAt, extraMinutes: 0 },
    finals: {
      championship: { title: 'Championship', teamIds: [], games: [] },
      secondChance: { title: 'Second-chance final', teamIds: [], games: [] }
    },
    seq: 1
  };
}

/** When tonight's league night opens, as UTC ISO (from the week's date and the bar-clock time). */
export const opensAtIso = (s: SampleState, date: string) => at(date, s.night.opensAt);
