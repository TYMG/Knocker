import { useDispatch, useSelector } from 'react-redux';
import { myTeam } from './sample/league';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

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
