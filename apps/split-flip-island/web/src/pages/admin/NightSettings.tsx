// Night settings: rarely needed, because a league night opens and closes on its own. This is where
// an admin changes those two times for every league night, gives tonight 15 more minutes, or
// closes the night early. Closing locks in the points, so it asks first. A night closed by
// mistake can be reopened from here.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { nightStatus, scoreCounts } from '../../sample/league';
import { sample } from '../../sample/slice';
import { addMinutes, clock, clockLabel } from '../../sample/time';
import { showToast } from '../../store';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import { ADMIN_HOME, attention, minutesWords } from './nightShared';

type Which = 'opensAt' | 'closesAt';

const EVERY_NIGHT = 'These times apply to every league night, so nobody has to remember to open or close one.';

/** Every quarter hour of the day as "19:00", the form the settings are stored in. */
const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

export default function NightSettings() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const night = nightStatus(league);
  const week = night.week.week;
  const settings = league.night;
  const flagged = scoreCounts(league, week).flagged;

  const [changing, setChanging] = useState<Which | null>(null);
  const [draft, setDraft] = useState('');
  const [closing, setClosing] = useState(false);

  const startChange = (which: Which) => {
    setDraft(settings[which]);
    setChanging(which);
  };

  // Opening must stay before closing, so each list only offers times on the right side of the
  // other one. "19:00" style times compare correctly as text. The current value is always
  // offered, even if it was somehow set off the quarter hour.
  const choices = (which: Which) => {
    const list = QUARTER_HOURS.filter((t) => (which === 'opensAt' ? t < settings.closesAt : t > settings.opensAt));
    return list.includes(settings[which]) ? list : [...list, settings[which]].sort();
  };

  let detail: string;
  if (!night.open) detail = 'Teams cannot submit scores.';
  else if (night.minutesLeft > 0) detail = `${minutesWords(night.minutesLeft)} left. Teams can submit scores until it closes.`;
  else detail = `It was due to close at ${clock(night.closesAt)}. Teams can submit scores until it closes.`;

  const rows: [Which, string][] = [
    ['opensAt', 'Opens on its own'],
    ['closesAt', 'Closes on its own']
  ];

  return (
    <Page title="Night settings" back={ADMIN_HOME}>
      <Stack spacing={3}>
        <Card sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5, mb: 0.5 }}>
            <Tag tone={night.open ? 'live' : 'plain'}>{night.open ? 'Open' : 'Closed'}</Tag>
            <Typography variant="h4" component="p">
              Week {week} is {night.open ? 'running' : 'closed'}
            </Typography>
          </Stack>
          <Typography color="textSecondary">{detail}</Typography>
        </Card>

        <Box>
          <Card>
            {rows.map(([which, label]) => (
              <Box key={which} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" color="textSecondary">
                    {label}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums' }}>{clockLabel(settings[which])}</Typography>
                  {which === 'closesAt' && night.open && settings.extraMinutes > 0 && (
                    <Typography variant="body2" color="textSecondary">
                      Tonight: {clock(night.closesAt)}, with {minutesWords(settings.extraMinutes)} added
                    </Typography>
                  )}
                </Box>
                <Button variant="outlined" onClick={() => startChange(which)} aria-label={`Change the ${which === 'opensAt' ? 'opening' : 'closing'} time`} sx={{ minHeight: 44, flexShrink: 0 }}>
                  Change
                </Button>
              </Box>
            ))}
          </Card>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {EVERY_NIGHT}
          </Typography>
        </Box>

        {night.open ? (
          <Section title="Just for tonight">
            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  dispatch(sample.addMinutes(15));
                  // The store has not updated inside this handler yet, so work the new time out here.
                  dispatch(showToast(`Added 15 minutes. Tonight now closes at ${clock(addMinutes(night.closesAt, 15))}.`));
                }}
              >
                Add 15 minutes
              </Button>
              <Button variant="outlined" color="secondary" size="large" onClick={() => setClosing(true)}>
                Close the night now
              </Button>
              <Typography variant="body2" color="textSecondary">
                Closing locks in tonight's points. You can reopen a night from Weeks if you closed it by mistake.
              </Typography>
            </Stack>
          </Section>
        ) : (
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => {
                dispatch(sample.reopenNight(week));
                dispatch(showToast(`Week ${week} is open again`));
              }}
            >
              Reopen week {week}
            </Button>
            <Typography variant="body2" color="textSecondary">
              For a night closed by mistake. Teams can submit scores again. The lines stay empty and call-outs that were settled stay settled.
            </Typography>
          </Stack>
        )}
      </Stack>

      <Dialog open={!!changing} onClose={() => setChanging(null)} fullWidth maxWidth="xs">
        <DialogTitle>{changing === 'opensAt' ? 'When league nights open' : 'When league nights close'}</DialogTitle>
        <DialogContent>
          {changing && (
            <TextField
              select
              label={changing === 'opensAt' ? 'Opens on its own at' : 'Closes on its own at'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              sx={{ mt: 1 }}
              slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } }}
            >
              {choices(changing).map((t) => (
                <MenuItem key={t} value={t} sx={{ minHeight: 44 }}>
                  {clockLabel(t)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            {EVERY_NIGHT}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setChanging(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!changing || draft === settings[changing]}
            onClick={() => {
              if (!changing) return;
              dispatch(sample.setNightTimes({ [changing]: draft }));
              dispatch(showToast(`League nights now ${changing === 'opensAt' ? 'open' : 'close'} at ${clockLabel(draft)}`));
              setChanging(null);
            }}
          >
            Save time
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closing} onClose={() => setClosing(false)} fullWidth maxWidth="xs">
        <DialogTitle>Close week {week} now?</DialogTitle>
        <DialogContent>
          <Typography>This locks in tonight's points, empties the lines and settles tonight's call-outs. Teams can no longer submit scores.</Typography>
          {flagged > 0 && (
            <Typography sx={attention({ mt: 1.5 })}>
              {flagged} {flagged === 1 ? 'score still needs' : 'scores still need'} a look. You can still fix or void {flagged === 1 ? 'it' : 'them'} after closing.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClosing(false)}>Keep it open</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              dispatch(sample.closeNight());
              dispatch(showToast(`Week ${week} is closed. Tonight's points are locked in.`));
              setClosing(false);
            }}
          >
            Close the night
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
