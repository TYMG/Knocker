import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import type { NightPoints, SeasonRow } from '../sample/league';
import { ordinal } from '../sample/time';
import { colors } from '../theme';
import { chartMotion } from './chartMotion';


/**
 * Season race, two views of the same weeks:
 *   1. Running points: each team's total, week by week.
 *   2. Rank by week: where that total put them in the standings (1st at the top).
 * Your team is drawn in the highlight color, the current top 4 in the lead color,
 * everyone else muted so the charts stay readable with 10+ teams.
 */
export default function SeasonChart({
  byNight, rows, option, myTeamId
}: {
  byNight: NightPoints[];
  rows: SeasonRow[];
  option: 'option1' | 'option2';
  myTeamId?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  // The theme uses CSS variables, so ask for the active scheme rather than reading theme.palette.
  const { mode, systemMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) === 'dark';
  if (byNight.length < 2) {
    return (
      <Typography variant="body2" color="textSecondary">
        The season charts appear after week 2.
      </Typography>
    );
  }
  const topFour = new Set(rows.filter((r) => r.rank <= 4).map((r) => r.team.teamId));
  const lead = dark ? { color: colors.lime, name: 'Lime' } : { color: colors.black, name: 'Black' };
  const mineLine = { color: colors.coral, name: 'Coral' };
  const muted = dark ? 'rgba(164,154,135,0.45)' : 'rgba(0,0,0,0.18)';
  const weeks = byNight.map((n) => `Wk ${n.week}`);
  // A team that joined mid-season has no rank before its first week.

  // One entry per team, highlighted lines last so they draw on top.
  const teams = rows
    .map((r) => {
      const id = r.team.teamId;
      const mine = id === myTeamId;
      const top = topFour.has(id);
      let total = 0;
      return {
        id,
        label: r.team.teamName,
        color: mine ? mineLine.color : top ? lead.color : muted,
        showMark: mine,
        order: mine ? 2 : top ? 1 : 0,
        points: byNight.map((n) => (total += n[option][id] ?? 0)),
        ranks: byNight.map((n) => n.ranks[option][id] ?? null)
      };
    })
    .sort((a, b) => a.order - b.order);

  // Point at a team's line and it thickens while the others fade, in both charts at once.
  // Tap a line to keep it lit; tap it again to let go.
  const line = (t: (typeof teams)[number]) => ({
    id: t.id, label: t.label, color: t.color, showMark: t.showMark, curve: 'linear' as const,
    highlightScope: { highlight: 'series' as const, fade: 'global' as const }
  });
  const lit = hovered ?? pinned;
  const highlight = {
    sx: chartMotion,
    highlightedItem: lit ? { seriesId: lit } : null,
    onHighlightChange: (item: { seriesId?: string | number } | null) => setHovered(item?.seriesId === undefined ? null : String(item.seriesId)),
    onLineClick: (_: unknown, item: { seriesId: string | number }) => setPinned((now) => (now === String(item.seriesId) ? null : String(item.seriesId))),
    onMarkClick: (_: unknown, item: { seriesId: string | number }) => setPinned((now) => (now === String(item.seriesId) ? null : String(item.seriesId)))
  };
  const places = rows.map((_, i) => i + 1);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Running points</Typography>
        <LineChart
          height={280}
          hideLegend
          {...highlight}
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
          hideLegend
          {...highlight}
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
      <Typography variant="body2" color="textSecondary">
        {myTeamId ? `${mineLine.name} is your team. ` : ''}{lead.name} lines are the current top 4. Tap a week to see every team, or tap a line to keep that team lit.
      </Typography>
    </Stack>
  );
}
