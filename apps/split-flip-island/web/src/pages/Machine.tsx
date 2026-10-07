// One machine. Teams reach this page by scanning the code stuck to the machine; anyone with the
// link can read it. From here a team submits a score in one tap and joins or leaves the line.
// Everyone sees the line, tonight's board for this machine and its season high score.

import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { findMachine, lineFor, linesView, machineBoard, nightStatus, placeInLine, scoreList, scoreSpread, seasonHigh, team, weekLabel, weekOf } from '../sample/league';
import { clock } from '../sample/time';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import EmptyNote from '../ui/EmptyNote';
import MachineArt from '../ui/MachineArt';
import Page from '../ui/Page';
import { Row, RowCard } from '../ui/Rows';
import ScoreDisplay from '../ui/ScoreDisplay';
import ScorePhoto from '../ui/ScorePhoto';
import ScoreSpreadChart from '../ui/ScoreSpreadChart';
import Tag from '../ui/Tag';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Section from '../ui/Section';
import TeamAvatar, { TeamLink } from '../ui/TeamAvatar';
import { smallLabel, spotLabel } from './lineWords';
import { useTopOfPage } from './useTopOfPage';

/**
 * Every game posted on this machine, a week at a time, newest first. The board above shows only
 * each team's best; this is the whole record, including second tries and voided scores.
 */
