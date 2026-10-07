// Enter a score for a team: for when a team's phone dies or has no signal. The admin picks the
// team and machine, types the score and says why. It is recorded as entered by an admin, counts
// right away and shows in the public log with the reason.

import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague } from '../../hooks';
import { formatScore, formatScoreInput } from '../../lib/format';
import { countedMachines, machine, nightStatus, teamsIn } from '../../sample/league';
import { sample } from '../../sample/slice';
import { showToast } from '../../store';
import MachineArt from '../../ui/MachineArt';
import Page from '../../ui/Page';
import PhotoPicker, { type PickedPhoto } from '../../ui/PhotoPicker';
import { scorePhoto } from '../../sample/art';
import TeamAvatar from '../../ui/TeamAvatar';
import { ADMIN_HOME, NightClosed } from './nightShared';

const TITLE = 'Enter a score for a team';
const optionSx = { display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 48 } as const;

export default function EnterScore() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const night = nightStatus(league);
  const teams = teamsIn(league, night.week.week).sort((a, b) => a.teamName.localeCompare(b.teamName));
  const machines = countedMachines(league, night.week).map((id) => machine(league, id));

  const [teamId, setTeamId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [score, setScore] = useState('');
  const [reason, setReason] = useState('');
  const [noPhoto, setNoPhoto] = useState(false);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  // Errors show after the first try at saving, not while the form is still being filled in.
  const [tried, setTried] = useState(false);
  /** What was just entered, shown above the cleared form. */
  const [done, setDone] = useState<string | null>(null);

  if (!night.open) {
    return (
      <Page title={TITLE} back={ADMIN_HOME}>
        <NightClosed week={night.week.week}>Scores can only be entered during league night.</NightClosed>
      </Page>
    );
  }

  const value = formatScoreInput(score).value;
  // A machine that went out after it was picked here can no longer take a score.
  const machineOk = machines.some((m) => m.machineId === machineId);
  const teamOk = teams.some((t) => t.teamId === teamId);
  const reasonOk = reason.trim().length >= 3;
  const picked = teams.find((t) => t.teamId === teamId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!teamOk || !machineOk || value === null || !reasonOk) return;
    const who = picked!.teamName;
    const what = machine(league, machineId).name;
    dispatch(sample.adminEnterScore({ teamId, machineId, score: value, reason: reason.trim(), noPhoto, photo: noPhoto ? undefined : photo?.photo, photoSource: photo?.source }));
    dispatch(showToast(`Entered ${formatScore(value)} for ${who} on ${what}`));
    setDone(`${formatScore(value)} for ${who} on ${what} is in and counts now.`);
    setTeamId('');
    setMachineId('');
    setScore('');
    setReason('');
    setNoPhoto(false);
    setPhoto(null);
    setTried(false);
  };

  return (
    <Page title={TITLE} subtitle="For when a team's phone dies or has no signal. It is logged as entered by an admin." back={ADMIN_HOME}>
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {done && (
          <Alert severity="success" onClose={() => setDone(null)}>
            {done}{' '}
            <Link component={RouterLink} to="/admin/scores" color="inherit" sx={{ fontWeight: 700 }}>
              Check scores
            </Link>
          </Alert>
        )}

        {machines.length === 0 ? (
          <Alert severity="info">
            No machines are in play tonight, so there is nothing to enter a score on.{' '}
            <Link component={RouterLink} to="/admin/lineup" color="inherit" sx={{ fontWeight: 700 }}>
              This week's machines
            </Link>
          </Alert>
        ) : (
          <>
            <TextField
              select
              label="Team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              error={tried && !teamOk}
              helperText={tried && !teamOk ? 'Pick the team.' : picked && !league.checkIns[picked.teamId] ? `${picked.teamName} is not checked in tonight. You can still enter the score.` : undefined}
            >
              {teams.map((t) => (
                <MenuItem key={t.teamId} value={t.teamId} sx={optionSx}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <TeamAvatar team={t} size={24} />
                    <span>
                      {t.teamName}
                      {!league.checkIns[t.teamId] && (
                        <Typography component="span" variant="body2" color="textSecondary">
                          {' '}
                          (not checked in)
                        </Typography>
                      )}
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField select label="Machine" value={machineOk ? machineId : ''} onChange={(e) => setMachineId(e.target.value)} error={tried && !machineOk} helperText={tried && !machineOk ? 'Pick the machine.' : undefined}>
              {machines.map((m) => (
                <MenuItem key={m.machineId} value={m.machineId} sx={optionSx}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
                    <MachineArt machine={m} size={24} />
                    {m.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Score"
              value={score}
              onChange={(e) => setScore(formatScoreInput(e.target.value).display)}
              error={tried && value === null}
              helperText={tried && value === null ? 'Type the score.' : undefined}
              slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.2rem' } } }}
            />

            <TextField
              label="Reason, shown in the public log"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={tried && !reasonOk}
              helperText={tried && !reasonOk ? 'Say why an admin is entering it.' : 'For example: phone died'}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />

            {/* The same photo step a team gets, so an admin posting for a team can attach the picture too. */}
            {!noPhoto && (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Photo of the score</Typography>
                <PhotoPicker
                  value={photo}
                  onChange={setPhoto}
                  standIn={scorePhoto(value ?? 0, machineOk ? machine(league, machineId).name : 'Score', 'full')}
                  hint="Get the whole score display in the frame."
                />
              </Box>
            )}

            <Box>
              <FormControlLabel control={<Checkbox checked={noPhoto} onChange={(e) => setNoPhoto(e.target.checked)} />} label="No photo available" sx={{ minHeight: 44 }} />
              <Typography variant="body2" color="textSecondary">
                Tick this when nobody got a picture of the score. In the sample league, a score entered without choosing a photo gets a drawn stand-in.
              </Typography>
            </Box>

            <Button type="submit" variant="contained" color="secondary" size="large">
              Enter score
            </Button>
          </>
        )}
      </Stack>
    </Page>
  );
}
