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
  if (league.checkInRequests?.[me.team.teamId]) {
    return (
      <Page title="Waiting for the admin">
        <Card sx={{ p: 2, borderWidth: 2, borderColor: 'primary.main' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>You tapped "I'm here"</Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
            The league admin confirms every team in person. Lines and scores open as soon as they do. Can't see them? They're running the night from their phone.
          </Typography>
        </Card>
      </Page>
    );
  }
  return (
    <Page title="Check in first">
      <Card sx={{ p: 2, borderWidth: 2, borderColor: 'secondary.main' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>You haven't checked in tonight</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
          Tap "I'm here" on Home, and lines and scores open once the league admin confirms you. Partner can't make it? You can bring a sub there too.
        </Typography>
        <Button component={RouterLink} to="/?tab=tonight" variant="contained" color="secondary" size="large" sx={{ mt: 1.5, minHeight: 48 }}>
          Check in on Home
        </Button>
      </Card>
    </Page>
  );
}
