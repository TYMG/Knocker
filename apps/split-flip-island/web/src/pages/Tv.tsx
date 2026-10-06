// The bar TV (/tv). It runs on the screen behind the bar all night and nobody touches it, so
// there is no login and nothing to tap except a quiet link back to the app.
//
// It shows the time left, the league message, tonight's points, one machine's board at a time
// (changing every 15 seconds), who is up on every machine, and a code to scan.
//
// Two things are different from every other page:
//   1. It is always dark, whatever theme the browser is in. A TV in a bar should not turn pale
//      yellow because of a setting. The "dark" class on the outer box makes every theme color
//      inside it resolve to its dark value.
//   2. On a big screen nothing scrolls, so every size is a share of the screen height (the
//      "--u" unit below, one hundredth of the space under the sample strip). The page then
//      looks the same at 1600 x 900 and 1920 x 1080. Below 900 px wide the three columns stack
//      and the page scrolls like any other.

import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { keyframes } from '@mui/material/styles';
import { useLeague } from '../hooks';
import { SAMPLE_BAR_HEIGHT } from '../layout/SampleBar';
import { countedMachines, lineCount, linesView, location, machine as machineOf, machineBoard, nightStatus, tonightRows, weekLabel, type LineView, type TonightRow } from '../sample/league';
import { longDate } from '../sample/time';
import { colors } from '../theme';
import CodeBox from '../ui/CodeBox';
import MovingList from '../ui/MovingList';
import ScoreDisplay from '../ui/ScoreDisplay';

/** Seconds each machine's board stays up. */
const ROTATE_SECONDS = 15;
/** Teams shown on a machine's board. */
const BOARD_ROWS = 5;

/** A size in screen units: u(3) is 3% of the screen height on a TV. */
const u = (n: number) => `calc(var(--u) * ${n})`;

const display = "'Bungee', Impact, sans-serif";
const line = `1px solid rgba(164, 154, 135, 0.35)`; // sand, faint
const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

export default function Tv() {
  const league = useLeague();
  const night = nightStatus(league);
  const week = night.week;
  const label = weekLabel(week.week);
  const rows = tonightRows(league);
  const counted = countedMachines(league, week);
  const lines = linesView(league);

  // The rotating board is only a display timer, so it may use the real clock. Everything about
  // the league itself (time left, points) still comes from the league's own clock.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const boardIndex = counted.length ? Math.floor(tick / ROTATE_SECONDS) % counted.length : 0;
  const secondsLeft = ROTATE_SECONDS - (tick % ROTATE_SECONDS);

  return (
    <Box
      className="dark"
      sx={(theme) => ({
        '--u': '6.5px',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: u(1.6),
        p: `${u(2)} ${u(2.4)}`,
        bgcolor: colors.black,
        color: colors.paleYellow,
        lineHeight: 1.2,
        [theme.breakpoints.up('md')]: {
          '--u': `min(calc((100dvh - ${SAMPLE_BAR_HEIGHT}px) / 100), calc(100vw / 178))`,
          height: `calc(100dvh - ${SAMPLE_BAR_HEIGHT}px)`,
          overflow: 'hidden',
          pb: u(1)
        }
      })}
    >
      {/* Name, week and the clock */}
      <Box component="header" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: u(1.5), flexShrink: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box component="h1" sx={{ m: 0, fontFamily: display, fontWeight: 400, fontSize: { xs: u(3.6), md: u(4.8) }, lineHeight: 1, color: colors.lime }}>
            Split Flipper Island
          </Box>
          <Box sx={{ mt: u(0.6), fontSize: u(3), fontWeight: 700 }}>
            {label} at {location(league).name}
          </Box>
        </Box>
        {night.open ? (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: u(1.6), flexShrink: 0 }}>
            <Box sx={{ fontFamily: display, fontSize: u(8.4), lineHeight: 1, color: colors.paleYellow, fontVariantNumeric: 'tabular-nums' }}>{night.minutesLeft}:00</Box>
            <Box sx={{ fontSize: u(3), fontWeight: 700, color: colors.sand }}>left tonight</Box>
          </Box>
        ) : (
          <Box sx={{ fontFamily: display, fontSize: { xs: u(4.4), md: u(6) }, lineHeight: 1, flexShrink: 0 }}>{label} is final</Box>
        )}
      </Box>

      {/* The league message, edge to edge */}
      {league.message && (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: u(1.6), mx: `calc(${u(2.4)} * -1)`, px: u(2.4), py: u(1.2), bgcolor: colors.coral, color: colors.black, flexShrink: 0 }}>
          <Box sx={{ px: u(1), py: u(0.3), borderRadius: u(0.6), bgcolor: colors.black, color: colors.coral, fontSize: u(2), fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>LEAGUE</Box>
          <Box sx={{ fontSize: u(3.3), fontWeight: 700, lineHeight: 1.15 }}>{league.message.text}</Box>
        </Box>
      )}

      <Box sx={{ flex: { md: '1 1 0' }, minHeight: 0, display: 'grid', gap: u(2), gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1.35fr) minmax(0, 1fr)' }, gridTemplateRows: { md: 'minmax(0, 1fr)' } }}>
        <Panel title={night.open ? "Tonight's points" : `${label} points`}>
          <PointsList rows={rows} />
        </Panel>

        <Panel>
          {counted.length === 0 ? (
            <Quiet>No machines are in play.</Quiet>
          ) : (
            <Board
              // A new key each time the machine changes restarts the fade-in.
              key={counted[boardIndex]}
              machineId={counted[boardIndex]!}
              position={boardIndex + 1}
              of={counted.length}
              secondsLeft={secondsLeft}
              closed={!night.open}
            />
          )}
        </Panel>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: u(2), minHeight: 0 }}>
          <Panel title={night.open ? "Who's up" : 'Until next time'} grow>
            {night.open ? <WhosUp lines={lines} /> : <AfterTheNight />}
          </Panel>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: u(2), p: u(1.6), border: line, borderRadius: u(1.2), bgcolor: colors.card, flexShrink: 0 }}>
            {/* CodeBox only takes a size in pixels, so its box is resized here to follow the screen. */}
            <Box sx={{ flexShrink: 0, '& > [role="img"]': { width: u(13), height: u(13), p: u(0.9) } }}>
              <CodeBox to={night.open ? '/' : '/standings'} />
            </Box>
            <Box sx={{ fontSize: u(3), fontWeight: 700, lineHeight: 1.15 }}>{night.open ? 'Scan to get in line or post a score' : 'Scan to see the full standings'}</Box>
          </Box>
        </Box>
      </Box>

      <Box component="footer" sx={{ flexShrink: 0, lineHeight: 1 }}>
        <Link component={RouterLink} to="/" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', minHeight: { xs: 44, md: 0 }, color: colors.sand, fontSize: { xs: '0.95rem', md: `max(${u(1.7)}, 13px)` } }}>
          Back to the app
        </Link>
      </Box>
    </Box>
  );
}

