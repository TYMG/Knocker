import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { useLeague } from '../../hooks';
import { type SeasonRow } from '../../sample/league';
import { machineHistory } from '../../sample/loveDr';
import { colors } from '../../theme';
import { ChartTip, fade, useNivo } from './nivo';

/**
 * Capture the flag: teams down the side in standings order, machines across the top. A square
 * counts the nights that team finished 1st on that machine, and is hotter the more there are.
 */
export default function FlagMap({ rows }: { rows: SeasonRow[] }) {
  const league = useLeague();
  const { theme, animate, motionConfig, ink } = useNivo();
  const data = rows.map((r) => ({
    id: r.team.teamName,
    data: machineHistory(league, r.team.teamId).map((h) => ({ x: h.machine.name, y: h.nights.filter((n) => n.rank === 1).length }))
  }));
  const most = Math.max(1, ...data.flatMap((row) => row.data.map((d) => d.y)));
  if (data.length === 0 || data[0]!.data.length === 0) return null;
  const longest = Math.max(...rows.map((r) => r.team.teamName.length));

  return (
    <Box>
      <Box sx={{ height: 84 + rows.length * 34 }} role="img" aria-label="Heat map of how many nights each team finished 1st on each machine.">
        <ResponsiveHeatMap
          data={data}
          theme={theme}
          animate={animate}
          motionConfig={motionConfig}
          margin={{ top: 72, right: 36, bottom: 4, left: Math.min(150, 16 + longest * 7) }}
          xInnerPadding={0.08}
          yInnerPadding={0.12}
          borderRadius={4}
          axisTop={{ tickSize: 0, tickPadding: 8, tickRotation: -40 }}
          axisLeft={{ tickSize: 0, tickPadding: 8 }}
          colors={(cell) => (cell.value ? fade(colors.coral, 0.25 + 0.75 * (cell.value / most)) : fade(colors.sand, 0.08))}
          emptyColor={fade(colors.sand, 0.08)}
          label={(cell) => (cell.value ? String(cell.value) : '')}
          labelTextColor={(cell) => ((cell.value ?? 0) / most > 0.5 ? colors.black : ink)}
          hoverTarget="rowColumn"
          inactiveOpacity={0.35}
          tooltip={({ cell }) => (
            <ChartTip>
              <strong>{cell.serieId}</strong> on {cell.data.x}: 1st on {cell.value ?? 0} {cell.value === 1 ? 'night' : 'nights'}
            </ChartTip>
          )}
        />
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        The number is how many nights that team finished 1st on that machine, counting tonight so far. The hotter the square, the more that machine is theirs.
      </Typography>
    </Box>
  );
}
