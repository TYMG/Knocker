// Everything a page can do to the sample league. Each action changes the made-up data in the
// browser and nothing else: no request is sent and nothing is saved on a server. The data is kept
// for the browser tab, so a refresh keeps your changes; "Start over" puts the story back.
//
// The league rules themselves live in shared/league/rules.ts, the same code the server runs.
// This file adds only what the sample needs: switching who you are, the guided story, the clock.

import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { inTheRunning, NO_SHOW_LIMIT, noShowCount, teamsIn, alreadyChallenged, canPlayTonight, challengeView, currentWeek, finalsPool, subProblem, subsUsed, finalsStep, finalsUsed, machine, season, seasonHigh, team, tonightRows, weekOf, type Bracket, type SeasonOption } from './league';
import { buildSeed, MY_TEAM } from './seed';
import { buildFreshLeague, HELPERS, helperScore, helperTeam } from './fresh';
import { addMinutes as plusMinutes, at, clockLabel, longDate, ordinal } from './time';
import type { Role, SampleState, SFinal, SScore } from './types';
import { addLog, fmt, leaveLines, lineEvent, lineOf, makeLeagueRules, names, type Current, nextId, refreshTurns, slug, startWeek, syncLive, TURN_MS } from '../../../shared/league/rules';

export { startWeek, TURN_MS };

/** Bump this when the shape of the sample data changes, so old saved copies are ignored. */
const SAVED_KEY = 'sfi-sample-v2';

/** The sample league as last saved in this tab (or the story's start). */
export function loadSavedSample(): SampleState {
  return load();
}

function load(): SampleState {
  try {
    const saved = sessionStorage.getItem(SAVED_KEY);
    if (saved) return JSON.parse(saved) as SampleState;
  } catch {
    // No storage (private browsing): start from the story every time.
  }
  return buildSeed();
}

export function saveSample(state: SampleState) {
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(state));
  } catch {
    // Fine: the sample still works until the tab closes.
  }
}

/** Repeatable randomness for the story's helper teams, so the demo plays the same way each time. */
const storyRand = (s: SampleState) => {
  let x = (s.seq * 2654435761) >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), x | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const slice = createSlice({
  name: 'sample',
  initialState: load,
  reducers: {
    ...makeLeagueRules(current as Current, MY_TEAM),
    /** Puts a whole league in place: the live league from the server, or the sample back. */
    loadLeague(_s: SampleState, a: PayloadAction<SampleState>) {
      return a.payload;
    },
    // ---- Who you are ----

    /** The switcher in the sample bar. */
    setRole(s: SampleState, a: PayloadAction<Role>) {
      s.role = a.payload;
    },
    /** Sample strip: is the admin you are viewing as also on a team (Left & Right)? */
    setAdminOnTeam(s: SampleState, a: PayloadAction<boolean>) {
      s.adminOnTeam = a.payload;
    },
    logInAs(s: SampleState, a: PayloadAction<string>) {
      s.myTeamId = a.payload;
      s.role = 'team';
    },
    logInAdmin(s: SampleState) {
      s.role = 'admin';
    },
    logOut(s: SampleState) {
      s.role = 'visitor';
    },
    /** Sample only: wind the turn clock forward so the demo does not have to wait. */
    sampleSkipTurnClock(s: SampleState, a: PayloadAction<{ machineId: string; ms: number }>) {
      const line = lineOf(s, a.payload.machineId);
      if (line.upAt) line.upAt -= a.payload.ms;
    },
    /** Sample only: set the clock, so the check-in countdown can be shown. */
    sampleSetClock(s: SampleState, a: PayloadAction<string>) {
      const week = currentWeek(s);
      s.now = at(week.date, a.payload);
    },
    /** For the sample only: pretend the team who was challenged said yes. */
    theyAccepted(s: SampleState, a: PayloadAction<string>) {
      const c = s.challenges.find((x) => x.id === a.payload);
      if (c && c.status === 'waiting') c.status = 'live';
    },

    // ---- The guided "new league" story (layout/StoryCard.tsx) ----

    /** Starts the story: an empty league on week 1, before anyone has signed up. */
    startStory() {
      return buildFreshLeague();
    },
    setStoryStep(s: SampleState, a: PayloadAction<number>) {
      if (s.story) s.story.step = a.payload;
    },
    /** The helper couples sign up and wait for an admin, like you did. */
    storyHelpersSignUp(s: SampleState) {
      HELPERS.forEach((h, i) => {
        if (s.teams.some((t) => t.teamId === h[0])) return;
        s.teams.push(helperTeam(h, s.now, startWeek(s), i));
        addLog(s, 'league', 'A new team signed up and is waiting for approval');
      });
    },
    /** In the real app the night opens by itself at 7 PM. The story does it on cue. */
    storyOpenNight(s: SampleState) {
      const week = s.weeks.find((w) => w.state === 'upcoming');
      if (!week || s.weeks.some((w) => w.state === 'open')) return;
      week.state = 'open';
      s.now = at(week.date, '19:02');
      addLog(s, 'league', `Week ${week.week} opened`);
    },
    /** The helper couples walk in and tap "I'm here". */
    storyHelpersArrive(s: SampleState) {
      s.now = plusMinutes(s.now, 6);
      for (const [teamId] of HELPERS) {
        const t = s.teams.find((x) => x.teamId === teamId && x.status === 'approved');
        if (!t || s.checkIns[teamId]) continue;
        (s.checkInRequests ??= {})[teamId] = s.now;
        addLog(s, 'league', `${t.teamName} says they are here`);
      }
    },
    /** Thirty minutes of play: every checked-in helper posts a game or two. */
    storyFastForward(s: SampleState) {
      const week = s.weeks.find((w) => w.state === 'open');
      if (!week) return;
      const rand = storyRand(s);
      const closes = at(week.date, s.night.closesAt);
      for (const [teamId, teamName, , skill] of HELPERS) {
        if (!s.checkIns[teamId]) continue;
        for (const machineId of week.machineIds) {
          if (week.out[machineId] || rand() < 0.45) continue;
          const games = rand() < 0.6 ? 1 : 2;
          for (let g = 0; g < games; g++) {
            const when = plusMinutes(s.now, 3 + Math.floor(rand() * 26));
            s.scores.push(helperScore(() => nextId(s, 's'), week.week, teamId, machineId, skill, when, rand()));
            addLog(s, 'score', `${teamName} submitted a score on ${machine(s, machineId).name}`);
          }
        }
      }
      const next = plusMinutes(s.now, 30);
      s.now = next < closes ? next : closes;
    },

    /** Puts the whole story back, keeping who you are viewing as. */
    resetSample(s: SampleState) {
      return { ...buildSeed(), role: s.role, adminOnTeam: s.adminOnTeam };
    }
  }
});

export const sampleReducer = slice.reducer;
export const sample = slice.actions;
