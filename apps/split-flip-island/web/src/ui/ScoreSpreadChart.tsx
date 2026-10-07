import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import { shortScore, type ScoreSpread } from '../sample/league';
import { formatScore } from '../lib/format';
import { colors } from '../theme';
import { chartMotion } from './chartMotion';

// One color per week, in a fixed order so week 3 is the same color on every machine. These eight
// were checked for color-blind readers on each background; the row labels carry the week too,
// so nothing depends on color alone. The "All" row is neutral because it is not a week.
const WEEK_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
};

/**
 * Bubble chart of where scores land on one machine. Score ranges run across the bottom, one row
 * per week runs down the side, and a bubble's size is how many games landed in that range that
 * week. The bottom row adds every week together.
 */
export default function ScoreSpreadChart({ spread, machineName }: { spread: ScoreSpread; machineName: string }) {
  const { mode, systemMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) === 'dark';
  const palette = dark ? WEEK_COLORS.dark : WEEK_COLORS.light;
  const all = spread.rows[spread.rows.length - 1]!;
  const mostAll = Math.max(...all.counts);
  const busiest = spread.bands[all.counts.indexOf(mostAll)]!;
  const rowCount = spread.rows.length;

  return (
    <Box>
      <ScatterChart
        height={Math.max(220, 70 + rowCount * 44)}
        hideLegend
        sx={chartMotion}
        margin={{ left: 4, right: 20, top: 12, bottom: 4 }}
        xAxis={[{ min: 0, max: spread.bands.length * spread.step, tickNumber: Math.min(spread.bands.length, 6), valueFormatter: (v: number) => shortScore(v), label: 'Score' }]}
        yAxis={[{
          width: 40,
          min: -0.6,
          max: rowCount - 0.4,
          reverse: true, // week 1 at the top, "All" at the bottom
          tickInterval: spread.rows.map((_, i) => i),
          valueFormatter: (v: number) => spread.rows[v]?.label ?? '',
          disableLine: true,
          disableTicks: true
        }]}
        // Bubble area, not width, follows the count, so a range with twice the games looks twice as big.
        zAxis={[{ id: 'games', sizeMap: { type: 'continuous', min: 1, max: Math.max(mostAll, 2), size: [5, 20] } }]}
        series={spread.rows.map((row, i) => ({
          id: String(row.week),
          label: row.week === 'all' ? 'All weeks' : `Week ${row.week}`,
          color: row.week === 'all' ? colors.sand : palette[(row.week - 1) % palette.length]!,
          sizeAxisId: 'games',
          // Point at a bubble and it grows while the others fade.
          highlightScope: { highlight: 'item' as const, fade: 'global' as const },
          data: row.counts
            .map((games, b) => ({ x: (b + 0.5) * spread.step, y: i, sizeValue: games, id: `${row.week}-${b}` }))
            .filter((point) => point.sizeValue > 0),
          valueFormatter: (point: { x: number; sizeValue?: number } | null) => {
            if (!point) return '';
            const band = spread.bands[Math.floor(point.x / spread.step)];
            const games = point.sizeValue ?? 0;
            return `${games} ${games === 1 ? 'game' : 'games'} between ${band?.label ?? ''}`;
          }
        }))}
      />
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Each bubble is a range of scores. The bigger the bubble, the more games landed there that week. The bottom row adds every week together.
      </Typography>
      <Typography sx={{ mt: 1 }}>
        Average {machineName} score this season: <strong>{formatScore(all.average)}</strong> over {all.games} {all.games === 1 ? 'game' : 'games'}. Most games land between {busiest.label}.
      </Typography>
    </Box>
  );
}
