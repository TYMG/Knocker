// Admin: one team. Used when a team asks about its scores or has forgotten its PIN.
// Top: who they are, how to reach them, reset the PIN. Below: their scores week by week, with
// one tap to mark a whole week as checked. A team still waiting for approval shows the
// approve / remove card instead, because it has no scores yet.

import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { currentWeek, findTeam, machine, scoreCounts, scoreList, seasonLine, teamTonight, weekLabel, weekOf } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock, longDate, ordinal } from '../../sample/time';
import type { SampleState, STeam, SWeek } from '../../sample/types';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import TeamAvatar from '../../ui/TeamAvatar';
import { ApprovalCard, count, listOf, PhoneLinks, ScoreRow } from './seasonParts';

const BACK = { to: '/admin/teams', label: 'Teams' };

/** "Week 5. 24 points, 2nd tonight. 5 games on 3 machines. Checked in at 6:55 PM." */
function weekSummary(league: SampleState, team: STeam, week: SWeek): string {
  const label = weekLabel(week.week);
  if (week.state === 'upcoming') return `${label}. ${longDate(week.date)}.`;
  if (team.firstWeek > week.week) return `${label}. ${team.teamName} starts in week ${team.firstWeek}.`;

  const tonight = teamTonight(league, team.teamId, week.week);
  const all = scoreList(league, { week: week.week, teamId: team.teamId });
  const active = all.filter((x) => x.status === 'active');
  const voided = all.length - active.length;
  const open = week.state === 'open';
  const parts = [`${label}.`];

  if (active.length === 0) {
    parts.push(open ? 'No scores yet tonight.' : 'Did not play.');
  } else {
    // Machines are counted from the scores themselves, so a game on a machine that later broke still shows up here.
    const machines = new Set(active.map((x) => x.machineId)).size;
    if (tonight.row) parts.push(`${count(tonight.row.points, 'point')}, ${ordinal(tonight.row.rank)} ${open ? 'tonight' : 'that night'}.`);
    parts.push(`${count(active.length, 'game')} on ${count(machines, 'machine')}.`);
  }
  if (voided > 0) parts.push(`${count(voided, 'voided score')} not counted.`);
  if (open) parts.push(tonight.checkedInAt ? `Checked in at ${clock(tonight.checkedInAt)}.` : 'Not checked in.');
  return parts.join(' ');
}

