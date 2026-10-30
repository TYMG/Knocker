import { useDispatch, useSelector } from 'react-redux';
import useMediaQuery from '@mui/material/useMediaQuery';
import { myTeam } from './sample/league';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * True when effects should stay off: the calm switch in the top bar is on, or the phone or
 * computer is set to reduce motion. Confetti, rolling numbers and the like all ask this.
 */
export function useCalm(): boolean {
  const switchedOn = useAppSelector((s) => s.ui.calm);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return switchedOn || reduceMotion;
}

/** The whole sample league. Pass it to the functions in sample/league.ts to ask it questions. */
export const useLeague = () => useAppSelector((s) => s.sample);

/**
 * Who is looking at the app right now.
 *
 * An admin is a player with extra powers, not a separate kind of person: an admin who is on a
 * team is both `isAdmin` and `isTeam`, and sees the team pages plus the Admin tab. An admin with
 * no team is `isAdmin` only.
 */
export function useMe() {
  const league = useLeague();
  const team = myTeam(league);
  const isAdmin = league.role === 'admin';
  const isTeam = league.role === 'team' || (isAdmin && league.adminOnTeam);
  return {
    role: league.role,
    isVisitor: league.role === 'visitor',
    isTeam,
    isAdmin,
    /** The logged-in team. Only meaningful when isTeam. */
    team,
    /** The id to highlight in tables: the team's id when logged in as a team, otherwise undefined. */
    myTeamId: isTeam ? team.teamId : undefined
  };
}

/** True while the app runs on the live league from the server (the Live switch). */
export const useLiveOn = () => useAppSelector((s) => s.live.on);

/**
 * True when the live league is on and the one looking isn't a player in it (a visitor, a solo
 * player, a team waiting for approval). The server sends them the schedule and a few counts and
 * nothing else, so pages about the league send them to the demo instead.
 */
export function useOutsider() {
  const on = useLiveOn();
  const league = useLeague();
  return on && !!league.outsider;
}
