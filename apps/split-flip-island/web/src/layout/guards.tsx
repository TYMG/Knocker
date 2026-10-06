import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { until } from '../sample/time';
import Page from '../ui/Page';

/** What a team sees everywhere until an admin approves it. */
export function WaitingForApproval() {
  const league = useLeague();
  const { team } = useMe();
  return (
    <Alert severity="info">
      <Typography sx={{ fontWeight: 700 }}>Waiting for approval</Typography>
      The league checks every new team before it can play. You don't need to do anything, and this page updates on its own.
      {team.expiresAt ? ` If nobody approves it, this sign-up is deleted ${until(team.expiresAt, league.now)}.` : ''}
    </Alert>
  );
}

/** Pages only a logged-in, approved team can use: lines, submit, call-outs. */
export function TeamOnly() {
  const me = useMe();
  const dispatch = useAppDispatch();
  if (!me.isTeam) {
    return (
      <Page title="Log in first" subtitle="This page is for a team that is logged in.">
        <Stack spacing={1.5}>
          <Button component={RouterLink} to="/login" variant="contained" color="secondary" size="large">
            Log in
          </Button>
          <Button variant="outlined" size="large" onClick={() => dispatch(sample.setRole('team'))}>
            View as {me.team.teamName} (sample)
          </Button>
        </Stack>
      </Page>
    );
  }
  if (me.team.status === 'pending') {
    return (
      <Page title={me.team.teamName}>
        <WaitingForApproval />
      </Page>
    );
  }
  return <Outlet />;
}

/** Admin pages send anyone who is not an admin to the admin log-in, then back. */
export function AdminOnly() {
  const me = useMe();
  const { pathname } = useLocation();
  if (!me.isAdmin) return <Navigate to="/admin/login" replace state={{ next: pathname }} />;
  return <Outlet />;
}
