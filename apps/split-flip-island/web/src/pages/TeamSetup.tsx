// Finish setting up, at "/team/setup": for a team just made from two solo players who both said
// yes. Together they pick the team name (or keep "Bea & Ana"), a photo if they want one, and the
// PIN they'll share to log in on another phone. Done once; after that the PIN changes in Settings.
import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useLiveOn, useMe } from '../hooks';
import { pinProblem } from '../../../shared/pin';
import { live } from '../live/client';
import { refreshLive } from '../live/sync';
import { teamPhoto } from '../sample/art';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import Page from '../ui/Page';
import PhotoPicker, { type PickedPhoto } from '../ui/PhotoPicker';

const pinInput = { htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4, autoComplete: 'off' } } as const;
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export default function TeamSetup() {
  const me = useMe();
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const liveOn = useLiveOn();
  const [name, setName] = useState(me.isTeam ? me.team.teamName : '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState('');
  const [sending, setSending] = useState(false);

  if (!me.isTeam) return <Navigate to="/" replace />;
  if (!me.team.needsSetup) {
    return (
      <Page title="Set up your team">
        <Stack spacing={2}>
          <Typography>{me.team.teamName} is all set. To change your PIN, go to Settings.</Typography>
          <Button component={RouterLink} to="/" variant="contained">Go to team home</Button>
        </Stack>
      </Page>
    );
  }
  const team = me.team;
  const teamName = name.trim().replace(/\s+/g, ' ');
  const taken = league.teams.some((t) => t.teamId !== team.teamId && t.teamName.toLowerCase() === teamName.toLowerCase());
  const errors = {
    name: teamName.length < 2 || teamName.length > 30 ? 'Team name must be 2 to 30 characters.' : taken ? 'Another team already has that name.' : '',
    pin: pinProblem(pin),
    again: !again ? 'Type the PIN again.' : again !== pin ? 'The two PINs do not match.' : ''
  };
  const err = (k: keyof typeof errors, hint?: string) => ({ id: `setup-${k}`, error: tried && !!errors[k], helperText: (tried && errors[k]) || hint });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const wrong = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
    if (wrong) { document.getElementById(`setup-${wrong}`)?.focus(); return; }
    const done = () => { dispatch(showToast(`${teamName} is all set. Welcome to the league!`)); navigate('/', { replace: true }); };
    if (liveOn) {
      setFailed('');
      setSending(true);
      live.finishSetup(teamName, pin, photo?.photo)
        .then(async () => { await refreshLive(); done(); })
        .catch((x: Error) => setFailed(x.message))
        .finally(() => setSending(false));
      return;
    }
    dispatch(sample.finishTeamSetup({ teamName, ...(photo?.photo ? { photo: photo.photo } : {}) }));
    done();
  };

  return (
    <Page title="Set up your team" subtitle={`${team.players[0]} and ${team.players[1]}: you both said yes. Do this part together.`}>
      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} autoComplete="off" {...err('name', 'Keep it, or pick your own. 2 to 30 characters.')} />
          <Box>
            <Typography component="h2" sx={{ fontWeight: 700, mb: 1 }}>Team photo (optional)</Typography>
            <PhotoPicker value={photo} onChange={setPhoto} facing="user" standIn={teamPhoto(teamName || team.teamName)} hint="Both of you in the shot. Skip it and the drawn one is used." />
          </Box>
          <TextField label="Team PIN" type="password" value={pin} onChange={(e) => setPin(digits(e.target.value))} slotProps={pinInput} {...err('pin', '4 digits you both share, to log in on another phone. This phone stays logged in.')} />
          <TextField label="PIN again" type="password" value={again} onChange={(e) => setAgain(digits(e.target.value))} slotProps={pinInput} {...err('again')} />
          {failed && <Typography role="alert" sx={{ color: 'secondary.main', fontWeight: 700 }}>{failed}</Typography>}
          <Button type="submit" variant="contained" color="secondary" size="large" disabled={sending}>{sending ? 'Saving…' : 'Save our team'}</Button>
          <Button component={RouterLink} to="/" color="inherit">Later</Button>
        </Stack>
      </Box>
    </Page>
  );
}
