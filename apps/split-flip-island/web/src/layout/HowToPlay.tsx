// The floating "?" button and the How to play / Scoring modal it opens. Only the X (or Esc)
// closes it: a tap outside does nothing, so nobody loses their place by accident. Inside, the
// header art and a few faint pinballs scroll at different speeds from the text (parallax), unless
// calm mode or the phone's reduce-motion setting is on. The wording lives in howToPlayText.ts.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { useCalm, useMe } from '../hooks';
import { colors } from '../theme';
import { EXAMPLE, PLAY, SCORING, SCORING_AFTER, SEASON, type HelpSection } from './howToPlayText';

const SEEN = 'sfi-help-seen';
const seen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN, '1'); } catch { /* private mode */ } };

export default function HowToPlay() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const me = useMe();
  const calm = useCalm();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(() => !seen());

  // Not on the admin pages, and Wrapped covers the whole screen anyway.
  if (pathname.startsWith('/admin') || pathname === '/wrapped') return null;

  const tabs = me.isTeam || me.isAdmin;
  const bottom = !wide && tabs ? 'calc(env(safe-area-inset-bottom) + 72px)' : 24;

  return (
    <>
      <Fab
        aria-label="How to play and scoring"
        onClick={() => { setOpen(true); setPulse(false); markSeen(); }}
        size="medium"
        sx={{
          position: 'fixed', right: 16, bottom, zIndex: 1250,
          bgcolor: colors.coral, color: colors.black, border: `2px solid ${colors.black}`,
          '&:hover': { bgcolor: colors.lime },
          ...(pulse && !calm && {
            animation: 'sfiHelpPulse 1.6s ease-in-out 3',
            '@keyframes sfiHelpPulse': {
              '0%, 100%': { boxShadow: `0 0 0 0 ${colors.coral}aa` },
              '50%': { boxShadow: `0 0 0 14px ${colors.coral}00`, transform: 'scale(1.08)' }
            }
          })
        }}
      >
        <QuestionMarkIcon />
      </Fab>
      {open && <HelpModal onClose={() => setOpen(false)} calm={calm} />}
    </>
  );
}

function HelpModal({ onClose, calm }: { onClose: () => void; calm: boolean }) {
  const [tab, setTab] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  // Parallax: the scroll position goes into a CSS variable, and each layer moves by its own share.
  useEffect(() => {
    const el = scroller.current;
    if (!el || calm) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => el.style.setProperty('--y', String(el.scrollTop)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [calm, tab]);

  // A new tab starts at its top.
  useEffect(() => {
    const el = scroller.current;
    if (el) { el.scrollTop = 0; el.style.setProperty('--y', '0'); }
  }, [tab]);

  return (
    <Dialog
      open
      // Only the X and Esc close it. A tap on the backdrop is ignored on purpose.
      onClose={(_, reason) => { if (reason !== 'backdropClick') onClose(); }}
      aria-labelledby="sfi-help-title"
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { m: 2, width: 'calc(100% - 32px)', maxHeight: 'calc(100% - 32px)', height: 720, bgcolor: colors.card, color: colors.paleYellow, border: `2px solid ${colors.coral}`, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}
    >
      {/* Top: the tabs and the only way out */}
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'rgba(255,255,153,0.15)', pl: 1, pr: 0.5, flexShrink: 0 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} aria-label="Help sections" textColor="inherit" sx={{ flex: 1, minHeight: 52, '& .MuiTabs-indicator': { bgcolor: colors.lime, height: 3 } }}>
          <Tab label="How to play" sx={{ fontWeight: 700, minHeight: 52 }} />
          <Tab label="Scoring" sx={{ fontWeight: 700, minHeight: 52 }} />
        </Tabs>
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: colors.paleYellow }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* The scrolling part, with a scroll bar that stays visible */}
      <Box
        ref={scroller}
        tabIndex={0}
        sx={{
          '--y': 0, position: 'relative', flex: 1, overflowY: 'scroll', overscrollBehavior: 'contain',
          scrollbarWidth: 'thin', scrollbarColor: `${colors.lime} transparent`,
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': { bgcolor: colors.lime, borderRadius: 4 },
          '&:focus-visible': { outline: `2px solid ${colors.lime}`, outlineOffset: -2 }
        }}
      >
        <Balls calm={calm} />
        <Header calm={calm} title={tab === 0 ? 'How to play Split Flipper' : 'How scoring works'} />
        <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2.5, sm: 4 }, pb: 5 }}>
          {tab === 0 ? <Sections list={PLAY} /> : <ScoringTab />}
        </Box>
      </Box>
    </Dialog>
  );
}

