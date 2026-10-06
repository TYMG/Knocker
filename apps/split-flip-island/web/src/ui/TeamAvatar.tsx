import { Link as RouterLink } from 'react-router';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import type { STeam } from '../sample/types';

/** The team's photo in a circle. `mine` adds the coral ring used for your own team. */
export default function TeamAvatar({ team, size = 36, mine }: { team: STeam; size?: number; mine?: boolean }) {
  return <Avatar src={team.photo || undefined} alt="" sx={{ width: size, height: size, flexShrink: 0, ...(mine && { border: 2, borderColor: 'secondary.main' }) }} />;
}

/** A team's name that opens its page. */
export function TeamLink({ team, noWrap = true }: { team: STeam; noWrap?: boolean }) {
  return (
    <Link component={RouterLink} to={`/teams/${team.teamId}`} underline="hover" color="inherit" sx={{ fontWeight: 700, minWidth: 0, ...(noWrap && { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
      {team.teamName}
    </Link>
  );
}
