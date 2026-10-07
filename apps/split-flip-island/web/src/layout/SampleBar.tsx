import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector, useLeague } from '../hooks';
import { sample } from '../sample/slice';
import type { Role } from '../sample/types';
import { setPendingRole, setTourOpen } from '../store';
import { colors } from '../theme';

export const SAMPLE_BAR_HEIGHT = 44;

/**
 * The strip across the top of every page while the app runs on made-up data. It says so, lets
 * you switch who you are viewing as, and opens the guide to the page you are on.
 * It is not part of the real app: it goes away when the pages are wired to the server.
 */
export default function SampleBar() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Leaving admin while on an admin page happens in two steps: go home first, then stop being
  // an admin (FinishRoleSwitch in App.tsx does the second step). Done the other way round, the
  // admin pages see a non-admin for a moment and send them to the admin log-in instead of home.
  const leavingFor = useAppSelector((s) => s.ui.pendingRole);

  const change = (role: Role | null) => {
    if (!role) return;
    if (role !== 'admin' && pathname.startsWith('/admin')) {
      dispatch(setPendingRole(role));
      navigate('/');
      return;
    }
    dispatch(sample.setRole(role));
    if (role === 'admin') navigate('/admin');
  };

  const button = { color: colors.paleYellow, borderColor: 'rgba(255,255,153,0.4)', py: 0.25, px: 1.25, fontSize: '0.8rem', minWidth: 0, lineHeight: 1.6 };

  return (
    <Box
      sx={{
        height: SAMPLE_BAR_HEIGHT, display: 'flex', alignItems: 'center', gap: 1, px: 1.5,
        bgcolor: colors.black, color: colors.paleYellow, borderBottom: `2px dashed ${colors.lime}`
      }}
    >
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.lime, lineHeight: 1.1, display: { xs: 'none', sm: 'block' } }}>
        Sample data
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={leavingFor ?? league.role}
        onChange={(_, role: Role | null) => change(role)}
        aria-label="View the app as"
        sx={{
          '& .MuiToggleButton-root': { ...button, textTransform: 'none', fontWeight: 700 },
          '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': { bgcolor: colors.lime, color: colors.black }
        }}
      >
        <ToggleButton value="visitor">Visitor</ToggleButton>
        <ToggleButton value="team">Team</ToggleButton>
        <ToggleButton value="admin">Admin</ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ flexGrow: 1 }} />
      <Button size="small" variant="outlined" onClick={() => dispatch(setTourOpen(true))} sx={button}>
        About this page
      </Button>
      <Button size="small" variant="outlined" component={RouterLink} to="/tour" sx={{ ...button, display: { xs: 'none', sm: 'inline-flex' } }}>
        All pages
      </Button>
    </Box>
  );
}
