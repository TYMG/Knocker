import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ResponsiveSwarmPlot } from '@nivo/swarmplot';
import { useLeague } from '../../hooks';
import { shortScore, team, weekLabel } from '../../sample/league';
import type { SScore } from '../../sample/types';
import { colors } from '../../theme';
import ScoreDisplay from '../ScoreDisplay';
import ScorePhoto from '../ScorePhoto';
import TeamAvatar, { TeamLink } from '../TeamAvatar';
import { ChartTip, useNivo } from './nivo';

/**
 * Every game on one machine as a dot: weeks across, score up the side. Your own games are coral.
 * Tap a dot to see whose game it was, with the photo.
 */
export default function GameSwarm({ scores, machineName, myId }: { scores: SScore[]; machineName: string; myId?: string }) {
  const league = useLeague();
  const { theme, animate, motionConfig, palette, card } = useNivo();
  const [picked, setPicked] = useState<string | null>(null);
  const games = scores.filter((x) => x.status === 'active');
  if (games.length === 0) return null;
  const weeks = [...new Set(games.map((x) => x.week))].sort((a, b) => a - b);
  const data = games.map((x) => ({ id: x.scoreId, group: `Wk ${x.week}`, value: x.score, mine: x.teamId === myId }));
  const top = Math.max(...games.map((x) => x.score));
  const chosen = games.find((x) => x.scoreId === picked);

  return (
    <Box>
      <Box sx={{ height: 300, '& circle': { cursor: 'pointer' } }} role="img" aria-label={`Every ${machineName} game this season as a dot, by week. ${games.length} games, the highest ${shortScore(top)}.`}>
        <ResponsiveSwarmPlot
          data={data}
          groups={weeks.map((w) => `Wk ${w}`)}
          groupBy="group"
          id="id"
          value="value"
          valueScale={{ type: 'linear', min: 0, max: top * 1.06 }}
          theme={theme}
          animate={animate}
          motionConfig={motionConfig}
          margin={{ top: 12, right: 8, bottom: 32, left: 52 }}
          size={(d) => (d.id === picked ? 16 : 11)}
          spacing={2}
          forceStrength={3}
          simulationIterations={90}
          colors={(d) => (d.data.mine ? colors.coral : palette[0]!)}
          borderWidth={(d) => (d.id === picked ? 3 : 1)}
          borderColor={card}
          enableGridX={false}
          axisTop={null}
          axisRight={null}
          axisBottom={{ tickSize: 0, tickPadding: 8 }}
          axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5, format: (v) => shortScore(Number(v)) }}
          useMesh
          onClick={(d) => setPicked((now) => (now === d.id ? null : d.id))}
          tooltip={(d) => {
            const x = games.find((g) => g.scoreId === d.id);
            return (
              <ChartTip>
                <strong>{x ? team(league, x.teamId).teamName : ''}</strong>: {shortScore(Number(d.value))}
              </ChartTip>
            );
          }}
        />
      </Box>
      {chosen ? (
        <Box data-testid="swarm-picked" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, rowGap: 1, mt: 1, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 160px', minWidth: 0 }}>
            <TeamAvatar team={team(league, chosen.teamId)} mine={chosen.teamId === myId} />
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <TeamLink team={team(league, chosen.teamId)} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {weekLabel(chosen.week)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0 }}>
            <ScoreDisplay value={chosen.score} />
            <ScorePhoto score={chosen} machineName={machineName} teamName={team(league, chosen.teamId).teamName} size={44} />
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Every game is a dot{myId ? ', and yours are coral' : ''}. Tap a dot to see whose game it was, with the photo.
        </Typography>
      )}
    </Box>
  );
}
