// The box that asks an admin for a code from their authenticator app before a hard change goes
// through: entering or changing a score, withdrawing, removing or renaming a team, resetting a
// PIN. A fresh code every time (Matt, Oct 30), so a logged-in screen left at the bar (the TV)
// can't be used to change the league. Live league only; the sample never asks.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { setCodeAsker } from '../live/client';

export default function AdminCodeDialog() {
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const answer = useRef<((code: string) => void) | null>(null);

  useEffect(() => {
    setCodeAsker((why) => new Promise<string>((resolve) => {
      answer.current = resolve;
      setCode('');
      setMessage(why);
    }));
    return () => setCodeAsker(null);
  }, []);

  const finish = (value: string) => {
    answer.current?.(value);
    answer.current = null;
    setMessage(null);
  };
  const digits = code.replace(/\D/g, '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (digits.length === 6) finish(digits);
  };

  return (
    <Dialog open={message !== null} onClose={() => finish('')} aria-labelledby="sfi-admin-code-title" fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="sfi-admin-code-title">Confirm this change</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{message}</Typography>
          <TextField
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { maxLength: 7 } }}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Each code works once. Making another change right away? Wait for the app to show a new one.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => finish('')}>Cancel</Button>
          <Button type="submit" variant="contained" color="secondary" disabled={digits.length !== 6}>Confirm</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
