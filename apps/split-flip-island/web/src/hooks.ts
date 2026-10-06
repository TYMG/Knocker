import { useDispatch, useSelector } from 'react-redux';
import { myTeam } from './sample/league';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/** The whole sample league. Pass it to the functions in sample/league.ts to ask it questions. */
export const useLeague = () => useAppSelector((s) => s.sample);

/** Who is looking at the app right now. */
export function useMe() {
  const league = useLeague();
  const team = myTeam(league);
  return {
    role: league.role,
    isVisitor: league.role === 'visitor',
    isTeam: league.role === 'team',
    isAdmin: league.role === 'admin',
    /** The logged-in team. Only meaningful when isTeam. */
    team,
    /** The id to highlight in tables: the team's id when viewing as a team, otherwise undefined. */
    myTeamId: league.role === 'team' ? team.teamId : undefined
  };
}
