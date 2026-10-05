import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { errorMessage, useLoginMutation } from '../api';
import { useAppDispatch } from '../hooks';
import { loggedIn } from '../store';

export default function Login() {
  const [teamName, setTeamName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      dispatch(loggedIn(await login({ teamName, pin }).unwrap()));
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Log in
      </Typography>
      <Stack spacing={2.5}>
        <TextField label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required autoComplete="username" />
        <TextField
          label="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
          type="password"
          autoComplete="current-password"
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Log in'}
        </Button>
        <Typography variant="body2" color="text.secondary">
          Forgot your PIN? Ask the league admin at the bar to reset it.
        </Typography>
        <Typography sx={{ textAlign: 'center' }}>
          New team?{' '}
          <Link component={RouterLink} to="/join">
            Sign up
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
