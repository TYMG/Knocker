// The league admin log-in. Admins get here from the link at the bottom of the team log-in, or
// because they opened an admin address without being logged in (the router sends them here and
// remembers where they were going). In the sample any name and password are accepted.
//
// On the live league it's two steps (decided Oct 30): the password, then the 6-digit code from
// the admin's authenticator app (Google Authenticator or similar). An admin without one yet is
// walked through adding it: a key to type into the app (or a link that opens the app on the
// phone), then the first code from the app.

import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../../hooks';
import { sample } from '../../sample/slice';
import { showToast } from '../../store';
import { useAppSelector } from '../../hooks';
import { live } from '../../live/client';
import type { AdminAuthResponse, TwoStepSetup } from '../../../../shared/types';
import { refreshLive } from '../../live/sync';
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
  const liveOn = useAppSelector((x) => x.live.on);
  const [failed, setFailed] = useState('');
  // The second step: 'code' asks for the app's code; 'setup' adds the app first.
  const [step, setStep] = useState<'password' | 'code' | 'setup'>('password');
  const [code, setCode] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setup, setSetup] = useState<TwoStepSetup | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (liveOn) {
      if (step !== 'password' && !/^\d{6}$/.test(code.replace(/\s/g, ''))) return setFailed('Type the 6 digits the app shows.');
      setFailed('');
      setBusy(true);
      const sent = code.replace(/\s/g, '');
      const call: Promise<AdminAuthResponse> =
        step === 'setup' ? live.confirmTwoStep(setupToken, sent) : live.adminLogIn(name, password, step === 'code' ? sent : undefined);
      call
        .then(async (r) => {
          if (r.needsCode) { setStep('code'); return; }
          if (r.setupToken) {
            setSetupToken(r.setupToken);
            setSetup(await live.startTwoStep(r.setupToken));
            setStep('setup');
            return;
          }
          await refreshLive();
          dispatch(showToast(`Logged in as the admin ${r.admin?.name ?? name}`));
          navigate(next, { replace: true });
        })
        .catch((err: Error) => { setFailed(err.message); setCode(''); })
        .finally(() => setBusy(false));
      return;
    }
    dispatch(sample.logInAdmin());
    dispatch(showToast('Logged in as a league admin'));
    // Replace, so Back does not return to the log-in form.
    navigate(next, { replace: true });
  };

  return (
    <Page title="League admin log in" subtitle="For the people running the league night.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {step === 'setup' && setup && (
          <Alert severity="info" icon={false}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Add the league to your authenticator app</Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
              <li>Open Google Authenticator (or any authenticator app) on your phone and tap +, then "Enter a setup key".</li>
              <li>
                Account: <b>Split Flipper Island</b>. Key:
                <Box component="code" sx={{ display: 'block', my: 0.75, p: 1, borderRadius: 1, bgcolor: 'background.paper', fontSize: '1rem', letterSpacing: 1, wordBreak: 'break-all', userSelect: 'all' }}>
                  {setup.key}
                </Box>
                On the phone with the app? <Link href={setup.link}>Open it in the app</Link> instead.
              </li>
              <li>Type the 6-digit code the app shows below. From now on you'll need a code each time you log in.</li>
            </Typography>
          </Alert>
        )}
        {step === 'code' && (
          <Typography>Open your authenticator app and type the code for Split Flipper Island.</Typography>
        )}
        {step !== 'password' && (
          <TextField
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            slotProps={{ htmlInput: { maxLength: 7 } }}
          />
        )}
        {step === 'password' && <>
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
        </>}
        {failed && <Typography role="alert" sx={{ color: 'secondary.main', fontWeight: 700 }}>{failed}</Typography>}
        <Button type="submit" variant="contained" color="secondary" size="large" disabled={busy}>
          {step === 'setup' ? 'Turn on two-step log-in' : step === 'password' && liveOn ? 'Next' : 'Log in'}
        </Button>
        {step !== 'password' && (
          <Button variant="text" onClick={() => { setStep('password'); setCode(''); setFailed(''); setSetup(null); setSetupToken(''); }}>
            Start again
          </Button>
        )}
        {!liveOn && (
          <Typography variant="body2" color="textSecondary">
            This is the sample league, so any name and password work.
          </Typography>
        )}
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
