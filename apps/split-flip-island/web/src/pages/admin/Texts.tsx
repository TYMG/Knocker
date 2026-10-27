// Texts: what the league texts, who gets tonight's reminder in the sample league, and (once AWS
// is set up with Terraform) a real test send to the admin's own verified phone.
//
// Real texts go through AWS End User Messaging. Phone numbers never come back to this page: the
// server only shows the last 4 digits of the verified test phones.

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLeague } from '../../hooks';
import { checkInWindow, inTheRunning, nightStatus } from '../../sample/league';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import { ADMIN_HOME } from './nightShared';
import { anyTexts, textPhones } from '../../ui/players';
import {
  SMS_SAMPLE, SMS_TEMPLATES, smsFitsOneSegment,
  type SmsStatusResponse, type SmsTemplate, type SmsTestResponse
} from '../../../../shared/sms';
import type { AdminAuthResponse } from '../../../../shared/types';

const TOKEN_KEY = 'sfi-admin-token';
const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; } };
const saveToken = (t: string) => { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* private window */ } };

async function call<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `The server said ${res.status}.`), { status: res.status });
  return data as T;
}

const KEYS = Object.keys(SMS_TEMPLATES) as SmsTemplate[];

export default function Texts() {
  return (
    <Page title="Texts" subtitle="League-night reminders by text. Teams opt in at sign-up." back={ADMIN_HOME}>
      <Stack spacing={4}>
        <Templates />
        <Tonight />
        <RealTexts />
      </Stack>
    </Page>
  );
}

function Templates() {
  return (
    <Section title="What gets texted">
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
        Only the check-in reminder goes out as a text. The rest show in the app; they're here so you can see the wording and send yourself a test.
      </Typography>
      <Stack spacing={1.5}>
        {KEYS.map((k) => {
          const tpl = SMS_TEMPLATES[k];
          const body = tpl.body(SMS_SAMPLE);
          const fits = smsFitsOneSegment(body);
          return (
            <Card key={k} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, flex: 1 }}>{tpl.label}</Typography>
                <Chip size="small" label={tpl.texted ? 'Texted' : 'In the app only'} color={tpl.texted ? 'secondary' : 'default'} />
              </Stack>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 3, px: 1.5, py: 1, fontSize: '0.95rem' }}>{body}</Box>
              <Typography variant="caption" color={fits ? 'textSecondary' : 'error'}>
                {body.length} characters{fits ? ', 1 text' : ': too long or has a special character, so it costs 2 texts'}
              </Typography>
            </Card>
          );
        })}
      </Stack>
    </Section>
  );
}

/** The sample league: who would get tonight's reminder. */
function Tonight() {
  const league = useLeague();
  const night = nightStatus(league);
  const win = checkInWindow(league);
  const teams = league.teams.filter(inTheRunning);
  const optedIn = teams.filter(anyTexts);
  const phones = teams.reduce((n, t) => n + textPhones(t), 0);
  const waiting = optedIn.filter((t) => !league.checkIns[t.teamId]);
  const when = night.open
    ? 'The night is open, so the reminder has gone out.'
    : win.open
      ? `The reminder goes out 5 minutes before start${win.minutesToOpen > 5 ? ` (in ${win.minutesToOpen - 5} minutes)` : ''}.`
      : 'The reminder goes out 5 minutes before the next league night starts.';
  return (
    <Section title="In this sample league">
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700 }}>{phones} phones on {optedIn.length} of {teams.length} teams get texts</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{when} It only goes to teams that haven't checked in yet.</Typography>
        {waiting.length > 0 ? (
          <Typography variant="body2">Would get it now: {waiting.map((t) => t.teamName).join(', ')}.</Typography>
        ) : (
          <Typography variant="body2">Nobody would get it right now: every team that opted in has checked in.</Typography>
        )}
        <Typography variant="caption" color="textSecondary">The sample league never sends a real text. Teams see the text in their check-in banner instead.</Typography>
      </Card>
    </Section>
  );
}

/** The real server: sign in as admin, see the number's status, send a test to verified phones. */
function RealTexts() {
  const [token, setToken] = useState(readToken);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<SmsStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string>('');
  const [sent, setSent] = useState('');

  useEffect(() => {
    if (!token) return;
    let live = true;
    setError('');
    call<SmsStatusResponse>('admin/sms', token)
      .then((s) => { if (live) setStatus(s); })
      .catch((e: Error & { status?: number }) => {
        if (!live) return;
        if (e.status === 401 || e.status === 403) { saveToken(''); setToken(''); setError('Signed out. Sign in again.'); }
        else setError(e.message);
      });
    return () => { live = false; };
  }, [token]);

  const signIn = async () => {
    setBusy('login'); setError('');
    try {
      const r = await call<AdminAuthResponse>('admin/login', '', { name, password });
      saveToken(r.token); setToken(r.token); setPassword('');
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(''); }
  };

  const test = async (template: SmsTemplate) => {
    setBusy(template); setError(''); setSent('');
    try {
      const r = await call<SmsTestResponse>('admin/sms/test', token, { template });
      setSent(`Sent "${SMS_TEMPLATES[template].label}" to ${r.sent} verified phone${r.sent === 1 ? '' : 's'}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(''); }
  };

  const active = status?.enabled && status.phoneStatus === 'ACTIVE';
  const verified = (status?.verifiedPhones ?? []).filter((p) => p.status === 'VERIFIED');

  return (
    <Section title="Real texts">
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        {sent && <Alert severity="success">{sent}</Alert>}
        {!token ? (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
              Sign in to the league server to check the texting number and send yourself a test. This only works on the deployed site.
            </Typography>
            <Stack spacing={1.5}>
              <TextField label="Admin name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <Button variant="contained" disabled={!name || !password || busy === 'login'} onClick={signIn}>Sign in</Button>
            </Stack>
          </Card>
        ) : !status ? (
          !error && <Typography color="textSecondary">Checking the texting number...</Typography>
        ) : (
          <Card variant="outlined" sx={{ p: 2 }}>
            {!status.enabled ? (
              <Typography>Texting isn't set up on the server yet. It's turned on with Terraform (sms_enabled).</Typography>
            ) : (
              <Stack spacing={0.5}>
                <Typography><b>Number:</b> {status.phoneNumber ?? 'not given yet'} ({status.phoneStatus === 'ACTIVE' ? 'approved, can send' : `${status.phoneStatus ?? 'unknown'}: waiting for carrier approval`})</Typography>
                <Typography><b>Account:</b> {status.accountTier === 'PRODUCTION' ? 'production, can text anyone who opted in' : 'sandbox, verified test phones only'}</Typography>
                <Typography><b>Test phones:</b> {status.verifiedPhones.length ? status.verifiedPhones.map((p) => `ending ${p.last4} (${p.status.toLowerCase()})`).join(', ') : 'none yet. Add one with scripts/sms-verify.sh add'}</Typography>
              </Stack>
            )}
            {status.enabled && (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {KEYS.map((k) => (
                  <Button key={k} variant="outlined" size="small" disabled={!active || verified.length === 0 || !!busy} onClick={() => test(k)}>
                    Test: {SMS_TEMPLATES[k].label}
                  </Button>
                ))}
              </Stack>
            )}
            {status.enabled && (!active || verified.length === 0) && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                Test sends open up once the number is approved and at least one test phone is verified.
              </Typography>
            )}
            <Button size="small" sx={{ mt: 1.5 }} onClick={() => { saveToken(''); setToken(''); setStatus(null); }}>Sign out of the server</Button>
          </Card>
        )}
      </Stack>
    </Section>
  );
}
