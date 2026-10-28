// The nudge to check in: a countdown in the last 5 minutes before the night opens (with a sub
// reminder at 1 minute), and a standing note once the night is open and the team hasn't.
import { Link as RouterLink, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../hooks';
import { canPlayTonight, checkInWindow, subsUsed } from '../sample/league';
import { colors } from '../theme';
import { SMS_TEMPLATES } from '../../../shared/sms';
import { anyTexts, textedNames } from '../ui/players';

export default function CheckInReminder() {
  const league = useLeague();
  const me = useMe();
  const { pathname } = useLocation();
  if (!me.isTeam || pathname.startsWith('/admin') || pathname === '/wrapped') return null;
  const t = me.team;
  if (canPlayTonight(league, t.teamId)) return null;
  const win = checkInWindow(league);
  if (!win.open) return null;
  if (league.checkInRequests?.[t.teamId]) {
    return (
      <Box role="status" sx={{ px: 2, py: 1, bgcolor: colors.lime, color: colors.black }}>
        <Typography sx={{ fontWeight: 700 }}>Waiting for the league admin to confirm you're here. Lines and scores open once they do.</Typography>
      </Box>
    );
  }
  const opening = win.minutesToOpen > 0;
  if (opening && win.minutesToOpen > 5) return null;

  const used = subsUsed(league, t.teamId);
  const left = ([0, 1] as const).filter((i) => !used[i]).map((i) => t.players[i]).filter(Boolean);
  const subLine = left.length === 2
    ? `Partner can't make it? Tap Sub when you check in. ${left[0]} and ${left[1]} each have one sub left this season.`
    : left.length === 1
      ? `Partner can't make it? ${left[0]} still has a sub this season; tap Sub when you check in.`
      : "You've used both of your subs this season.";
  const urgent = !opening || win.minutesToOpen <= 1;
  const title = !opening
    ? "You haven't checked in. You can't join lines or submit scores until you do."
    : win.minutesToOpen <= 1
      ? 'League night starts in 1 minute. Check in now.'
      : `League night starts in ${win.minutesToOpen} minutes. Check in so you can join lines.`;

  return (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1.25, bgcolor: urgent ? colors.coral : colors.lime, color: colors.black }}>
      <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        {(win.minutesToOpen <= 1 || !opening) && <Typography variant="body2">{subLine}</Typography>}
        {/* Demo of the real text: teams that opted in get it on Player 1's phone 5 minutes before start. */}
        {opening && anyTexts(t) && (
          <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Texted to {textedNames(t)}: "{SMS_TEMPLATES.checkInReminder.body({ teamName: t.teamName, machineName: '', minutes: 5, week: 0, noShows: 0, partnerName: '' })}"
          </Typography>
        )}
      </Box>
      {(
        <Button component={RouterLink} to="/?tab=tonight" variant="contained" sx={{ bgcolor: colors.black, color: colors.paleYellow, flexShrink: 0, '&:hover': { bgcolor: colors.black } }}>
          Check in
        </Button>
      )}
    </Box>
  );
}
