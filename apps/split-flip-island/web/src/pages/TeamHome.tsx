// Team home, at "/" for a logged-in team. This is the page the phone sits on all night:
// where you stand, how long is left, your place in line, what is left to play, what you have
// played, and what just happened to you. Submit a score is the one big button.
//
// What a team sees depends on where it is in its life:
//   - waiting for approval: its photo, its name and the waiting notice, nothing else;
//   - approved but starting in a later week: when it starts;
//   - league night open: everything;
//   - league night closed: how the week ended, with the line and submit parts hidden.

import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { useLeague, useMe } from '../hooks';
import { WaitingForApproval } from '../layout/guards';
import { callOuts, lineCount, lineFor, linesView, nightStatus, placeInLine, teamTonight, weekLabel, weekOf } from '../sample/league';
import { ago, clock, clockLabel, longDate, ordinal } from '../sample/time';
import type { STeam } from '../sample/types';
import ActionCard from '../ui/ActionCard';
import EmptyNote from '../ui/EmptyNote';
import MachineArt from '../ui/MachineArt';
import Page from '../ui/Page';
import { Row, RowCard, RowText } from '../ui/Rows';
import ScoreDisplay from '../ui/ScoreDisplay';
import Section from '../ui/Section';
import Tag from '../ui/Tag';
import TeamAvatar from '../ui/TeamAvatar';

const pointsText = (points: number) => `${points} ${points === 1 ? 'point' : 'points'}`;
const gamesText = (games: number) => `${games} ${games === 1 ? 'game' : 'games'}`;

