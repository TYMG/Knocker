// Turns on a machine line, as alerts:
// - the clock: a team at the front that has not tapped "We started" within 5 minutes forfeits
// - for a team: "You're next", "It's your turn" (with a countdown and "We started"), "Turn forfeited"
// - for an admin: a quick, quiet note when a team starts a game or forfeits, which can be muted
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { FORFEIT_LIMIT, forfeitCounts, lineFor } from '../sample/league';
import { sample, TURN_MS } from '../sample/slice';
import { showToast } from '../store';
import { colors } from '../theme';
import { mmss, setBlipsMuted, turnLeft, useBlipsMuted, useNow } from '../ui/turnClock';

export default function TurnAlerts() {
  const me = useMe();
  return (
    <>
      <TurnClock />
      {me.isTeam && <TeamTurn teamId={me.team.teamId} />}
      {me.isTeam && <TeamForfeit teamId={me.team.teamId} />}
      {me.isAdmin && <AdminBlips />}
    </>
  );
}

/** Forfeits any front team whose 5 minutes ran out without a "We started". */
function TurnClock() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const waiting = league.lines.filter((l) => l.teamIds[0] && l.started === false && l.upAt);
  const now = useNow(waiting.length > 0);
  useEffect(() => {
    for (const l of waiting) {
      if (now - l.upAt! >= TURN_MS) dispatch(sample.forfeitTurn({ machineId: l.machineId, teamId: l.teamIds[0]!, by: 'clock' }));
    }
  });
  return null;
}

function TeamTurn({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const mine = lineFor(league, teamId);
  const name = mine?.machine.name ?? '';

  // "You're next": once, when a team moves up to second.
  const lastPos = useRef(mine?.position);
  useEffect(() => {
    const was = lastPos.current;
    lastPos.current = mine?.position;
    if (mine?.position === 2 && was !== 2) {
      dispatch(showToast(`You're next on ${name}. Head over now: once ${mine.ahead[0]?.teamName ?? 'they'} finish, you have 5 minutes to start.`));
    }
  }, [mine?.position, name, mine?.ahead, dispatch]);

  const up = !!mine && mine.position === 1 && !mine.started && !!mine.upAt;
  const now = useNow(up);
  // "Hide for now" is remembered for this turn, even if the page reloads.
  const [hiddenFor, setHiddenState] = useState<string | undefined>(() => {
    try { return sessionStorage.getItem('sfi-turn-hidden') ?? undefined; } catch { return undefined; }
  });
  const setHiddenFor = (v: string | undefined) => {
    setHiddenState(v);
    try { if (v) sessionStorage.setItem('sfi-turn-hidden', v); else sessionStorage.removeItem('sfi-turn-hidden'); } catch { /* private mode */ }
  };
  if (!up) return null;

  const left = turnLeft(mine.upAt, now);
  const urgent = left < 60_000;
  const start = () => {
    dispatch(sample.startTurn(teamId));
    dispatch(showToast(`Have a great game on ${name}. Submit your score when it ends.`));
  };

  if (hiddenFor && hiddenFor === mine.turnId) {
    // Tucked away: a slim bar that keeps the clock in view.
    return (
      <Box role="status" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1290, display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, pt: 'calc(env(safe-area-inset-top) + 6px)', bgcolor: urgent ? colors.coral : colors.lime, color: colors.black }}>
        <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>Your turn on {name}: {mmss(left)} to start</Typography>
        <Button size="small" variant="contained" onClick={start} sx={{ bgcolor: colors.black, color: colors.paleYellow, '&:hover': { bgcolor: colors.black } }}>We started</Button>
        <Button size="small" onClick={() => setHiddenFor(undefined)} sx={{ color: colors.black }}>Show</Button>
      </Box>
    );
  }

  return (
    <Dialog open onClose={() => undefined} aria-labelledby="sfi-turn-title" slotProps={{ paper: { sx: { m: 2, p: 3, textAlign: 'center', bgcolor: colors.card, color: colors.paleYellow, border: `3px solid ${urgent ? colors.coral : colors.lime}`, borderRadius: 3, maxWidth: 420 } } }}>
      <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.8 }}>Your turn</Typography>
      <Typography id="sfi-turn-title" variant="h2" component="h2" sx={{ color: colors.lime, my: 1 }}>{name}</Typography>
      <Typography sx={{ fontFamily: "'Bungee', Impact, sans-serif", fontSize: '3.5rem', lineHeight: 1, color: urgent ? colors.coral : colors.paleYellow, fontVariantNumeric: 'tabular-nums' }} aria-live="off">
        {mmss(left)}
      </Typography>
      <Typography sx={{ mt: 1.5, lineHeight: 1.5 }}>
        Start your game within 5 minutes or you forfeit your turn. Tap below once your first ball is in play.
      </Typography>
      <Button fullWidth size="large" variant="contained" onClick={start} sx={{ mt: 2.5, minHeight: 52, bgcolor: colors.lime, color: colors.black, fontWeight: 700, '&:hover': { bgcolor: colors.lime } }}>
        We started
      </Button>
      <Button fullWidth onClick={() => setHiddenFor(mine.turnId)} sx={{ mt: 1, color: colors.paleYellow }}>
        Hide for now
      </Button>
    </Dialog>
  );
}

