import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ScoreDisplay from '../components/ScoreDisplay';
import { api, errorMessage, isSignedOut, useMeQuery } from '../api';
import { useAppDispatch } from '../hooks';
import { formatNight, timeUntil } from '../lib/format';
import { loggedOut } from '../store';
import type { MachineStatus } from '../../../shared/types';

function MachineRow({ status }: { status: MachineStatus }) {
  const done = status.attempts > 0;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.25, px: 2, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
      {done ? <CheckCircleIcon color="primary" /> : <RadioButtonUncheckedIcon color="disabled" />}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }} noWrap>
          {status.machine.name}
        </Typography>
        {done && (
          <Typography variant="body2" color="text.secondary">
            {status.attempts} {status.attempts === 1 ? 'game' : 'games'} submitted
          </Typography>
        )}
      </Box>
      {done && <ScoreDisplay value={status.best} size="sm" />}
    </Stack>
  );
}

export default function Home() {
  const { data, error, isLoading } = useMeQuery(undefined, { pollingInterval: 15000 });
  const dispatch = useAppDispatch();
  // The team is gone (a sign-up that was removed or never approved) or the login ran out.
  const signedOut = isSignedOut(error);
  useEffect(() => {
    if (!signedOut) return;
    dispatch(loggedOut());
    dispatch(api.util.resetApiState());
  }, [signedOut, dispatch]);

  if (isLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;
  if (error || !data) return <Alert severity="error">{errorMessage(error)}</Alert>;

  const toPlay = data.machines.filter((m) => m.attempts === 0);
  const played = data.machines.filter((m) => m.attempts > 0);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
        <Avatar src={data.team.photoUrl ?? undefined} alt="" sx={{ width: 64, height: 64, border: 3, borderColor: 'secondary.main' }} />
        <Box>
          <Typography variant="h2">{data.team.teamName}</Typography>
          {data.night && (
            <Typography color="text.secondary">
              Week {data.night.week}, {formatNight(data.night.date)}
            </Typography>
          )}
        </Box>
      </Stack>

      {data.team.status === 'pending' ? (
        <Alert severity="info">
          <Typography sx={{ fontWeight: 700 }}>Waiting for approval</Typography>
          The league checks every new team before it can play. You don't need to do anything, and this page updates on its own.
          {data.team.expiresAt ? ` If nobody approves it, this sign-up is deleted ${timeUntil(data.team.expiresAt)}.` : ''}
        </Alert>
      ) : !data.night?.open ? (
        <Alert severity="info">No league night is open right now. Scores open at 7 PM on league night.</Alert>
      ) : (
        <Stack spacing={3}>
          <Button component={RouterLink} to="/submit" variant="contained" color="secondary" size="large">
            Submit a score
          </Button>

          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {toPlay.length ? `Still to play tonight (${toPlay.length})` : 'Every machine has a score. Nice.'}
            </Typography>
            {toPlay.length > 0 && (
              <Card>
                {toPlay.map((m) => (
                  <MachineRow key={m.machine.machineId} status={m} />
                ))}
              </Card>
            )}
          </Box>

          {played.length > 0 && (
            <Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                Played tonight
              </Typography>
              <Card>
                {played.map((m) => (
                  <MachineRow key={m.machine.machineId} status={m} />
                ))}
              </Card>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
