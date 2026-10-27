// Everything a page can do to the sample league. Each action changes the made-up data in the
// browser and nothing else: no request is sent and nothing is saved on a server. The data is kept
// for the browser tab, so a refresh keeps your changes; "Start over" puts the story back.
//
// Admin actions also write to the league log, the way the real app must.

import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { teamPhoto } from './art';
import { inTheRunning, NO_SHOW_LIMIT, noShowCount, teamsIn, alreadyChallenged, canPlayTonight, challengeView, currentWeek, finalsPool, subProblem, subsUsed, finalsStep, finalsUsed, machine, season, seasonHigh, team, tonightRows, weekOf, type Bracket, type SeasonOption } from './league';
import { buildSeed, MY_TEAM } from './seed';
import { buildFreshLeague, HELPERS, helperScore, helperTeam } from './fresh';
import { addMinutes as plusMinutes, at, clockLabel, longDate, ordinal } from './time';
import type { Role, SampleState, SFinal, SScore } from './types';

/** Bump this when the shape of the sample data changes, so old saved copies are ignored. */
const SAVED_KEY = 'sfi-sample-v2';

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

const nextId = (s: SampleState, prefix: string) => `${prefix}${++s.seq}`;

function addLog(s: SampleState, kind: 'score' | 'admin' | 'league', action: string, reason?: string) {
  s.log.unshift({ id: nextId(s, 'l'), at: s.now, kind, action, reason: reason?.trim() || undefined });
}

const slug = (name: string, taken: string[]) => {
  const base = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
  let idValue = base;
  for (let n = 2; taken.includes(idValue); n++) idValue = `${base}-${n}`;
  return idValue;
};

/** A team at the front of a line has this long to start its game. */
export const TURN_MS = 5 * 60 * 1000;

/**
 * Starts the clock for whoever is now at the front of each line. Lines from the seed have no
 * record yet: their front team is taken to be playing already, so nobody is forfeited on load.
 */
function refreshTurns(s: SampleState) {
  for (const line of s.lines) {
    const head = line.teamIds[0];
    // '' means "nobody up", which is different from a seed line that has no record at all.
    if (!head) { line.upTeamId = ''; line.upAt = undefined; line.started = undefined; continue; }
    if (line.upTeamId === head) continue;
    if (line.upTeamId === undefined) {
      line.upTeamId = head; line.started = true; continue;
    }
    line.upTeamId = head; line.upAt = Date.now(); line.started = false; line.turnId = nextId(s, 't');
  }
}

function lineEvent(s: SampleState, kind: 'started' | 'forfeit', teamId: string, machineId: string) {
  s.lineEvents = [{ id: nextId(s, 'e'), kind, teamId, machineId, real: Date.now() }, ...(s.lineEvents ?? [])].slice(0, 20);
}


// ---- Finals, run by an admin ----

/** Keeps the public "Game N is on" panel in step with the play order and the scores in. */
function syncLive(f: SFinal) {
  const i = f.games.length - 1;
  const g = f.games[i];
  if (!g || g.places || !g.order || !g.machineId) { f.live = undefined; return; }
  const scores = g.scores ?? {};
  const waiting = g.order.filter((id) => scores[id] === undefined);
  f.live = { game: i, scores: { ...scores }, playing: waiting[0], next: waiting[1] };
}

/** Places for one game: the higher score is better; equal scores share the better place. */
function placesFor(order: string[], scores: Record<string, number>): Record<string, number> {
  const places: Record<string, number> = {};
  for (const id of order) places[id] = 1 + order.filter((o) => scores[o]! > scores[id]!).length;
  return places;
}

function leaveLines(s: SampleState, teamId: string, onlyMachineId?: string) {
  for (const line of s.lines) {
    if (onlyMachineId && line.machineId !== onlyMachineId) continue;
    line.teamIds = line.teamIds.filter((id) => id !== teamId);
    line.notify = line.notify.filter((id) => id !== teamId);
    delete line.joinedAt[teamId];
  }
  refreshTurns(s);
}

function lineOf(s: SampleState, machineId: string) {
  let line = s.lines.find((l) => l.machineId === machineId);
  if (!line) s.lines.push((line = { machineId, teamIds: [], joinedAt: {}, notify: [], upTeamId: '' }));
  return line;
}

/** A team that joins now plays from this week: the current week if it has not opened yet, otherwise the next. */
export const startWeek = (s: SampleState) => {
  const w = currentWeek(s);
  return w.state === 'upcoming' ? w.week : w.week + 1;
};

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

const names = (s: SampleState, x: { teamId: string; machineId: string }) => ({ who: team(s, x.teamId).teamName, what: machine(s, x.machineId).name });
const fmt = (n: number) => n.toLocaleString('en-US');

