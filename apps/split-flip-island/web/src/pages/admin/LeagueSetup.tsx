// League setup: the season's dates and times, pausing the league, and (for the owner) starting
// the whole league over and setting up a new season.
//
// On the sample league, starting over and setting up only change the made-up league in this
// browser ("Back to the demo" brings the demo back). On the live league they go to the server.
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { newLeague } from '../../../../shared/league/new';
import { useAppDispatch, useAppSelector, useLeague } from '../../hooks';
import { live } from '../../live/client';
import { refreshLive } from '../../live/sync';
import { sample } from '../../sample/slice';
import { clockLabel, shortDate } from '../../sample/time';
import { showToast } from '../../store';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import { ADMIN_HOME } from './nightShared';

const WORDS = 'START OVER';

export default function LeagueSetup() {
  const liveOn = useAppSelector((s) => s.live.on);
  const missing = useAppSelector((s) => s.live.missing);
  // On the sample, "start over" just opens the setup form here.
  const [settingUp, setSettingUp] = useState(false);
  const showForm = liveOn ? missing : settingUp;
  return (
    <Page title="League setup" subtitle="The season's dates and times, pausing, and starting over." back={ADMIN_HOME}>
      {showForm ? <SetupForm onDone={() => setSettingUp(false)} /> : (
        <Stack spacing={4}>
          <Season />
          <Pause />
          <StartOver onSampleStartOver={() => setSettingUp(true)} />
        </Stack>
      )}
    </Page>
  );
}

function Season() {
  const league = useLeague();
  const nights = league.weeks.filter((w) => w.week <= 8);
  const finals = league.weeks.find((w) => w.week === 9);
  return (
    <Section title="This season">
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700 }}>
          {nights.length} league nights, {clockLabel(league.night.opensAt)} to {clockLabel(league.night.closesAt)}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          {nights.map((w) => shortDate(w.date)).join(', ')}{finals ? `. Finals ${shortDate(finals.date)}.` : '.'}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          Up to {league.teamCap} teams. Machines: {league.machines.filter((m) => !m.removed).map((m) => m.name).join(', ') || 'none yet'}.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Change night times in Night settings, machines in Locations and machines, and skip a week in Weeks.
        </Typography>
      </Card>
    </Section>
  );
}

function Pause() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const paused = !!league.paused;
  return (
    <Section title="Pause the league">
      <Card variant="outlined" sx={{ p: 2 }}>
        <FormControlLabel
          control={<Switch checked={paused} onChange={(e) => { dispatch(sample.setPaused(e.target.checked)); dispatch(showToast(e.target.checked ? 'The league is paused.' : 'The league is running again.')); }} />}
          label={<Typography sx={{ fontWeight: 700 }}>{paused ? 'Paused' : 'Running'}</Typography>}
          sx={{ mx: 0 }}
        />
        <Typography variant="body2" color="textSecondary">
          While paused, nights don't open by themselves, no reminder texts go out, and sign-ups are closed. Everyone can still look at the league, and admins can still change things.
        </Typography>
      </Card>
    </Section>
  );
}

