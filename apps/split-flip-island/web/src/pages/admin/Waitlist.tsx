// Admin: solo players waiting for a partner, at "/admin/waitlist".
//   1. Suggested pairs: players who fit each other, best match first, each with a Pair up button.
//   2. Everyone waiting: name, pronouns, how they play, their best match, and Pair with… or Remove.
// Who each player asked to play with, and who they've picked, are never shown here: the server
// only says which others each one fits.
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useLiveOn } from '../../hooks';
import { live } from '../../live/client';
import { refreshLive } from '../../live/sync';
import { bestPairs, fits, match } from '../../../../shared/league/match';
import { sample } from '../../sample/slice';
import { ago } from '../../sample/time';
import type { SWaitlistEntry } from '../../sample/types';
import { showToast } from '../../store';
import EmptyNote from '../../ui/EmptyNote';
import Page from '../../ui/Page';
import Section from '../../ui/Section';
import Tag from '../../ui/Tag';
import { Together, Traits } from '../Solo';

const label = (w: SWaitlistEntry) => (w.pronouns ? `${w.name} (${w.pronouns})` : w.name);
/** On the live league the server says who fits whom; the sample league works it out here. */
const fitTogether = (a: SWaitlistEntry, b: SWaitlistEntry) => (a.fitsWith ? a.fitsWith.includes(b.id) : fits(a, b));
const scoreOf = (a: SWaitlistEntry, b: SWaitlistEntry) => (a.traits && b.traits ? match(a.traits, b.traits).score : null);