/** One boxed column. `grow` lets it take the spare height in a stack of two. */
function Panel({ title, children, grow }: { title?: string; children: ReactNode; grow?: boolean }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: grow ? { md: '1 1 0' } : undefined, p: u(1.8), border: line, borderRadius: u(1.2), bgcolor: colors.card, overflow: 'hidden' }}>
      {title && <PanelTitle>{title}</PanelTitle>}
      {children}
    </Box>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <Box component="h2" sx={{ m: 0, mb: u(1), fontFamily: display, fontWeight: 400, fontSize: u(3), lineHeight: 1.1, color: colors.lime, flexShrink: 0 }}>
      {children}
    </Box>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <Box sx={{ fontSize: u(2.6), color: colors.sand }}>{children}</Box>;
}

/** Places moved in the last 20 minutes, big enough for a TV. The arrow shape carries it, not just the color. */
function Move({ change }: { change: number | undefined }) {
  const places = Math.abs(change ?? 0);
  const label = !change ? 'No change in the last 20 minutes' : `${change > 0 ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'} in the last 20 minutes`;
  return (
    <Box component="span" role="img" aria-label={label} sx={{ width: '2.1em', flexShrink: 0, fontSize: '0.72em', fontWeight: 700, whiteSpace: 'nowrap', color: !change ? colors.sand : change > 0 ? colors.lime : colors.coral }}>
      {!change ? '–' : `${change > 0 ? '▲' : '▼'}${places}`}
    </Box>
  );
}

/**
 * Every team with its place, movement, name and points. The rows share the height of the
 * column, and the type gets a little smaller as the league grows, so 12 teams still fit.
 */