function EveryScore({ machineName, weeks, startWeek, myId }: { machineName: string; weeks: number[]; startWeek: number | undefined; myId: string | undefined }) {
  const league = useLeague();
  const { machineId } = useParams();
  const [chosen, setChosen] = useState(startWeek);
  if (chosen === undefined || !machineId) {
    return (
      <Section title="Every score">
        <EmptyNote>No scores on {machineName} yet.</EmptyNote>
      </Section>
    );
  }
  const scores = scoreList(league, { machineId, week: chosen });
  const outThatWeek = !!weekOf(league, chosen)?.out[machineId];
  return (
    <Section title="Every score" aside={`${scores.length} in ${weekLabel(chosen).toLowerCase()}`}>
      <ToggleButtonGroup exclusive size="small" value={chosen} onChange={(_, next: number | null) => next && setChosen(next)} aria-label="Week to show" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        {weeks.map((w) => (
          <ToggleButton key={w} value={w} sx={{ px: 1.5, minHeight: 40, textTransform: 'none', fontWeight: 700 }}>
            Wk {w}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {outThatWeek && (
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
          {machineName} was out in {weekLabel(chosen).toLowerCase()}, so these did not count.
        </Typography>
      )}
      <RowCard>
        {scores.map((x) => {
          const t = team(league, x.teamId);
          const voided = x.status === 'voided';
          return (
            <Row key={x.scoreId} mine={x.teamId === myId} dim={voided} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 170px', minWidth: 0 }}>
                <TeamAvatar team={t} mine={x.teamId === myId} />
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <TeamLink team={t} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {clock(x.at)} {voided && <Tag tone="bad">Voided</Tag>}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0, ...(voided && { textDecoration: 'line-through' }) }}>
                <ScoreDisplay value={x.score} size="sm" />
                <ScorePhoto score={x} machineName={machineName} teamName={t.teamName} size={44} />
              </Box>
            </Row>
          );
        })}
      </RowCard>
    </Section>
  );
}

const rankSx = { width: 22, flexShrink: 0, textAlign: 'right', fontFamily: "'Bungee', sans-serif" } as const;

export default function Machine() {
  const { machineId } = useParams();
  useTopOfPage(machineId);
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const machine = findMachine(league, machineId);

  if (!machine) {
    return (
      <Page title="Machine not found" subtitle="There is no machine at this address. The code or link may be out of date.">
        <Button component={RouterLink} to="/standings" variant="outlined" sx={{ minHeight: 44 }}>
          See the standings
        </Button>
      </Page>
    );
  }

  const night = nightStatus(league);
  const week = night.week;
  const picked = week.machineIds.includes(machine.machineId);
  const out = picked ? week.out[machine.machineId] : undefined;
  const inPlay = night.open && picked && !out;
  // Only an approved team can use the buttons. Visitors and admins read the page.
  const canPlay = me.isTeam && me.team.status === 'approved';
  const myId = canPlay ? me.team.teamId : undefined;

  const line = linesView(league).find((l) => l.machine.machineId === machine.machineId);
  const mine = canPlay ? lineFor(league, me.team.teamId) : undefined;
  const inThisLine = mine?.machine.machineId === machine.machineId;
  const board = machineBoard(league, week.week, machine.machineId);
  const high = seasonHigh(league, machine.machineId);
  // Every game on this machine, not just each team's best: the chart and the full list below.
  const spread = scoreSpread(league, machine.machineId);
  const allScores = scoreList(league, { machineId: machine.machineId });
  const weeksWithScores = [...new Set(allScores.map((x) => x.week))].sort((a, b) => b - a);

  let status: string;
  if (!picked) status = 'Not picked this week';
  else if (night.open) status = out ? `Out tonight: ${out.reason}. Scores from tonight do not count.` : 'In play tonight';
  else status = out ? `League night is closed. It was out in week ${week.week}: ${out.reason}. Its scores did not count.` : `League night is closed. It was in play in week ${week.week}.`;

  const leave = () => {
    dispatch(sample.leaveLine());
    dispatch(showToast(`You left the ${machine.name} line.`));
  };

  return (
    <Page
      title={
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MachineArt machine={machine} size={88} />
          <Box component="span" sx={{ minWidth: 0 }}>
            {machine.name}
          </Box>
        </Box>
      }
      subtitle={
        // An out machine is worth noticing, so it is coral as well as saying so.
        <Box component="span" sx={{ display: 'block', mt: 1, ...(out && { color: 'secondary.main', fontWeight: 700 }) }}>
          {status}
        </Box>
      }
    >
      <Stack spacing={4}>
        {canPlay && inPlay && (
          <Button component={RouterLink} to={`/submit?machine=${machine.machineId}`} variant="contained" color="secondary" size="large" fullWidth>
            Submit a score on {machine.name}
          </Button>
        )}

        {/* The line. A machine that is not in play has no line, so say why instead. */}
        {inPlay && line ? (
          <Section title={`The line (${line.teams.length})`}>
            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
              One game, then back of the line
            </Typography>
            {line.teams.length === 0 ? (
              <EmptyNote>{canPlay ? 'Nobody is in line. Sign up and you can play right now.' : 'Nobody is in line.'}</EmptyNote>
            ) : (
              <RowCard>
                {line.teams.map((t, i) => (
                  <Row key={t.teamId} mine={t.teamId === myId}>
                    <Typography sx={{ ...smallLabel, width: 64, flexShrink: 0, ...(i === 0 && { color: 'primary.main' }) }}>{spotLabel(i + 1)}</Typography>
                    <TeamAvatar team={t} mine={t.teamId === myId} />
                    <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', gap: 0.75, alignItems: 'baseline' }}>
                      <TeamLink team={t} />
                      {t.teamId === myId && (
                        <Typography component="span" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                          (you)
                        </Typography>
                      )}
                    </Box>
                  </Row>
                ))}
              </RowCard>
            )}
            {canPlay && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {inThisLine ? (
                  <Button variant="outlined" size="large" fullWidth onClick={leave}>
                    Leave the line
                  </Button>
                ) : (
                  <>
                    <Button component={RouterLink} to={`/lines/join/${machine.machineId}`} variant="outlined" size="large" fullWidth>
                      Sign up for this line
                    </Button>
                    {mine && (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        You are {placeInLine(mine.position)} for {mine.machine.name}. Signing up here takes you out of that line.
                      </Typography>
                    )}
                  </>
                )}
                <Link component={RouterLink} to="/lines" sx={{ alignSelf: 'center', py: 1.25, fontWeight: 700 }}>
                  See every line
                </Link>
              </Stack>
            )}
            {me.isVisitor && (
              <Link component={RouterLink} to="/login" sx={{ display: 'inline-block', mt: 0.5, py: 1.25 }}>
                Log in to sign up
              </Link>
            )}
          </Section>
        ) : (
          picked && (
            <Section title="The line">
              <EmptyNote>{night.open ? `No line. ${machine.name} is out tonight.` : 'Lines open with the night.'}</EmptyNote>
            </Section>
          )
        )}

        <Section title={night.open ? 'Tonight on this machine' : `${weekLabel(week.week)} on this machine`}>
          {out && board.length > 0 && (
            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
              {machine.name} {night.open ? 'is out tonight, so these scores do not count' : 'was out that night, so these scores did not count'}. They stay on record.
            </Typography>
          )}
          {board.length === 0 ? (
            <EmptyNote>{!picked ? `${machine.name} was not picked this week, so it has no scores.` : night.open ? 'No scores yet tonight.' : 'Nobody posted a score that night.'}</EmptyNote>
          ) : (
            <RowCard>
              {board.map((r) => {
                const games = `${r.games} ${r.games === 1 ? 'game' : 'games'}`;
                return (
                  // The score and photo drop to a second line on a phone: a 9-digit score, a name and a photo do not fit on one.
                  <Row key={r.team.teamId} mine={r.team.teamId === myId} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 190px', minWidth: 0 }}>
                      <Typography sx={{ ...rankSx, color: out ? 'text.secondary' : r.rank <= 4 ? 'primary.main' : 'text.secondary' }}>{r.rank}</Typography>
                      <TeamAvatar team={r.team} mine={r.team.teamId === myId} />
                      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline', minWidth: 0 }}>
                          <TeamLink team={r.team} />
                          {r.team.teamId === myId && (
                            <Typography component="span" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                              (you)
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {out ? `Does not count, ${games}` : `${r.points} ${r.points === 1 ? 'pt' : 'pts'}, ${games}`}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0 }}>
                      <ScoreDisplay value={r.best.score} size="sm" />
                      <ScorePhoto score={r.best} machineName={machine.name} teamName={r.team.teamName} size={44} />
                    </Box>
                  </Row>
                );
              })}
            </RowCard>
          )}
        </Section>

        <Section title="Where scores land">
          {spread ? (
            <Card sx={{ p: 2 }}>
              <ScoreSpreadChart spread={spread} machineName={machine.name} />
            </Card>
          ) : (
            <EmptyNote>The chart appears once someone has played {machine.name}.</EmptyNote>
          )}
        </Section>

        <EveryScore
          key={machine.machineId}
          machineName={machine.name}
          weeks={weeksWithScores}
          startWeek={weeksWithScores.includes(week.week) ? week.week : weeksWithScores[0]}
          myId={myId}
        />

        <Section title="Season high score">
          {high ? (
            <Card sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, rowGap: 1, px: 2, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: '1 1 160px', minWidth: 0 }}>
                <TeamAvatar team={team(league, high.teamId)} mine={high.teamId === myId} />
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <TeamLink team={team(league, high.teamId)} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {weekLabel(high.week)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexShrink: 0 }}>
                <ScoreDisplay value={high.score} />
                <ScorePhoto score={high} machineName={machine.name} teamName={team(league, high.teamId).teamName} size={44} />
              </Box>
            </Card>
          ) : (
            <EmptyNote>Nobody has played it yet.</EmptyNote>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
