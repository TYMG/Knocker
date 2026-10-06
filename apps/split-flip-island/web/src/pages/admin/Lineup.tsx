// This week's machines: which machines at the bar are in play. Used before the night to pick the
// lineup, and during it when a machine breaks. Taking a machine out mid-night is the one switch
// here that changes the standings (its scores stop counting for everyone), so it asks for a
// reason first. Later weeks simply toggle. Finished weeks can only be looked at.

import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { countedMachines, currentWeek, lineCount, linesView, location, machine, machinesAt, scoreList, weekOf } from '../../sample/league';
import { sample } from '../../sample/slice';
import { clock } from '../../sample/time';
import type { SMachine, SWeek } from '../../sample/types';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import MachineArt from '../../ui/MachineArt';
import Page from '../../ui/Page';
import ReasonDialog from '../../ui/ReasonDialog';
import { ADMIN_HOME, choiceSx, listWords } from './nightShared';

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

export default function Lineup() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const place = location(league);
  const leagueWeeks = league.weeks.filter((w) => w.week <= 8); // week 9 is finals night, which has its own page
  const [chosen, setChosen] = useState(() => currentWeek(league).week);
  const [takingOut, setTakingOut] = useState<SMachine | null>(null);
  const [puttingBack, setPuttingBack] = useState<SMachine | null>(null);

  const week = weekOf(league, chosen) ?? currentWeek(league);
  const open = week.state === 'open';
  const final = week.state === 'final';
  const machines = machinesAt(league, place.locationId);
  const lines = open ? linesView(league) : [];

  // Three buttons: the chosen week with the week before and after. At either end of the season
  // the window stops, so all eight weeks can be stepped through.
  const first = Math.min(Math.max(week.week - 1, 1), Math.max(leagueWeeks.length - 2, 1));
  const shownWeeks = leagueWeeks.filter((w) => w.week >= first && w.week < first + 3);
  const tab = (w: SWeek) => `Week ${w.week}${w.state === 'open' ? ', tonight' : ''}`;

  const note = (m: SMachine): string => {
    const picked = week.machineIds.includes(m.machineId);
    const out = week.out[m.machineId];
    if (!picked) return final ? 'Was not picked for this week.' : 'Not picked for this week.';
    if (out) return `${final ? 'Went out at' : 'Out since'} ${clock(out.at)}: ${out.reason}.`;
    if (open) return `In play. ${lineCount(lines.find((l) => l.machine.machineId === m.machineId)?.teams.length ?? 0)}.`;
    return final ? 'Was in play.' : 'Picked for this week.';
  };

  /** Scores on a machine this week that would start counting again if it went back in. */
  const scoresOn = (machineId: string) => scoreList(league, { week: week.week, machineId }).filter((x) => x.status === 'active').length;

  const change = (m: SMachine, wantIn: boolean) => {
    const inPlay = week.machineIds.includes(m.machineId) && !week.out[m.machineId];
    if (final || wantIn === inPlay) return;
    if (open && !wantIn) return setTakingOut(m); // a breakdown: ask why first
    if (open && week.out[m.machineId] && scoresOn(m.machineId) > 0) return setPuttingBack(m); // its old scores would count again
    const wasOut = !!week.out[m.machineId];
    dispatch(sample.setMachineInPlay({ week: week.week, machineId: m.machineId, inPlay: wantIn }));
    dispatch(showToast(open ? (wasOut ? `${m.name} is back in play` : `${m.name} added to tonight's machines`) : `${m.name} is ${wantIn ? 'in' : 'out'} for week ${week.week}`));
  };

  // "Week 6 starts with the same machines as week 5" is only said when the data agrees.
  const before = weekOf(league, week.week - 1);
  let carried: string | null = null;
  if (week.state === 'upcoming' && before && week.machineIds.length > 0) {
    const outBefore = Object.keys(before.out).map((id) => machine(league, id).name);
    if (sameSet(week.machineIds, before.machineIds)) carried = `Week ${week.week} starts with the same machines as week ${before.week}.`;
    else if (sameSet(week.machineIds, countedMachines(league, before))) carried = `Week ${week.week} starts with the machines still in play in week ${before.week}, so without ${listWords(outBefore)}.`;
  }

  return (
    <Page title={`Week ${week.week} machines`} subtitle={`Pick which machines at ${place.name} are in play this week.`} back={ADMIN_HOME}>
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={week.week}
          onChange={(_, next: number | null) => next && setChosen(next)}
          aria-label="Week to show"
          sx={choiceSx}
        >
          {shownWeeks.map((w) => (
            <ToggleButton key={w.week} value={w.week}>
              {tab(w)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {final && <Alert severity="info">Week {week.week} is final. Its machines can no longer be changed.</Alert>}

        {machines.length === 0 ? (
          <EmptyNote>There are no machines at {place.name} yet.</EmptyNote>
        ) : (
          <Card>
            {machines.map((m) => {
              const inPlay = week.machineIds.includes(m.machineId) && !week.out[m.machineId];
              return (
                <Box key={m.machineId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
                  <MachineArt machine={m} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{m.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {note(m)}
                    </Typography>
                  </Box>
                  <ToggleButtonGroup
                    exclusive
                    disabled={final}
                    value={inPlay ? 'in' : 'out'}
                    onChange={(_, next: 'in' | 'out' | null) => next && change(m, next === 'in')}
                    aria-label={`${m.name}, week ${week.week}`}
                    // "Out" is filled coral, "In" lime (black on the light scheme). The words carry the meaning; the color only backs them up.
                    sx={[choiceSx, { flexShrink: 0, '& .MuiToggleButton-root': { minWidth: 52 }, '& .MuiToggleButton-root.Mui-selected[value="out"], & .MuiToggleButton-root.Mui-selected[value="out"]:hover': { bgcolor: 'secondary.main', color: 'secondary.contrastText' } }]}
                  >
                    {/* Named with the machine, so a screen reader does not hear five identical "In" buttons. */}
                    <ToggleButton value="in" aria-label={`${m.name}, in`}>
                      In
                    </ToggleButton>
                    <ToggleButton value="out" aria-label={`${m.name}, out`}>
                      Out
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              );
            })}
          </Card>
        )}

        {!final && (
          <Typography variant="body2" color="textSecondary">
            Taking a machine out during the night drops its scores for every team that night.{carried ? ` ${carried}` : ''}
          </Typography>
        )}

        <Link component={RouterLink} to="/admin/machines" underline="hover" sx={{ alignSelf: 'flex-start', py: 1.25, fontWeight: 700 }}>
          Add or remove machines at {place.name}
        </Link>
      </Stack>

      <ReasonDialog
        open={!!takingOut}
        title={`Take ${takingOut?.name ?? 'it'} out for the night?`}
        body="Its scores stop counting for every team tonight and its line is emptied. Tonight's points change right away. The scores stay on record, and count again if you put it back in."
        confirmLabel="Take it out"
        onClose={() => setTakingOut(null)}
        onConfirm={(reason) => {
          if (!takingOut) return;
          dispatch(sample.setMachineInPlay({ week: week.week, machineId: takingOut.machineId, inPlay: false, reason }));
          dispatch(showToast(`${takingOut.name} is out for the night. Its scores stopped counting.`));
          setTakingOut(null);
        }}
      />

      {/* Putting a broken machine back also moves the standings, so it gets a plain yes or no. */}
      <Dialog open={!!puttingBack} onClose={() => setPuttingBack(null)} fullWidth maxWidth="xs">
        <DialogTitle>Put {puttingBack?.name ?? 'it'} back in play?</DialogTitle>
        <DialogContent>
          <Typography>
            {puttingBack && scoresOn(puttingBack.machineId) === 1 ? 'The 1 score' : `The ${puttingBack ? scoresOn(puttingBack.machineId) : 0} scores`} posted on it tonight start counting again, and tonight's points change right away.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPuttingBack(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              if (!puttingBack) return;
              dispatch(sample.setMachineInPlay({ week: week.week, machineId: puttingBack.machineId, inPlay: true }));
              dispatch(showToast(`${puttingBack.name} is back in play. Its scores count again.`));
              setPuttingBack(null);
            }}
          >
            Put it back
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
