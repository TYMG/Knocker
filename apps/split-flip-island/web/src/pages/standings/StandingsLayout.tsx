// The frame shared by the four public standings pages: the "Standings" title, one line saying
// where the night stands, and the tabs Tonight / Season / Finals / Log. The page for the current
// tab is drawn where <Outlet /> sits. Anyone with the link can open these pages.

import { Link as RouterLink, Outlet, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useLeague } from '../../hooks';
import { nightStatus, teamsIn, weekLabel } from '../../sample/league';
import { longDate } from '../../sample/time';
import Page from '../../ui/Page';

const TABS = [
  { to: '/standings', label: 'Tonight' },
  { to: '/standings/season', label: 'Season' },
  { to: '/standings/finals', label: 'Finals' },
  { to: '/standings/log', label: 'Log' }
];

export default function StandingsLayout() {
  const league = useLeague();
  const { pathname } = useLocation();
  const night = nightStatus(league);
  const teamCount = teamsIn(league, night.week.week).length;
  const label = weekLabel(night.week.week);

  // The tab comes from the address, so a shared link or the back button lands on the right one.
  // A trailing slash is ignored. Anything unknown under /standings falls back to Tonight.
  const path = pathname.replace(/\/+$/, '');
  const current = Math.max(TABS.findIndex((t) => t.to === path), 0);

  const teams = `${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`;
  const timeLeft = night.minutesLeft === 0 ? 'Time is up.' : `${night.minutesLeft} ${night.minutesLeft === 1 ? 'minute' : 'minutes'} left.`;
  const status = night.open
    ? `${label}, ${longDate(night.week.date)}. ${teams}. ${timeLeft}`
    : `${label} is final. ${longDate(night.week.date)}. ${teams}.`;

  return (
    <Page width="wide" title="Standings" subtitle={status}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={current} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Standings pages">
          {TABS.map((t) => (
            <Tab key={t.to} label={t.label} component={RouterLink} to={t.to} sx={{ minHeight: 48, fontSize: '1rem', minWidth: { xs: 72, sm: 90 } }} />
          ))}
        </Tabs>
      </Box>
      <Outlet />
    </Page>
  );
}
