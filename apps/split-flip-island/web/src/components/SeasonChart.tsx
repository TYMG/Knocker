import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import type { NightPoints, StandingRow } from '../../../shared/types';
import { colors } from '../theme';

/**
 * Season race: each team's running points total, week by week.
 * Your team is drawn in flipper yellow, the current top 4 in lagoon teal,
 * everyone else in muted grey so the chart stays readable with 10+ teams.
 */
export default function SeasonChart({
  byNight, rows, option, myTeamId
}: {
  byNight: NightPoints[];
  rows: StandingRow[];
  option: 'option1' | 'option2';
  myTeamId?: string;
}) {
  const theme = useTheme();
  if (byNight.length < 2) {
    return (
      <Typography variant="body2" color="text.secondary">
        The season chart appears after week 2.
      </Typography>
    );
  }
  const topFour = new Set(rows.filter((r) => r.rank <= 4).map((r) => r.team.teamId));
  const muted = theme.palette.mode === 'dark' ? 'rgba(231,240,238,0.22)' : 'rgba(19,33,43,0.18)';

  const series = rows
    .map((r) => {
      let total = 0;
      const data = byNight.map((n) => (total += n[option][r.team.teamId] ?? 0));
      const mine = r.team.teamId === myTeamId;
      const color = mine ? colors.flipper : topFour.has(r.team.teamId) ? theme.palette.primary.main : muted;
      return { id: r.team.teamId, label: r.team.teamName, data, color, showMark: mine, curve: 'linear' as const, order: mine ? 2 : topFour.has(r.team.teamId) ? 1 : 0 };
    })
    .sort((a, b) => a.order - b.order); // draw highlighted lines on top

  return (
    <Box>
      <LineChart
        height={280}
        hideLegend
        margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
        xAxis={[{ scaleType: 'point', data: byNight.map((n) => `Wk ${n.week}`) }]}
        yAxis={[{ width: 44 }]}
        series={series.map(({ order: _order, ...s }) => s)}
      />
      <Typography variant="body2" color="text.secondary">
        Running points by week. {myTeamId ? 'Yellow is your team. ' : ''}Teal lines are the current top 4.
      </Typography>
    </Box>
  );
}
