// Runs the pages on the live league. While the switch is on:
//   - the league comes from the server into the same place the sample league lives, so every
//     page works unchanged (refreshed every 10 seconds, when the tab comes back, and after
//     each change);
//   - a page's action is sent to the server instead of changing anything here, and the league
//     the server answers with replaces the one on screen;
//   - things only the sample can do (switching who you are, the story, the sample clock) are
//     turned away with a note.
import type { Dispatch, Middleware, UnknownAction } from '@reduxjs/toolkit';
import { ADMIN_ACTIONS, SERVER_ONLY, TEAM_ACTIONS } from '../../../shared/league/permissions';
import type { LeagueActionName } from '../../../shared/league/rules';
import { live, LiveError, tokens } from './client';
import { liveActions } from './liveSlice';

const REFRESH_MS = 10_000;

// Imported lazily to avoid a loop with store.ts.
type AnyDispatch = Dispatch<UnknownAction>;
let dispatchRef: AnyDispatch | null = null;
let getOn: () => boolean = () => false;

const toast = async (text: string) => {
  const { showToast } = await import('../store');
  dispatchRef?.(showToast(text));
};

let inFlight: Promise<void> | null = null;
/** Loads the league from the server into the app. Calls in the same moment share one request. */
export function refreshLive(): Promise<void> {
  if (!dispatchRef || !getOn()) return Promise.resolve();
  if (inFlight) return inFlight;
  const d = dispatchRef;
  inFlight = (async () => {
    try {
      const r = await live.league();
      const { sample } = await import('../sample/slice');
      if (!r.league) {
        // No league on the server: an empty one stands in, so admins get the setup form.
        const { newLeague } = await import('../../../shared/league/new');
        const today = new Date().toISOString();
        const empty = newLeague({ firstNight: today.slice(0, 10), opensAt: '19:00', closesAt: '21:00' }, today);
        d(sample.loadLeague({ ...empty, log: [], role: r.viewer.role, adminName: r.viewer.adminName, adminIsOwner: r.viewer.adminIsOwner, myTeamId: '' }));
        d(liveActions.failed({ message: 'The live league has not been set up yet.', missing: true }));
        return;
      }
      // A solo player's phone moves to their new team, or back to visiting if they left.
      if (r.teamToken) { tokens.clear(); tokens.setTeam(r.teamToken); }
      else if (r.soloGone) tokens.setSolo('');
      d(sample.loadLeague(r.league));
      d(liveActions.loaded(r.version));
    } catch (err) {
      const missing = err instanceof LiveError && err.status === 404;
      d(liveActions.failed({ message: missing ? 'The live league has not been set up yet.' : "Can't reach the league server. Check your signal.", missing }));
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function send(run: () => Promise<{ league?: unknown } | unknown>) {
  const d = dispatchRef!;
  d(liveActions.sending(true));
  try {
    await run();
  } catch (err) {
    await toast(err instanceof Error ? err.message : 'That did not go through. Try again.');
  } finally {
    d(liveActions.sending(false));
    await refreshLive();
  }
}

/** Sample actions that, on the live league, mean something else or nothing. */
const SAMPLE_ONLY = new Set(['setRole', 'setAdminOnTeam', 'logInAs', 'logInAdmin', 'sampleSkipTurnClock', 'sampleSetClock', 'theyAccepted', 'startStory', 'setStoryStep', 'storyHelpersSignUp', 'storyOpenNight', 'storyHelpersArrive', 'storyFastForward', 'resetSample']);

export const liveMiddleware: Middleware = (api) => {
  dispatchRef = api.dispatch as AnyDispatch;
  getOn = () => (api.getState() as { live: { on: boolean } }).live.on;
  return (next) => (action) => {
    const a = action as UnknownAction & { payload?: unknown };
    if (!getOn() || typeof a.type !== 'string' || !a.type.startsWith('sample/')) return next(action);
    const name = a.type.slice('sample/'.length);
    if (name === 'loadLeague') return next(action);
    if (name === 'logOut') {
      live.logOut();
      void refreshLive();
      return undefined;
    }
    // The turn clock is the server's job on the live league.
    if (name === 'forfeitTurn' && (a.payload as { by?: string })?.by === 'clock') return undefined;
    if (TEAM_ACTIONS.has(name as LeagueActionName) || ADMIN_ACTIONS.has(name as LeagueActionName)) {
      void send(() => live.action(name, a.payload));
      return undefined;
    }
    switch (name) {
      case 'setSmsOptIn': { const p = a.payload as { player: 0 | 1; optIn: boolean }; void send(() => live.setTexts(p.player, p.optIn)); return undefined; }
      case 'approveTeam': void send(() => live.approve(a.payload as string)); return undefined;
      case 'removeSignUp': { const p = a.payload as { teamId: string; reason: string }; void send(() => live.remove(p.teamId, p.reason)); return undefined; }
      case 'pickPartner': { const p = a.payload as { toId: string; picked: boolean }; void send(() => live.pickPartner(p.toId, p.picked)); return undefined; }
      case 'leaveWaitlist': {
        const id = a.payload as string | undefined;
        void send(() => (tokens.admin() && id ? live.removeSolo(id) : live.leaveWaitlist()));
        return undefined;
      }
    }
    // Sign-up, posting a score and PIN resets are sent by their pages; the rest isn't live yet.
    if (!SAMPLE_ONLY.has(name) && !SERVER_ONLY.has(name as LeagueActionName)) void toast("That isn't on the live league yet.");
    else if (SAMPLE_ONLY.has(name)) void toast('That only works on the sample league.');
    return undefined;
  };
};

/** Keeps the live league fresh while the switch is on. Call once when the app starts. */
export function startLiveRefresh(): () => void {
  const tick = () => { if (getOn() && document.visibilityState === 'visible') void refreshLive(); };
  const timer = window.setInterval(tick, REFRESH_MS);
  document.addEventListener('visibilitychange', tick);
  tick();
  return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
}

/** Flips between the live league and the sample. The sample comes back as it was left. */
export async function setLive(on: boolean) {
  if (!dispatchRef) return;
  const { saveOn } = await import('./liveSlice');
  const { sample, loadSavedSample } = await import('../sample/slice');
  saveOn(on);
  dispatchRef(liveActions.setLiveOn(on));
  if (on) await refreshLive();
  else dispatchRef(sample.loadLeague(loadSavedSample()));
}