/** Title over a pair of flippers. It scrolls at half speed and fades, so the rules slide over it. */
function Header({ title, calm }: { title: string; calm: boolean }) {
  return (
    <Box sx={{ height: 190, position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5,
          ...(!calm && { transform: 'translateY(calc(var(--y) * 0.5px))', opacity: 'max(0, calc(1 - var(--y) / 220))' })
        }}
      >
        <Flippers />
        <Typography id="sfi-help-title" variant="h2" component="h2" sx={{ color: colors.lime, textAlign: 'center', px: 2, textWrap: 'balance' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

function Flippers() {
  return (
    <svg width="150" height="56" viewBox="0 0 150 56" aria-hidden="true">
      <circle cx="75" cy="10" r="8" fill={colors.paleYellow} stroke={colors.black} strokeWidth="2" />
      <g transform="rotate(22 22 30)"><rect x="14" y="24" width="48" height="13" rx="6.5" fill={colors.coral} stroke={colors.black} strokeWidth="2" /><circle cx="22" cy="30.5" r="3" fill={colors.black} /></g>
      <g transform="rotate(-22 128 30)"><rect x="88" y="24" width="48" height="13" rx="6.5" fill={colors.coral} stroke={colors.black} strokeWidth="2" /><circle cx="128" cy="30.5" r="3" fill={colors.black} /></g>
    </svg>
  );
}

/** Faint pinballs behind the text, each drifting at its own speed as you scroll. */
const BALLS = [
  { left: '6%', top: 260, size: 34, speed: -0.25 },
  { left: '84%', top: 420, size: 22, speed: -0.45 },
  { left: '70%', top: 120, size: 46, speed: -0.15 },
  { left: '14%', top: 760, size: 26, speed: -0.55 },
  { left: '88%', top: 980, size: 38, speed: -0.3 }
];
function Balls({ calm }: { calm: boolean }) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {BALLS.map((b, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute', left: b.left, top: b.top, width: b.size, height: b.size, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, #fff 0, ${colors.sand} 45%, #3a352c 100%)`, opacity: 0.16,
            ...(!calm && { transform: `translateY(calc(var(--y) * ${b.speed}px))` })
          }}
        />
      ))}
    </Box>
  );
}

function Sections({ list }: { list: HelpSection[] }) {
  return <>{list.map((s) => <Block key={s.title} title={s.title}><Lines s={s} /></Block>)}</>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 3.5 }}>
      <Typography variant="h3" component="h3" sx={{ color: colors.coral, mb: 1.25 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function Lines({ s }: { s: HelpSection }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1, '& li::marker': { color: colors.lime } }}>
      {s.lines.map((l, i) => (
        <Box component="li" key={i} sx={{ fontSize: '1.05rem', lineHeight: 1.5, textWrap: 'pretty' }}>
          {l.lead && <Box component="strong" sx={{ color: colors.lime }}>{l.lead} </Box>}
          {l.text}
        </Box>
      ))}
    </Box>
  );
}

function ScoringTab() {
  return (
    <>
      <Sections list={SCORING} />
      <Box sx={{ mt: 2, border: `1px solid ${colors.sand}55`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1, fontWeight: 700, bgcolor: 'rgba(255,255,153,0.06)' }}>{EXAMPLE.caption}</Box>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td': { px: 2, py: 0.75, borderTop: `1px solid ${colors.sand}33` }, '& td:last-of-type': { textAlign: 'right', fontWeight: 700, color: colors.lime } }}>
          <thead><tr><Box component="th" sx={{ textAlign: 'left', px: 2, py: 0.75 }}>Place</Box><Box component="th" sx={{ textAlign: 'right', px: 2, py: 0.75 }}>Points</Box></tr></thead>
          <tbody>{EXAMPLE.rows.map(([p, n]) => <tr key={p}><td>{p}</td><td>{n}</td></tr>)}</tbody>
        </Box>
      </Box>

      <Block title={SEASON.title}>
        <Typography sx={{ fontSize: '1.05rem', lineHeight: 1.5, mb: 1.5, textWrap: 'pretty' }}>{SEASON.intro}</Typography>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {SEASON.options.map((o, i) => (
            <Box key={o.name} sx={{ p: 2, borderRadius: 2, border: `2px solid ${i === 0 ? colors.lime : colors.coral}`, bgcolor: 'rgba(0,0,0,0.25)' }}>
              <Typography sx={{ fontWeight: 700, color: i === 0 ? colors.lime : colors.coral, mb: 0.5 }}>Option {i + 1}: {o.name}</Typography>
              <Typography sx={{ lineHeight: 1.5 }}>{o.text}</Typography>
            </Box>
          ))}
        </Box>
      </Block>

      <Sections list={SCORING_AFTER} />
    </>
  );
}