function PointsList({ rows }: { rows: TonightRow[] }) {
  if (rows.length === 0) return <Quiet>No teams yet.</Quiet>;
  const size = rows.length <= 10 ? 3.1 : rows.length <= 12 ? 2.8 : 2.3;
  const arrows = rows.some((r) => r.change !== undefined);
  return (
    // MovingList slides a row to its new place when the order changes. Its own boxes are
    // stretched from here so the rows fill the column on a TV.
    <Box
      sx={{
        flex: { md: '1 1 0' }, minHeight: 0, fontSize: u(size),
        '& > div': { height: { md: '100%' }, display: 'flex', flexDirection: 'column' },
        '& > div > div': { flex: { md: '1 1 0' }, minHeight: 0, display: 'flex', alignItems: 'center', py: { xs: u(1), md: 0 }, borderColor: 'rgba(164, 154, 135, 0.25)' }
      }}
    >
      <MovingList items={rows} keyOf={(r) => r.team.teamId}>
        {(r) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4em', width: '100%', minWidth: 0 }}>
            <Box sx={{ width: '1.5em', textAlign: 'right', flexShrink: 0, fontFamily: display, color: colors.lime }}>{r.rank}</Box>
            {arrows && <Move change={r.change} />}
            <Box sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team.teamName}</Box>
            <Box sx={{ flexShrink: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {r.points}
              <Box component="span" sx={{ ml: '0.3em', fontSize: '0.68em', fontWeight: 400, color: colors.sand }}>
                pts
              </Box>
            </Box>
          </Box>
        )}
      </MovingList>
    </Box>
  );
}