function TeamForfeit({ teamId }: { teamId: string }) {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const f = (league.forfeits ?? []).find((x) => x.teamId === teamId && !x.seen);
  if (!f) return null;
  const machine = league.machines.find((m) => m.machineId === f.machineId);
  const counts = forfeitCounts(league, teamId);
  const done = () => dispatch(sample.forfeitSeen(f.id));

  return (
    <Dialog open onClose={() => undefined} aria-labelledby="sfi-forfeit-title" slotProps={{ paper: { sx: { m: 2, p: 3, bgcolor: colors.card, color: colors.paleYellow, border: `3px solid ${colors.coral}`, borderRadius: 3, maxWidth: 420 } } }}>
      <Typography id="sfi-forfeit-title" variant="h2" component="h2" sx={{ color: colors.coral }}>Turn forfeited</Typography>
      <Typography sx={{ mt: 1.5, lineHeight: 1.5 }}>
        {f.by === 'clock'
          ? `You didn't start on ${machine?.name ?? 'the machine'} within 5 minutes, so you're off the line and the next team is up.`
          : `The admin called it: you weren't at ${machine?.name ?? 'the machine'} for your turn, so you're off the line.`}{' '}
        Want to play it? Sign up again at the back.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Box sx={{ flex: 1, p: 1.25, borderRadius: 2, bgcolor: 'rgba(255,255,153,0.06)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.8rem', opacity: 0.8 }}>Tonight</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '1.4rem' }}>{counts.tonight}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.25, borderRadius: 2, bgcolor: 'rgba(255,255,153,0.06)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.8rem', opacity: 0.8 }}>This season</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: counts.season >= FORFEIT_LIMIT ? colors.coral : undefined }}>{counts.season} of {FORFEIT_LIMIT}</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.85 }}>
        {counts.season >= FORFEIT_LIMIT ? `That's ${counts.season} forfeits this season. The league will decide a penalty.` : `${FORFEIT_LIMIT} forfeits in a season brings a penalty.`}
      </Typography>
      <Button fullWidth size="large" variant="contained" onClick={() => { done(); navigate(`/lines/join/${f.machineId}`); }} sx={{ mt: 2.5, minHeight: 48, bgcolor: colors.lime, color: colors.black, fontWeight: 700, '&:hover': { bgcolor: colors.lime } }}>
        Sign up again
      </Button>
      <Button fullWidth onClick={done} sx={{ mt: 1, color: colors.paleYellow }}>OK</Button>
    </Dialog>
  );
}

/** Small notes for an admin, top right, gone after a few seconds. Only what happened while open. */
function AdminBlips() {
  const league = useLeague();
  const muted = useBlipsMuted();
  const opened = useRef(Date.now());
  const [gone, setGone] = useState<string[]>([]);
  const fresh = (league.lineEvents ?? []).filter((e) => e.real > opened.current && !gone.includes(e.id)).slice(0, 3);

  useEffect(() => {
    if (fresh.length === 0) return;
    const timers = fresh.map((e) => window.setTimeout(() => setGone((g) => [...g, e.id]), 4500));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [fresh.map((e) => e.id).join()]);

  if (muted || fresh.length === 0) return null;
  const teamName = (id: string) => league.teams.find((t) => t.teamId === id)?.teamName ?? 'A team';
  const machineName = (id: string) => league.machines.find((m) => m.machineId === id)?.name ?? 'a machine';

  return (
    <Box aria-live="polite" sx={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 64px)', right: 12, zIndex: 1280, display: 'grid', gap: 0.75, maxWidth: 300 }}>
      {fresh.map((e) => (
        <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.5, py: 0.5, borderRadius: 99, bgcolor: colors.black, color: colors.paleYellow, border: `1px solid ${e.kind === 'started' ? colors.lime : colors.coral}`, boxShadow: '0 4px 14px rgba(0,0,0,0.35)', fontSize: '0.9rem' }}>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: e.kind === 'started' ? colors.lime : colors.coral }} />
          <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
            <b>{teamName(e.teamId)}</b> {e.kind === 'started' ? 'started on' : 'forfeited on'} {machineName(e.machineId)}
          </Box>
          <Button size="small" onClick={() => setBlipsMuted(true)} sx={{ color: colors.sand, minWidth: 0, px: 0.75, fontSize: '0.75rem' }}>Mute</Button>
          <IconButton size="small" aria-label="Dismiss" onClick={() => setGone((g) => [...g, e.id])} sx={{ color: colors.sand }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      ))}
    </Box>
  );
}
