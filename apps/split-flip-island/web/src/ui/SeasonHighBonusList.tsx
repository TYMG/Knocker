import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useLeague } from '../hooks';
import { SEASON_HIGH_BONUS, seasonHighBonuses, seasonOver } from '../sample/league';
import EmptyNote from './EmptyNote';
import MachineArt from './MachineArt';
import { Row, RowCard } from './Rows';
import ScoreDisplay from './ScoreDisplay';
import Section from './Section';
import Tag from './Tag';
import TeamAvatar, { TeamLink } from './TeamAvatar';

/**
 * The season-high bonus: whoever holds the highest score on a machine when the season ends gets
 * 10 extra points. During the season this shows who holds each one right now, so teams have a
 * reason to keep an eye on every machine, not just this week's standings.
 */
export default function SeasonHighBonusList({ myTeamId }: { myTeamId?: string }) {
  const league = useLeague();
  const bonuses = seasonHighBonuses(league);
  const over = seasonOver(league);
  return (
    <Section title="Season high bonus" aside={`${SEASON_HIGH_BONUS} points each`}>
      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
        {over
          ? `The season is over. Each team below earned ${SEASON_HIGH_BONUS} extra points for holding the highest score of the season on a machine. They are in the totals above.`
          : `Hold the highest score of the season on a machine when the last league night ends and your team gets ${SEASON_HIGH_BONUS} extra points. These are the scores to beat.`}
      </Typography>
      {bonuses.length === 0 ? (
        <EmptyNote>No scores yet this season.</EmptyNote>
      ) : (
        <RowCard>
          {bonuses.map((b) => (
            <Row key={b.machine.machineId} mine={b.team.teamId === myTeamId} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 180px', minWidth: 0 }}>
                <MachineArt machine={b.machine} size={40} />
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Link component={RouterLink} to={`/machines/${b.machine.machineId}`} color="inherit" sx={{ fontWeight: 700 }}>
                    {b.machine.name}
                  </Link>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <TeamAvatar team={b.team} size={20} mine={b.team.teamId === myTeamId} />
                    <TeamLink team={b.team} />
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', flexShrink: 0 }}>
                <ScoreDisplay value={b.score.score} size="sm" />
                <Tag tone={over ? 'live' : 'good'}>
                  {over ? `+${SEASON_HIGH_BONUS}` : `+${SEASON_HIGH_BONUS} if it holds`}
                </Tag>
              </Box>
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
  );
}