export default function Waitlist() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const liveOn = useLiveOn();
  const [paired, setPaired] = useState<{ teamName: string; pin: string } | null>(null);
  const [confirm, setConfirm] = useState<{ a: SWaitlistEntry; b: SWaitlistEntry } | null>(null);
  const [removing, setRemoving] = useState<SWaitlistEntry | null>(null);

  const waitlist = [...league.waitlist].sort((a, b) => a.at.localeCompare(b.at));
  const pairs = bestPairs(waitlist).filter((p) => fitTogether(p.a, p.b)).slice(0, 6);
  const odd = waitlist.length % 2 === 1;

  const pairUp = (a: SWaitlistEntry, b: SWaitlistEntry) => {
    setConfirm(null);
    if (liveOn) {
      // The server makes the team and a temporary PIN, shown here once.
      live.pairWaitlist([a.id, b.id])
        .then(async (r) => { setPaired(r); await refreshLive(); })
        .catch((err: Error) => dispatch(showToast(err.message)));
      return;
    }
    dispatch(sample.pairWaitlist([a.id, b.id]));
    dispatch(showToast(`Paired ${a.name} and ${b.name}. They start next week.`));
  };

  const summary = waitlist.length === 0 ? 'Nobody is waiting.'
    : `${waitlist.length} solo ${waitlist.length === 1 ? 'player' : 'players'} waiting.${odd ? ' An odd number: one will be left over until someone new joins.' : ''}`;

  return (
    <Page title="Waitlist" subtitle={summary} back={{ to: '/admin/teams', label: 'Teams' }}>
      <Stack spacing={4}>
        <Section title="Suggested pairs" aside={pairs.length || undefined}>
          {pairs.length === 0 ? (
            <EmptyNote>{waitlist.length < 2 ? 'It takes two.' : 'Nobody waiting fits each other yet. You can still pair anyone by hand below.'}</EmptyNote>
          ) : (
            <Stack spacing={1.5}>
              {pairs.map((p) => (
                <Box key={`${p.a.id}-${p.b.id}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{p.a.name} &amp; {p.b.name}</Typography>
                      <Tag tone={p.score >= 6 ? 'good' : 'plain'}>{p.score} of 10</Tag>
                    </Box>
                    <Together lines={p.together} />
                    <Button variant="outlined" onClick={() => setConfirm({ a: p.a, b: p.b })} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>Pair up</Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            Players see each other as nameless cards and can pick each other; a mutual pick makes the team without you. These are for nudging along anyone who hasn't.
          </Typography>
        </Section>

        <Section title="Everyone waiting" aside={waitlist.length || undefined}>
          {waitlist.length === 0 ? <EmptyNote>Nobody on the waitlist.</EmptyNote> : (
            <Stack spacing={1.5}>
              {waitlist.map((w) => {
                const others = waitlist.filter((o) => o.id !== w.id);
                const fitting = others.filter((o) => fitTogether(w, o));
                const best = fitting.map((o) => ({ o, s: scoreOf(w, o) ?? -1 })).sort((x, y) => y.s - x.s)[0];
                return (
                  <Box key={w.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Stack spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{label(w)}</Typography>
                        <Typography variant="body2" color="textSecondary">Joined {ago(w.at, league.now)}</Typography>
                      </Box>
                      {w.traits ? <Traits traits={w.traits} /> : <Typography variant="body2" color="textSecondary">Joined before the matchmaker questions.</Typography>}
                      <Typography variant="body2">
                        {fitting.length === 0 ? 'Fits nobody waiting right now.'
                          : `Fits ${fitting.length} of the others.${best && best.s >= 0 ? ` Best match: ${best.o.name}, ${best.s} of 10.` : ''}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        {others.length > 0 && (
                          <TextField
                            select size="small" label="Pair with…" value="" sx={{ minWidth: 200 }}
                            onChange={(e) => { const b = others.find((o) => o.id === e.target.value); if (b) setConfirm({ a: w, b }); }}
                          >
                            {[...others].sort((x, y) => (scoreOf(w, y) ?? -1) - (scoreOf(w, x) ?? -1)).map((o) => {
                              const s = scoreOf(w, o);
                              return <MenuItem key={o.id} value={o.id}>{o.name}{s !== null ? ` · ${s} of 10` : ''}{fitTogether(w, o) ? '' : ' · not who they asked for'}</MenuItem>;
                            })}
                          </TextField>
                        )}
                        <Button color="inherit" onClick={() => setRemoving(w)} sx={{ color: 'text.secondary', minHeight: 40 }}>Remove</Button>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Section>
      </Stack>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Pair {confirm?.a.name} and {confirm?.b.name}?</DialogTitle>
        <DialogContent>
          {confirm && !fitTogether(confirm.a, confirm.b) && (
            <Typography sx={{ color: 'secondary.main', fontWeight: 700, mb: 1 }}>One of them asked to play with someone else. Check with them first.</Typography>
          )}
          <Typography>They become a team named {confirm?.a.name} &amp; {confirm?.b.name}, starting next week. You'll get a temporary PIN to tell them.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => confirm && pairUp(confirm.a, confirm.b)}>Pair up</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)} fullWidth maxWidth="xs">
        <DialogTitle>Take {removing?.name} off the waitlist?</DialogTitle>
        <DialogContent><Typography>Their phone number, answers and picks are deleted. They can join again.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={() => { if (removing) { dispatch(sample.leaveWaitlist(removing.id)); dispatch(showToast(`Took ${removing.name} off the waitlist`)); } setRemoving(null); }}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!paired} fullWidth maxWidth="xs">
        <DialogTitle>{paired?.teamName} is a team</DialogTitle>
        <DialogContent>
          <Typography>Their temporary PIN:</Typography>
          <Typography aria-label={`Temporary PIN ${paired?.pin.split('').join(' ')}`} sx={{ fontFamily: 'monospace', fontSize: '3rem', fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center', my: 1 }}>
            {paired?.pin}
          </Typography>
          <Typography>Tell them in person. Their phones switch to the team by themselves; the PIN is for logging in on another phone. They can change it in Settings.</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>It won't be shown again. If it's lost, reset it from the team's page.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => { dispatch(showToast(`${paired?.teamName} is in. They start next week.`)); setPaired(null); }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
