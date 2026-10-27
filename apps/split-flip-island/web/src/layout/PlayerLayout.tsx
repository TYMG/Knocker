import { useEffect, useRef } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
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
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { motion } from 'motion/react';
import { useAppDispatch, useCalm, useLeague, useMe } from '../hooks';
import { challenges } from '../sample/league';
import { sample } from '../sample/slice';
import { colors } from '../theme';
import PinballBackground from '../ui/PinballBackground';
import Toaster from '../ui/Toaster';
import SampleBar from './SampleBar';
import DoctorsOrdersPopup from './DoctorsOrdersPopup';
import { ApprovalCheer } from './guards';
import TourDrawer from './TourDrawer';
import StoryCard from './StoryCard';
import HowToPlay from './HowToPlay';
import TurnAlerts from './TurnAlerts';
import CheckInReminder from './CheckInReminder';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

/**
 * The bar at the bottom of the screen. A team gets Home, Lines, Submit, Challenges, Standings.
 * An admin is a player with extra powers and gets the same bar. The admin pages are not in the
 * bar: the ADMIN badge beside the name opens them.
 *
 * An admin who is not on a team has no line or scores of their own, so for them Lines opens the
 * admin view of every line, Submit opens "enter a score for a team", and Home is the standings.
 */
function navFor(me: ReturnType<typeof useMe>, waiting: number): NavItem[] {
  const soloAdmin = me.isAdmin && !me.isTeam;
  const linesTo = soloAdmin ? '/admin/lines' : '/lines';
  const submitTo = soloAdmin ? '/admin/enter-score' : '/submit';
  const items: NavItem[] = [
    { to: '/', label: 'Home', icon: <HomeIcon />, match: (p) => p === '/' || p.startsWith('/love-dr') },
    { to: linesTo, label: 'Lines', icon: <GroupsIcon />, match: (p) => p.startsWith('/lines') || p.startsWith('/machines') || (soloAdmin && p.startsWith('/admin/lines')) },
    { to: submitTo, label: 'Submit', icon: <AddAPhotoIcon />, match: (p) => p.startsWith('/submit') || (soloAdmin && p.startsWith('/admin/enter-score')) },
    { to: '/standings', label: 'Standings', icon: <LeaderboardIcon />, match: (p) => p.startsWith('/standings') || p.startsWith('/teams') }
  ];
  // Challenges are for teams, so an admin with no team does not get the tab. The dot counts challenges waiting on you.
  if (me.isTeam) {
    items.splice(3, 0, {
      to: '/challenges', label: 'Challenges', match: (p) => p.startsWith('/challenges'),
      icon: (
        <Badge badgeContent={waiting} color="secondary" overlap="circular">
          <SportsMmaIcon />
        </Badge>
      )
    });
  }
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
  const league = useLeague();
  const waiting = me.isTeam && me.team.status === 'approved' ? challenges(league, me.team.teamId).waitingOnMe.length : 0;
  const nav = navFor(me, waiting);
  const onAdmin = pathname.startsWith('/admin');
  // The first match wins, so the admin view of the lines lights up Lines, not Admin.
  const current = nav.findIndex((n) => n.match(pathname));

  // A new page starts at the top, the way a new page should.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Pages slide in from the side of the tab you tapped: a tab to the right comes from the right.
  // Moving around inside one tab, the new page just rises a little.
  const calm = useCalm();
  const lastTab = useRef(current);
  const side = current === -1 || lastTab.current === -1 || current === lastTab.current ? 0 : current > lastTab.current ? 1 : -1;
  useEffect(() => {
    lastTab.current = current;
    // The theme reads this to switch off the button press.
    document.documentElement.toggleAttribute('data-calm', calm);
  }, [current, calm]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', isolation: 'isolate' }}>
      {/* Drifting pinballs behind every page except home, which gets its own show. */}
      {pathname !== '/' && <PinballBackground />}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 'appBar' }}>
        <SampleBar />
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ gap: { xs: 0.5, sm: 1 } }}>
            <Typography component={RouterLink} to="/" aria-label="Split Flipper Island" variant="h3" noWrap sx={{ color: 'inherit', textDecoration: 'none', fontSize: { xs: '1rem', sm: '1.25rem' }, minWidth: 0, mr: 0.5 }}>
              {/* An admin's top bar is full on a phone, so the name shortens there instead of being cut off. */}
              {me.isAdmin ? (
                <>
                  <Box component="span" aria-hidden sx={{ display: { xs: 'inline', sm: 'none' } }}>SFI</Box>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Split Flipper Island</Box>
                </>
              ) : (
                'Split Flipper Island'
              )}
            </Typography>
            {me.isAdmin && (
              // The ADMIN badge is also the way in: tap it to open the admin pages.
              <Typography
                component={RouterLink}
                to="/admin"
                aria-label="Admin pages"
                aria-current={onAdmin ? 'page' : undefined}
                sx={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.8rem', border: 2, borderColor: 'currentColor', borderRadius: 1, px: 0.75, lineHeight: 1.5, flexShrink: 0, color: onAdmin ? colors.sand : 'inherit', bgcolor: onAdmin ? colors.black : 'transparent', textDecoration: 'none' }}
              >
                ADMIN
              </Typography>
            )}
            {wide && tabs && (
              <Tabs value={current === -1 ? false : current} textColor="inherit" slotProps={{ indicator: { sx: { bgcolor: 'common.black', height: 3 } } }}>
                {nav.map((n) => (
                  <Tab key={n.label} label={n.label} component={RouterLink} to={n.to} />
                ))}
              </Tabs>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <ApprovalCheer />
            <Tooltip title="Settings">
              <IconButton component={RouterLink} to="/settings" color="inherit" aria-label="Settings" aria-current={pathname === '/settings' ? 'page' : undefined}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
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
        <CheckInReminder />
      </Box>

      <Box component="main" sx={{ flexGrow: 1, px: 2, pt: 3, pb: !wide && tabs ? 12 : 6 }}>
        <motion.div key={pathname} initial={calm ? false : { opacity: 0, x: side * 32, y: side === 0 ? 10 : 0 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}>
          <Outlet />
        </motion.div>
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
      <DoctorsOrdersPopup />
      <Toaster />
      <TourDrawer />
      <StoryCard />
      <HowToPlay />
      <TurnAlerts />
    </Box>
  );
}
