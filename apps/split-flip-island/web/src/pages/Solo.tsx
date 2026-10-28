// A solo player's partner page, at "/solo", like a dating app's.
//   Swipe: one nameless card at a time (how they play, what you have in common), best match first.
//     Right (or the check button) = would team up; left (or the X) = pass.
//   Both swiped right: it's a match. Names show, and a pop-up offers Ask to pair or Keep swiping.
//   Matches: everyone you've matched with. Ask one to pair; they get a request to accept or turn
//     down. Only when both have said yes is it a team: this phone moves to the team, and anyone who
//     said yes to texts gets one. Nobody ever sees who passed on them or turned them down.
// Not logged in: the log-in form for solo players.
import { useEffect, useState, type FormEvent } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
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
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useCalm, useLeague, useLiveOn } from '../hooks';
import { formatPhoneInput } from '../lib/format';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import { live } from '../live/client';
import { refreshLive } from '../live/sync';
import { QUESTIONS, shortAnswer, soloView, SUGGEST_FROM, type SoloCard, type SoloTraits } from '../../../shared/league/match';
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

/** The matches this phone has already shown a "match!" pop-up for. Per player; lost in a private window, which only means a repeat pop-up. */
const seenKey = (id: string) => `sfi-seen-matches-${id}`;
const readSeen = (id: string): string[] => { try { return JSON.parse(localStorage.getItem(seenKey(id)) ?? '[]') as string[]; } catch { return []; } };
const markSeen = (id: string, matchId: string) => { try { localStorage.setItem(seenKey(id), JSON.stringify([...readSeen(id), matchId])); } catch { /* private window */ } };

const who = (c: SoloCard) => (c.pronouns ? `${c.name} (${c.pronouns})` : c.name);

/** The card on top of the deck. Drag it right or left, or use the buttons under it. */
function SwipeCard({ card, onDecide }: { card: SoloCard; onDecide: (like: boolean) => void }) {
  const calm = useCalm();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const likeOpacity = useTransform(x, [30, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -30], [1, 0]);
  const fling = (like: boolean) => {
    if (calm) { onDecide(like); return; }
    void animate(x, like ? 520 : -520, { duration: 0.22 }).then(() => onDecide(like));
  };
  const inner = (
    <Stack spacing={1.25}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>A solo player <Typography component="span" variant="body2" color="textSecondary">· waiting since {since(card.at)}</Typography></Typography>
        {card.score >= SUGGEST_FROM && <Tag tone="good">Good match</Tag>}
      </Box>
      <Traits traits={card.traits} />
      <Together lines={card.together} />
    </Stack>
  );
  return (
    <Box>
      <Box sx={{ position: 'relative', touchAction: 'pan-y' }}>
        {calm ? (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2.5, bgcolor: 'background.paper', minHeight: 220 }}>{inner}</Box>
        ) : (
          <motion.div
            key={card.id}
            drag="x"
            dragSnapToOrigin
            style={{ x, rotate }}
            onDragEnd={(_, info) => { if (info.offset.x > 110) fling(true); else if (info.offset.x < -110) fling(false); }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2.5, bgcolor: 'background.paper', minHeight: 220, cursor: 'grab', position: 'relative' }}>
              <motion.div style={{ opacity: likeOpacity, position: 'absolute', top: 14, right: 14 }} aria-hidden><Tag tone="live">Team up</Tag></motion.div>
              <motion.div style={{ opacity: passOpacity, position: 'absolute', top: 14, right: 14 }} aria-hidden><Tag tone="bad">Pass</Tag></motion.div>
              {inner}
            </Box>
          </motion.div>
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
        <IconButton aria-label="Pass" onClick={() => fling(false)} sx={{ width: 64, height: 64, border: 2, borderColor: 'divider' }}><CloseIcon fontSize="large" /></IconButton>
        <IconButton aria-label="I'd team up" onClick={() => fling(true)} sx={{ width: 64, height: 64, bgcolor: 'secondary.main', color: 'secondary.contrastText', '&:hover': { bgcolor: 'secondary.dark' } }}><CheckIcon fontSize="large" /></IconButton>
      </Box>
    </Box>
  );
}

