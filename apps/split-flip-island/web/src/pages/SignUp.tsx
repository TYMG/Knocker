import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PhotoCapture from '../components/PhotoCapture';
import { errorMessage, useCreateUploadMutation, useRegisterMutation } from '../api';
import { resizeImage, uploadPhoto } from '../lib/photos';
import { useAppDispatch } from '../hooks';
import { loggedIn } from '../store';

export default function SignUp() {
  const [teamName, setTeamName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createUpload] = useCreateUploadMutation();
  const [register] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const pinMismatch = pinAgain.length === 4 && pin !== pinAgain;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!photo) return setError('Take a team photo to finish signing up.');
    if (pin !== pinAgain) return setError("The two PINs don't match.");
    setBusy(true);
    try {
      const { photo: target } = await createUpload({ purpose: 'team' }).unwrap();
      await uploadPhoto(target, await resizeImage(photo, 800));
      const auth = await register({ teamName, phone1, phone2, pin, photoKey: target.key }).unwrap();
      dispatch(loggedIn(auth));
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Sign up your team
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Couples get first priority. You'll use your team name and PIN to log in on league nights. The league approves each
        new team before it can play.
      </Typography>
      <Stack spacing={2.5}>
        <TextField label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required slotProps={{ htmlInput: { maxLength: 30 } }} />
        <TextField label="Player 1 phone" value={phone1} onChange={(e) => setPhone1(digits(e.target.value, 10))} required type="tel" slotProps={{ htmlInput: { inputMode: 'tel' } }} />
        <TextField label="Player 2 phone" value={phone2} onChange={(e) => setPhone2(digits(e.target.value, 10))} required type="tel" slotProps={{ htmlInput: { inputMode: 'tel' } }} />
        <Stack direction="row" spacing={2}>
          <TextField label="4-digit PIN" value={pin} onChange={(e) => setPin(digits(e.target.value, 4))} required type="password" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
          <TextField label="PIN again" value={pinAgain} onChange={(e) => setPinAgain(digits(e.target.value, 4))} required type="password" error={pinMismatch} helperText={pinMismatch ? "Doesn't match" : ' '} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Stack>
        <PhotoCapture file={photo} onChange={setPhoto} facing="user" label="Take a team photo" hint="Both of you in the shot. It shows next to your team name in the standings." />
        <Typography variant="body2" color="text.secondary">
          Phone numbers stay private. They never appear in the standings or the league log.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" color="secondary" size="large" disabled={busy}>
          {busy ? 'Signing up…' : 'Sign up'}
        </Button>
        <Typography sx={{ textAlign: 'center' }}>
          Already signed up?{' '}
          <Link component={RouterLink} to="/login">
            Log in
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
