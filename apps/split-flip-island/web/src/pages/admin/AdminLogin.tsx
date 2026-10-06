import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { errorMessage, useAdminLoginMutation } from '../../api';
import { useAppDispatch } from '../../hooks';
import { adminLoggedIn } from '../../store';

export default function AdminLogin() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useAdminLoginMutation();
  const dispatch = useAppDispatch();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const auth = await login({ name, password }).unwrap();
      dispatch(adminLoggedIn({ token: auth.token, name: auth.admin.name }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Admin log in
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        For league organizers. Each admin has their own name and password.
      </Typography>
      <Stack spacing={2.5}>
        <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="username" />
        <TextField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" autoComplete="current-password" />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Log in'}
        </Button>
        <Typography variant="body2" color="text.secondary">
          Forgot your password? The league organizer can reset it.
        </Typography>
      </Stack>
    </Box>
  );
}