/** The top of the page: the team's photo with its coral ring, its name, and a few lines under it. */
function Header({ team, children }: { team: STeam; children?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <TeamAvatar team={team} size={88} mine />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {team.teamName}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}

export default function TeamHome() {
  const league = useLeague();
  const { team } = useMe();
  const night = nightStatus(league);
  const week = night.week;
  const weekLine = `${weekLabel(week.week)}, ${longDate(week.date)}`;

  // 1. A new team that no admin has approved yet.
  if (team.status === 'pending') {
    return (
      <Page>
        <Stack spacing={2.5}>
          <Header team={team} />
          <WaitingForApproval />
        </Stack>
      </Page>
    );
  }

  // 2. Approved part-way through the season: the team counts from a later week.
  if (team.firstWeek > week.week) {
    const first = weekOf(league, team.firstWeek);
    // Week 9 is finals night, which a brand new team does not play in.
    const starts = first && first.week <= 8;
    return (
      <Page>
        <Stack spacing={2.5}>
          <Header team={team}>
            <Typography sx={{ color: 'text.secondary' }}>{starts ? `Starts in week ${first.week}` : 'Approved'}</Typography>
          </Header>
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700 }}>You are in.</Typography>
            {starts
              ? `Your first league night is week ${first.week}, ${longDate(first.date)}. Scores open at ${clockLabel(league.night.opensAt)}. Until then you can follow the standings.`
              : 'This season has no league nights left for a new team. Ask the league admin about the next one.'}
          </Alert>
          <Button component={RouterLink} to="/standings" variant="outlined" size="large">
            See the standings
          </Button>
        </Stack>
      </Page>
    );
  }

  const tonight = teamTonight(league, team.teamId, week.week);
  const row = tonight.row;
  const place = row ? `${ordinal(row.rank)} of ${tonight.teamCount}` : undefined;
  const waitingOnMe = callOuts(league, team.teamId).waitingOnMe.length;
  // Newest first. Dates in the sample are all written the same way, so comparing the text is enough.
  const feed = league.feed.filter((f) => f.teamId === team.teamId).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const myLine = lineFor(league, team.teamId);
  const lines = linesView(league);

  const played = (
    <Section title={night.open ? 'Played tonight' : `Played in week ${week.week}`}>
      {tonight.played.length === 0 ? (
        <EmptyNote>{night.open ? 'No scores yet tonight.' : 'No scores that week.'}</EmptyNote>
      ) : (
        <RowCard>
          {tonight.played.map((p) => (
            <Row key={p.machine.machineId} to={`/machines/${p.machine.machineId}`} sx={{ alignItems: 'flex-start' }}>
              <MachineArt machine={p.machine} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                  <Typography noWrap sx={{ fontWeight: 700 }}>
                    {p.machine.name}
                  </Typography>
                  <ScoreDisplay size="sm" value={p.best.score} label={`Best score ${p.best.score.toLocaleString('en-US')}`} />
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {gamesText(p.games)}
                  {p.best.check === 'checked' ? ', checked by the league' : ''}
                </Typography>
                <Typography sx={{ color: 'text.secondary' }} variant="body2">
                  {ordinal(p.rank)} on this machine, {pointsText(p.points)}
                </Typography>
              </Box>
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
  );

  const justHappened = (
    <Section title="Just happened">
      {feed.length === 0 ? (
        <EmptyNote>{night.open ? 'Nothing yet tonight.' : 'Nothing to report.'}</EmptyNote>
      ) : (
        <RowCard>
          {feed.map((item, i) => (
            // An item with somewhere to go is one big link, so the whole row is the tap target.
            // The line between rows is drawn here: Row only draws it between two rows of the same
            // kind, and this list mixes rows that are links with rows that are not.
            <Row key={item.id} to={item.to} sx={i > 0 ? { borderTop: 1, borderColor: 'divider' } : undefined}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{item.text}</Typography>
                <Typography sx={{ color: 'text.secondary' }} variant="body2">
                  {ago(item.at, league.now)}
                  {item.to && (
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'underline', ml: 1 }}>
                      {item.linkLabel ?? 'Open'}
                    </Box>
                  )}
                </Typography>
              </Box>
              {item.to && <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />}
            </Row>
          ))}
        </RowCard>
      )}
    </Section>
  );

  const callOutsRow = (
    <ActionCard
      to="/call-outs"
      icon={<CampaignIcon />}
      title="Call-outs"
      alert={waitingOnMe > 0}
      note={waitingOnMe > 0 ? `${waitingOnMe} waiting on you` : 'Nobody is waiting on you'}
    />
  );

  // 4. League night is closed: how the week ended. No lines, no submitting.
  if (!night.open) {
    const next = weekOf(league, week.week + 1);
    const posted = (row?.games ?? 0) > 0;
    return (
      <Page>
        <Stack spacing={3}>
          <Header team={team}>
            <Typography sx={{ color: 'text.secondary' }}>{weekLine}</Typography>
          </Header>
          <Card sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {weekLabel(week.week)} is closed. Scores open at {clockLabel(league.night.opensAt)} on league night.
            </Typography>
            <Typography sx={{ mt: 1 }}>
              {row && posted ? (
                <>
                  You finished{' '}
                  <Box component="strong" sx={{ color: 'primary.main' }}>
                    {place}
                  </Box>{' '}
                  with {pointsText(row.points)}.
                </>
              ) : (
                'You did not post a score that week.'
              )}
            </Typography>
            {next && (
              <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
                Next up: {next.week >= 9 ? 'finals night' : `week ${next.week}`}, {longDate(next.date)}.
              </Typography>
            )}
            <Button component={RouterLink} to="/standings" variant="contained" color="secondary" size="large" fullWidth sx={{ mt: 2 }}>
              See the standings
            </Button>
          </Card>
          {played}
          {justHappened}
          {callOutsRow}
        </Stack>
      </Page>
    );
  }

  // 3. League night is open.
  const minutes = night.minutesLeft;
  const lineTitle = !myLine
    ? 'You are not in a line'
    : myLine.position === 1
      ? `You are up on ${myLine.machine.name}`
      : myLine.position === 2
        ? `You are next for ${myLine.machine.name}`
        : `You are ${placeInLine(myLine.position)} for ${myLine.machine.name}`;

  return (
    <Page>
      <Stack spacing={3}>
        <Header team={team}>
          <Typography sx={{ color: 'text.secondary' }}>{weekLine}</Typography>
          <Typography
            variant="body2"
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5, fontWeight: 700, color: tonight.checkedInAt ? 'primary.main' : 'secondary.main', '& svg': { fontSize: '1.1rem', mt: '1px', flexShrink: 0 } }}
          >
            {tonight.checkedInAt ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
            {tonight.checkedInAt ? `Checked in at ${clock(tonight.checkedInAt)}` : 'Not checked in yet. Find the league admin when you arrive.'}
          </Typography>
        </Header>

        <Card sx={{ p: 2 }}>
          <Typography component="p" sx={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>
            Tonight so far:{' '}
            <Box component="span" sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>
              {row ? `${place}, ${pointsText(row.points)}` : 'no points yet'}
            </Box>
          </Typography>
          <Typography sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <TimerOutlinedIcon fontSize="small" />
            {minutes > 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left` : 'Time is up. The league admin will close the night.'}
          </Typography>
        </Card>

        <ActionCard
          to="/lines"
          icon={<GroupsIcon />}
          title={lineTitle}
          // Coral when it is your turn: someone is waiting behind you.
          alert={myLine?.position === 1}
          note={myLine ? 'See every line or switch machines' : 'Sign up for a machine'}
        />

        <Button component={RouterLink} to="/submit" variant="contained" color="secondary" size="large" startIcon={<AddAPhotoIcon />} sx={{ minHeight: 60, fontSize: '1.15rem' }}>
          Submit a score
        </Button>

        <Section title={`Still to play tonight (${tonight.toPlay.length})`}>
          {tonight.toPlay.length === 0 ? (
            <EmptyNote>Every machine played. Go again to beat your best.</EmptyNote>
          ) : (
            <RowCard>
              {tonight.toPlay.map((m) => {
                const line = lines.find((l) => l.machine.machineId === m.machineId);
                const inThisLine = myLine?.machine.machineId === m.machineId;
                return (
                  // Two things to tap in one row: the machine (opens its page) and the line link.
                  // A link cannot sit inside another link, so the row itself is not one.
                  <Row key={m.machineId} sx={{ px: 0, py: 0, gap: 0 }}>
                    <ButtonBase component={RouterLink} to={`/machines/${m.machineId}`} sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, pl: 2, pr: 1, py: 1.25, minHeight: 64 }}>
                      <MachineArt machine={m} />
                      <RowText primary={m.name} secondary={lineCount(line?.teams.length ?? 0)} />
                    </ButtonBase>
                    <Box sx={{ pr: 1.5, flexShrink: 0 }}>
                      {inThisLine && myLine ? (
                        <Tag tone="good">{placeInLine(myLine.position)}</Tag>
                      ) : (
                        <Button component={RouterLink} to={`/lines/join/${m.machineId}`} variant="outlined" sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>
                          {myLine ? 'Switch line' : 'Sign up'}
                        </Button>
                      )}
                    </Box>
                  </Row>
                );
              })}
            </RowCard>
          )}
        </Section>

        {played}
        {justHappened}
        {callOutsRow}
      </Stack>
    </Page>
  );
}
