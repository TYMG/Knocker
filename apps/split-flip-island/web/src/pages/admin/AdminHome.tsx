import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { api, errorMessage, isSignedOut, useAdminTeamsQuery } from '../../api';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { adminLoggedOut } from '../../store';

/**
 * Admin home: one button per job, each opening its own page. Approving teams is the only
 * job so far; the rest of the admin pages arrive in a later pass.
 */
export default function AdminHome() {
  const name = useAppSelector((s) => s.admin.name);
  const dispatch = useAppDispatch();
  const { data, error } = useAdminTeamsQuery(undefined, { pollingInterval: 30000 });
  const signedOut = isSignedOut(error);

  useEffect(() => {
    if (signedOut) dispatch(adminLoggedOut());
  }, [signedOut, dispatch]);

  const waiting = data?.pending.length ?? 0;
  const logOut = () => {
    dispatch(adminLoggedOut());
    dispatch(api.util.invalidateTags(['AdminTeams']));
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>
        League admin
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Signed in as {name}
      </Typography>
      <Stack spacing={2}>
        {error && !signedOut && <Alert severity="error">{errorMessage(error)}</Alert>}
        <Card sx={waiting > 0 ? { borderColor: 'secondary.main', borderWidth: 2 } : undefined}>
          <ButtonBase component={RouterLink} to="/admin/teams" sx={{ width: '100%', minHeight: 72, px: 2, py: 1.5, justifyContent: 'space-between', textAlign: 'left' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.15rem' }}>Approve teams</Typography>
              <Typography variant="body2" color="text.secondary">
                {!data ? 'Checking for new sign-ups…' : waiting === 0 ? 'Nobody is waiting' : `${waiting} waiting for approval`}
              </Typography>
            </Box>
            <ChevronRightIcon />
          </ButtonBase>
        </Card>
        <Button onClick={logOut} size="large">
          Log out of admin
        </Button>
      </Stack>
    </Box>
  );
}
