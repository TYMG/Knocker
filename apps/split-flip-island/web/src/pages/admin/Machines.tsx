// Admin: the places the league plays and the machines at each one. Used before the season and
// when the bar swaps a machine. Removing a machine never deletes anything: its old scores stay,
// it just stops being offered when a week's machines are picked, and it can be put back.
// Also prints the code stickers that go on each machine.

import { useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import GlobalStyles from '@mui/material/GlobalStyles';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import { useAppDispatch, useLeague } from '../../hooks';
import { machinesAt, machineWeeks } from '../../sample/league';
import { sample } from '../../sample/slice';
import type { SampleState, SMachine } from '../../sample/types';
import { showToast, type RootState } from '../../store';
import ActionCard from '../../ui/ActionCard';
import CodeBox from '../../ui/CodeBox';
import EmptyNote from '../../ui/EmptyNote';
import MachineArt from '../../ui/MachineArt';
import Page from '../../ui/Page';
import { Row, RowCard, RowText } from '../../ui/Rows';
import Section from '../../ui/Section';
import { count, listOf } from './seasonParts';

/** [1, 2, 3, 4, 5] -> "weeks 1 to 5"; [3] -> "week 3"; [1, 2, 5] -> "weeks 1, 2 and 5" */
function weekRuns(weeks: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < weeks.length; ) {
    let j = i;
    while (weeks[j + 1] === weeks[j]! + 1) j++;
    // Three or more weeks in a row read better as a range.
    if (j - i >= 2) parts.push(`${weeks[i]} to ${weeks[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(weeks[k]));
    i = j + 1;
  }
  return `${weeks.length === 1 ? 'week' : 'weeks'} ${listOf(parts)}`;
}

/** "In play weeks 1 to 5", "In play weeks 1 to 4, out in week 5", "Not picked for any week yet" */
function inPlayNote(league: SampleState, machineId: string): string {
  const picked = machineWeeks(league, machineId);
  if (picked.length === 0) return 'Not picked for any week yet';
  // A week it was picked for but broke in does not count as a week in play.
  const out = picked.filter((n) => league.weeks.find((w) => w.week === n)?.out[machineId]);
  const counted = picked.filter((n) => !out.includes(n));
  if (counted.length === 0) return `Out in ${weekRuns(out)}`;
  return `In play ${weekRuns(counted)}${out.length > 0 ? `, out in ${weekRuns(out)}` : ''}`;
}

/** A small dialog that asks for one name. `taken` are names already in use, which are refused. */
function NameDialog({ open, title, label, confirmLabel, taken, onConfirm, onClose }: { open: boolean; title: string; label: string; confirmLabel: string; taken: string[]; onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (open) setName('');
  }, [open]);
  const clean = name.trim().replace(/\s+/g, ' ');
  const clash = taken.find((t) => t.toLowerCase() === clean.toLowerCase());
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (clean && !clash) onConfirm(clean);
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField autoFocus label={label} value={name} onChange={(e) => setName(e.target.value)} error={!!clash} helperText={clash ? `There is already one called ${clash}.` : ' '} autoComplete="off" slotProps={{ htmlInput: { maxLength: 40 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="secondary" disabled={!clean || !!clash}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// When printing, only the stickers should reach the paper: the app behind the dialog, the dialog's
// own title and buttons, and its dark background are all left out.
const PRINT_ONLY_STICKERS = {
  '@media print': {
    '#root, .MuiBackdrop-root, .stickers-no-print': { display: 'none !important' },
    '.MuiDialog-root': { position: 'static !important' },
    '.MuiDialog-container': { display: 'block !important', height: 'auto !important' },
    '.MuiDialog-paper': { margin: '0 !important', maxWidth: 'none !important', maxHeight: 'none !important', width: '100% !important', boxShadow: 'none !important', background: '#ffffff !important' }
  }
} as const;

/** A preview of the stickers for one location, one per machine, ready to print and cut out. */
function StickersDialog({ open, locationName, machines, onClose }: { open: boolean; locationName: string; machines: SMachine[]; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && <GlobalStyles styles={PRINT_ONLY_STICKERS} />}
      <DialogTitle className="stickers-no-print">Code stickers for {locationName}</DialogTitle>
      <DialogContent>
        <Typography className="stickers-no-print" color="textSecondary">
          One sticker for each machine. Print, cut along the dashed lines and stick one on each machine.
        </Typography>
        <Typography className="stickers-no-print" variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
          Sample: these codes are placeholders. Scanning one does nothing yet.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: 1.5 }}>
          {machines.map((m) => (
            // Stickers are paper: always black on white, whatever the app's theme.
            <Box key={m.machineId} sx={{ bgcolor: 'common.white', color: 'common.black', border: '2px dashed', borderColor: 'common.black', borderRadius: 1.5, p: 1.25, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, textAlign: 'center', breakInside: 'avoid' }}>
              <Typography sx={{ fontFamily: "'Bungee', Impact, sans-serif", fontSize: '0.95rem', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{m.name}</Typography>
              <CodeBox to={`/machines/${m.machineId}`} size={104} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.25 }}>Scan to get in line or post a score</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions className="stickers-no-print" sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="secondary" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Machines() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const [chosenId, setChosenId] = useState<string | undefined>(league.locations[0]?.locationId);
  const [addingLocation, setAddingLocation] = useState(false);
  const [addingMachine, setAddingMachine] = useState(false);
  // The machine being asked about stays set while the dialog closes, so its name does not blink out.
  const [removing, setRemoving] = useState<SMachine | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);

  const here = league.locations.find((l) => l.locationId === chosenId) ?? league.locations[0];
  const machines = here ? machinesAt(league, here.locationId) : [];
  const removed = here ? league.machines.filter((m) => m.locationId === here.locationId && m.removed) : [];

  const addLocation = (name: string) => {
    setAddingLocation(false);
    dispatch(sample.addLocation(name));
    // The action makes up the new location's id, so read it back to select it.
    const locations = store.getState().sample.locations;
    setChosenId(locations[locations.length - 1]?.locationId);
    dispatch(showToast(`Added ${name}. It has no machines yet.`));
  };

  const addMachine = (name: string) => {
    if (!here) return;
    setAddingMachine(false);
    dispatch(sample.addMachine({ name, locationId: here.locationId }));
    dispatch(showToast(`Added ${name} at ${here.name}.`));
  };

  const remove = () => {
    if (!removing) return;
    dispatch(sample.removeMachine(removing.machineId));
    dispatch(showToast(`Removed ${removing.name}. Its old scores are kept.`));
    setRemoveOpen(false);
  };

  // What removing does to the calendar, worked out for the machine being asked about.
  const removingTonight = removing ? league.weeks.some((w) => w.state === 'open' && w.machineIds.includes(removing.machineId)) : false;
  const removingComing = removing ? league.weeks.filter((w) => w.state === 'upcoming' && w.machineIds.includes(removing.machineId)).length : 0;

  return (
    <Page title="Locations and machines" back={{ to: '/admin', label: 'Admin home' }}>
      <Stack spacing={4}>
        <Section title="Location">
          <Stack direction="row" role="group" aria-label="Location" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {league.locations.map((l) => {
              const selected = l.locationId === here?.locationId;
              return (
                <Chip
                  key={l.locationId}
                  clickable
                  aria-pressed={selected}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setChosenId(l.locationId)}
                  label={`${l.name}, ${count(machinesAt(league, l.locationId).length, 'machine')}`}
                  sx={{ height: 44, borderRadius: 22, fontSize: '0.95rem', fontWeight: selected ? 700 : 400, px: 0.5, maxWidth: '100%' }}
                />
              );
            })}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingLocation(true)} sx={{ minHeight: 44, borderRadius: 22 }}>
              Add a location
            </Button>
          </Stack>
        </Section>

        {here && (
          <Section title={`Machines at ${here.name}`}>
            {machines.length === 0 ? (
              <EmptyNote>No machines here yet.</EmptyNote>
            ) : (
              <RowCard>
                {machines.map((m) => (
                  <Row key={m.machineId}>
                    <MachineArt machine={m} size={48} />
                    <RowText primary={m.name} secondary={inPlayNote(league, m.machineId)} />
                    <Button onClick={() => { setRemoving(m); setRemoveOpen(true); }} aria-label={`Remove ${m.name}`} sx={{ minHeight: 44, flexShrink: 0, mr: -1 }}>
                      Remove
                    </Button>
                  </Row>
                ))}
              </RowCard>
            )}

            <Button variant="contained" color="secondary" size="large" fullWidth startIcon={<AddIcon />} onClick={() => setAddingMachine(true)} sx={{ mt: 1.5 }}>
              Add a machine
            </Button>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
              Removing a machine keeps its old scores. It just stops showing up when you pick a week's machines.
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <ActionCard to="/admin/lineup" title="Pick this week's machines" />
              <Button variant="outlined" size="large" startIcon={<PrintIcon />} disabled={machines.length === 0} onClick={() => setStickersOpen(true)}>
                Print code stickers
              </Button>
            </Stack>
          </Section>
        )}

        {removed.length > 0 && (
          <Section title="Removed" small>
            <RowCard>
              {removed.map((m) => (
                <Row key={m.machineId}>
                  <Box sx={{ display: 'flex', opacity: 0.55 }}>
                    <MachineArt machine={m} size={36} />
                  </Box>
                  <RowText primary={<Box component="span" sx={{ color: 'text.secondary' }}>{m.name}</Box>} secondary="Old scores kept" />
                  <Button variant="outlined" onClick={() => {
                    dispatch(sample.restoreMachine(m.machineId));
                    dispatch(showToast(`${m.name} is back. It can be picked for a week again.`));
                  }} aria-label={`Put back ${m.name}`} sx={{ minHeight: 44, flexShrink: 0 }}>
                    Put back
                  </Button>
                </Row>
              ))}
            </RowCard>
          </Section>
        )}
      </Stack>

      <NameDialog open={addingLocation} title="Add a location" label="Location name" confirmLabel="Add location" taken={league.locations.map((l) => l.name)} onConfirm={addLocation} onClose={() => setAddingLocation(false)} />
      <NameDialog
        open={addingMachine}
        title={`Add a machine at ${here?.name ?? ''}`}
        label="Machine name"
        confirmLabel="Add machine"
        // Removed machines count as taken too: put the old one back instead of making a second one.
        taken={[...machines, ...removed].map((m) => m.name)}
        onConfirm={addMachine}
        onClose={() => setAddingMachine(false)}
      />

      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Remove {removing?.name}?</DialogTitle>
        <DialogContent>
          <Typography>Its old scores are kept. It stops showing up when you pick a week's machines.</Typography>
          {(removingTonight || removingComing > 0) && (
            <Typography sx={{ mt: 1.5 }}>
              {removingTonight ? 'It stays on the list for the week that is open now. ' : ''}
              {removingComing > 0 ? `It comes off the ${count(removingComing, 'coming week')} it was picked for.` : ''}
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            You can put it back at any time.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoveOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={remove}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {here && <StickersDialog open={stickersOpen} locationName={here.name} machines={machines} onClose={() => setStickersOpen(false)} />}
    </Page>
  );
}
