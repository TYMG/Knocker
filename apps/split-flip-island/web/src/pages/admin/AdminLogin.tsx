// The league admin log-in. Admins get here from the link at the bottom of the team log-in, or
// because they opened an admin address without being logged in (the router sends them here and
// remembers where they were going). In the sample any name and password are accepted.

import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../../hooks';
import { sample } from '../../sample/slice';
import { showToast } from '../../store';
import Page from '../../ui/Page';

export default function AdminLogIn() {
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // Set by the AdminOnly guard: the admin page the person was trying to open.
  const next = (useLocation().state as { next?: string } | null)?.next ?? '/admin';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  // Errors only show after the first try, so the form is not red before anyone has typed.
  const [tried, setTried] = useState(false);

  if (me.isAdmin) {
    return (
      <Page title="League admin log in" subtitle={`You are already logged in as the admin ${league.adminName}.`}>
        <Stack spacing={2}>
          <Button component={RouterLink} to="/admin" variant="contained" color="secondary" size="large">
            Admin home
          </Button>
          <Typography variant="body2" color="textSecondary">
            To log out, use the button at the top right.
          </Typography>
        </Stack>
      </Page>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!name.trim() || !password) return;
    dispatch(sample.logInAdmin());
    dispatch(showToast('Logged in as a league admin'));
    // Replace, so Back does not return to the log-in form.
    navigate(next, { replace: true });
  };

  return (
    <Page title="League admin log in" subtitle="For the people running the league night.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="username"
          autoCapitalize="words"
          error={tried && !name.trim()}
          helperText={tried && !name.trim() ? 'Type your name.' : undefined}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          error={tried && !password}
          helperText={tried && !password ? 'Type your password.' : undefined}
        />
        <Button type="submit" variant="contained" color="secondary" size="large">
          Log in
        </Button>
        <Typography variant="body2" color="textSecondary">
          This is the sample league, so any name and password work.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Admin accounts are created on the organizer's computer, never on the website.
        </Typography>
        <Link component={RouterLink} to="/" underline="hover" sx={{ alignSelf: 'flex-start', py: 1.5, fontWeight: 700 }}>
          Not an admin? Go to the front page
        </Link>
      </Stack>
    </Page>
  );
}
