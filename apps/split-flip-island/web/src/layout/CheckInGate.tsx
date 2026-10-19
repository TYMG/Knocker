// Check in first: a team that has not checked in (or tapped "I'm here") can't join lines or
// submit scores on an open night. Wraps the Lines, Sign up for a line and Submit routes.
import { Link as RouterLink, Outlet } from 'react-router';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../hooks';
import { canPlayTonight, nightStatus } from '../sample/league';
import Page from '../ui/Page';

export default function CheckInGate() {
  const league = useLeague();
  const me = useMe();
  const night = nightStatus(league);
  if (!night.open || !me.isTeam || canPlayTonight(league, me.team.teamId)) return <Outlet />;
  return (
    <Page title="Check in first">
      <Card sx={{ p: 2, borderWidth: 2, borderColor: 'secondary.main' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>You haven't checked in tonight</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
          Lines and scores open up once you tap "I'm here" on Home. Partner can't make it? You can bring a sub there too.
        </Typography>
        <Button component={RouterLink} to="/?tab=tonight" variant="contained" color="secondary" size="large" sx={{ mt: 1.5, minHeight: 48 }}>
          Check in on Home
        </Button>
      </Card>
    </Page>
  );
}
