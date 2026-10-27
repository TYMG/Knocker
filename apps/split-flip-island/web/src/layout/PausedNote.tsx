// A slim note across the top while an admin has the league paused (see SampleState.paused).
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../hooks';
import { colors } from '../theme';

export default function PausedNote() {
  const league = useLeague();
  const me = useMe();
  if (!league.paused) return null;
  return (
    <Box role="status" sx={{ px: 2, py: 0.75, bgcolor: colors.paleYellow, color: colors.black }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {me.isAdmin
          ? 'The league is paused: nights won\'t open by themselves, no reminder texts, and sign-ups are closed. Resume it in League setup.'
          : 'The league is paused for now. Sign-ups are closed until it starts again.'}
      </Typography>
    </Box>
  );
}
