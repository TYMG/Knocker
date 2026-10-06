import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { colors } from '../theme';
import Toaster from '../ui/Toaster';
import SampleBar from './SampleBar';
import ThemeToggle from './ThemeToggle';
import TourDrawer from './TourDrawer';

const NAV = [
  { to: '/', label: 'Home', icon: <HomeIcon />, match: (p: string) => p === '/' || p.startsWith('/call-outs') },
  { to: '/lines', label: 'Lines', icon: <GroupsIcon />, match: (p: string) => p.startsWith('/lines') || p.startsWith('/machines') },
  { to: '/submit', label: 'Submit', icon: <AddAPhotoIcon />, match: (p: string) => p.startsWith('/submit') },
  { to: '/standings', label: 'Standings', icon: <LeaderboardIcon />, match: (p: string) => p.startsWith('/standings') || p.startsWith('/teams') }
];

/** The league message an admin posts. It shows at the top of every phone. */
function MessageBanner() {
  const message = useLeague().message;
  if (!message) return null;
  return (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1, bgcolor: colors.coral, color: colors.black }}>
      <CampaignIcon fontSize="small" />
      <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{message.text}</Typography>
    </Box>
  );
}

/** The frame around every page for players and visitors: top bar, league message, page, bottom bar. */
export default function PlayerLayout() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const me = useMe();
  const current = NAV.findIndex((n) => n.match(pathname));
  // The four tabs belong to a logged-in team. A visitor gets a Standings link and a Log in button.
  const tabs = me.isTeam;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 'appBar' }}>
        <SampleBar />
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ gap: 1 }}>
            <Typography component={RouterLink} to="/" variant="h3" sx={{ color: 'inherit', textDecoration: 'none', fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0, mr: 1 }}>
              Split Flipper Island
            </Typography>
            {wide && tabs && (
              <Tabs value={current === -1 ? false : current} textColor="inherit" slotProps={{ indicator: { sx: { bgcolor: 'common.black', height: 3 } } }}>
                {NAV.map((n) => (
                  <Tab key={n.to} label={n.label} component={RouterLink} to={n.to} />
                ))}
              </Tabs>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <ThemeToggle />
            {me.isTeam ? (
              <Tooltip title={`Log out ${me.team.teamName}`}>
                <IconButton
                  color="inherit"
                  aria-label="Log out"
                  onClick={() => {
                    dispatch(sample.logOut());
                    navigate('/');
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                {pathname !== '/standings' && (
                  <Button component={RouterLink} to="/standings" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                    Standings
                  </Button>
                )}
                <Button component={RouterLink} to="/login" variant="outlined" color="inherit" size="small" sx={{ borderColor: 'currentColor', flexShrink: 0 }}>
                  Log in
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>
        <MessageBanner />
      </Box>

      <Box component="main" sx={{ flexGrow: 1, px: 2, pt: 3, pb: !wide && tabs ? 12 : 6 }}>
        <Outlet />
      </Box>

      {!wide && tabs && (
        <Paper sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 'appBar', pb: 'env(safe-area-inset-bottom)', borderTop: 1, borderColor: 'divider' }}>
          <BottomNavigation showLabels value={current === -1 ? false : current}>
            {NAV.map((n) => (
              <BottomNavigationAction key={n.to} label={n.label} icon={n.icon} component={RouterLink} to={n.to} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      <Toaster />
      <TourDrawer />
    </Box>
  );
}
