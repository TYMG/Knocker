// Log in, at "/login". A team that already signed up types its team name and 4-digit PIN.
// Teams still waiting for approval can log in too: they land on a home page that says so.
//
// While the app runs on sample data there are no real PINs. Any 4 digits work as long as the
// team name matches a team, and the page says that plainly so nobody is left guessing.
// The PIN is only checked for its shape here. It is not kept or sent anywhere.

import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { approvedTeams, findTeam, findTeamByName } from '../sample/league';
import { MY_TEAM } from '../sample/seed';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import Page from '../ui/Page';
import TeamAvatar from '../ui/TeamAvatar';

const linkSx = { fontWeight: 700, display: 'inline-block', py: 1.25 } as const;

export default function LogIn() {
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [tried, setTried] = useState(false);

  // Already logged in: say who, and offer the way home.
  if (me.isTeam) {
    return (
      <Page title="Log in">
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <TeamAvatar team={me.team} size={56} mine />
            <Typography>
              You are logged in as <strong>{me.team.teamName}</strong>.
            </Typography>
          </Stack>
          <Button component={RouterLink} to="/" variant="contained" color="secondary" size="large">
            Go to team home
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              dispatch(sample.logOut());
              dispatch(showToast(`Logged out ${me.team.teamName}`));
            }}
          >
            Log out and log in as another team
          </Button>
        </Stack>
      </Page>
    );
  }

  const match = findTeamByName(league, name);
  const errors = {
    name: !name.trim() ? 'Type your team name.' : match ? '' : 'No team by that name. Check the spelling.',
    pin: /^\d{4}$/.test(pin) ? '' : 'A PIN is 4 digits.'
  };
  // The team to suggest: the one the sample story follows, or any team if it is gone.
  const example = (findTeam(league, MY_TEAM) ?? approvedTeams(league)[0])?.teamName;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.name || !match) {
      document.getElementById('login-name')?.focus();
      return;
    }
    if (errors.pin) {
      document.getElementById('login-pin')?.focus();
      return;
    }
    dispatch(sample.logInAs(match.teamId));
    dispatch(showToast(`Logged in as ${match.teamName}`));
    navigate('/');
  };

  return (
    <Page title="Log in">
      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2}>
          <TextField
            id="login-name"
            label="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            error={tried && !!errors.name}
            helperText={tried && errors.name ? errors.name : undefined}
            slotProps={{ htmlInput: { maxLength: 30, autoCapitalize: 'words' } }}
          />
          <TextField
            id="login-pin"
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            error={tried && !!errors.pin}
            helperText={tried && errors.pin ? errors.pin : '4 digits.'}
            // Brings up the number keypad on a phone.
            slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4, autoComplete: 'off' } }}
          />
          <Button type="submit" variant="contained" color="secondary" size="large">
            Log in
          </Button>
          {example && (
            <Typography sx={{ color: 'text.secondary' }} variant="body2">
              This is sample data, so there are no real PINs. Try “{example}” with any 4 digits.
            </Typography>
          )}
        </Stack>
      </Box>

      <Stack spacing={0.5} sx={{ mt: 4 }}>
        <Typography>Forgot your PIN? Ask the league admin at the bar to reset it.</Typography>
        <Typography>
          New team?{' '}
          <Link component={RouterLink} to="/join" sx={linkSx}>
            Sign up
          </Link>
        </Typography>
        <Box>
          <Link component={RouterLink} to="/admin/login" underline="hover" sx={{ color: 'text.secondary', ...linkSx, fontWeight: 400 }}>
            League admin log in
          </Link>
        </Box>
      </Stack>
    </Page>
  );
}