export default function TeamDetail() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamId } = useParams();
  // The chosen week is kept in the address, so coming back from a score lands on the same week.
  const [search, setSearch] = useSearchParams();
  const [phonesShown, setPhonesShown] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pinWasReset, setPinWasReset] = useState(false);

  const team = findTeam(league, teamId);
  if (!team) {
    return (
      <Page title="Team not found" back={BACK}>
        <EmptyNote>There is no team at this address. It may have been a sign-up that was removed or ran out of time.</EmptyNote>
        <Button component={RouterLink} to={BACK.to} variant="outlined" size="large" sx={{ mt: 1 }}>
          Back to teams
        </Button>
      </Page>
    );
  }

  const title = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <TeamAvatar team={team} size={64} />
      <span>{team.teamName}</span>
    </Box>
  );

  if (team.status === 'pending') {
    return (
      <Page title={title} subtitle={seasonLine(league, team.teamId)} back={BACK}>
        <ApprovalCard team={team} onRemoved={() => navigate(BACK.to)} />
      </Page>
    );
  }

  const asked = Number(search.get('week'));
  const week = weekOf(league, asked) ?? currentWeek(league);
  const scores = scoreList(league, { week: week.week, teamId: team.teamId });
  const counts = scoreCounts(league, week.week, team.teamId);
  const players = team.players.filter(Boolean);

  const resetPin = () => {
    setResetOpen(false);
    setPinWasReset(true);
    dispatch(sample.resetPin(team.teamId));
    dispatch(showToast(`${team.teamName}'s PIN is reset. The reset is in the league log.`));
  };

  const markAll = () => {
    dispatch(sample.markAllChecked({ teamId: team.teamId, week: week.week }));
    dispatch(showToast(`Checked ${count(counts.unchecked, 'score')} for ${team.teamName} in ${weekLabel(week.week).toLowerCase()}.`));
  };

  return (
    <Page title={title} subtitle={seasonLine(league, team.teamId)} back={BACK}>
      <Stack spacing={3}>
        <Box>
          {players.length > 0 && <Typography sx={{ mb: 1.5 }}>{listOf(players)}</Typography>}
          <Stack direction="row" spacing={1.5}>
            {/* Hidden until asked for, so the numbers are not on screen at the bar by accident. */}
            <Button variant="outlined" onClick={() => setPhonesShown((shown) => !shown)} aria-expanded={phonesShown} sx={{ minHeight: 44, flex: '1 1 auto', whiteSpace: 'nowrap' }}>
              {phonesShown ? 'Hide phone numbers' : 'Show phone numbers'}
            </Button>
            <Button variant="outlined" onClick={() => setResetOpen(true)} sx={{ minHeight: 44, flex: '1 1 auto', whiteSpace: 'nowrap' }}>
              Reset PIN
            </Button>
          </Stack>
          {phonesShown && (
            <Box sx={{ mt: 1 }}>
              <PhoneLinks team={team} />
            </Box>
          )}
          {pinWasReset && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Sample: how the team gets its new PIN is not decided yet.
            </Typography>
          )}
          <Link component={RouterLink} to={`/teams/${team.teamId}`} sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, mt: 0.5, fontWeight: 700 }}>
            See the public team page
          </Link>
        </Box>

        <Box>
          {/* The strip scrolls sideways inside itself. minWidth 0 on the tabs keeps nine of them from widening the page. */}
          <Tabs
            value={week.week}
            onChange={(_, value: number) => setSearch({ week: String(value) }, { replace: true })}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label={`${team.teamName}'s scores by week`}
            sx={{ borderBottom: 1, borderColor: 'divider', mx: -2, '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 } }}
          >
            {league.weeks.map((w) => (
              <Tab key={w.week} value={w.week} label={w.week >= 9 ? 'Finals' : `Wk ${w.week}`} id={`week-tab-${w.week}`} aria-controls="week-panel" sx={{ minWidth: 64, minHeight: 48, px: 1.5 }} />
            ))}
          </Tabs>

          <Box role="tabpanel" id="week-panel" aria-labelledby={`week-tab-${week.week}`} sx={{ pt: 2 }}>
            <Typography sx={{ mb: 1.5 }}>{weekSummary(league, team, week)}</Typography>

            {counts.unchecked > 0 && (
              <Button variant="contained" color="secondary" size="large" fullWidth onClick={markAll} sx={{ mb: 1 }}>
                {counts.unchecked === 1 ? 'Mark 1 as checked' : `Mark all ${counts.unchecked} as checked`}
              </Button>
            )}
            {(counts.unchecked > 0 || counts.flagged > 0) && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                {counts.flagged === 0
                  ? 'Scores that need a look are left for you to open.'
                  : counts.unchecked > 0
                    ? `${count(counts.flagged, 'score')} that ${counts.flagged === 1 ? 'needs' : 'need'} a look ${counts.flagged === 1 ? 'is' : 'are'} left for you to open.`
                    : `${count(counts.flagged, 'score')} ${counts.flagged === 1 ? 'needs' : 'need'} a look. Open ${counts.flagged === 1 ? 'it' : 'each one'} to decide.`}
              </Typography>
            )}

            {scores.length === 0 ? (
              // For a week that has been played, the line above already says the team did not play.
              week.state === 'upcoming' && <EmptyNote>No scores yet.</EmptyNote>
            ) : (
              <Card>
                {scores.map((x) => {
                  const name = machine(league, x.machineId).name;
                  return <ScoreRow key={x.scoreId} score={x} machineName={name} teamName={team.teamName} primary={name} meta={clock(x.at)} />;
                })}
              </Card>
            )}
          </Box>
        </Box>
      </Stack>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reset {team.teamName}'s PIN?</DialogTitle>
        <DialogContent>
          <Typography>The PIN is reset and the reset is written to the league log.</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            Sample: how the team gets its new PIN is not decided yet.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={resetPin}>
            Reset PIN
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
