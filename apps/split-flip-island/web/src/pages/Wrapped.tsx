// Season Wrapped (Build Plan phase 7): full-screen cards you tap through, like Spotify Wrapped,
// written by the Love Dr. Tap the right side for the next card, the left side to go back.
// GSAP brings each card in. In calm mode the cards simply appear.
//
// The numbers come from sample/wrapped.ts. Before week 8 closes this is "Wrapped so far".

import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import { useCalm, useLeague, useMe } from '../hooks';
import { wrapped, type WrappedCard } from '../sample/wrapped';
import { colors } from '../theme';
import { celebrate } from '../ui/celebrate';
import { Mascot } from './LoveDr';

gsap.registerPlugin(useGSAP);

const display = "'Bungee', Impact, sans-serif";

/** Each card's colors: [background, big text, body text]. Brand colors only. */
const LOOK: Record<WrappedCard['key'], [string, string, string]> = {
  intro: [colors.black, colors.lime, colors.paleYellow],
  games: [colors.coral, colors.black, colors.black],
  'best-night': [colors.lime, colors.black, colors.black],
  favorite: [colors.paleYellow, colors.black, colors.black],
  'got-away': [colors.sand, colors.black, colors.black],
  statuses: [colors.black, colors.coral, colors.paleYellow],
  couple: [colors.coral, colors.paleYellow, colors.black],
  finish: [colors.black, colors.lime, colors.paleYellow]
};

export default function Wrapped() {
  const league = useLeague();
  const me = useMe();
  const calm = useCalm();
  const navigate = useNavigate();
  const [at, setAt] = useState(0);
  const stage = useRef<HTMLDivElement>(null);

  const data = me.isTeam ? wrapped(league, me.team.teamId) : undefined;
  const cards = data?.cards ?? [];
  const card = cards[at];
  const last = at === cards.length - 1;

  const go = (step: number) => setAt((i) => Math.min(Math.max(i + step, 0), cards.length - 1));
  const close = () => navigate('/');

  // Arrow keys and Escape, for a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // The last card gets confetti, once per opening.
  useEffect(() => {
    if (last && cards.length > 1) celebrate('first');
  }, [last, cards.length]);

  // Each card's entrance: the kicker rises, the big thing lands with a bounce, then the Dr. speaks.
  useGSAP(
    () => {
      if (calm || !stage.current) return;
      const q = gsap.utils.selector(stage);
      gsap.timeline()
        .from(q('.w-kicker'), { y: 24, opacity: 0, duration: 0.35, ease: 'power2.out' })
        .from(q('.w-big'), { scale: 0.55, opacity: 0, duration: 0.55, ease: 'back.out(2.2)' }, '-=0.1')
        .from(q('.w-label'), { y: 14, opacity: 0, duration: 0.3 }, '-=0.25')
        .from(q('.w-chip'), { y: 16, opacity: 0, duration: 0.3, stagger: 0.08 }, '-=0.1')
        .from(q('.w-dr'), { x: -40, rotation: -15, opacity: 0, duration: 0.45, ease: 'back.out(2)' }, '-=0.05')
        .from(q('.w-says'), { opacity: 0, y: 10, duration: 0.35 }, '-=0.2');
    },
    { scope: stage, dependencies: [at, calm], revertOnUpdate: true }
  );

  if (!me.isTeam) return <Navigate to="/" replace />;
  if (!data || !card) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        Your Wrapped shows up after your first league night.
        <Box sx={{ mt: 2 }}>
          <Button onClick={close} variant="contained">Back home</Button>
        </Box>
      </Box>
    );
  }

  const [bg, bigColor, ink] = LOOK[card.key];
  const bigSize = card.big.length > 12 ? 'clamp(2.2rem, 11vw, 4.2rem)' : 'clamp(3.4rem, 22vw, 7.5rem)';

  return (
    <Box
      role="dialog"
      aria-label={data.final ? 'Season Wrapped' : 'Wrapped so far'}
      sx={{ position: 'fixed', inset: 0, zIndex: 1500, bgcolor: bg, color: ink, display: 'flex', flexDirection: 'column', transition: calm ? 'none' : 'background-color 300ms ease' }}
    >
      {/* Progress: one bar per card */}
      <Stack direction="row" spacing={0.75} sx={{ px: 2, pt: 'calc(env(safe-area-inset-top) + 12px)' }}>
        {cards.map((c, i) => (
          <Box key={c.key} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: ink, opacity: i <= at ? 0.9 : 0.25 }} />
        ))}
      </Stack>
      <IconButton aria-label="Close Wrapped" onClick={close} sx={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 22px)', right: 8, color: ink, zIndex: 2 }}>
        <CloseIcon />
      </IconButton>

      {/* The card. Tap zones: left third goes back, the rest goes forward. */}
      <Box
        ref={stage}
        key={card.key}
        onClick={(e) => {
          const x = e.clientX / window.innerWidth;
          go(x < 0.33 ? -1 : 1);
        }}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, maxWidth: 640, width: '100%', mx: 'auto', cursor: 'pointer', userSelect: 'none' }}
      >
        <Box className="w-kicker" sx={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em', mb: 1.5 }}>
          {card.kicker}
        </Box>
        <Box className="w-big" sx={{ fontFamily: display, fontSize: bigSize, lineHeight: 0.95, color: bigColor, wordBreak: 'break-word', transformOrigin: 'left center' }}>
          {card.big}
        </Box>
        {card.label && (
          <Box className="w-label" sx={{ mt: 1.5, fontSize: '1.15rem', fontWeight: 700 }}>
            {card.label}
          </Box>
        )}
        {card.chips && (
          <Stack spacing={0.75} sx={{ mt: 2 }}>
            {card.chips.map((c) => (
              <Box key={c} className="w-chip" sx={{ alignSelf: 'flex-start', px: 1.5, py: 0.5, borderRadius: 999, border: 2, borderColor: ink, fontWeight: 700 }}>
                {c}
              </Box>
            ))}
          </Stack>
        )}
        <Stack direction="row" spacing={1.5} sx={{ mt: 4, alignItems: 'center' }}>
          <Box className="w-dr" sx={{ bgcolor: colors.paleYellow, borderRadius: '50%', p: 0.5, border: 2, borderColor: colors.black, flexShrink: 0 }}>
            <Mascot size={56} />
          </Box>
          <Box className="w-says" sx={{ fontSize: '1.1rem', lineHeight: 1.4, fontStyle: 'italic' }}>
            “{card.says}”
          </Box>
        </Stack>
      </Box>

      {/* Bottom: where you are, and the way out on the last card */}
      <Stack direction="row" spacing={1.5} sx={{ px: 2, pb: 'calc(env(safe-area-inset-bottom) + 16px)', justifyContent: 'center', minHeight: 64, alignItems: 'center' }}>
        {last ? (
          <>
            <Button variant="outlined" onClick={() => setAt(0)} sx={{ color: ink, borderColor: ink, minHeight: 44 }}>
              Play it again
            </Button>
            <Button variant="contained" onClick={close} sx={{ bgcolor: ink, color: bg, minHeight: 44, '&:hover': { bgcolor: ink } }}>
              Done
            </Button>
          </>
        ) : (
          <Box sx={{ opacity: 0.7, fontSize: '0.9rem' }}>Tap to keep going</Box>
        )}
      </Stack>
    </Box>
  );
}
