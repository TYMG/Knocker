// The front door: what anyone who is not logged in as a team sees at "/".
// It explains the league in one scroll (what it is, how a night works, the season, the top of
// the standings, the house rules) and points to Sign up and Standings.
//
// Motion, from the approved "HomeScroll" wireframe:
//   - the hero is drawn in layers that drift at different speeds as you scroll, and it fades out;
//   - the three steps and the standings rows arrive one at a time as they scroll into view.
// People who ask their device for less motion get none of it: everything is simply there.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { useLeague, useMe } from '../hooks';
import { playedWeeks, season, weekLabel } from '../sample/league';
import { clockLabel, longDate } from '../sample/time';
import { colors } from '../theme';
import Page from '../ui/Page';
import { Row, RowCard } from '../ui/Rows';
import Section from '../ui/Section';
import StandingsTable from '../ui/StandingsTable';
import { HeroFar, HeroMachines } from './FrontDoorHero';

const HOUSE_RULES = [
  'Every score needs a photo of the display.',
  'Every score is public, and so is every correction.',
  'Alliances are welcome. Team up to knock the leaders down.',
  'It is a night out first and a competition second.'
];

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** "19:00", "21:00" -> "7 to 9 PM". Keeps the minutes and both AM/PM marks only when they are needed. */
function hoursRange(opensAt: string, closesAt: string): string {
  const [from, fromHalf] = clockLabel(opensAt).replace(':00', '').split(' ');
  const [to, toHalf] = clockLabel(closesAt).replace(':00', '').split(' ');
  return fromHalf === toHalf ? `${from} to ${to} ${toHalf}` : `${from} ${fromHalf} to ${to} ${toHalf}`;
}

const wantsLessMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * True once the element has scrolled into view, and it stays true. Starts true when the person
 * asked for less motion or the browser cannot tell us, so nothing is ever left hidden.
 */
function useSeen<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => wantsLessMotion() || !('IntersectionObserver' in window));
  useEffect(() => {
    const node = ref.current;
    if (seen || !node) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { threshold }
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** One of the three steps. It rises into place the first time it is scrolled into view. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <Card
      ref={ref}
      sx={{
        p: 2, display: 'flex', gap: 2, alignItems: 'flex-start',
        opacity: seen ? 1 : 0,
        transform: seen ? 'none' : 'translateY(28px)',
        transition: `opacity 500ms ${EASE}, transform 500ms ${EASE}`,
        // On a phone the steps are stacked, so each arrives as you reach it. Side by side they
        // would all arrive at once, so each waits a beat longer than the one before.
        transitionDelay: { xs: '0ms', md: `${(n - 1) * 140}ms` }
      }}
    >
      <Typography aria-hidden sx={{ fontFamily: "'Bungee', sans-serif", fontSize: '2.2rem', lineHeight: 1, color: 'primary.main', width: 34, flexShrink: 0, textAlign: 'center' }}>
        {n}
      </Typography>
      <Box>
        <Typography variant="h4" component="h4">
          <Box component="span" sx={visuallyHidden}>Step {n}: </Box>
          {title}
        </Typography>
        {/* Quiet text takes its color through sx on these pages: in MUI 9 the color="text.secondary" prop on Typography has no effect. */}
        <Typography sx={{ color: 'text.secondary' }}>{children}</Typography>
      </Box>
    </Card>
  );
}

// Read out by screen readers, not drawn. The sizes are written as '1px' because a bare 1 means 100% to MUI.
const visuallyHidden = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } as const;

/** Holds the standings table and slides its rows in from the left, one after another. */
function RowsArrive({ children }: { children: ReactNode }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.15);
  // The shared table has no way to animate its own rows, so this reaches in from outside:
  // inside the table's card, the first wrapper holds one box per team. If StandingsTable's
  // layout changes, the rows simply stop animating; they are never left hidden, because the
  // hidden state is only applied by the selector below.
  const rows = '& .MuiCard-root > div > div';
  // Built as a plain object and handed over whole: spelled out inline, the computed keys make
  // the style type too big for TypeScript to check.
  const style: Record<string, object | string> = {
    overflow: 'hidden', // rows start a little to the left; do not let that widen the page
    [rows]: { opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateX(-40px)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }
  };
  for (let i = 1; i <= 8; i++) style[`${rows}:nth-of-type(${i})`] = { transitionDelay: `${(i - 1) * 110}ms` };
  return (
    <Box ref={ref} sx={style as SxProps<Theme>}>
      {children}
    </Box>
  );
}

