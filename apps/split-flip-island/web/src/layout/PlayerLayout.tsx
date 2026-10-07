import { useEffect } from 'react';
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
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

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

/**
 * The bar at the bottom of the screen. A team gets Home, Lines, Submit, Standings. An admin is a
 * player with extra powers, so an admin gets the same four plus Admin.
 *
 * An admin who is not on a team has no line or scores of their own, so for them Lines opens the
 * admin view of every line, Submit opens "enter a score for a team", and Home is the standings.
 */
function navFor(me: ReturnType<typeof useMe>): NavItem[] {
  const soloAdmin = me.isAdmin && !me.isTeam;
  const linesTo = soloAdmin ? '/admin/lines' : '/lines';
  const submitTo = soloAdmin ? '/admin/enter-score' : '/submit';
  const items: NavItem[] = [
    { to: '/', label: 'Home', icon: <HomeIcon />, match: (p) => p === '/' || p.startsWith('/challenges') },
    { to: linesTo, label: 'Lines', icon: <GroupsIcon />, match: (p) => p.startsWith('/lines') || p.startsWith('/machines') || (soloAdmin && p.startsWith('/admin/lines')) },
    { to: submitTo, label: 'Submit', icon: <AddAPhotoIcon />, match: (p) => p.startsWith('/submit') || (soloAdmin && p.startsWith('/admin/enter-score')) },
    { to: '/standings', label: 'Standings', icon: <LeaderboardIcon />, match: (p) => p.startsWith('/standings') || p.startsWith('/teams') }
  ];
  if (me.isAdmin) items.push({ to: '/admin', label: 'Admin', icon: <AdminPanelSettingsIcon />, match: (p) => p.startsWith('/admin') });
  return items;
}

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

/** The frame around every page except the bar TV: top bar, league message, page, bottom bar. */
export default function PlayerLayout() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const me = useMe();
  const adminName = useLeague().adminName;
  // The tabs belong to someone who is logged in. A visitor gets a Standings link and a Log in button.
  const tabs = me.isTeam || me.isAdmin;
  const nav = navFor(me);
  // The first match wins, so the admin view of the lines lights up Lines, not Admin.
  const current = nav.findIndex((n) => n.match(pathname));

  // A new page starts at the top, the way a new page should.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 'appBar' }}>
        <SampleBar />
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ gap: { xs: 0.5, sm: 1 } }}>
            <Typography component={RouterLink} to="/" variant="h3" noWrap sx={{ color: 'inherit', textDecoration: 'none', fontSize: { xs: me.isAdmin ? '0.85rem' : '1rem', sm: '1.25rem' }, minWidth: 0, mr: 0.5 }}>
              Split Flipper Island
            </Typography>
            {me.isAdmin && (
              <Typography sx={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.8rem', border: 2, borderColor: 'currentColor', borderRadius: 1, px: 0.75, lineHeight: 1.5, flexShrink: 0 }}>ADMIN</Typography>
            )}
            {wide && tabs && (
              <Tabs value={current === -1 ? false : current} textColor="inherit" slotProps={{ indicator: { sx: { bgcolor: 'common.black', height: 3 } } }}>
                {nav.map((n) => (
                  <Tab key={n.label} label={n.label} component={RouterLink} to={n.to} />
                ))}
              </Tabs>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <ThemeToggle />
            {tabs ? (
              <Tooltip title={me.isAdmin ? `Log out admin ${adminName}` : `Log out ${me.team.teamName}`}>
                <IconButton
                  color="inherit"
                  aria-label="Log out"
                  onClick={() => {
                    // Leave the page first: logging out while on an admin page would bounce to the admin log-in.
                    navigate('/');
                    dispatch(sample.logOut());
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
            {nav.map((n) => (
              // Five items have to share a phone's width, so they are allowed to be narrower than MUI's default.
              <BottomNavigationAction key={n.label} label={n.label} icon={n.icon} component={RouterLink} to={n.to} sx={{ minWidth: 0, px: 0.5 }} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      <Toaster />
      <TourDrawer />
    </Box>
  );
}