function StartOver({ onSampleStartOver }: { onSampleStartOver: () => void }) {
  const league = useLeague();
  const liveOn = useAppSelector((s) => s.live.on);
  const dispatch = useAppDispatch();
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  // The sample league plays the owner; on the live league only the owner sees this.
  if (liveOn && !league.adminIsOwner) return null;
  // On the live league the owner types their password again, so a phone left logged in can't wipe it.
  const ready = typed.trim().toUpperCase() === WORDS && (!liveOn || password.length > 0);
  const go = () => {
    if (!ready) return;
    if (!liveOn) { setTyped(''); onSampleStartOver(); return; }
    setBusy(true); setFailed('');
    live.startOver(typed, password)
      .then(async (r) => { await refreshLive(); dispatch(showToast(`Started over: ${r.deleted} records deleted. Set up the new season.`)); })
      .catch((err: Error) => setFailed(err.message))
      .finally(() => setBusy(false));
  };
  return (
    <Section title="Start over">
      <Card variant="outlined" sx={{ p: 2, borderColor: 'error.main' }}>
        <Typography sx={{ fontWeight: 700 }}>Delete the whole league and start a new season</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, mb: 2 }}>
          Every team, score, line, challenge and the league log are deleted, along with each team's PIN and phone numbers. Admin accounts stay. This can't be undone.
          {!liveOn && ' (On the sample league this only resets the made-up league in this browser.)'}
        </Typography>
        <Stack spacing={1.5}>
          <TextField label={`Type ${WORDS} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          {liveOn && (
            <TextField label="Your admin password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          )}
          {failed && <Alert severity="error">{failed}</Alert>}
          <Button variant="contained" color="error" disabled={!ready || busy} onClick={go} sx={{ minHeight: 44 }}>
            {busy ? 'Deleting…' : 'Start over'}
          </Button>
        </Stack>
      </Card>
    </Section>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const league = useLeague();
  const liveOn = useAppSelector((s) => s.live.on);
  const dispatch = useAppDispatch();
  const [firstNight, setFirstNight] = useState('');
  const [opensAt, setOpensAt] = useState(league.night.opensAt || '19:00');
  const [closesAt, setClosesAt] = useState(league.night.closesAt || '21:00');
  const [teamCap, setTeamCap] = useState(String(league.teamCap || 12));
  const [machinesText, setMachinesText] = useState(league.machines.filter((m) => !m.removed).map((m) => m.name).join('\n'));
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);
  const machines = machinesText.split('\n').map((m) => m.trim()).filter(Boolean);
  const problem = !firstNight ? 'Pick the date of the first league night.'
    : closesAt <= opensAt ? 'The night has to end after it starts.'
      : machines.length === 0 ? 'Add at least one machine.'
        : !(Number(teamCap) >= 2 && Number(teamCap) <= 40) ? 'The team limit is 2 to 40.' : '';

  const save = () => {
    if (problem) { setFailed(problem); return; }
    const body = { firstNight, opensAt, closesAt, machines, teamCap: Number(teamCap) };
    if (!liveOn) {
      const slug = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const fresh = newLeague({ ...body, machines: machines.map((name) => ({ machineId: slug(name), name })) }, new Date().toISOString());
      dispatch(sample.loadLeague({ ...fresh, role: 'admin', adminName: league.adminName || 'Matt', myTeamId: '' }));
      dispatch(showToast('New season set up (sample league).'));
      onDone();
      return;
    }
    setBusy(true); setFailed('');
    live.setupLeague(body)
      .then(async () => { await refreshLive(); dispatch(showToast('The new season is set up.')); onDone(); })
      .catch((err: Error) => setFailed(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">There's no league right now. Set up the season: weeks 1 to 8 are a week apart from the first night, and week 9 is finals.</Alert>
      <TextField label="First league night" type="date" value={firstNight} onChange={(e) => setFirstNight(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <TextField label="Starts" type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        <TextField label="Ends" type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
      </Box>
      <TextField label="Most teams" type="number" value={teamCap} onChange={(e) => setTeamCap(e.target.value)} slotProps={{ htmlInput: { min: 2, max: 40, inputMode: 'numeric' } }} />
      <TextField label="Machines, one per line" multiline minRows={4} value={machinesText} onChange={(e) => setMachinesText(e.target.value)} helperText="Times are Eastern. You can change machines and night times later." />
      {failed && <Alert severity="error">{failed}</Alert>}
      <Button variant="contained" color="secondary" size="large" disabled={busy} onClick={save}>
        {busy ? 'Setting up…' : 'Set up the season'}
      </Button>
      {!liveOn && <Button onClick={() => { dispatch(sample.resetSample()); onDone(); }}>Back to the demo league</Button>}
    </Stack>
  );
}
