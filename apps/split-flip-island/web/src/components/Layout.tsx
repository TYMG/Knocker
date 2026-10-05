import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme, useTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import HistoryIcon from '@mui/icons-material/History';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppDispatch, useAppSelector } from '../hooks';
import { loggedOut } from '../store';
import { api } from '../api';

const NAV = [
  { to: '/', label: 'Home', icon: <HomeIcon /> },
  { to: '/submit', label: 'Submit', icon: <AddAPhotoIcon /> },
  { to: '/standings', label: 'Standings', icon: <LeaderboardIcon /> },
  { to: '/log', label: 'Log', icon: <HistoryIcon /> }
];

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const next = { system: 'light', light: 'dark', dark: 'system' } as const;
  const current = mode ?? 'system';
  const icon = { system: <BrightnessAutoIcon />, light: <LightModeIcon />, dark: <DarkModeIcon /> }[current];
  return (
    <Tooltip title={`Theme: ${current}. Tap to switch.`}>
      <IconButton color="inherit" aria-label="Switch theme" onClick={() => setMode(next[current])}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

export default function Layout() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const team = useAppSelector((s) => s.auth.team);
  const current = NAV.findIndex((n) => n.to === pathname);

  const logOut = () => {
    dispatch(loggedOut());
    dispatch(api.util.resetApiState());
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h3"
            sx={{ color: 'inherit', textDecoration: 'none', fontSize: { xs: '1.05rem', sm: '1.25rem' }, flexShrink: 0 }}
          >
            Split Flipper Island
          </Typography>
          {wide && (
            <Tabs
              value={current === -1 ? false : current}
              textColor="inherit"
              slotProps={{ indicator: { sx: { bgcolor: 'secondary.main', height: 3 } } }}
              sx={{ flexGrow: 1 }}
            >
              {NAV.map((n) => (
                <Tab key={n.to} label={n.label} component={RouterLink} to={n.to} />
              ))}
            </Tabs>
          )}
          <Box sx={{ flexGrow: wide ? 0 : 1 }} />
          <ThemeToggle />
          {team && (
            <Tooltip title={`Log out ${team.teamName}`}>
              <IconButton color="inherit" aria-label="Log out" onClick={logOut}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, px: 2, pt: 3, pb: wide ? 6 : 12 }}>
        <Outlet />
      </Box>

      {!wide && (
        <Paper sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, pb: 'env(safe-area-inset-bottom)', borderTop: 1, borderColor: 'divider' }}>
          <BottomNavigation showLabels value={current === -1 ? false : current}>
            {NAV.map((n) => (
              <BottomNavigationAction key={n.to} label={n.label} icon={n.icon} component={RouterLink} to={n.to} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
