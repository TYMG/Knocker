// A solo player's partner page, at "/solo". Logged in (phone number and PIN), they see the other
// solo players who fit them: no names, just how each one plays and what the two have in common,
// best match first. Picking says "I'd team up"; when two players pick each other, they're a team
// straight away and this phone moves to the new team. Nobody ever sees who passed on them.
// Not logged in: the log-in form for solo players.
import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import FavoriteBorderIcon from '@mui/icons-material/HandshakeOutlined';
import { useAppDispatch, useLeague, useLiveOn } from '../hooks';
import { formatPhoneInput } from '../lib/format';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import { live } from '../live/client';
import { refreshLive } from '../live/sync';
import { cardsFor, match, QUESTIONS, shortAnswer, SUGGEST_FROM, type SoloTraits } from '../../../shared/league/match';
import EmptyNote from '../ui/EmptyNote';
import Page from '../ui/Page';
import Section from '../ui/Section';
import Tag from '../ui/Tag';

const traitList = (t: SoloTraits) => QUESTIONS.map((q) => shortAnswer(q.key, t[q.key] as never));
const since = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

export function Traits({ traits }: { traits: SoloTraits }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {traitList(traits).map((t) => (
        <Box key={t} component="span" sx={{ px: 1.25, py: 0.25, borderRadius: 999, border: 1, borderColor: 'divider', fontSize: '0.85rem' }}>{t}</Box>
      ))}
    </Box>
  );
}

export function Together({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {lines.map((l) => (
        <Box component="li" key={l} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
          <CheckIcon fontSize="small" sx={{ color: 'primary.main', mt: '2px' }} aria-hidden />
          <Typography variant="body2">{l}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

function SoloLogIn() {
  const dispatch = useAppDispatch();
  const liveOn = useLiveOn();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [failed, setFailed] = useState('');
  const [sending, setSending] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length !== 10) { setFailed('Enter all 10 digits of your phone number.'); return; }
    if (!/^\d{4}$/.test(pin)) { setFailed('A PIN is 4 digits.'); return; }
    setFailed('');
    setSending(true);
    live.soloLogIn(phone, pin)
      .then(async () => { await refreshLive(); dispatch(showToast('Logged in')); })
      .catch((err: Error) => setFailed(err.message))
      .finally(() => setSending(false));
  };

  return (
    <Page title="Find a partner" subtitle="Solo players on the waitlist log in here.">
      {liveOn ? (
        <Box component="form" noValidate onSubmit={submit}>
          <Stack spacing={2}>
            <TextField id="solo-login-phone" label="Phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'tel-national' } }} />
            <TextField id="solo-login-pin" label="PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} helperText="The 4 digits you picked when you joined." slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4, autoComplete: 'off' } }} />
            {failed && <Typography role="alert" sx={{ color: 'secondary.main', fontWeight: 700 }}>{failed}</Typography>}
            <Button type="submit" variant="contained" color="secondary" size="large" disabled={sending}>{sending ? 'Logging in…' : 'Log in'}</Button>
          </Stack>
        </Box>
      ) : (
        <Typography>In the sample league, join the waitlist as a solo player to try this page.</Typography>
      )}
      <Stack spacing={0.5} sx={{ mt: 4 }}>
        <Typography>Forgot your PIN? Ask the league admin at the bar.</Typography>
        <Typography>
          Not on the waitlist yet?{' '}
          <Link component={RouterLink} to="/join" sx={{ fontWeight: 700, display: 'inline-block', py: 1.25 }}>Join as a solo player</Link>
        </Typography>
      </Stack>
    </Page>
  );
}

export default function Solo() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const liveOn = useLiveOn();
  const [leaving, setLeaving] = useState(false);
  const me = league.waitlist.find((w) => w.id === league.mySoloId);

  // Picked each other (or the admin paired them): this phone is on the new team now.
  const nowTeam = !me && league.role === 'team' && !!league.myTeamId;
  useEffect(() => {
    if (nowTeam) {
      dispatch(showToast("You picked each other. You're a team!"));
      navigate('/', { replace: true });
    }
  }, [nowTeam, dispatch, navigate]);

  if (!me?.traits) return nowTeam ? null : <SoloLogIn />;
  const myTraits = me.traits;

  const cards = cardsFor(league.waitlist, me.id);
  const picks = me.picks ?? [];
  const others = league.waitlist.length - 1;

  const toggle = (toId: string, theirs: SoloTraits) => {
    const picked = !picks.includes(toId);
    // The sample league has nobody behind its cards, so a good match picks you back.
    const pickedBack = !liveOn && picked && match(myTraits, theirs).score >= SUGGEST_FROM;
    if (pickedBack) dispatch(sample.pickPartner({ fromId: toId, toId: me.id, picked: true }));
    dispatch(sample.pickPartner({ toId, picked }));
    if (!picked) dispatch(showToast('Took back your pick'));
    else if (!pickedBack) dispatch(showToast("Picked. If they pick you too, you're a team."));
  };

  return (
    <Page title="Find a partner" subtitle={`Hi ${me.name}. These are the solo players who fit what you're looking for, best match first.`}>
      <Stack spacing={3}>
        <Section title="How you play" small>
          <Traits traits={myTraits} />
        </Section>

        <Section title="Waiting now" aside={cards.length > 0 ? cards.length : undefined}>
          {cards.length === 0 ? (
            <EmptyNote>
              {others > 0
                ? "Nobody waiting fits what you're looking for yet. You're first in line when someone new joins."
                : "You're the only one waiting so far. You're first in line when someone new joins."}
            </EmptyNote>
          ) : (
            <Stack spacing={1.5}>
              {cards.map((c, i) => {
                const picked = picks.includes(c.id);
                const suggested = i < 2 && c.score >= SUGGEST_FROM && !picked;
                return (
                  <Box key={c.id} sx={{ border: 1, borderColor: picked ? 'primary.main' : 'divider', borderRadius: 2, p: 2 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>A solo player <Typography component="span" variant="body2" color="textSecondary">· waiting since {since(c.at)}</Typography></Typography>
                        {suggested && <Tag tone="good">Suggested</Tag>}
                        {picked && <Tag tone="live">You picked</Tag>}
                      </Box>
                      <Traits traits={c.traits} />
                      <Together lines={c.together} />
                      <Button
                        variant={picked ? 'outlined' : 'contained'}
                        color={picked ? 'inherit' : 'secondary'}
                        aria-pressed={picked}
                        startIcon={picked ? <CheckIcon /> : <FavoriteBorderIcon />}
                        onClick={() => toggle(c.id, c.traits)}
                        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
                      >
                        {picked ? 'Picked. Tap to take it back' : "I'd team up"}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            Pick as many as you like. When you and another player have both picked each other, you're a team straight away, and you'll see each other's first names. Nobody ever sees who didn't pick them.
          </Typography>
        </Section>

        <Box>
          <Button variant="text" color="inherit" onClick={() => setLeaving(true)} sx={{ color: 'text.secondary' }}>Leave the waitlist</Button>
        </Box>
      </Stack>

      <Dialog open={leaving} onClose={() => setLeaving(false)} fullWidth maxWidth="xs">
        <DialogTitle>Leave the waitlist?</DialogTitle>
        <DialogContent>
          <Typography>Your answers and picks are deleted. You can join again any time.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLeaving(false)}>Stay</Button>
          <Button variant="contained" color="secondary" onClick={() => { dispatch(sample.leaveWaitlist(undefined)); setLeaving(false); dispatch(showToast('You left the waitlist')); navigate('/'); }}>Leave</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
