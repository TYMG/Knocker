// Text reminders, team side: the "save our number" button, the on/off switch on the team page,
// and the end-of-season question (keep texts for next season, or stop them).
//
// The contact card lives on knckr.com (public, outside the demo password) and is built by
// Terraform from the league's real number, so the number never sits in this code.
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import { useAppDispatch, useLeague } from '../hooks';
import { sample } from '../sample/slice';
import type { STeam } from '../sample/types';
import { showToast } from '../store';
import { colors } from '../theme';
import Section from './Section';

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

/** Team page: turn the check-in reminder on or off any time. */
export function TextsSection({ team }: { team: STeam }) {
  const dispatch = useAppDispatch();
  const on = !!team.smsOptIn;
  const flip = (optIn: boolean) => {
    dispatch(sample.setSmsOptIn({ teamId: team.teamId, optIn }));
    dispatch(showToast(optIn ? `Texts on. ${team.players[0] || 'Player 1'} gets a reminder on league nights.` : 'Texts off. No more reminder texts.'));
  };
  return (
    <Section title="Texts">
      <FormControlLabel
        control={<Switch checked={on} onChange={(e) => flip(e.target.checked)} />}
        label={<Typography sx={{ fontWeight: 700 }}>Check-in reminder texts</Typography>}
        sx={{ mx: 0, mb: 0.5 }}
      />
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
        {on
          ? `${team.players[0] || 'Player 1'}'s phone gets one text about 5 minutes before a league night starts, only if you haven't checked in. Nothing comes between seasons.`
          : 'Turn this on to get one text before each league night if you haven\'t checked in yet.'}
        {' '}Replying STOP to a text also turns them off; text START to turn them back on.
      </Typography>
      {on && <SaveNumberButton />}
    </Section>
  );
}

/** After the finals: teams getting texts are asked whether to keep them for next season. */
export function TeamSeasonTexts({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const t = league.teams.find((x) => x.teamId === teamId);
  const done = !!league.finals.championship.winnerId;
  if (!t || !done || !t.smsOptIn || t.smsSeasonAsked) return null;
  const answer = (keep: boolean) => {
    dispatch(sample.answerSeasonTexts({ teamId, keep }));
    dispatch(showToast(keep ? "Texts stay on. See you next season." : 'Texts off. Turn them back on from your team page any time.'));
  };
  return (
    <Dialog open onClose={() => undefined} aria-labelledby="sfi-season-texts-title" slotProps={{ paper: { sx: { m: 2, p: 3, bgcolor: colors.card, color: colors.paleYellow, border: `3px solid ${colors.lime}`, borderRadius: 3, maxWidth: 420 } } }}>
      <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.8 }}>Season's over</Typography>
      <Typography id="sfi-season-texts-title" variant="h2" component="h2" sx={{ color: colors.lime, mt: 0.5 }}>Keep the reminder texts?</Typography>
      <Typography sx={{ mt: 1.5, lineHeight: 1.5 }}>
        Thanks for playing! {t.players[0] || 'Player 1'}'s phone gets a check-in reminder on league nights. There are no league nights until next season, so nothing comes in the meantime.
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.85 }}>Stop them now if you'd rather. You can turn them back on from your team page.</Typography>
      <Button fullWidth size="large" variant="contained" onClick={() => answer(true)} sx={{ mt: 2.5, minHeight: 48, bgcolor: colors.lime, color: colors.black, fontWeight: 700, '&:hover': { bgcolor: colors.lime } }}>
        Keep them for next season
      </Button>
      <Button fullWidth size="large" variant="outlined" onClick={() => answer(false)} sx={{ mt: 1, minHeight: 48, color: colors.paleYellow, borderColor: colors.paleYellow }}>
        Stop texts
      </Button>
    </Dialog>
  );
}