const slice = createSlice({
  name: 'sample',
  initialState: load,
  reducers: {
    // ---- Who you are ----

    /** The switcher in the sample bar. */
    setRole(s, a: PayloadAction<Role>) {
      s.role = a.payload;
    },
    /** Sample strip: is the admin you are viewing as also on a team (Left & Right)? */
    setAdminOnTeam(s, a: PayloadAction<boolean>) {
      s.adminOnTeam = a.payload;
    },
    logInAs(s, a: PayloadAction<string>) {
      s.myTeamId = a.payload;
      s.role = 'team';
    },
    logInAdmin(s) {
      s.role = 'admin';
    },
    logOut(s) {
      s.role = 'visitor';
    },
    /** A new team waits for an admin, and is deleted if nobody approves it in 24 hours. */
    signUp(s, a: PayloadAction<{ teamName: string; phone1: string; phone2: string; smsOptIn?: boolean }>) {
      const teamName = a.payload.teamName.trim().replace(/\s+/g, ' ');
      const teamId = slug(teamName, s.teams.map((t) => t.teamId));
      s.teams.push({
        teamId, teamName, players: ['Player 1', 'Player 2'], phone1: a.payload.phone1, phone2: a.payload.phone2, photo: teamPhoto(teamName), smsOptIn: !!a.payload.smsOptIn,
        status: 'pending', createdAt: s.now, expiresAt: plusMinutes(s.now, 24 * 60), firstWeek: startWeek(s)
      });
      s.myTeamId = teamId;
      s.role = 'team';
      addLog(s, 'league', 'A new team signed up and is waiting for approval');
    },
    joinWaitlist(s, a: PayloadAction<string>) {
      s.waitlist.push({ id: nextId(s, 'w'), name: a.payload.trim() || 'Solo player', at: s.now });
    },

    // ---- Lines ----

    /** One line at a time: joining one leaves any other. */
    joinLine(s, a: PayloadAction<{ machineId: string; notify: boolean; teamId?: string }>) {
      const teamId = a.payload.teamId ?? s.myTeamId;
      // Check in first: no lines for a team that has not said it is here.
      if (!canPlayTonight(current(s), teamId)) return;
      leaveLines(s, teamId);
      const line = lineOf(s, a.payload.machineId);
      line.teamIds.push(teamId);
      line.joinedAt[teamId] = s.now;
      if (a.payload.notify) line.notify.push(teamId);
      refreshTurns(s);
    },
    leaveLine(s, a: PayloadAction<string | undefined>) {
      leaveLines(s, a.payload ?? s.myTeamId);
    },
    /** Admin: the team was not at the machine when its turn came. */
    lineToBack(s, a: PayloadAction<{ machineId: string; teamId: string }>) {
      const line = lineOf(s, a.payload.machineId);
      if (!line.teamIds.includes(a.payload.teamId)) return;
      line.teamIds = [...line.teamIds.filter((id) => id !== a.payload.teamId), a.payload.teamId];
      refreshTurns(s);
    },
    /** The team at the front tapped "We started": the honor system. */
    startTurn(s, a: PayloadAction<string | undefined>) {
      const teamId = a.payload ?? s.myTeamId;
      const line = s.lines.find((l) => l.teamIds[0] === teamId);
      if (!line || line.started) return;
      line.started = true;
      lineEvent(s, 'started', teamId, line.machineId);
    },
    /** Out of time (the clock), or an admin's call. The team comes off the line; the next team is up. */
    forfeitTurn(s, a: PayloadAction<{ machineId: string; teamId: string; by: 'clock' | 'admin' }>) {
      const { machineId, teamId, by } = a.payload;
      const line = lineOf(s, machineId);
      if (line.teamIds[0] !== teamId) return;
      if (by === 'clock' && (line.started || !line.upAt || Date.now() - line.upAt < TURN_MS)) return;
      const week = currentWeek(s).week;
      s.forfeits = [...(s.forfeits ?? []), { id: nextId(s, 'x'), teamId, machineId, week, at: s.now, by }];
      lineEvent(s, 'forfeit', teamId, machineId);
      const who = s.teams.find((t) => t.teamId === teamId)?.teamName ?? 'A team';
      const what = s.machines.find((m) => m.machineId === machineId)?.name ?? 'a machine';
      addLog(s, by === 'clock' ? 'league' : 'admin', `${who} forfeited their turn on ${what}`, by === 'clock' ? 'Did not start within 5 minutes' : 'Admin call: not at the machine');
      leaveLines(s, teamId, machineId);
    },
    /** Admin: forgive a forfeit, once per team per night. It stops counting; the team stays off the line. */
    forgiveForfeit(s, a: PayloadAction<string>) {
      const f = s.forfeits?.find((x) => x.id === a.payload);
      if (!f || f.forgiven) return;
      if ((s.forfeits ?? []).some((x) => x.teamId === f.teamId && x.forgiven && x.week === f.week)) return;
      f.forgiven = true;
      const who = s.teams.find((t) => t.teamId === f.teamId)?.teamName ?? 'A team';
      const what = s.machines.find((m) => m.machineId === f.machineId)?.name ?? 'a machine';
      addLog(s, 'admin', `Admin forgave ${who}'s forfeit on ${what} (one forgiveness per night)`);
    },
    forgivenSeen(s, a: PayloadAction<string>) {
      const f = s.forfeits?.find((x) => x.id === a.payload);
      if (f) f.forgivenSeen = true;
    },
    forfeitSeen(s, a: PayloadAction<string>) {
      const f = s.forfeits?.find((x) => x.id === a.payload);
      if (f) f.seen = true;
    },
    /** Sample only: wind the turn clock forward so the demo does not have to wait. */
    sampleSkipTurnClock(s, a: PayloadAction<{ machineId: string; ms: number }>) {
      const line = lineOf(s, a.payload.machineId);
      if (line.upAt) line.upAt -= a.payload.ms;
    },
    lineRemove(s, a: PayloadAction<{ machineId: string; teamId: string }>) {
      leaveLines(s, a.payload.teamId, a.payload.machineId);
    },

    // ---- Finals ----

    /** Lock in the four teams for a final, seeded from the season standings. */
    finalsLock(s, a: PayloadAction<{ bracket: Bracket; option: SeasonOption }>) {
      const rows = season(current(s))[a.payload.option].filter((r) => inTheRunning(r.team));
      const [from, to] = a.payload.bracket === 'championship' ? [0, 4] : [4, 8];
      const teamIds = rows.slice(from, to).map((r) => r.team.teamId);
      if (teamIds.length < 4) return;
      const f = s.finals[a.payload.bracket];
      f.teamIds = teamIds; f.games = []; f.live = undefined; f.locked = true; f.winnerId = undefined;
      addLog(s, 'admin', `Admin locked in the ${f.title.toLowerCase()}: ${teamIds.map((id) => team(current(s), id).teamName).join(', ')}`);
    },
    /** The team whose turn it is picks the machine, or (games 2 and 3) a spot in the play order. */
    finalsChoose(s, a: PayloadAction<{ bracket: Bracket; machineId?: string; spot?: number }>) {
      const f = s.finals[a.payload.bracket];
      if (!f.locked) return;
      const step = finalsStep(current(f) as SFinal);
      if (step.kind !== 'choose') return;
      const { machineId, spot } = a.payload;
      if (machineId) {
        if (finalsUsed(f).includes(machineId) || !finalsPool(current(s)).some((m) => m.machineId === machineId)) return;
      } else if (!spot || !step.canSpot || !step.spotsLeft.includes(spot)) return;
      if (step.mustMachine && !machineId) return;
      if (machineId && f.games[step.game]?.machineId) return;
      if (step.game === f.games.length) f.games.push({ machineId: '', places: null, picks: [] });
      const g = f.games[step.game]!;
      const picks = (g.picks ??= []);
      if (machineId) { g.machineId = machineId; picks.push({ teamId: step.teamId, pick: 'machine' }); }
      else picks.push({ teamId: step.teamId, pick: spot! });
      const name = team(current(s), step.teamId).teamName;
      if (step.game === 0) {
        // Game 1: the 1st seed picks the machine and everyone plays in seed order.
        g.order = [...f.teamIds];
      } else if (picks.length === f.teamIds.length) {
        // Everyone has chosen: the machine picker takes the spot nobody picked.
        const order: string[] = [];
        for (const n of [1, 2, 3, 4]) order.push(picks.find((p) => p.pick === n)?.teamId ?? picks.find((p) => p.pick === 'machine')!.teamId);
        g.order = order;
      }
      if (machineId) addLog(s, 'league', `${f.title}, game ${step.game + 1}: ${name} picked ${machine(current(s), machineId).name}`);
      syncLive(f);
    },
    /** The admin enters (or corrects) a team's score for the game being played. */
    finalsScore(s, a: PayloadAction<{ bracket: Bracket; teamId: string; score: number }>) {
      const f = s.finals[a.payload.bracket];
      const g = f.games[f.games.length - 1];
      if (!f.locked || !g || g.places || !g.order) return;
      g.scores = { ...(g.scores ?? {}), [a.payload.teamId]: a.payload.score };
      const snap = current(s);
      if (g.order.every((id) => g.scores![id] !== undefined)) {
        g.places = placesFor(g.order, g.scores);
        const first = g.order.find((id) => g.places![id] === 1)!;
        addLog(s, 'league', `${f.title}, game ${f.games.length}: ${team(snap, first).teamName} won ${machine(snap, g.machineId).name}`);
        const step = finalsStep(current(f) as SFinal);
        if (f.games.length === 3 && step.kind === 'done') {
          const totals = f.teamIds.map((id) => ({ id, t: f.games.reduce((sum, gm) => sum + (gm.places ? 5 - (gm.places[id] ?? 5) : 0), 0) }));
          f.winnerId = totals.sort((x, y) => y.t - x.t)[0]!.id;
          addLog(s, 'league', `${team(snap, f.winnerId).teamName} won the ${f.title.toLowerCase()}`);
        }
      }
      syncLive(f);
    },
    /** A tie at the top after game 3, settled by a one-ball playoff. */
    finalsPlayoff(s, a: PayloadAction<{ bracket: Bracket; winnerId: string }>) {
      const f = s.finals[a.payload.bracket];
      const step = finalsStep(current(f) as SFinal);
      if (step.kind !== 'playoff' || !step.tied.includes(a.payload.winnerId)) return;
      f.winnerId = a.payload.winnerId;
      addLog(s, 'league', `${team(current(s), f.winnerId).teamName} won the one-ball playoff and the ${f.title.toLowerCase()}`);
    },
    /** Start a final over: back to locking in the teams. */
    finalsReset(s, a: PayloadAction<Bracket>) {
      const f = s.finals[a.payload];
      f.games = []; f.live = undefined; f.locked = false; f.winnerId = undefined;
      addLog(s, 'admin', `Admin started the ${f.title.toLowerCase()} over`);
    },

    // ---- Scores ----

    /** A team posts a score. It counts right away and waits for an admin to check it. */
    submitScore(s, a: PayloadAction<{ machineId: string; score: number; photoSource: 'camera' | 'library'; photo?: string }>) {
      const week = currentWeek(s);
      const teamId = s.myTeamId;
      if (!canPlayTonight(current(s), teamId)) return;
      const { machineId, score, photoSource, photo } = a.payload;
      const { who, what } = names(s, { teamId, machineId });
      const before = tonightRows(current(s)).find((r) => r.team.teamId === teamId)?.rank;
      const high = seasonHigh(current(s), machineId)?.score;
      const flag = high && score > high * 1.5 ? "Far above this machine's best this season" : undefined;
      const history = [{ at: s.now, text: `${who} submitted ${fmt(score)}` }];
      if (flag) history.push({ at: s.now, text: `Flagged on its own: ${flag.charAt(0).toLowerCase()}${flag.slice(1)}` });
      s.scores.push({
        scoreId: nextId(s, 's'), week: week.week, teamId, machineId, score, at: s.now, enteredBy: 'team', photoSource, photo,
        check: flag ? 'flagged' : 'unchecked', flag, status: 'active', history
      });
      leaveLines(s, teamId, machineId);
      addLog(s, 'score', `${who} submitted a score on ${what}`);
      const after = tonightRows(current(s)).find((r) => r.team.teamId === teamId)?.rank;
      if (before && after && after < before) {
        s.feed.unshift({ id: nextId(s, 'f'), teamId, at: s.now, text: `You moved up to ${ordinal(after)} tonight.`, to: '/standings', linkLabel: 'See the standings' });
      }
    },
    /** Admin: a team's phone died, so the admin types the score in for them. */
    adminEnterScore(s, a: PayloadAction<{ teamId: string; machineId: string; score: number; reason: string; noPhoto: boolean; photo?: string; photoSource?: 'camera' | 'library' }>) {
      const { teamId, machineId, score, reason, noPhoto } = a.payload;
      const { who, what } = names(s, a.payload);
      s.scores.push({
        scoreId: nextId(s, 's'), week: currentWeek(s).week, teamId, machineId, score, at: s.now, enteredBy: 'admin', photoSource: noPhoto ? 'none' : (a.payload.photoSource ?? 'camera'), photo: noPhoto ? undefined : a.payload.photo,
        check: 'checked', checkedBy: s.adminName, status: 'active', reason,
        history: [{ at: s.now, text: `Entered by ${s.adminName} for ${who}: ${fmt(score)}. ${reason}` }]
      });
      leaveLines(s, teamId, machineId);
      addLog(s, 'admin', `Admin entered a score for ${who} on ${what}`, reason);
    },
    markChecked(s, a: PayloadAction<string>) {
      const x = s.scores.find((y) => y.scoreId === a.payload);
      if (!x || x.status === 'voided' || x.check === 'checked') return;
      check(s, x);
      const { who, what } = names(s, x);
      addLog(s, 'admin', `Admin checked ${who}'s ${what} score`);
    },
    /** Checks every not-yet-checked score for a team in a week. Scores that need a look are left alone. */
    markAllChecked(s, a: PayloadAction<{ teamId: string; week: number }>) {
      const list = s.scores.filter((x) => x.teamId === a.payload.teamId && x.week === a.payload.week && x.status === 'active' && x.check === 'unchecked');
      if (list.length === 0) return;
      for (const x of list) check(s, x);
      addLog(s, 'admin', `Admin checked ${list.length} of ${team(s, a.payload.teamId).teamName}'s scores`);
    },
    correctScore(s, a: PayloadAction<{ scoreId: string; score: number; reason: string }>) {
      const x = s.scores.find((y) => y.scoreId === a.payload.scoreId);
      if (!x) return;
      const { who, what } = names(s, x);
      x.history.push({ at: s.now, text: `Changed by ${s.adminName} from ${fmt(x.score)} to ${fmt(a.payload.score)}: ${a.payload.reason}` });
      x.score = a.payload.score;
      x.reason = a.payload.reason;
      x.check = 'checked';
      x.checkedBy = s.adminName;
      addLog(s, 'admin', `Admin changed ${who}'s ${what} score`, a.payload.reason);
    },
    /** A voided score stays on record and stops counting. Nothing is ever deleted. */
    voidScore(s, a: PayloadAction<{ scoreId: string; reason: string }>) {
      const x = s.scores.find((y) => y.scoreId === a.payload.scoreId);
      if (!x || x.status === 'voided') return;
      const { who, what } = names(s, x);
      x.status = 'voided';
      x.reason = a.payload.reason;
      x.history.push({ at: s.now, text: `Voided by ${s.adminName}: ${a.payload.reason}` });
      addLog(s, 'admin', `Admin voided ${who}'s ${what} score`, a.payload.reason);
    },

    // ---- Running the night ----

    /** A team taps "I'm here". It waits on the admin's Check In page until confirmed. */
    /** A team taps "I'm here", saying which partner (if any) has a sub tonight. */
    requestCheckIn(s, a: PayloadAction<string | { teamId?: string; subs?: { outPlayer: 0 | 1; subName: string }[] } | undefined>) {
      const p = typeof a.payload === 'object' ? a.payload : { teamId: a.payload };
      const teamId = p.teamId ?? s.myTeamId;
      if (s.checkIns[teamId]) return;
      const snap = current(s);
      const used = subsUsed(snap, teamId);
      // One sub per player per season, at most one partner out, and never someone in the league.
      const subs = (p.subs ?? []).filter((x) => !used[x.outPlayer] && !subProblem(snap, x.subName)).slice(0, 1);
      (s.checkInRequests ??= {})[teamId] = s.now;
      if (subs.length) (s.pendingSubs ??= {})[teamId] = subs.map((x) => ({ outPlayer: x.outPlayer, subName: x.subName.trim() }));
      else delete s.pendingSubs?.[teamId];
      addLog(s, 'league', `${team(s, teamId).teamName} says they are here${subs.length ? ' with a sub' : ''}`);
    },
    cancelCheckInRequest(s, a: PayloadAction<string | undefined>) {
      const teamId = a.payload ?? s.myTeamId;
      delete s.checkInRequests?.[teamId];
      delete s.pendingSubs?.[teamId];
    },
    /** The admin checks a team in, from a request or by hand at the door. A requested sub is used now. */
    checkIn(s, a: PayloadAction<string>) {
      const teamId = a.payload;
      s.checkIns[teamId] = s.now;
      delete s.checkInRequests?.[teamId];
      const week = currentWeek(s).week;
      for (const x of s.pendingSubs?.[teamId] ?? []) {
        s.subs = [...(s.subs ?? []), { id: nextId(s, 'u'), teamId, week, outPlayer: x.outPlayer, subName: x.subName, at: s.now }];
        const out = team(current(s), teamId).players[x.outPlayer];
        addLog(s, 'league', `${team(current(s), teamId).teamName} play with a sub tonight: ${x.subName} in for ${out}`);
      }
      delete s.pendingSubs?.[teamId];
    },
    /** The admin could not find the team: the request goes away and the team can tap again. */
    declineCheckIn(s, a: PayloadAction<string>) {
      delete s.checkInRequests?.[a.payload];
      delete s.pendingSubs?.[a.payload];
    },
    /** Admin: excuse a no-show for a good reason. It stops counting; if that brings the team back under the limit, it is back in the running. */
    excuseNoShow(s, a: PayloadAction<string>) {
      const n = s.noShows?.find((x) => x.id === a.payload);
      if (!n || n.excused) return;
      n.excused = true;
      const t = s.teams.find((x) => x.teamId === n.teamId);
      if (!t) return;
      addLog(s, 'admin', `Admin excused ${t.teamName}'s no-show in week ${n.week}`);
      if (t.eliminated && noShowCount(current(s), t.teamId) <= NO_SHOW_LIMIT) {
        t.eliminated = undefined;
        addLog(s, 'admin', `${t.teamName} are back in the running`);
      }
    },
    noShowSeen(s, a: PayloadAction<string>) {
      const n = s.noShows?.find((x) => x.id === a.payload);
      if (n) n.seen = true;
    },
    /** Team: turn the check-in reminder texts on or off. */
    setSmsOptIn(s, a: PayloadAction<{ teamId: string; optIn: boolean }>) {
      const t = s.teams.find((x) => x.teamId === a.payload.teamId);
      if (t) t.smsOptIn = a.payload.optIn;
    },
    /** Team: answered the end-of-season question about keeping the texts. */
    answerSeasonTexts(s, a: PayloadAction<{ teamId: string; keep: boolean }>) {
      const t = s.teams.find((x) => x.teamId === a.payload.teamId);
      if (!t) return;
      t.smsSeasonAsked = true;
      if (!a.payload.keep) t.smsOptIn = false;
    },
    eliminatedSeen(s, a: PayloadAction<string>) {
      const t = s.teams.find((x) => x.teamId === a.payload);
      if (t?.eliminated) t.eliminated.seen = true;
    },
    /** Admin: work the season standings out again (after removing or adding teams). */
    recalculateSeason(s) {
      // The sample works standings out from the scores every time, so this records the request;
      // the real server re-runs every closed night here.
      addLog(s, 'admin', 'Admin recalculated the season standings');
    },
    /** Admin: a team leaves mid-season. Its scores stop counting, so every night is worked out again without it. */
    withdrawTeam(s, a: PayloadAction<{ teamId: string; reason: string }>) {
      const t = s.teams.find((x) => x.teamId === a.payload.teamId);
      if (!t || t.status !== 'approved') return;
      t.status = 'withdrawn';
      t.withdrawn = { at: s.now, week: currentWeek(s).week, reason: a.payload.reason.trim() };
      leaveLines(s, t.teamId);
      delete s.checkIns[t.teamId];
      delete s.checkInRequests?.[t.teamId];
      for (const c of s.challenges) if ((c.fromTeamId === t.teamId || c.toTeamId === t.teamId) && (c.status === 'waiting' || c.status === 'live')) c.status = 'passed';
      addLog(s, 'admin', `Admin withdrew ${t.teamName}. Every night is worked out again without them`, a.payload.reason);
    },
    /** Admin: undo a withdrawal made by mistake. */
    reinstateTeam(s, a: PayloadAction<string>) {
      const t = s.teams.find((x) => x.teamId === a.payload);
      if (!t || t.status !== 'withdrawn') return;
      t.status = 'approved';
      t.withdrawn = undefined;
      addLog(s, 'admin', `Admin brought ${t.teamName} back into the league`);
    },
    /** Sample only: set the clock, so the check-in countdown can be shown. */
    sampleSetClock(s, a: PayloadAction<string>) {
      const week = currentWeek(s);
      s.now = at(week.date, a.payload);
    },
    undoCheckIn(s, a: PayloadAction<string>) {
      delete s.checkIns[a.payload];
    },
    postMessage(s, a: PayloadAction<string>) {
      s.message = { text: a.payload.trim(), postedAt: s.now, by: s.adminName };
      addLog(s, 'admin', 'Admin posted a message to everyone');
    },
    takeDownMessage(s) {
      if (!s.message) return;
      s.message = null;
      addLog(s, 'admin', 'Admin took down the message');
    },
    addMinutes(s, a: PayloadAction<number>) {
      s.night.extraMinutes += a.payload;
      addLog(s, 'admin', `Admin added ${a.payload} minutes to tonight`);
    },
    /** Opening and closing times for every league night, as "19:00". */
    setNightTimes(s, a: PayloadAction<{ opensAt?: string; closesAt?: string }>) {
      if (a.payload.opensAt) s.night.opensAt = a.payload.opensAt;
      if (a.payload.closesAt) s.night.closesAt = a.payload.closesAt;
      addLog(s, 'admin', `Admin set league nights to run ${clockLabel(s.night.opensAt)} to ${clockLabel(s.night.closesAt)}`);
    },
    /** Locks in the open week's points, empties the lines and settles tonight's challenges. */
    closeNight(s) {
      const week = s.weeks.find((w) => w.state === 'open');
      if (!week) return;
      const snapshot = current(s);
      const settledNow: string[] = [];
      for (const c of s.challenges) {
        if (c.week !== week.week) continue;
        if (c.status === 'waiting') c.status = 'passed';
        if (c.status === 'live') {
          const view = challengeView(snapshot, c);
          c.status = 'settled';
          // No leader means a tie, or neither team posted a score: nobody wins and no points move.
          c.winnerTeamId = view.leader?.teamId;
          if (view.leader) {
            const loser = view.leader.teamId === c.fromTeamId ? view.to : view.from;
            settledNow.push(`${view.leader.teamName} won ${c.stake} ${c.stake === 1 ? 'point' : 'points'} from ${loser.teamName} on ${view.machine.name}`);
          } else {
            settledNow.push(`${view.from.teamName} and ${view.to.teamName} tied on ${view.machine.name}. No points moved.`);
          }
        }
      }
      for (const line of s.lines) {
        line.teamIds = [];
        line.notify = [];
        line.joinedAt = {};
      }
      refreshTurns(s);
      // No-shows: every team in the running that wasn't checked in. The third one eliminates it.
      const snap = current(s);
      for (const t of teamsIn(snap, week.week)) {
        if (t.eliminated || s.checkIns[t.teamId]) continue;
        // A night reopened and closed again doesn't count the same no-show twice.
        if ((s.noShows ?? []).some((x) => x.teamId === t.teamId && x.week === week.week)) continue;
        s.noShows = [...(s.noShows ?? []), { id: nextId(s, 'n'), teamId: t.teamId, week: week.week, at: s.now }];
        const n = noShowCount(current(s), t.teamId);
        addLog(s, 'league', `${t.teamName} did not check in for week ${week.week} (no-show ${n} of ${NO_SHOW_LIMIT} allowed)`);
        if (n > NO_SHOW_LIMIT) {
          const live = s.teams.find((x) => x.teamId === t.teamId)!;
          live.eliminated = { at: s.now, week: week.week };
          addLog(s, 'league', `${t.teamName} are out of the running after a third no-show. Their points so far stay; nothing after week ${week.week} counts`);
        }
      }
      week.state = 'final';
      s.checkInRequests = {};
      for (const line of settledNow) addLog(s, 'league', line);
      // Challenge points move in the season standings, not in the night's own points, so the night's winner is who played best.
      const winner = tonightRows(current(s), week.week)[0];
      addLog(s, 'league', winner && winner.points > 0 ? `Week ${week.week} closed. ${winner.team.teamName} won the night with ${winner.points} points.` : `Week ${week.week} closed.`);
    },
    /** For a night closed by mistake. Only when no other night is open. */
    reopenNight(s, a: PayloadAction<number>) {
      const week = weekOf(s, a.payload);
      if (!week || week.state !== 'final' || s.weeks.some((w) => w.state === 'open')) return;
      week.state = 'open';
      addLog(s, 'admin', `Admin reopened week ${week.week}`, 'closed by mistake');
    },
    /** No league night that date. That week and every later one move back seven days. */
    skipWeek(s, a: PayloadAction<number>) {
      const week = weekOf(s, a.payload);
      if (!week || week.state !== 'upcoming') return;
      s.skippedDates.push(week.date);
      addLog(s, 'admin', `Admin skipped ${longDate(week.date)}. Later weeks move back one week.`);
      for (const w of s.weeks) {
        if (w.week < week.week) continue;
        const d = new Date(`${w.date}T12:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + 7);
        w.date = d.toISOString().slice(0, 10);
      }
    },

    // ---- Machines ----

    /**
     * Puts a machine in or out for a week. For the open week, "out" means it broke: it stays on the
     * list, its line empties and its scores stop counting. For a later week it is simply picked or not.
     */
    setMachineInPlay(s, a: PayloadAction<{ week: number; machineId: string; inPlay: boolean; reason?: string }>) {
      const week = weekOf(s, a.payload.week);
      if (!week || week.state === 'final') return;
      const { machineId, inPlay } = a.payload;
      const name = machine(s, machineId).name;
      if (week.state === 'upcoming') {
        week.machineIds = inPlay ? [...new Set([...week.machineIds, machineId])] : week.machineIds.filter((id) => id !== machineId);
        return;
      }
      if (!inPlay) {
        if (!week.machineIds.includes(machineId) || week.out[machineId]) return;
        const reason = a.payload.reason?.trim() || 'out of order';
        week.out[machineId] = { at: s.now, reason };
        const line = lineOf(s, machineId);
        line.teamIds = [];
        line.notify = [];
        line.joinedAt = {};
        refreshTurns(s);
        addLog(s, 'admin', `Admin took ${name} out for the night`, reason);
      } else if (week.out[machineId]) {
        delete week.out[machineId];
        addLog(s, 'admin', `Admin put ${name} back in play`);
      } else if (!week.machineIds.includes(machineId)) {
        week.machineIds.push(machineId);
        addLog(s, 'admin', `Admin added ${name} to tonight's machines`);
      }
    },
    addMachine(s, a: PayloadAction<{ name: string; locationId: string }>) {
      const name = a.payload.name.trim();
      if (!name) return;
      s.machines.push({ machineId: slug(name, s.machines.map((m) => m.machineId)), name, locationId: a.payload.locationId, removed: false });
    },
    /** Keeps the machine's old scores. It just can't be picked for a week any more. */
    removeMachine(s, a: PayloadAction<string>) {
      const m = s.machines.find((x) => x.machineId === a.payload);
      if (!m) return;
      m.removed = true;
      for (const w of s.weeks) if (w.state === 'upcoming') w.machineIds = w.machineIds.filter((id) => id !== m.machineId);
    },
    restoreMachine(s, a: PayloadAction<string>) {
      const m = s.machines.find((x) => x.machineId === a.payload);
      if (m) m.removed = false;
    },
    addLocation(s, a: PayloadAction<string>) {
      const name = a.payload.trim();
      if (!name) return;
      s.locations.push({ locationId: slug(name, s.locations.map((l) => l.locationId)), name });
    },

    // ---- Teams ----

    /** A newly approved team starts counting the week after the current one. */
    approveTeam(s, a: PayloadAction<string>) {
      const t = s.teams.find((x) => x.teamId === a.payload);
      if (!t || t.status === 'approved') return;
      t.status = 'approved';
      t.expiresAt = undefined;
      t.firstWeek = startWeek(s);
      addLog(s, 'admin', `Admin approved a new team: ${t.teamName}`);
    },
    removeSignUp(s, a: PayloadAction<{ teamId: string; reason: string }>) {
      const t = s.teams.find((x) => x.teamId === a.payload.teamId);
      if (!t || t.status !== 'pending') return;
      s.teams = s.teams.filter((x) => x.teamId !== t.teamId);
      if (s.myTeamId === t.teamId) {
        s.myTeamId = MY_TEAM;
        if (s.role === 'team') s.role = 'visitor';
      }
      addLog(s, 'admin', 'Admin removed a sign-up', a.payload.reason);
    },
    /** Makes one team out of two solo players from the waitlist. */
    pairWaitlist(s, a: PayloadAction<[string, string]>) {
      const pair = a.payload.map((idValue) => s.waitlist.find((w) => w.id === idValue));
      const [one, two] = pair;
      if (!one || !two || one === two) return;
      const teamName = `${one.name} & ${two.name}`;
      s.teams.push({
        teamId: slug(teamName, s.teams.map((t) => t.teamId)), teamName, players: [one.name, two.name], phone1: '(202) 555-0150', phone2: '(202) 555-0151',
        photo: teamPhoto(teamName), status: 'approved', createdAt: s.now, firstWeek: startWeek(s)
      });
      s.waitlist = s.waitlist.filter((w) => w.id !== one.id && w.id !== two.id);
      addLog(s, 'admin', `Admin paired two solo players into a new team: ${teamName}`);
    },
    resetPin(s, a: PayloadAction<string>) {
      addLog(s, 'admin', `Admin reset ${team(s, a.payload).teamName}'s PIN`);
    },

    // ---- Challenges ----

    /**
     * A team puts up to 10 of its own points on beating another team on one machine tonight.
     * Two teams get one challenge a night between them; they can go again next week.
     */
    challenge(s, a: PayloadAction<{ toTeamId: string; machineId: string; stake: number }>) {
      if (alreadyChallenged(s, s.myTeamId, a.payload.toTeamId)) return;
      // An eliminated team is out of the running: no challenges either way.
      const pair = [s.myTeamId, a.payload.toTeamId].map((id) => s.teams.find((t) => t.teamId === id));
      if (pair.some((t) => !t || !inTheRunning(t))) return;
      const stake = Math.min(Math.max(Math.round(a.payload.stake), 1), 10);
      const { who } = names(s, { teamId: s.myTeamId, machineId: a.payload.machineId });
      const { who: them, what } = names(s, { teamId: a.payload.toTeamId, machineId: a.payload.machineId });
      s.challenges.unshift({ id: nextId(s, 'c'), week: currentWeek(s).week, machineId: a.payload.machineId, fromTeamId: s.myTeamId, toTeamId: a.payload.toTeamId, at: s.now, stake, status: 'waiting' });
      addLog(s, 'league', `${who} challenged ${them} on ${what} for ${stake} ${stake === 1 ? 'point' : 'points'}`);
    },
    answerChallenge(s, a: PayloadAction<{ id: string; accept: boolean }>) {
      const c = s.challenges.find((x) => x.id === a.payload.id);
      if (!c || c.status !== 'waiting') return;
      c.status = a.payload.accept ? 'live' : 'passed';
      const { who, what } = names(s, { teamId: c.toTeamId, machineId: c.machineId });
      addLog(s, 'league', `${who} ${a.payload.accept ? 'accepted' : 'passed on'} ${team(s, c.fromTeamId).teamName}'s challenge on ${what}`);
    },
    /** For the sample only: pretend the team who was challenged said yes. */
    theyAccepted(s, a: PayloadAction<string>) {
      const c = s.challenges.find((x) => x.id === a.payload);
      if (c && c.status === 'waiting') c.status = 'live';
    },

    // ---- The guided "new league" story (layout/StoryCard.tsx) ----

    /** Starts the story: an empty league on week 1, before anyone has signed up. */
    startStory() {
      return buildFreshLeague();
    },
    setStoryStep(s, a: PayloadAction<number>) {
      if (s.story) s.story.step = a.payload;
    },
    /** The helper couples sign up and wait for an admin, like you did. */
    storyHelpersSignUp(s) {
      HELPERS.forEach((h, i) => {
        if (s.teams.some((t) => t.teamId === h[0])) return;
        s.teams.push(helperTeam(h, s.now, startWeek(s), i));
        addLog(s, 'league', 'A new team signed up and is waiting for approval');
      });
    },
    /** In the real app the night opens by itself at 7 PM. The story does it on cue. */
    storyOpenNight(s) {
      const week = s.weeks.find((w) => w.state === 'upcoming');
      if (!week || s.weeks.some((w) => w.state === 'open')) return;
      week.state = 'open';
      s.now = at(week.date, '19:02');
      addLog(s, 'league', `Week ${week.week} opened`);
    },
    /** The helper couples walk in and tap "I'm here". */
    storyHelpersArrive(s) {
      s.now = plusMinutes(s.now, 6);
      for (const [teamId] of HELPERS) {
        const t = s.teams.find((x) => x.teamId === teamId && x.status === 'approved');
        if (!t || s.checkIns[teamId]) continue;
        (s.checkInRequests ??= {})[teamId] = s.now;
        addLog(s, 'league', `${t.teamName} says they are here`);
      }
    },
    /** Thirty minutes of play: every checked-in helper posts a game or two. */
    storyFastForward(s) {
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
    resetSample(s) {
      return { ...buildSeed(), role: s.role, adminOnTeam: s.adminOnTeam };
    }
  }
});

function check(s: SampleState, x: SScore) {
  x.check = 'checked';
  x.checkedBy = s.adminName;
  x.history.push({ at: s.now, text: `Checked by ${s.adminName}` });
}

export const sampleReducer = slice.reducer;
export const sample = slice.actions;
