import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { type ScoreSpread } from '../sample/league';
import { formatScore } from '../lib/format';
import { colors } from '../theme';
import { ChartTip, fade, useNivo } from './charts/nivo';

/**
 * Heat map of where scores land on one machine. Score ranges run across the bottom, one row per
 * week runs down the side, and a square is hotter the more games landed in that range that week.
 * The number in the square is the count, so nothing depends on color alone. The bottom row adds
 * every week together and has its own color, because it is not a week.
 */
export default function ScoreSpreadChart({ spread, machineName }: { spread: ScoreSpread; machineName: string }) {
  const { theme, animate, motionConfig, ink } = useNivo();
  const all = spread.rows[spread.rows.length - 1]!;
  const mostAll = Math.max(...all.counts);
  const busiest = spread.bands[all.counts.indexOf(mostAll)]!;
  // Heat is judged within a row, so the "All" row does not wash out the weeks.
  const most = new Map(spread.rows.map((row) => [row.label, Math.max(...row.counts, 1)]));
  const heat = (row: string, games: number | null) => (games ?? 0) / (most.get(row) ?? 1);
  const data = spread.rows.map((row) => ({ id: row.label, data: spread.bands.map((band, i) => ({ x: band.label, y: row.counts[i] ?? 0 })) }));
  const crowded = spread.bands.length > 7;

  return (
    <Box>
      <Box sx={{ height: Math.max(220, 64 + spread.rows.length * 40) }} role="img" aria-label={`Heat map of ${machineName} scores by week. Most games land between ${busiest.label}.`}>
        <ResponsiveHeatMap
          data={data}
          theme={theme}
          animate={animate}
          motionConfig={motionConfig}
          margin={{ top: 4, right: 4, bottom: crowded ? 56 : 40, left: 48 }}
          xInnerPadding={0.08}
          yInnerPadding={0.12}
          borderRadius={4}
          axisTop={null}
          axisLeft={{ tickSize: 0, tickPadding: 8 }}
          // Each column is a range; the label is where the range starts.
          axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: crowded ? -45 : 0, format: (label) => String(label).split(' to ')[0] ?? '' }}
          colors={(cell) => {
            const row = String(cell.serieId);
            if (!cell.value) return fade(colors.sand, 0.08);
            return fade(row === all.label ? colors.coral : colors.dmdAmber, 0.22 + 0.78 * heat(row, cell.value));
          }}
          emptyColor={fade(colors.sand, 0.08)}
          label={(cell) => (cell.value ? String(cell.value) : '')}
          labelTextColor={(cell) => (heat(String(cell.serieId), cell.value) > 0.5 ? colors.black : ink)}
          hoverTarget="cell"
          inactiveOpacity={0.35}
          tooltip={({ cell }) => (
            <ChartTip>
              <strong>{cell.serieId}</strong>: {cell.value ?? 0} {cell.value === 1 ? 'game' : 'games'} between {cell.data.x}
            </ChartTip>
          )}
        />
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Each square is a range of scores, starting at the number under it. The hotter the square, the more games landed there that week. The bottom row adds every week together.
      </Typography>
      <Typography sx={{ mt: 1 }}>
        Average {machineName} score this season: <strong>{formatScore(all.average)}</strong> over {all.games} {all.games === 1 ? 'game' : 'games'}. Most games land between {busiest.label}.
      </Typography>
    </Box>
  );
}
