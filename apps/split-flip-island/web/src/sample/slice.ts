// Everything a page can do to the sample league. Each action changes the made-up data in the
// browser and nothing else: no request is sent and nothing is saved on a server. The data is kept
// for the browser tab, so a refresh keeps your changes; "Start over" puts the story back.
//
// Admin actions also write to the league log, the way the real app must.

import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { teamPhoto } from './art';
import { alreadyChallenged, challengeView, currentWeek, machine, seasonHigh, team, tonightRows, weekOf } from './league';
import { buildSeed, MY_TEAM } from './seed';
import { addMinutes as plusMinutes, clockLabel, longDate, ordinal } from './time';
import type { Role, SampleState, SScore } from './types';

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

function leaveLines(s: SampleState, teamId: string, onlyMachineId?: string) {
  for (const line of s.lines) {
    if (onlyMachineId && line.machineId !== onlyMachineId) continue;
    line.teamIds = line.teamIds.filter((id) => id !== teamId);
    line.notify = line.notify.filter((id) => id !== teamId);
    delete line.joinedAt[teamId];
  }
}

function lineOf(s: SampleState, machineId: string) {
  let line = s.lines.find((l) => l.machineId === machineId);
  if (!line) s.lines.push((line = { machineId, teamIds: [], joinedAt: {}, notify: [] }));
  return line;
}

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
    signUp(s, a: PayloadAction<{ teamName: string; phone1: string; phone2: string }>) {
      const teamName = a.payload.teamName.trim().replace(/\s+/g, ' ');
      const teamId = slug(teamName, s.teams.map((t) => t.teamId));
      s.teams.push({
        teamId, teamName, players: ['Player 1', 'Player 2'], phone1: a.payload.phone1, phone2: a.payload.phone2, photo: teamPhoto(teamName),
        status: 'pending', createdAt: s.now, expiresAt: plusMinutes(s.now, 24 * 60), firstWeek: currentWeek(s).week + 1
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
      leaveLines(s, teamId);
      const line = lineOf(s, a.payload.machineId);
      line.teamIds.push(teamId);
      line.joinedAt[teamId] = s.now;
      if (a.payload.notify) line.notify.push(teamId);
    },
    leaveLine(s, a: PayloadAction<string | undefined>) {
      leaveLines(s, a.payload ?? s.myTeamId);
    },
    /** Admin: the team was not at the machine when its turn came. */
    lineToBack(s, a: PayloadAction<{ machineId: string; teamId: string }>) {
      const line = lineOf(s, a.payload.machineId);
      if (!line.teamIds.includes(a.payload.teamId)) return;
      line.teamIds = [...line.teamIds.filter((id) => id !== a.payload.teamId), a.payload.teamId];
    },
    lineRemove(s, a: PayloadAction<{ machineId: string; teamId: string }>) {
      leaveLines(s, a.payload.teamId, a.payload.machineId);
    },

    // ---- Scores ----

    /** A team posts a score. It counts right away and waits for an admin to check it. */
    submitScore(s, a: PayloadAction<{ machineId: string; score: number; photoSource: 'camera' | 'library'; photo?: string }>) {
      const week = currentWeek(s);
      const teamId = s.myTeamId;
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

    checkIn(s, a: PayloadAction<string>) {
      s.checkIns[a.payload] = s.now;
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
      week.state = 'final';
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
      t.firstWeek = currentWeek(s).week + 1;
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
        photo: teamPhoto(teamName), status: 'approved', createdAt: s.now, firstWeek: currentWeek(s).week + 1
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
