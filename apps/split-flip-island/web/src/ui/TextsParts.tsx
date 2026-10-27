// Text reminders, team side: the "save our number" button, the on/off switch (on the Settings
// page), and the end-of-season note that points teams to Settings.
//
// The contact card lives on knckr.com (public, outside the demo password) and is built by
// Terraform from the league's real number, so the number never sits in this code.
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import Link from '@mui/material/Link';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import { useAppDispatch, useLeague } from '../hooks';
import { sample } from '../sample/slice';
import type { STeam } from '../sample/types';
import { showToast } from '../store';
import { colors } from '../theme';

export const CONTACT_CARD_URL = 'https://knckr.com/split-flip-island.vcf';
export const TEXT_TERMS_URL = 'https://knckr.com/sms.html';

/** One tap adds "Split Flipper Island" to the phone's contacts, so texts show the name, not a number. */
export function SaveNumberButton({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <Button
      href={CONTACT_CARD_URL}
      download="Split Flipper Island.vcf"
      variant="outlined"
      fullWidth={fullWidth}
      startIcon={<ContactPhoneIcon />}
      sx={{ minHeight: 44, justifyContent: 'flex-start' }}
    >
      Save our number to your contacts
    </Button>
  );
}

/** Settings: the team turns the check-in reminder on or off any time. */
export function TextsSetting({ team }: { team: STeam }) {
  const dispatch = useAppDispatch();
  const on = !!team.smsOptIn;
  const who = team.players[0] || 'Player 1';
  const flip = (optIn: boolean) => {
    dispatch(sample.setSmsOptIn({ teamId: team.teamId, optIn }));
    dispatch(showToast(optIn ? `Texts on. ${who} gets a reminder on league nights.` : 'Texts off. No more reminder texts.'));
  };
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>Reminder texts</Typography>
          <Typography variant="body2" color="textSecondary">
            {on
              ? `${who}'s phone gets one text about 5 minutes before a league night, only if you haven't checked in. Nothing comes between seasons.`
              : "One text before each league night if you haven't checked in yet."}
            {' '}Replying STOP also turns them off; START turns them back on.{' '}
            <Link href={TEXT_TERMS_URL} target="_blank" rel="noopener">Terms</Link>
          </Typography>
        </Box>
        <Switch checked={on} onChange={(e) => flip(e.target.checked)} slotProps={{ input: { 'aria-label': 'Reminder texts' } }} />
      </Box>
      {on && <Box sx={{ mt: 1.5 }}><SaveNumberButton /></Box>}
    </Card>
  );
}

/** After the finals: teams still getting texts are reminded where to turn them off (Settings). */
export function TeamSeasonTexts({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const t = league.teams.find((x) => x.teamId === teamId);
  const done = !!league.finals.championship.winnerId;
  if (!t || !done || !t.smsOptIn || t.smsSeasonAsked) return null;
  const close = (toSettings: boolean) => {
    dispatch(sample.answerSeasonTexts({ teamId, keep: true }));
    if (toSettings) navigate('/settings');
  };
  return (
    <Dialog open onClose={() => undefined} aria-labelledby="sfi-season-texts-title" slotProps={{ paper: { sx: { m: 2, p: 3, bgcolor: colors.card, color: colors.paleYellow, border: `3px solid ${colors.lime}`, borderRadius: 3, maxWidth: 420 } } }}>
      <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.8 }}>Season's over</Typography>
      <Typography id="sfi-season-texts-title" variant="h2" component="h2" sx={{ color: colors.lime, mt: 0.5 }}>Thanks for playing!</Typography>
      <Typography sx={{ mt: 1.5, lineHeight: 1.5 }}>
        {t.players[0] || 'Player 1'}'s phone is still set to get check-in reminder texts. Nothing comes until next season's league nights.
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.85 }}>Rather not get them next season? Turn them off any time in Settings (the gear at the top).</Typography>
      <Button fullWidth size="large" variant="contained" onClick={() => close(true)} sx={{ mt: 2.5, minHeight: 48, bgcolor: colors.lime, color: colors.black, fontWeight: 700, '&:hover': { bgcolor: colors.lime } }}>
        Open Settings
      </Button>
      <Button fullWidth size="large" variant="outlined" onClick={() => close(false)} sx={{ mt: 1, minHeight: 48, color: colors.paleYellow, borderColor: colors.paleYellow }}>
        Keep them on
      </Button>
    </Dialog>
  );
}
