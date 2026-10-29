// Admin: one team. Used when a team asks about its scores or has forgotten its PIN.
// Top: who they are, how to reach them, reset the PIN. Below: their scores week by week, with
// one tap to mark a whole week as checked. A team still waiting for approval shows the
// approve / remove card instead, because it has no scores yet.

import { useState } from 'react';
import { live } from '../../live/client';
import { refreshLive } from '../../live/sync';
import { pinProblem } from '../../../../shared/pin';
import { playersLine } from '../../ui/players';
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
import { useAppDispatch, useAppSelector, useLeague } from '../../hooks';
import { currentWeek, FORFEIT_LIMIT, forfeitCounts, NO_SHOW_LIMIT, noShowCount, subsUsed, findTeam, machine, scoreCounts, scoreList, seasonLine, teamTonight, weekLabel, weekOf } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock, longDate, ordinal } from '../../sample/time';
import type { SampleState, STeam, SWeek } from '../../sample/types';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import TeamAvatar from '../../ui/TeamAvatar';
import ReasonDialog from '../../ui/ReasonDialog';
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
  // The temporary PIN, shown once in the dialog right after the reset.
  const [tempPin, setTempPin] = useState('');
  const liveOn = useAppSelector((x) => x.live.on);

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
    if (liveOn) {
      // The live league: the server makes the temporary PIN and shows it here once.
      live.resetPin(team.teamId)
        .then((r) => { setTempPin(r.pin); void refreshLive(); })
        .catch((err: Error) => { setResetOpen(false); dispatch(showToast(err.message)); });
      return;
    }
    setTempPin(temporaryPin());
    dispatch(sample.resetPin(team.teamId));
  };
  const closeReset = () => {
    setResetOpen(false);
    if (tempPin) dispatch(showToast(`${team.teamName}'s PIN is reset. The reset is in the league log.`));
    setTempPin('');
  };

  const markAll = () => {
    dispatch(sample.markAllChecked({ teamId: team.teamId, week: week.week }));
    dispatch(showToast(`Checked ${count(counts.unchecked, 'score')} for ${team.teamName} in ${weekLabel(week.week).toLowerCase()}.`));
  };

  return (
    <Page title={title} subtitle={seasonLine(league, team.teamId)} back={BACK}>
      <Stack spacing={3}>
        <Box>
          {players.length > 0 && <Typography sx={{ mb: 1.5 }}>{playersLine(team)}</Typography>}
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
          <Forfeits league={league} teamId={team.teamId} />
          <NoShows teamId={team.teamId} />
          <Subs league={league} teamId={team.teamId} />
          <Withdraw teamId={team.teamId} />
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

      <Dialog open={resetOpen} onClose={tempPin ? undefined : closeReset} fullWidth maxWidth="xs">
        {!tempPin ? (
          <>
            <DialogTitle>Reset {team.teamName}'s PIN?</DialogTitle>
            <DialogContent>
              <Typography>You'll get a temporary PIN to tell the team in person. Their old PIN stops working and every phone they were logged in on is signed out (good for a lost phone). The reset goes in the league log.</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeReset}>Cancel</Button>
              <Button variant="contained" color="secondary" onClick={resetPin}>
                Reset PIN
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>{team.teamName}'s temporary PIN</DialogTitle>
            <DialogContent>
              <Typography aria-label={`Temporary PIN ${tempPin.split('').join(' ')}`} sx={{ fontFamily: 'monospace', fontSize: '3rem', fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center', my: 1 }}>
                {tempPin}
              </Typography>
              <Typography>Tell the team in person. They log in with it, then pick their own in Settings (the gear), under Change PIN.</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>It won't be shown again. If it's lost, reset it again.</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="contained" onClick={closeReset}>Done</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Page>
  );
}

/** Turns this team forfeited, tonight and this season. Three in a season brings a penalty (not decided yet). */
function Forfeits({ league, teamId }: { league: SampleState; teamId: string }) {
  const f = forfeitCounts(league, teamId);
  const over = f.season >= FORFEIT_LIMIT;
  return (
    <Typography variant="body2" sx={{ mt: 1.25, color: over ? 'secondary.main' : 'text.secondary', fontWeight: over ? 700 : 400 }}>
      Forfeited turns: {f.tonight} tonight, {f.season} this season{f.forgiven ? ` (plus ${f.forgiven} forgiven)` : ''}{over ? `. That's ${FORFEIT_LIMIT} or more: the penalty is not decided yet.` : `. ${FORFEIT_LIMIT} in a season brings a penalty.`}
    </Typography>
  );
}

/** Each partner can be subbed out once a season. */
function Subs({ league, teamId }: { league: SampleState; teamId: string }) {
  const t = league.teams.find((x) => x.teamId === teamId)!;
  const used = subsUsed(league, teamId);
  const line = ([0, 1] as const)
    .map((i) => (used[i] ? `${t.players[i]}: subbed out in week ${used[i]!.week} (${used[i]!.subName})` : `${t.players[i]}: sub not used`))
    .join(' · ');
  return <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>Subs: {line}</Typography>;
}

/** Take a team out mid-season, or bring it back. Every night is worked out again either way. */
function Withdraw({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const t = league.teams.find((x) => x.teamId === teamId)!;
  const [open, setOpen] = useState(false);
  if (t.status === 'pending') return null;
  if (t.status === 'withdrawn') {
    return (
      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: 1, borderColor: 'secondary.main' }}>
        <Typography sx={{ fontWeight: 700 }}>Withdrawn in week {t.withdrawn?.week}</Typography>
        <Typography variant="body2" color="textSecondary">{t.withdrawn?.reason ? `${t.withdrawn.reason.replace(/[.!?]$/, '')}.` : 'No reason given.'} Their scores no longer count, so every night is worked out as if they were never in the league.</Typography>
        <Button onClick={() => { dispatch(sample.reinstateTeam(teamId)); dispatch(showToast(`${t.teamName} is back in the league`)); }} sx={{ mt: 0.5 }}>
          Bring them back
        </Button>
      </Box>
    );
  }
  return (
    <>
      <Button color="secondary" variant="outlined" onClick={() => setOpen(true)} sx={{ mt: 1.5, minHeight: 44 }}>
        {t.eliminated ? 'Remove from the standings entirely' : 'Withdraw this team'}
      </Button>
      <ReasonDialog
        open={open}
        title={`Withdraw ${t.teamName}?`}
        body="They leave the league. Every night is worked out again as if they were never here: their scores stop counting and points shift for everyone. Live challenges with them are called off. You can bring them back."
        confirmLabel="Withdraw"
        onConfirm={(reason) => { dispatch(sample.withdrawTeam({ teamId, reason })); dispatch(showToast(`${t.teamName} withdrawn. Standings worked out again.`)); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** No-shows this season, each with Excuse, and the team's place in the running. */
function NoShows({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const t = league.teams.find((x) => x.teamId === teamId)!;
  const list = (league.noShows ?? []).filter((n) => n.teamId === teamId);
  const count = noShowCount(league, teamId);
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ color: count >= NO_SHOW_LIMIT ? 'secondary.main' : 'text.secondary', fontWeight: count >= NO_SHOW_LIMIT ? 700 : 400 }}>
        No-shows: {count} of {NO_SHOW_LIMIT} allowed this season.
      </Typography>
      {list.map((n) => (
        <Stack key={n.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>
            Week {n.week}{n.excused ? ': excused' : ''}
          </Typography>
          {!n.excused && (
            <Button size="small" onClick={() => { dispatch(sample.excuseNoShow(n.id)); dispatch(showToast(`Excused ${t.teamName}'s week ${n.week} no-show`)); }}>
              Excuse
            </Button>
          )}
        </Stack>
      ))}
      {t.eliminated && (
        <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, border: 1, borderColor: 'secondary.main' }}>
          <Typography sx={{ fontWeight: 700 }}>Out of the running since week {t.eliminated.week}</Typography>
          <Typography variant="body2" color="textSecondary">
            They keep the points they earned before, can still come and play for fun, but nothing after week {t.eliminated.week} counts and they can't make the finals or win season prizes. Excuse a no-show above to bring them back, or remove them from the standings entirely below.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/** A random 4-digit PIN that isn't one of the easy ones (the server makes its own the same way). */
function temporaryPin(): string {
  for (;;) {
    const pin = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    if (!pinProblem(pin)) return pin;
  }
}
