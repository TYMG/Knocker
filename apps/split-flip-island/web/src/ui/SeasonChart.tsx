import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LineChart } from '@mui/x-charts/LineChart';
import { useLeague } from '../hooks';
import { approvedTeams, type NightPoints, type SeasonRow } from '../sample/league';
import { ordinal } from '../sample/time';
import { LINE_STYLES, useSeriesColors } from './chartColors';
import { chartMotion } from './chartMotion';

/** How long the lines take to draw themselves in when the chart appears. Slow enough to watch the season unfold. */
const DRAW_MS = 3000;

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
  const { palette } = useSeriesColors();
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

  const line = (t: (typeof teams)[number]) => ({
    id: t.id, label: t.label, color: t.color, showMark: t.mine, curve: 'linear' as const,
    highlightScope: { highlight: 'series' as const, fade: 'global' as const }
  });
  const lit = hovered ?? pinned;
  const pin = (id: string) => setPinned((now) => (now === id ? null : id));
  const shared = {
    hideLegend: true, // the key below serves both charts
    highlightedItem: lit ? { seriesId: lit } : null,
    onHighlightChange: (item: { seriesId?: string | number } | null) => setHovered(item?.seriesId === undefined ? null : String(item.seriesId)),
    onLineClick: (_: unknown, item: { seriesId: string | number }) => pin(String(item.seriesId)),
    onMarkClick: (_: unknown, item: { seriesId: string | number }) => pin(String(item.seriesId)),
    sx: {
      ...chartMotion,
      // The lines draw in slowly, left to right, so the season plays out in front of you.
      '& .MuiAppearingMask-animate': { animationDuration: `${DRAW_MS}ms`, animationTimingFunction: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      '& .MuiLineChart-line': { strokeWidth: 2.25, strokeLinecap: 'round' as const },
      // Dashes and the thicker line for your own team are set per line.
      ...Object.fromEntries(
        teams.map((t) => [`& .MuiLineChart-line[data-series="${t.id}"]`, { strokeDasharray: t.style.dash ?? 'none', ...(t.mine && { strokeWidth: 4 }) }])
      )
    }
  };
  const places = rows.map((_, i) => i + 1);
  const key = [...teams].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Running points</Typography>
        <LineChart
          height={280}
          {...shared}
          margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
          xAxis={[{ scaleType: 'point', data: weeks }]}
          yAxis={[{ width: 44 }]}
          series={teams.map((t) => ({ ...line(t), data: t.points, valueFormatter: (v: number | null) => (v === null ? '' : `${v.toLocaleString('en-US')} pts`) }))}
        />
      </Box>
      <Box>
        <Typography variant="h4">Rank by week</Typography>
        <LineChart
          height={Math.max(200, Math.min(320, 36 + places.length * 26))}
          {...shared}
          margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
          xAxis={[{ scaleType: 'point', data: weeks }]}
          yAxis={[{
            width: 44,
            reverse: true, // 1st place at the top
            min: 1,
            max: Math.max(places.length, 2),
            domainLimit: 'strict',
            tickInterval: places,
            valueFormatter: (v: number) => ordinal(v)
          }]}
          series={teams.map((t) => ({ ...line(t), data: t.ranks, valueFormatter: (v: number | null) => (v === null ? '' : ordinal(v)) }))}
        />
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
          Tap a team here, or its line, to keep it lit in both charts. Tap again to let go. Tap a week to see every team's number.
        </Typography>
      </Box>
    </Stack>
  );
}