export default function Solo() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const liveOn = useLiveOn();
  const [tab, setTab] = useState<'swipe' | 'matches'>('swipe');
  const [leaving, setLeaving] = useState(false);
  const [popup, setPopup] = useState<SoloCard | null>(null);
  const view = soloView(league.waitlist, league.mySoloId);
  const me = view.me;

  // Paired (both said yes, or the admin paired them): this phone is on the new team now.
  const nowTeam = !me && league.role === 'team' && !!league.myTeamId;
  useEffect(() => {
    if (nowTeam) {
      dispatch(showToast("You're a team! Now set it up together."));
      navigate('/team/setup', { replace: true });
    }
  }, [nowTeam, dispatch, navigate]);

  // A match this phone hasn't celebrated yet (just now, or while they were away): the pop-up.
  const matchIds = view.matches.map((m) => m.id).join(',');
  useEffect(() => {
    if (!me || popup) return;
    const seen = readSeen(me.id);
    const fresh = view.matches.find((m) => !seen.includes(m.id));
    if (fresh) setPopup(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIds, me?.id]);

  if (!me?.traits) return nowTeam ? null : <SoloLogIn />;
  const meId = me.id;
  const closePopup = () => { if (popup) markSeen(meId, popup.id); setPopup(null); };

  const decide = (card: SoloCard, like: boolean) => {
    // The sample league has nobody behind its cards: a good match swipes right on you too, and a
    // great one asks you to pair straight away, so the whole flow can be tried.
    const back = !liveOn && like && card.score >= SUGGEST_FROM;
    if (back) dispatch(sample.swipe({ fromId: card.id, toId: meId, like: true }));
    dispatch(sample.swipe({ toId: card.id, like }));
    if (back && card.score >= 8) dispatch(sample.askToPair({ fromId: card.id, toId: meId }));
  };
  const ask = (c: SoloCard) => {
    dispatch(sample.askToPair({ toId: c.id }));
    // In the sample league, they say yes.
    if (!liveOn) dispatch(sample.answerPair({ fromId: meId, accept: true, meId: c.id }));
    else dispatch(showToast(`Asked ${c.name}. You'll be a team once they say yes.`));
  };
  const answer = (c: SoloCard, accept: boolean) => {
    dispatch(sample.answerPair({ fromId: c.id, accept }));
    if (!accept) dispatch(showToast('Request turned down. They won’t be told why.'));
  };

  const top = view.deck[0];
  const incoming = view.incoming[0];

  return (
    <Page title="Find a partner" subtitle={`Hi ${me.name}. Swipe right on players you'd team up with. Nobody sees your name until you match.`}>
      <Stack spacing={2.5}>
        {incoming && (
          <Alert severity="info" icon={false} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700 }}>{who(incoming)} wants to pair up with you.</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>You'll be a team once you say yes.</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="secondary" onClick={() => answer(incoming, true)}>Accept</Button>
              <Button color="inherit" onClick={() => answer(incoming, false)}>Not now</Button>
            </Box>
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v: 'swipe' | 'matches') => setTab(v)} variant="fullWidth">
          <Tab value="swipe" label={`Swipe${view.deck.length ? ` (${view.deck.length})` : ''}`} />
          <Tab value="matches" label={<Badge color="secondary" badgeContent={view.incoming.length} sx={{ '& .MuiBadge-badge': { right: -14 } }}>{`Matches${view.matches.length ? ` (${view.matches.length})` : ''}`}</Badge>} />
        </Tabs>

        {tab === 'swipe' && (
          top ? <SwipeCard key={top.id} card={top} onDecide={(like) => decide(top, like)} /> : (
            <EmptyNote>
              {view.matches.length > 0
                ? "You've seen everyone waiting for now. Check your matches, or come back when someone new joins."
                : "Nobody new to look at right now. You're first in line when someone who fits joins."}
            </EmptyNote>
          )
        )}

        {tab === 'matches' && (
          view.matches.length === 0 ? <EmptyNote>No matches yet. When you and another player both swipe right, they show up here.</EmptyNote> : (
            <Stack spacing={1.5}>
              {view.matches.map((c) => {
                const askedThem = view.asked?.id === c.id;
                const askedMe = view.incoming.some((x) => x.id === c.id);
                return (
                  <Box key={c.id} sx={{ border: 1, borderColor: askedMe || askedThem ? 'primary.main' : 'divider', borderRadius: 2, p: 2 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{who(c)}</Typography>
                        {askedMe && <Tag tone="live">Asked you</Tag>}
                        {askedThem && <Tag tone="good">Waiting for them</Tag>}
                      </Box>
                      <Traits traits={c.traits} />
                      <Together lines={c.together} />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        {askedMe ? (
                          <>
                            <Button variant="contained" color="secondary" onClick={() => answer(c, true)}>Accept</Button>
                            <Button color="inherit" onClick={() => answer(c, false)}>Not now</Button>
                          </>
                        ) : askedThem ? (
                          <Button variant="outlined" color="inherit" onClick={() => dispatch(sample.cancelAsk(undefined))}>Take back my request</Button>
                        ) : (
                          <Button variant="contained" color="secondary" onClick={() => ask(c)}>{view.asked ? 'Ask to pair instead' : 'Ask to pair'}</Button>
                        )}
                        <Button size="small" color="inherit" sx={{ color: 'text.secondary', ml: 'auto' }} onClick={() => { dispatch(sample.swipe({ toId: c.id, like: false })); dispatch(showToast('Unmatched')); }}>Unmatch</Button>
                      </Box>
                      {view.asked && !askedThem && !askedMe && (
                        <Typography variant="body2" color="textSecondary">You can ask one match at a time. Asking {c.name} takes back your request to {view.asked.name}.</Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )
        )}

        <Section title="How you play" small>
          <Traits traits={me.traits} />
        </Section>

        <Box>
          <Button variant="text" color="inherit" onClick={() => setLeaving(true)} sx={{ color: 'text.secondary' }}>Leave the waitlist</Button>
        </Box>
      </Stack>

      <Dialog open={!!popup} onClose={closePopup} fullWidth maxWidth="xs">
        <DialogTitle sx={{ textAlign: 'center' }}>It's a match!</DialogTitle>
        <DialogContent>
          {popup && (
            <Stack spacing={1.5}>
              <Typography sx={{ textAlign: 'center' }}>You and <strong>{who(popup)}</strong> both want to team up.</Typography>
              <Together lines={popup.together} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
          <Button fullWidth variant="contained" color="secondary" onClick={() => { const c = popup; closePopup(); if (c) ask(c); }}>Ask to pair</Button>
          <Button fullWidth color="inherit" onClick={closePopup}>Keep swiping</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={leaving} onClose={() => setLeaving(false)} fullWidth maxWidth="xs">
        <DialogTitle>Leave the waitlist?</DialogTitle>
        <DialogContent>
          <Typography>Your answers, swipes and matches are deleted. You can join again any time.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLeaving(false)}>Stay</Button>
          <Button variant="contained" color="secondary" onClick={() => { dispatch(sample.leaveWaitlist(undefined)); setLeaving(false); dispatch(showToast('You left the waitlist')); navigate('/'); }}>Leave</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
