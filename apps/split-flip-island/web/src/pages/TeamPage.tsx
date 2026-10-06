// A team's public page: where it stands this season, its badges, its best score on each machine
// and how each week went. Reached by tapping a team name anywhere in the app.
// A logged-in team can call the other team out from here.

import { Link as RouterLink, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLeague, useMe } from '../hooks';
import { currentWeek, findTeam, nightStatus, seasonLine, teamSeason, weekLabel } from '../sample/league';
import { ordinal } from '../sample/time';
import EmptyNote from '../ui/EmptyNote';
import Page from '../ui/Page';
import { Row, RowCard, RowText } from '../ui/Rows';
import ScoreDisplay from '../ui/ScoreDisplay';
import ScorePhoto from '../ui/ScorePhoto';
import Section from '../ui/Section';
import Tag from '../ui/Tag';
import TeamAvatar from '../ui/TeamAvatar';
import { smallLabel } from './lineWords';
import { useTopOfPage } from './useTopOfPage';

/** One of the three numbers under the team's name. */
function Tile({ label, value, under }: { label: string; value: string; under?: string }) {
  return (
    <Card sx={{ px: 1, py: 1.5, textAlign: 'center', minWidth: 0 }}>
      <Typography sx={{ ...smallLabel, fontSize: '0.7rem', letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography sx={{ fontFamily: "'Bungee', sans-serif", fontSize: '1.6rem', lineHeight: 1.2, color: 'primary.main' }}>{value}</Typography>
      {/* Kept even when empty so the three tiles stay the same height. */}
      <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: '1.43em' }}>
        {under}
      </Typography>
    </Card>
  );
}

export default function TeamPage() {
  const { teamId } = useParams();
  useTopOfPage(teamId);
  const league = useLeague();
  const me = useMe();
  const team = findTeam(league, teamId);

  if (!team) {
    return (
      <Page title="Team not found" subtitle="There is no team at this address. It may have been removed, or the link is wrong.">
        <Button component={RouterLink} to="/standings" variant="outlined" sx={{ minHeight: 44 }}>
          See the standings
        </Button>
      </Page>
    );
  }

  const line = seasonLine(league, team.teamId);

  // A sign-up nobody has approved yet is not part of the league, so its page shows nothing else.
  if (team.status === 'pending') {
    return (
      <Page title={team.teamName} subtitle={line}>
        <Link component={RouterLink} to="/standings" sx={{ display: 'inline-block', py: 1.25, fontWeight: 700 }}>
          See the standings
        </Link>
      </Page>
    );
  }

  const night = nightStatus(league);
  const isMine = me.isTeam && me.team.teamId === team.teamId;
  const header = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <TeamAvatar team={team} size={88} mine={isMine} />
      <Box component="span" sx={{ minWidth: 0 }}>
        {team.teamName}
      </Box>
    </Box>
  );
  const subtitle = (
    <Box component="span" sx={{ display: 'block', mt: 1 }}>
      {line}
    </Box>
  );

  // Approved partway through the season: the team counts from the week after it was approved.
  if (team.firstWeek > currentWeek(league).week) {
    return (
      <Page title={header} subtitle={subtitle}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          {isMine && <Tag tone="good">This is your team</Tag>}
          <Typography>
            {team.teamName} plays its first league night in week {team.firstWeek}. Scores, badges and week by week results show up here after that.
          </Typography>
          <Link component={RouterLink} to="/standings" sx={{ py: 1.25, fontWeight: 700 }}>
            See the standings
          </Link>
        </Stack>
      </Page>
    );
  }

  const stats = teamSeason(league, team.teamId);
  // Calling out is one approved team to another, and only while a night is open.
  const canCallOut = me.isTeam && !isMine && me.team.status === 'approved';
  const bestWeekOpen = stats.weeks.find((w) => w.week === stats.bestNight?.week)?.open;

  return (
    <Page title={header} subtitle={subtitle}>
      <Stack spacing={4}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          {isMine && <Tag tone="good">This is your team</Tag>}
          {canCallOut &&
            (night.open ? (
              <>
                <Button component={RouterLink} to={`/call-outs?team=${team.teamId}`} variant="contained" color="secondary" size="large" fullWidth>
                  Call them out
                </Button>
                {!league.checkIns[team.teamId] && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: '8px !important' }}>
                    {team.teamName} has not checked in tonight, so they may not answer.
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                League night is closed. You can call them out when the next night opens.
              </Typography>
            ))}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, width: '100%' }}>
            <Tile label="Games played" value={String(stats.games)} />
            <Tile
              label="Best night"
              value={stats.bestNight ? ordinal(stats.bestNight.rank) : 'None'}
              under={stats.bestNight ? `week ${stats.bestNight.week}${bestWeekOpen ? ', so far' : ''}` : 'yet'}
            />
            <Tile label="Machine wins" value={String(stats.machineWins)} />
          </Box>
        </Stack>

        <Section title="Badges">
          {stats.badges.length === 0 ? (
            <EmptyNote>No badges yet.</EmptyNote>
          ) : (
            <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, m: 0, p: 0, listStyle: 'none' }}>
              {stats.badges.map((badge) => (
                // A long badge wraps inside its tag instead of pushing the page sideways.
                <Box component="li" key={badge} sx={{ maxWidth: '100%', '& > span': { whiteSpace: 'normal' } }}>
                  <Tag tone="good">{badge}</Tag>
                </Box>
              ))}
            </Box>
          )}
        </Section>

        <Section title="Best score on each machine">
          {stats.bests.length === 0 ? (
            <EmptyNote>No scores yet.</EmptyNote>
          ) : (
            <RowCard>
              {stats.bests.map((b) => (
                <Row key={b.machine.machineId}>
                  <RowText
                    primary={
                      <Link component={RouterLink} to={`/machines/${b.machine.machineId}`} color="inherit">
                        {b.machine.name}
                      </Link>
                    }
                    secondary={weekLabel(b.week)}
                  />
                  <ScoreDisplay value={b.score.score} size="sm" />
                  <ScorePhoto score={b.score} machineName={b.machine.name} teamName={team.teamName} size={44} />
                </Row>
              ))}
            </RowCard>
          )}
        </Section>

        <Section title="Week by week">
          {stats.weeks.length === 0 ? (
            <EmptyNote>No league nights yet.</EmptyNote>
          ) : (
            <RowCard>
              {stats.weeks.map((w) => (
                <Row key={w.week} sx={{ minHeight: 48 }}>
                  <Typography sx={{ width: 48, flexShrink: 0, color: 'text.secondary', fontWeight: 700 }}>Wk {w.week}</Typography>
                  <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {w.played ? (
                      <Typography sx={{ fontWeight: 700 }}>{ordinal(w.rank)}</Typography>
                    ) : (
                      <Typography sx={{ color: 'text.secondary' }}>{w.open ? 'No games yet' : 'Did not play'}</Typography>
                    )}
                    {w.open && <Tag tone="live">So far</Tag>}
                  </Box>
                  <Typography sx={{ flexShrink: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums', ...(!w.played && { color: 'text.secondary' }) }}>
                    {w.points} {w.points === 1 ? 'pt' : 'pts'}
                  </Typography>
                </Row>
              ))}
            </RowCard>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
