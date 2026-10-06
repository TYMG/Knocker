// Admin home: the page an organizer's phone or tablet sits on all night. It answers "is the night
// open and how long is left", then lists one big button per job. A button turns coral when its job
// needs attention (teams missing, scores flagged, sign-ups waiting). Nothing is changed from here.

import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CampaignIcon from '@mui/icons-material/Campaign';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PlaceIcon from '@mui/icons-material/Place';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import TvIcon from '@mui/icons-material/Tv';
import { useLeague } from '../../hooks';
import { adminSummary, approvedTeams, machinesAt, nightStatus } from '../../sample/league';
import { clock, longDate } from '../../sample/time';
import ActionCard from '../../ui/ActionCard';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import { attention, listWords, minutesWords } from './nightShared';

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The line under a button's title: quiet normally, and in the attention style when the job needs
 * doing. ActionCard asks for these colors itself, but MUI 9 ignores the way it asks, so the
 * color is set on the text here.
 */
function Note({ alert, children }: { alert?: boolean; children: ReactNode }) {
  return (
    <Box component="span" sx={alert ? attention() : { color: 'text.secondary' }}>
      {children}
    </Box>
  );
}

/** One column on a phone, two on a tablet, three on a computer, so the buttons stay big. */
function Buttons({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>{children}</Box>;
}

export default function AdminHome() {
  const league = useLeague();
  const sum = adminSummary(league);
  const night = nightStatus(league);
  const week = night.week;
  const { flagged, unchecked, all } = sum.scores;

  // ---- The status sentence. Every time in it comes from the night settings. ----
  let status: string;
  if (!night.open) {
    status = `Week ${week.week} is closed.`;
  } else {
    // Normally the night has already opened by the time anyone looks. If an admin moves the
    // opening time later than now, say what the setting is rather than something untrue.
    const opened = league.now >= night.opensAt ? `Opened on its own at ${clock(night.opensAt)}.` : `Set to open on its own at ${clock(night.opensAt)}.`;
    const closes =
      night.minutesLeft > 0
        ? `Closes on its own at ${clock(night.closesAt)}, ${minutesWords(night.minutesLeft)} from now.`
        : `It was due to close at ${clock(night.closesAt)}. Close it from Night settings.`;
    const added = league.night.extraMinutes > 0 ? ` That includes ${minutesWords(league.night.extraMinutes)} added tonight.` : '';
    status = `${opened} ${closes}${added}`;
  }

  // ---- The line under each button ----
  const missing = sum.teams - sum.here;
  const hereNote = !night.open ? `${sum.here} of ${sum.teams} were here` : missing === 0 ? `All ${sum.teams} are here` : `${sum.here} of ${sum.teams} are here`;

  const scoreParts = [flagged > 0 ? `${flagged} ${flagged === 1 ? 'needs' : 'need'} a look` : null, unchecked > 0 ? `${unchecked} not checked` : null].filter(Boolean);
  const scoresNote = scoreParts.length ? scoreParts.join(', ') : all === 0 ? 'No scores yet' : `All ${all} checked`;

  const linesNote = !night.open
    ? 'No lines while the night is closed'
    : sum.lineTeams === 0
      ? 'Nobody in line'
      : `${count(sum.lineTeams, 'team')} signed up across ${count(sum.lineMachines, 'machine')}`;

  const out = sum.machinesOut.map((m) => m.name);
  const lineupNote = `${sum.machinesIn.length} in${out.length ? `, ${listWords(out)} ${out.length === 1 ? 'is' : 'are'} out` : ''}`;

  const teamCount = approvedTeams(league).length;
  const teamsNote = [count(teamCount, 'team'), sum.pending > 0 ? `${sum.pending} waiting for approval` : null, sum.waitlist > 0 ? `${sum.waitlist} on the waitlist` : null]
    .filter(Boolean)
    .join(', ');

  const leagueWeeks = league.weeks.filter((w) => w.week <= 8).length;
  const places = league.locations;
  const machineCount = places.reduce((n, place) => n + machinesAt(league, place.locationId).length, 0);
  const placesNote = `${places.length === 1 ? places[0]!.name : count(places.length, 'location')}, ${count(machineCount, 'machine')}`;

  return (
    <Page title="Admin home" width="wide">
      <Stack spacing={4}>
        <Card sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5, mb: 0.75 }}>
            <Tag tone={night.open ? 'live' : 'plain'}>{night.open ? 'Open' : 'Closed'}</Tag>
            <Typography variant="h4" component="p">
              Week {week.week}, {longDate(week.date)}
            </Typography>
          </Stack>
          <Typography color="textSecondary">{status}</Typography>
          <Link component={RouterLink} to="/admin/night" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.5, mb: -1, py: 1.25, fontWeight: 700 }}>
            <SettingsIcon fontSize="small" />
            Night settings
          </Link>
        </Card>

        <Section title="Tonight">
          <Buttons>
            <ActionCard to="/admin/check-in" title="Check in teams" note={<Note alert={night.open && missing > 0}>{hereNote}</Note>} alert={night.open && missing > 0} icon={<HowToRegIcon />} />
            <ActionCard to="/admin/scores" title="Check scores" note={<Note alert={flagged > 0}>{scoresNote}</Note>} alert={flagged > 0} icon={<FactCheckIcon />} />
            <ActionCard to="/admin/enter-score" title="Enter a score for a team" note={<Note>When a team's phone dies</Note>} icon={<KeyboardIcon />} />
            <ActionCard to="/admin/message" title="Message everyone" note={<Note>{league.message ? '1 message showing now' : 'Nothing showing'}</Note>} icon={<CampaignIcon />} />
            <ActionCard to="/admin/lines" title="Machine lines" note={<Note>{linesNote}</Note>} icon={<FormatListNumberedIcon />} />
            <ActionCard to="/admin/lineup" title="This week's machines" note={<Note>{lineupNote}</Note>} icon={<TuneIcon />} />
          </Buttons>
        </Section>

        <Section title="The season">
          <Buttons>
            <ActionCard to="/admin/teams" title="Teams" note={<Note alert={sum.pending > 0}>{teamsNote}</Note>} alert={sum.pending > 0} icon={<GroupsIcon />} />
            <ActionCard to="/admin/weeks" title="Weeks" note={<Note>{`Week ${week.week} of ${leagueWeeks}, then finals`}</Note>} icon={<CalendarMonthIcon />} />
            <ActionCard to="/admin/machines" title="Locations and machines" note={<Note>{placesNote}</Note>} icon={<PlaceIcon />} />
          </Buttons>
        </Section>

        <Link component={RouterLink} to="/tv" underline="hover" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, alignSelf: 'flex-start', py: 1.25 }}>
          <TvIcon fontSize="small" />
          Open the bar TV view
        </Link>
      </Stack>
    </Page>
  );
}