/** The top of the page: the name, the pitch and the two ways in, over the drawn bar. */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  // Parallax. The scroll position is written to two CSS variables on the hero and the layers
  // work their own offsets out from them in CSS, so scrolling never re-renders React.
  // At most one update per frame, and none at all once the hero is well off screen.
  useEffect(() => {
    const hero = ref.current;
    if (!hero || wantsLessMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(Math.max(window.scrollY, 0), hero.offsetHeight + 100);
      hero.style.setProperty('--y', String(y));
      hero.style.setProperty('--fade', String(Math.max(0, 1 - y / 520)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        // The layout pads <main> by 16px at the sides and 24px on top. Pull the hero out to the edges.
        mx: -2, mt: -3, mb: 4,
        position: 'relative', overflow: 'hidden',
        // The bar is dark in both themes: it is a picture of a bar at night, not a surface.
        bgcolor: colors.black, color: colors.paleYellow,
        // svh, not vh, so the phone's address bar sliding away does not resize the hero. The cap
        // keeps it sensible on tall screens.
        minHeight: { xs: 'clamp(560px, 76svh, 640px)', md: 'clamp(520px, 72svh, 640px)' },
        display: 'flex', flexDirection: 'column',
        '& .hero-layers': { position: 'absolute', inset: 0, opacity: 'var(--fade, 1)' },
        '& svg': { position: 'absolute', left: 0, width: '100%', display: 'block', willChange: 'transform' },
        // Back layer moves slowest, the machines a little faster, the words fastest of all.
        '& .hero-far': { top: 0, height: '100%', transform: 'translate3d(0, calc(var(--y, 0) * 0.55px), 0)' },
        '& .hero-mid': { bottom: 0, height: { xs: 210, sm: 250, md: 280 }, transform: 'translate3d(0, calc(var(--y, 0) * 0.28px), 0)' },
        '& .hero-words': { transform: 'translate3d(0, calc(var(--y, 0) * -0.1px), 0)', opacity: 'var(--fade, 1)' },
        '@media (prefers-reduced-motion: reduce)': { '& svg, & .hero-words': { transform: 'none' }, '& .hero-layers, & .hero-words': { opacity: 1 } }
      }}
    >
      <div className="hero-layers">
        <HeroFar />
        <HeroMachines />
      </div>
      <Box className="hero-words" sx={{ position: 'relative', width: '100%', maxWidth: 1100 + 32, mx: 'auto', px: 2, pt: { xs: 8, md: 10 }, pb: { xs: 28, sm: 34, md: 38 } }}>
        <Box sx={{ maxWidth: 600 }}>
          <Typography variant="h1" sx={{ color: colors.lime, textShadow: `0 2px 0 ${colors.black}` }}>
            Split Flipper Island
          </Typography>
          <Typography sx={{ mt: 2, fontSize: { xs: '1.15rem', sm: '1.3rem' }, lineHeight: 1.45, textShadow: `0 1px 8px ${colors.black}` }}>
            Think Love Island, but made for pinball. Two players share one machine: one flipper each, one hand each.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/join" variant="contained" color="secondary" size="large">
              Sign up your team
            </Button>
            <Button
              component={RouterLink}
              to="/standings"
              variant="outlined"
              size="large"
              sx={{ color: colors.paleYellow, borderColor: colors.paleYellow, bgcolor: 'rgba(0, 0, 0, 0.55)', '&:hover': { borderColor: colors.lime, bgcolor: 'rgba(0, 0, 0, 0.7)' } }}
            >
              See the standings
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default function FrontDoor() {
  const league = useLeague();
  const me = useMe();

  const nights = league.weeks.filter((w) => w.week <= 8);
  const played = playedWeeks(league);
  const openWeek = played.find((w) => w.state === 'open');
  const latest = played[played.length - 1];
  const first = nights[0];
  const hours = hoursRange(league.night.opensAt, league.night.closesAt);
  // "Wednesday, October 14" -> "Wednesdays"
  const weekday = first ? `${longDate(first.date).split(',')[0]}s` : '';
  const rows = season(league).option1;
  const finalists = league.finals.championship.teamIds.length;

  const signUp = (
    <Button component={RouterLink} to="/join" variant="contained" color="secondary" size="large">
      Sign up your team
    </Button>
  );

  return (
    <>
      <Hero />
      <Page width="wide">
        <Stack spacing={5}>
          <Section title="How a night works">
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <Step n={1} title="Pair up">
                You take the left flipper, your partner takes the right. The other hand stays off the machine.
              </Step>
              <Step n={2} title="Play every machine">
                League night runs {hours}. Play any machine as many times as you like.
              </Step>
              <Step n={3} title="Post your scores">
                Snap the display, type the score, and watch the standings move.
              </Step>
            </Box>
          </Section>

          {/* Side by side on a wide screen: the season and the rules on the left, the standings on the right. */}
          <Box sx={{ display: 'grid', gap: 5, columnGap: 6, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, alignItems: 'start' }}>
            <Section title="The season" aside={openWeek ? `${weekLabel(openWeek.week)} is on now` : `${played.length} of ${nights.length} played`}>
              {/* Filled markers are weeks with points. The label on each says so in words too. */}
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                {nights.map((w) => {
                  const done = played.some((p) => p.week === w.week);
                  return (
                    <Box
                      component="li"
                      key={w.week}
                      aria-label={`${weekLabel(w.week)}, ${w.state === 'open' ? 'on now' : done ? 'played' : 'still to come'}`}
                      sx={{
                        flex: '1 1 0', maxWidth: 44, aspectRatio: '1', borderRadius: '50%', display: 'grid', placeItems: 'center',
                        fontFamily: "'Bungee', sans-serif", fontSize: '0.95rem',
                        border: 2, borderColor: done ? 'primary.main' : 'divider',
                        bgcolor: done ? 'primary.main' : 'transparent',
                        color: done ? 'primary.contrastText' : 'text.secondary',
                        // The week being played tonight gets a second ring.
                        ...(w.state === 'open' && { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 2 })
                      }}
                    >
                      {w.week}
                    </Box>
                  );
                })}
                <Box component="li" sx={{ flexShrink: 0, ml: 0.5, px: 1.25, py: 0.5, borderRadius: 999, border: 2, borderColor: 'divider', fontWeight: 700, fontSize: '0.9rem' }}>
                  Finals
                </Box>
              </Box>
              <Typography sx={{ color: 'text.secondary', mt: 1.5 }}>
                {NUMBER_WORDS[nights.length] ?? nights.length} league nights, then a championship night for the top {finalists}.
              </Typography>
              <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, m: 0, mt: 2 }}>
                <Card sx={{ p: 1.5 }}>
                  <Typography sx={{ color: 'text.secondary' }} component="dt" variant="body2">
                    League night
                  </Typography>
                  <Typography component="dd" sx={{ m: 0, fontWeight: 700 }}>
                    {weekday}, {hours}
                  </Typography>
                </Card>
                {first && (
                  <Card sx={{ p: 1.5 }}>
                    <Typography sx={{ color: 'text.secondary' }} component="dt" variant="body2">
                      {first.state === 'upcoming' ? 'Starts' : 'Started'}
                    </Typography>
                    <Typography component="dd" sx={{ m: 0, fontWeight: 700 }}>
                      {longDate(first.date)}
                    </Typography>
                  </Card>
                )}
              </Box>
            </Section>

            <Box sx={{ gridColumn: { md: 2 }, gridRow: { md: '1 / span 2' } }}>
              <Section title="Standings" aside={latest ? `after ${weekLabel(latest.week).toLowerCase()}` : undefined}>
                {latest ? (
                  <>
                    <RowsArrive>
                      <StandingsTable rows={rows} limit={5} myTeamId={me.myTeamId} />
                    </RowsArrive>
                    {rows.length > 0 && (
                      <Link component={RouterLink} to="/standings/season" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, mt: 0.5, fontWeight: 700 }}>
                        See all {rows.length} teams
                      </Link>
                    )}
                  </>
                ) : (
                  <Typography sx={{ color: 'text.secondary' }}>No league night has been played yet. The table fills in after week 1.</Typography>
                )}
              </Section>
            </Box>

            <Section title="House rules">
              <RowCard>
                {HOUSE_RULES.map((rule) => (
                  <Row key={rule}>
                    <Typography>{rule}</Typography>
                  </Row>
                ))}
              </RowCard>
            </Section>
          </Box>

          <Section title="Grab a partner">
            <Typography sx={{ mb: 2, maxWidth: 560 }}>
              Couples get first pick of the {league.teamCap} spots. Flying solo? Join the waitlist and we will pair you up.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>{signUp}</Box>
          </Section>

          <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider', pt: 1 }}>
            {[
              { to: '/standings/log', label: 'League log' },
              { to: '/standings/finals', label: 'Championship' }
            ].map((l) => (
              <Link key={l.to} component={RouterLink} to={l.to} underline="hover" sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
                {l.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </Page>
    </>
  );
}
