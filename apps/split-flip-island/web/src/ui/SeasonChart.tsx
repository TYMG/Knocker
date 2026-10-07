import { createContext, useContext, useId, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ResponsiveBump } from '@nivo/bump';
import { ResponsiveLine, type LineCustomSvgLayerProps } from '@nivo/line';
import { motion } from 'motion/react';
import { useLeague } from '../hooks';
import { approvedTeams, type NightPoints, type SeasonRow } from '../sample/league';
import { ordinal } from '../sample/time';
import { LINE_STYLES } from './chartColors';
import { ChartTip, fade, useNivo } from './charts/nivo';

/** How long the lines take to draw themselves in when the chart appears. Slow enough to watch the season unfold. */
const DRAW_SECONDS = 3;

type PointsSeries = { id: string; data: { x: string; y: number }[] };

interface TeamLook {
  id: string;
  label: string;
  mine: boolean;
  color: string;
  style: (typeof LINE_STYLES)[number];
}

/** What the running-points lines need to know. A context keeps the layer below the same component from one draw to the next, so the slow draw-in plays once. */
const Lines = createContext<{ teams: Map<string, TeamLook>; lit: string | null; draw: boolean; pin: (id: string) => void; hover: (id: string | null) => void } | null>(null);

/**
 * The lines of the running-points chart, drawn by hand so each team keeps its own dashes, your
 * team is thicker with dots, a line can be tapped, and the whole set draws in from the left.
 */
