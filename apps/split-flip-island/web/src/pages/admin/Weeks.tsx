// Admin: the season's calendar. One row per week with its state (final, open now, or still to
// come), each opening that week's scores. Two rare jobs also live here: skipping a date, which
// moves every later week back seven days, and reopening a night that was closed by mistake.

import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useAppDispatch, useLeague } from '../../hooks';
import { scoreCounts, teamsIn, weekLabel } from '../../sample/league';
import { sample } from '../../sample/slice';
import { longDate, shortDate } from '../../sample/time';
import type { SampleState, SWeek } from '../../sample/types';
import { showToast } from '../../store';
import Page from '../../ui/Page';
import Tag from '../../ui/Tag';
import { count } from './seasonParts';

/** The date seven days later, the same sum the skip action does. */
function weekLater(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** "Final. 10 teams, 38 scores." / "Open now. 8 teams here, 32 scores." / the date for a week still to come. */
function stateLine(league: SampleState, week: SWeek): string {
  const counts = scoreCounts(league, week.week);
  if (week.state === 'final') return `Final. ${count(counts.teams, 'team')}, ${count(counts.all, 'score')}.`;
  if (week.state === 'open') {
    const here = teamsIn(league, week.week).filter((t) => league.checkIns[t.teamId]).length;
    return `Open now. ${count(here, 'team')} here, ${count(counts.all, 'score')}.`;
  }
  return week.week >= 9 ? `${longDate(week.date)}. Top 4 and second-chance final.` : longDate(week.date);
}

export default function Weeks() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipChoice, setSkipChoice] = useState<number | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);

  const weeks = [...league.weeks].sort((a, b) => a.week - b.week);
  const coming = weeks.filter((w) => w.state === 'upcoming');
  const nightOpen = weeks.some((w) => w.state === 'open');
  // Only the latest finished week can be reopened, and only while no other night is open.
  const reopenable = nightOpen ? undefined : [...weeks].reverse().find((w) => w.state === 'final');
  const chosen = coming.find((w) => w.week === skipChoice);

  // Weeks and skipped dates in one list, in date order, so a skipped date sits between the weeks around it.
  const items: ({ date: string; week: SWeek } | { date: string; week?: undefined })[] = [
    ...weeks.map((week) => ({ date: week.date, week })),
    ...league.skippedDates.map((date) => ({ date }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  const skip = () => {
    if (!chosen) return;
    setSkipOpen(false);
    dispatch(sample.skipWeek(chosen.week));
    dispatch(showToast(`No league night on ${longDate(chosen.date)}. ${weekLabel(chosen.week)} moves to ${longDate(weekLater(chosen.date))}.`));
  };

  const reopen = () => {
    if (!reopenable) return;
    setReopenOpen(false);
    dispatch(sample.reopenNight(reopenable.week));
    dispatch(showToast(`${weekLabel(reopenable.week)} is open again.`));
  };

  return (
    <Page title="Weeks" back={{ to: '/admin', label: 'Admin home' }}>
      <Stack spacing={1}>
        {items.map((item) => {
          if (!item.week) {
            return (
              <Box key={`skipped-${item.date}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5, py: 0.75, color: 'text.secondary' }}>
                <EventBusyIcon fontSize="small" />
                <Typography variant="body2">No league night on {longDate(item.date)}</Typography>
              </Box>
            );
          }
          const week = item.week;
          const open = week.state === 'open';
          return (
            <Card
              key={week.week}
              sx={{
                // The open week is the highlighted row; weeks still to come have a dashed outline.
                ...(open && { bgcolor: 'action.selected', borderColor: 'primary.main', borderWidth: 2 }),
                ...(week.state === 'upcoming' && { borderStyle: 'dashed', borderColor: 'text.secondary' })
              }}
            >
              <CardActionArea component={RouterLink} to={`/admin/weeks/${week.week}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, minHeight: 64 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{weekLabel(week.week)}</Typography>
                    {/* A coming week's state line is its date, so only weeks already played repeat it here in short. */}
                    {week.state !== 'upcoming' && (
                      <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>
                        {shortDate(week.date)}
                      </Typography>
                    )}
                    {open && <Tag tone="live">Open</Tag>}
                  </Stack>
                  <Typography variant="body2" color={open ? 'textPrimary' : 'textSecondary'}>
                    {stateLine(league, week)}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
              </CardActionArea>
              {reopenable?.week === week.week && (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5, px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
                  <Button variant="outlined" onClick={() => setReopenOpen(true)} sx={{ minHeight: 44 }}>
                    Reopen {weekLabel(week.week).toLowerCase()}
                  </Button>
                  <Typography variant="body2" color="textSecondary" sx={{ flex: '1 1 160px' }}>
                    For a night closed by mistake.
                  </Typography>
                </Box>
              )}
            </Card>
          );
        })}
      </Stack>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        disabled={coming.length === 0}
        onClick={() => {
          setSkipChoice(null);
          setSkipOpen(true);
        }}
        sx={{ mt: 3 }}
      >
        Skip a week
      </Button>
      {coming.length === 0 && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          There are no weeks left to skip.
        </Typography>
      )}

      <Dialog open={skipOpen} onClose={() => setSkipOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Skip a week</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>That date gets no league night. That week and every later one, finals included, move back seven days.</Typography>
          <FormControl>
            <FormLabel id="skip-week-label" sx={{ mb: 0.5 }}>
              Which week?
            </FormLabel>
            <RadioGroup aria-labelledby="skip-week-label" value={skipChoice ?? ''} onChange={(e) => setSkipChoice(Number(e.target.value))}>
              {coming.map((w) => (
                <FormControlLabel
                  key={w.week}
                  value={w.week}
                  control={<Radio />}
                  sx={{ minHeight: 52 }}
                  label={
                    <Box>
                      <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{weekLabel(w.week)}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {longDate(w.date)}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
          {chosen && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
              {weekLabel(chosen.week)} moves to {longDate(weekLater(chosen.date))}.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSkipOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" disabled={!chosen} onClick={skip}>
            Skip this date
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reopenOpen && !!reopenable} onClose={() => setReopenOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reopen {reopenable ? weekLabel(reopenable.week).toLowerCase() : 'this week'}?</DialogTitle>
        <DialogContent>
          <Typography>This is for a night closed by mistake. Teams can submit scores again until you close it. It goes in the league log.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReopenOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={reopen}>
            Reopen
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
