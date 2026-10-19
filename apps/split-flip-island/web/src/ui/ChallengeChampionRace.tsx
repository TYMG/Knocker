import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useLeague } from '../hooks';
import { CHALLENGE_CHAMPION_BONUS, challengeChampions, challengeRace, seasonOver } from '../sample/league';
import EmptyNote from './EmptyNote';
import { Row, RowCard, RowText } from './Rows';
import Section from './Section';
import Tag from './Tag';
import TeamAvatar, { TeamLink } from './TeamAvatar';

/**
 * The quest for Challenge Champion: the team with the most challenge wins when the season ends
 * gets 10 extra points. During the season this shows the race, so there is a reason to keep
 * challenging. `limit` shortens the list; your own team always shows.
 */
export default function ChallengeChampionRace({ myTeamId, limit = 5 }: { myTeamId?: string; limit?: number }) {
  const league = useLeague();
  const race = challengeRace(league);
  const leaders = new Set(challengeChampions(league).map((r) => r.team.teamId));
  const over = seasonOver(league);
  const shown = race.filter((r, i) => i < limit || r.team.teamId === myTeamId);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <Box data-testid="challenge-race">
    <Section title="Quest for Challenge Champion" aside={`${CHALLENGE_CHAMPION_BONUS} points`}>
      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
        {over
          ? `The season is over. The Challenge Champion earned ${CHALLENGE_CHAMPION_BONUS} extra points for winning the most challenges. They are in the season totals.`
          : `Win the most challenges this season and your team gets ${CHALLENGE_CHAMPION_BONUS} extra points when the last league night ends. If teams are level on wins, the one that won the most points takes it.`}
      </Typography>
      {race.length === 0 ? (
        <EmptyNote>Nobody has won a challenge yet. The first win takes the lead.</EmptyNote>
      ) : (
        <RowCard>
          {/* Leaders first. */}
          {shown.map((r) => (
            <Row key={r.team.teamId} mine={r.team.teamId === myTeamId}>
              <Typography sx={{ width: 22, flexShrink: 0, fontWeight: 700, color: 'text.secondary' }}>{race.indexOf(r) + 1}</Typography>
              <TeamAvatar team={r.team} mine={r.team.teamId === myTeamId} />
              <RowText primary={<TeamLink team={r.team} />} secondary={`${plural(r.wins, 'win', 'wins')}, ${plural(r.losses, 'loss', 'losses')}, ${plural(r.pointsWon, 'point', 'points')} won`} />
              {leaders.has(r.team.teamId) && (
                <Box sx={{ flexShrink: 0 }}>
                  <Tag tone={over ? 'live' : 'good'}>{over ? `+${CHALLENGE_CHAMPION_BONUS}` : `+${CHALLENGE_CHAMPION_BONUS} if it holds`}</Tag>
                </Box>
              )}
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
    </Box>
  );
}
