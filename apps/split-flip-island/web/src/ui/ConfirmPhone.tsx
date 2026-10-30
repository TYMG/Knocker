// Confirming a phone for texts (live league only). Saying yes to texts is the consent; a 6-digit
// code texted to the phone proves it's theirs. Until then the league texts nothing to it.
// The sample league has nothing to confirm, so none of this shows there.
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLiveOn } from '../hooks';
import { live } from '../live/client';

/** One phone: "Send me a code", then a box for the code. */
export function ConfirmPhone({ who, start, confirm, onDone }: { who: string; start: () => Promise<unknown>; confirm: (code: string) => Promise<unknown>; onDone: () => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = (job: () => Promise<unknown>, then: () => void) => {
    setBusy(true); setError('');
    job().then(then).catch((e: Error) => setError(e.message)).finally(() => setBusy(false));
  };
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography variant="body2">
        Confirm {who} to start getting texts: we text a 6-digit code to that phone.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {sent && (
        <TextField
          label="Code from the text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          size="small"
          slotProps={{ htmlInput: { maxLength: 7 } }}
        />
      )}
      <Stack direction="row" spacing={1}>
        {sent && (
          <Button variant="contained" size="small" disabled={busy || code.replace(/\D/g, '').length !== 6} onClick={() => run(() => confirm(code), onDone)} sx={{ minHeight: 40 }}>
            Confirm
          </Button>
        )}
        <Button variant={sent ? 'text' : 'outlined'} size="small" disabled={busy} onClick={() => run(start, () => { setSent(true); setCode(''); })} sx={{ minHeight: 40 }}>
          {sent ? 'Send a new code' : 'Text me a code'}
        </Button>
      </Stack>
    </Stack>
  );
}

/** The team's phones and whether each is confirmed, from the server. Null in the sample or while loading. */
export function useTeamPhones() {
  const on = useLiveOn();
  const [state, setState] = useState<{ texts: [boolean, boolean]; confirmed: [boolean, boolean] } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    live.teamTexts().then((s) => { if (alive) setState(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [on, tick]);
  return on ? { state, reload: () => setTick((t) => t + 1) } : { state: null, reload: () => undefined };
}

/** Team home: a nudge to Settings while a phone that wants texts isn't confirmed. */
export function ConfirmPhonesNudge() {
  const { state } = useTeamPhones();
  if (!state || ![0, 1].some((i) => state.texts[i] && !state.confirmed[i])) return null;
  return (
    <Alert severity="info" action={<Button component={RouterLink} to="/settings" color="inherit" size="small">Settings</Button>}>
      Confirm your phone to get reminder texts. It takes one code.
    </Alert>
  );
}

/** Solo page: confirm the one phone, if it said yes to texts. */
export function SoloConfirmPhone() {
  const on = useLiveOn();
  const [state, setState] = useState<{ texts: boolean; confirmed: boolean } | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    live.soloTexts().then((s) => { if (alive) setState(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [on]);
  if (!state || !state.texts || state.confirmed) return null;
  return (
    <Alert severity="info" icon={false}>
      <ConfirmPhone
        who="your phone"
        start={() => live.soloConfirmStart()}
        confirm={(code) => live.soloConfirm(code)}
        onDone={() => setState({ texts: true, confirmed: true })}
      />
    </Alert>
  );
}