function LinesLayer({ series, lineGenerator, innerWidth, innerHeight }: LineCustomSvgLayerProps<PointsSeries>) {
  const ctx = useContext(Lines);
  const clip = `draw-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!ctx) return null;
  const box = { x: -10, y: -12, height: innerHeight + 24 };
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          {ctx.draw ? (
            <motion.rect {...box} initial={{ width: 0 }} animate={{ width: innerWidth + 20 }} transition={{ duration: DRAW_SECONDS, ease: [0.3, 0, 0.2, 1] }} />
          ) : (
            <rect {...box} width={innerWidth + 20} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {series.map((s) => {
          const id = String(s.id);
          const t = ctx.teams.get(id);
          if (!t) return null;
          const spots = s.data.map((d) => d.position).filter((p): p is { x: number; y: number } => p.y !== null);
          const d = lineGenerator(spots) ?? undefined;
          const on = ctx.lit === id;
          return (
            <g key={id} opacity={ctx.lit && !on ? 0.18 : 1} style={{ transition: 'opacity 260ms ease' }}>
              <path d={d} fill="none" stroke={t.color} strokeWidth={on ? 5 : t.mine ? 4 : 2.25} strokeDasharray={t.style.dash} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke-width 260ms ease' }} />
              {t.mine && spots.map((p) => <circle key={p.x} cx={p.x} cy={p.y} r={on ? 6 : 4.5} fill={t.color} />)}
              {/* A wider, invisible copy of the line so a finger can hit it. */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }} onClick={() => ctx.pin(id)} onMouseEnter={() => ctx.hover(id)} onMouseLeave={() => ctx.hover(null)} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

/**
 * Season race, two views of the same weeks:
 *   1. Running points: each team's total, week by week.
 *   2. Rank by week: where that total put them in the standings (1st at the top).
 * Every team has its own color and line style, listed in the key under the charts. Your own
 * team's line is thicker and has dots. Point at a line or a name and that team lights up in
 * both charts; tap to keep it lit.
 */
export default function SeasonChart({
  byNight, rows, option, myTeamId
}: {
  byNight: NightPoints[];
  rows: SeasonRow[];
  option: 'option1' | 'option2';
  myTeamId?: string;
}) {
  const league = useLeague();
  const { theme, animate, motionConfig, palette, card } = useNivo();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  if (byNight.length < 2) {
    return (
      <Typography variant="body2" color="textSecondary">
        The season charts appear after week 2.
      </Typography>
    );
  }
  const weeks = byNight.map((n) => `Wk ${n.week}`);
  // A team keeps its color and line style all season: they follow the order teams joined the
  // league, never the standings, so a team that climbs does not change color.
  const joined = approvedTeams(league).map((t) => t.teamId);
  const look = (teamId: string) => {
    const index = Math.max(joined.indexOf(teamId), 0);
    return { color: palette[index % palette.length]!, style: LINE_STYLES[Math.floor(index / palette.length) % LINE_STYLES.length]! };
  };

  // One entry per team. Your own line is drawn last so it sits on top.
  const teams = rows
    .map((r) => {
      const id = r.team.teamId;
      let total = 0;
      return {
        id,
        label: r.team.teamName,
        rank: r.rank,
        mine: id === myTeamId,
        ...look(id),
        points: byNight.map((n) => (total += n[option][id] ?? 0)),
        ranks: byNight.map((n) => n.ranks[option][id] ?? null)
      };
    })
    .sort((a, b) => Number(a.mine) - Number(b.mine));

  const lit = hovered ?? pinned;
  const pin = (id: string) => setPinned((now) => (now === id ? null : id));
  const byId = new Map<string, TeamLook>(teams.map((t) => [t.id, t]));
  const nameOf = (id: string) => byId.get(id)?.label ?? '';
  const margin = { top: 14, right: 14, bottom: 30, left: 46 };
  const axisBottom = { tickSize: 0, tickPadding: 8 };
  const places = rows.map((_, i) => i + 1);
  const key = [...teams].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Running points</Typography>
        <Box sx={{ height: 280 }} role="img" aria-label={`Running season points by week. ${key[0]?.label ?? ''} lead.`}>
          <Lines.Provider value={{ teams: byId, lit, draw: animate, pin, hover: setHovered }}>
            <ResponsiveLine<PointsSeries>
              data={teams.map((t) => ({ id: t.id, data: t.points.map((y, i) => ({ x: weeks[i]!, y })) }))}
              theme={theme}
              animate={false}
              margin={margin}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto' }}
              colors={(s) => byId.get(String(s.id))?.color ?? palette[0]!}
              enableGridX={false}
              axisBottom={axisBottom}
              axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5 }}
              // Tap a week and every team's total shows, highest first.
              enableSlices="x"
              sliceTooltip={({ slice }) => (
                <ChartTip>
                  <strong>{String(slice.points[0]?.data.x ?? '')}</strong>
                  {[...slice.points]
                    .sort((a, b) => Number(b.data.y) - Number(a.data.y))
                    .map((p) => (
                      <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.seriesColor, flexShrink: 0 }} />
                        <Box component="span" sx={{ flexGrow: 1, fontWeight: String(p.seriesId) === myTeamId ? 700 : 400 }}>{nameOf(String(p.seriesId))}</Box>
                        <Box component="span" sx={{ pl: 1.5, fontVariantNumeric: 'tabular-nums' }}>{Number(p.data.y).toLocaleString('en-US')}</Box>
                      </Box>
                    ))}
                </ChartTip>
              )}
              layers={['grid', 'axes', 'crosshair', 'slices', LinesLayer]}
            />
          </Lines.Provider>
        </Box>
      </Box>
      <Box>
        <Typography variant="h4">Rank by week</Typography>
        <Box sx={{ height: Math.max(220, Math.min(340, 50 + places.length * 28)), '& path': { cursor: 'pointer' } }} role="img" aria-label={`Each team's place in the standings, week by week. ${key[0]?.label ?? ''} are 1st.`}>
          <ResponsiveBump
            data={teams.map((t) => ({ id: t.id, data: t.ranks.map((y, i) => ({ x: weeks[i]!, y })) }))}
            theme={theme}
            animate={animate}
            motionConfig={motionConfig}
            margin={margin}
            xOuterPadding={0.15}
            yOuterPadding={0.4}
            // A team that is not lit is drawn faint, in both charts at once.
            colors={(s) => {
              const color = byId.get(String(s.id))?.color ?? palette[0]!;
              return lit && lit !== s.id ? fade(color, 0.18) : color;
            }}
            lineWidth={2.5}
            activeLineWidth={5}
            inactiveLineWidth={2.5}
            opacity={1}
            activeOpacity={1}
            inactiveOpacity={0.25}
            startLabel={false}
            endLabel={false}
            enableGridX={false}
            axisTop={null}
            axisRight={null}
            axisBottom={axisBottom}
            axisLeft={{ tickSize: 0, tickPadding: 8, format: (v) => ordinal(Number(v)) }}
            // Dots: filled for a solid-line team, a ring for a dashed one, bigger for your own.
            pointComponent={({ point }) => {
              const t = byId.get(String(point.serie.id));
              if (point.y === null || !t) return null;
              const ring = t.style.dash !== undefined;
              const r = (t.mine ? 6.5 : 4.5) + (point.isActive ? 1.5 : 0);
              return <circle cx={point.x} cy={point.y} r={r} fill={ring ? card : point.color} stroke={point.color} strokeWidth={ring ? 2.5 : 0} style={{ pointerEvents: 'none' }} />;
            }}
            onMouseEnter={(s) => setHovered(String(s.id))}
            onMouseLeave={() => setHovered(null)}
            onClick={(s) => pin(String(s.id))}
            lineTooltip={({ serie }) => {
              const last = [...serie.data.data].reverse().find((d) => d.y !== null);
              return (
                <ChartTip>
                  <strong>{nameOf(String(serie.id))}</strong>
                  {last?.y ? `: ${ordinal(Number(last.y))} now` : ''}
                </ChartTip>
              );
            }}
          />
        </Box>
      </Box>

      {/* The key: every team with its color and line style, in standings order. Tap one to keep it lit. */}
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Teams
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.5 }}>
          {key.map((t) => {
            const on = lit === t.id;
            return (
              <li key={t.id}>
                <ButtonBase
                  onClick={() => pin(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(t.id)}
                  onBlur={() => setHovered(null)}
                  aria-pressed={pinned === t.id}
                  aria-label={`${t.label}, ${ordinal(t.rank)}, ${t.style.name} line${t.mine ? ', your team' : ''}. Highlight in the charts.`}
                  sx={{
                    width: '100%', minHeight: 40, px: 1, gap: 1, justifyContent: 'flex-start', borderRadius: 1, textAlign: 'left',
                    border: 1, borderColor: pinned === t.id ? 'text.primary' : 'transparent',
                    bgcolor: on ? 'action.selected' : 'transparent',
                    opacity: lit && !on ? 0.45 : 1,
                    transition: 'opacity 260ms ease, background-color 260ms ease'
                  }}
                >
                  {/* A short piece of the team's own line: its color and its dashes. */}
                  <svg width="30" height="12" aria-hidden style={{ flexShrink: 0 }}>
                    <line x1="2" y1="6" x2="28" y2="6" stroke={t.color} strokeWidth={t.mine ? 4.5 : 3} strokeLinecap="round" strokeDasharray={t.style.dash} />
                    {t.mine && <circle cx="15" cy="6" r="4.5" fill={t.color} />}
                  </svg>
                  <Typography variant="body2" noWrap sx={{ fontWeight: t.mine ? 700 : 400, minWidth: 0 }}>
                    {t.rank}. {t.label}
                    {t.mine ? ' (you)' : ''}
                  </Typography>
                </ButtonBase>
              </li>
            );
          })}
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Tap a team here, or its line, to keep it lit in both charts. Tap again to let go. In Running points, tap a week to see every team's total. In Rank by week, a ring instead of a dot marks a team with a dashed line.
        </Typography>
      </Box>
    </Stack>
  );
}