/** One machine's top five, with the countdown to the next machine. */
function Board({ machineId, position, of, secondsLeft, closed }: { machineId: string; position: number; of: number; secondsLeft: number; closed: boolean }) {
  const league = useLeague();
  const week = nightStatus(league).week;
  const machine = machineOf(league, machineId);
  const rows = machineBoard(league, week.week, machineId).slice(0, BOARD_ROWS);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: { md: '1 1 0' }, minHeight: 0, animation: `${fadeIn} 500ms ease-out`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: u(1.5), flexShrink: 0 }}>
        <Box component="h2" sx={{ m: 0, flexGrow: 1, minWidth: 0, fontFamily: display, fontWeight: 400, fontSize: u(5.2), lineHeight: 1, color: colors.lime, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {machine.name}
        </Box>
        {of > 1 && (
          <Box sx={{ flexShrink: 0, fontSize: u(2.2), fontWeight: 700, color: colors.sand }}>
            {position} of {of}
          </Box>
        )}
      </Box>
      {of > 1 && (
        <Box sx={{ flexShrink: 0, mt: u(0.8) }}>
          <Box sx={{ fontSize: u(2.3), color: colors.sand }}>
            next machine in {secondsLeft} {secondsLeft === 1 ? 'second' : 'seconds'}
          </Box>
          {/* A thin bar that fills as the 15 seconds run. Decoration only: the words above say the same. */}
          <Box aria-hidden sx={{ mt: u(0.6), height: u(0.5), borderRadius: u(0.25), bgcolor: 'rgba(164, 154, 135, 0.25)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${((ROTATE_SECONDS - secondsLeft) / ROTATE_SECONDS) * 100}%`, bgcolor: colors.lime, transition: 'width 1s linear', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }} />
          </Box>
        </Box>
      )}

      {rows.length === 0 ? (
        <Box sx={{ mt: u(2) }}>
          <Quiet>{closed ? 'No scores on this machine.' : 'No scores yet. Be the first.'}</Quiet>
        </Box>
      ) : (
        <Box sx={{ flex: { md: '1 1 0' }, minHeight: 0, display: 'flex', flexDirection: 'column', mt: u(0.8) }}>
          {rows.map((r) => (
            <Box
              key={r.team.teamId}
              sx={{
                // Kept to a fifth of the column each, so a board with two scores does not stretch.
                flex: { md: `0 1 ${100 / BOARD_ROWS}%` }, minHeight: 0, py: { xs: u(1.2), md: 0 },
                display: 'grid', alignItems: 'center', columnGap: u(1.6),
                // Phone: name and points on one line, the score under them. TV: score at the right.
                gridTemplateColumns: { xs: 'auto minmax(0, 1fr) auto', md: 'auto minmax(0, 1fr) auto' },
                gridTemplateAreas: { xs: '"place name pts" "place score score"', md: '"place name score" "place pts score"' },
                alignContent: 'center',
                '& + &': { borderTop: line }
              }}
            >
              <Box sx={{ gridArea: 'place', width: u(4.6), textAlign: 'right', fontFamily: display, fontSize: u(4.6), lineHeight: 1, color: colors.lime }}>{r.rank}</Box>
              <Box sx={{ gridArea: 'name', minWidth: 0, fontSize: u(3.2), fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team.teamName}</Box>
              <Box sx={{ gridArea: 'pts', fontSize: u(2.4), color: colors.sand, whiteSpace: 'nowrap' }}>
                {r.points} {r.points === 1 ? 'pt' : 'pts'}
              </Box>
              {/* ScoreDisplay has no TV size, so its type and padding are scaled from here. */}
              <Box sx={{ gridArea: 'score', display: 'flex', mt: { xs: u(0.6), md: 0 }, '& > [role="img"]': { fontSize: u(4), p: `${u(1)} ${u(1.4)}`, borderRadius: u(0.7) } }}>
                <ScoreDisplay value={r.best.score} size="md" />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

/** Each machine picked tonight: how long the line is, who is playing, who is next. */
function WhosUp({ lines }: { lines: LineView[] }) {
  if (lines.length === 0) return <Quiet>No machines are picked yet.</Quiet>;
  // With more than four machines the type shrinks a little so they all still fit.
  const k = lines.length <= 4 ? 1 : Math.max(4 / lines.length, 0.65);
  const s = (n: number) => u(Number((n * k).toFixed(2)));
  return (
    <Box sx={{ flex: { md: '1 1 0' }, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {lines.map((l) => (
        <Box
          key={l.machine.machineId}
          sx={{ flex: { md: l.out ? '0 0 auto' : '1 1 0' }, minHeight: 0, py: { xs: u(1.2), md: l.out ? u(1) : 0 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: s(0.5), '& + &': { borderTop: line } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: u(1.2) }}>
            <Box component="h3" sx={{ m: 0, flexGrow: 1, minWidth: 0, fontFamily: display, fontWeight: 400, fontSize: s(2.7), lineHeight: 1.1, color: l.out ? colors.sand : colors.paleYellow, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.machine.name}
            </Box>
            {l.out ? (
              <Box sx={{ flexShrink: 0, px: u(1), py: u(0.2), borderRadius: u(2), border: `2px solid ${colors.coral}`, color: colors.coral, fontSize: s(2), fontWeight: 700, whiteSpace: 'nowrap' }}>Out tonight</Box>
            ) : (
              <Box sx={{ flexShrink: 0, fontSize: s(2.2), color: colors.sand, whiteSpace: 'nowrap' }}>{lineCount(l.teams.length)}</Box>
            )}
          </Box>
          {!l.out && l.playing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: u(1.2), minWidth: 0 }}>
              <Box sx={{ flexShrink: 0, px: u(0.9), py: u(0.25), borderRadius: u(0.6), bgcolor: colors.lime, color: colors.black, fontSize: s(1.9), fontWeight: 700, letterSpacing: '0.08em' }}>NOW</Box>
              <Box sx={{ minWidth: 0, fontSize: s(3), fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.playing.teamName}</Box>
            </Box>
          )}
          {!l.out && (
            <Box sx={{ fontSize: s(2.3), color: colors.paleYellow, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: { md: 'nowrap' } }}>{nextUp(l)}</Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

/** "Next: Bumper Crop, then Left & Right", or an invitation when nobody is waiting. */
function nextUp(l: LineView): string {
  if (!l.playing) return 'Nobody is playing. Walk up.';
  const [first, second, ...more] = l.waiting;
  if (!first) return 'Nobody waiting. Walk up.';
  if (!second) return `Next: ${first.teamName}`;
  return `Next: ${first.teamName}, then ${second.teamName}${more.length ? ` and ${more.length} more` : ''}`;
}

/** The right column once the night is closed: scores are locked, and when the league is back. */
function AfterTheNight() {
  const league = useLeague();
  const next = league.weeks.find((w) => w.state === 'upcoming');
  const leaders = tonightRows(league).filter((r) => r.rank === 1 && r.points > 0);
  const top = leaders[0];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: u(1.6), fontSize: u(2.8), lineHeight: 1.25 }}>
      <Box sx={{ fontWeight: 700 }}>The night is closed. These points are final.</Box>
      {top && (
        <Box>
          {leaders.length === 1
            ? `${top.team.teamName} won the night with ${top.points} points.`
            : `${leaders.map((r) => r.team.teamName).join(' and ')} tied for the night on ${top.points} points.`}
        </Box>
      )}
      {next && (
        <Box sx={{ color: colors.sand }}>
          {next.week >= 9 ? 'Championship night' : `${weekLabel(next.week)}`}: {longDate(next.date)}.
        </Box>
      )}
    </Box>
  );
}
