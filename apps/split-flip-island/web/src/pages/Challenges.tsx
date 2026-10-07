// Challenges: one team bets some of its own points that it will post the better score on one
// machine tonight. The other team accepts or passes. When the night closes, the loser's points
// go to the winner, like a dollar game. A challenge is for 10 points at most, and two teams get
// one challenge a night between them.
// A team sends challenges from here, answers the ones sent to it, posts its score, and watches
// live and settled ones.

import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { alreadyChallenged, approvedTeams, challenges, countedMachines, machine as machineOf, maxStake, nightStatus, weekLabel, type ChallengeView } from '../sample/league';
import { sample } from '../sample/slice';
import { ago, clock } from '../sample/time';
import type { STeam } from '../sample/types';
import { showToast } from '../store';
import EmptyNote from '../ui/EmptyNote';
import Page from '../ui/Page';
import { Row, RowCard, RowText } from '../ui/Rows';
import ScoreDisplay from '../ui/ScoreDisplay';
import Section from '../ui/Section';
import Tag from '../ui/Tag';
import TeamAvatar, { TeamLink } from '../ui/TeamAvatar';
import { useTopOfPage } from './useTopOfPage';

/** One side of a live challenge: photo, name and best score tonight. */
function Side({ team, best, mine }: { team: STeam; best: number | undefined; mine: boolean }) {
  return (
    <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, textAlign: 'center' }}>
      <TeamAvatar team={team} size={48} mine={mine} />
      <TeamLink team={team} noWrap={false} />
      {best === undefined ? (
        // Same height as a score, so the two sides stay level.
        <Typography sx={{ color: 'text.secondary', lineHeight: '25px' }}>
          No score yet
        </Typography>
      ) : (
        <ScoreDisplay value={best} size="sm" />
      )}
    </Box>
  );
}

const points = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

function LiveCard({ view, myTeamId, closesAt }: { view: ChallengeView; myTeamId: string; closesAt: string }) {
  const stake = view.challenge.stake;
  const mine = view.from.teamId === myTeamId || view.to.teamId === myTeamId;
  // challengeView names no leader when the scores are level or neither team has one.
  const standing = view.leader ? `${view.leader.teamId === myTeamId ? 'You lead' : `${view.leader.teamName} leads`}.` : 'Level so far.';
  return (
    <Card sx={{ p: 2, ...(mine && { borderWidth: 2, borderColor: 'primary.main' }) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="h4" component="h4" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Link component={RouterLink} to={`/machines/${view.machine.machineId}`} color="inherit">
            {view.machine.name}
          </Link>
        </Typography>
        <Tag tone="live">{points(stake)}</Tag>
        {mine && <Tag tone="good">Yours</Tag>}
      </Box>
      <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: 1 }}>
        <Side team={view.from} best={view.fromBest} mine={view.from.teamId === myTeamId} />
        <Side team={view.to} best={view.toBest} mine={view.to.teamId === myTeamId} />
        {/* "vs" sits between the two photos, where there is always room. */}
        <Typography aria-hidden sx={{ position: 'absolute', left: '50%', top: 12, transform: 'translateX(-50%)', color: 'text.secondary', fontWeight: 700 }}>
          vs
        </Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary', mt: 1.5 }}>
        {standing} {view.leader ? `They take ${points(stake)} from the other team if it stays that way.` : `${points(stake)} are on the line.`} Ends when the night closes at{' '}
        {clock(closesAt)}.
      </Typography>
      {/* The score for a challenge is an ordinary league score on that machine, posted the usual way. */}
      {mine && (
        <Button component={RouterLink} to={`/submit?machine=${view.machine.machineId}`} variant="contained" color="secondary" size="large" fullWidth sx={{ mt: 1.5 }}>
          Submit a score on {view.machine.name}
        </Button>
      )}
    </Card>
  );
}

export default function Challenges() {
  useTopOfPage();
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();

  const myTeamId = me.team.teamId;
  const night = nightStatus(league);
  const lists = challenges(league, myTeamId);
  const others = approvedTeams(league).filter((t) => t.teamId !== myTeamId);
  const machines = night.open ? countedMachines(league, night.week).map((id) => machineOf(league, id)) : [];

  const [open, setOpen] = useState(false);
  const [toTeamId, setToTeamId] = useState('');
  const [machineId, setMachineId] = useState('');
  // You wager points you already have, so you can put up no more than your season total, and never more than 10.
  const most = maxStake(league, myTeamId);
  const [stake, setStake] = useState(1);

  // "Challenge them" on a team's page sends people here with ?team=<id>: open the form with that
  // team chosen. The address is then tidied so a refresh does not open the form again.
  const asked = params.get('team');
  useEffect(() => {
    if (!asked) return;
    if (night.open && others.some((t) => t.teamId === asked)) {
      setToTeamId(asked);
      setOpen(true);
    }
    setParams({}, { replace: true });
    // Only when the address changes: the other values are read once at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);

  const toTeam = others.find((t) => t.teamId === toTeamId);
  const pickedMachine = machines.find((m) => m.machineId === machineId);
  // One challenge a night between two teams, whoever sent it and however it went.
  const taken = (teamId: string) => alreadyChallenged(league, myTeamId, teamId);
  const repeat = !!toTeam && taken(toTeam.teamId);

  const start = () => {
    setToTeamId('');
    setMachineId('');
    setStake(Math.min(5, Math.max(most, 1)));
    setOpen(true);
  };

  const send = () => {
    if (!toTeam || !pickedMachine || repeat || most < 1) return;
    dispatch(sample.challenge({ toTeamId: toTeam.teamId, machineId: pickedMachine.machineId, stake }));
    dispatch(showToast(`You challenged ${toTeam.teamName} on ${pickedMachine.name} for ${points(stake)}.`));
    setOpen(false);
  };

  const answer = (view: ChallengeView, accept: boolean) => {
    dispatch(sample.answerChallenge({ id: view.challenge.id, accept }));
    dispatch(showToast(accept ? `Challenge accepted. Best ${view.machine.name} score tonight wins ${points(view.challenge.stake)}.` : `You passed on ${view.from.teamName}'s challenge.`));
  };

  const nothing = lists.waitingOnMe.length + lists.sentByMe.length + lists.live.length + lists.settled.length === 0;
  const note = (t: STeam) => (t.firstWeek > night.week.week ? ` (starts week ${t.firstWeek})` : league.checkIns[t.teamId] ? '' : ' (not here tonight)');

  return (
    <Page title="Challenges" subtitle="Pick a team and a machine, and put up to 10 of the points you have on it. Best score tonight wins, and the loser's points go to the winner. One challenge a night between any two teams.">
      <Stack spacing={4}>
        <Box>
          <Button variant="contained" color="secondary" size="large" fullWidth disabled={!night.open || machines.length === 0 || most < 1} onClick={start}>
            Challenge a team
          </Button>
          {night.open && machines.length > 0 && most < 1 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              You wager points you already have, and you have none yet. Post a score first.
            </Typography>
          )}
          {!night.open ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              League night is closed. Challenges open with the night.
            </Typography>
          ) : (
            machines.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                No machines are in play tonight, so there is nothing to challenge a team on.
              </Typography>
            )
          )}
        </Box>

        {lists.waitingOnMe.length > 0 && (
          <Section title="Waiting on you">
            <Stack spacing={1.5}>
              {lists.waitingOnMe.map((v) => (
                <Card key={v.challenge.id} sx={{ p: 2, borderColor: 'secondary.main', borderLeftWidth: 5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TeamAvatar team={v.from} size={44} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {v.from.teamName} challenged you on {v.machine.name}.
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        For {points(v.challenge.stake)}. Sent {ago(v.challenge.at, league.now)}. Accept, and whoever posts the better score tonight takes them from the other team.
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <Button fullWidth size="large" onClick={() => answer(v, false)} aria-label={`Pass on ${v.from.teamName}'s challenge`}>
                      Pass
                    </Button>
                    <Button fullWidth size="large" variant="outlined" onClick={() => answer(v, true)} aria-label={`Accept ${v.from.teamName}'s challenge`}>
                      Accept
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Section>
        )}

        {lists.sentByMe.length > 0 && (
          <Section title="Waiting on them">
            <Stack spacing={1.5}>
              {lists.sentByMe.map((v) => (
                <Card key={v.challenge.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TeamAvatar team={v.to} size={44} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        You challenged {v.to.teamName} on {v.machine.name}.
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        For {points(v.challenge.stake)}. Sent {ago(v.challenge.at, league.now)}. They have not answered yet.
                      </Typography>
                    </Box>
                  </Box>
                  {/* Nobody is on the other phone in the sample, so this stands in for their answer. */}
                  <Button
                    size="small"
                    sx={{ mt: 1, ml: -0.5, minHeight: 44 }}
                    onClick={() => {
                      dispatch(sample.theyAccepted(v.challenge.id));
                      dispatch(showToast(`${v.to.teamName} accepted. The challenge is live.`));
                    }}
                  >
                    Pretend they accepted (sample)
                  </Button>
                </Card>
              ))}
            </Stack>
          </Section>
        )}

        {lists.live.length > 0 && (
          <Section title="Live tonight">
            <Stack spacing={1.5}>
              {lists.live.map((v) => (
                <LiveCard key={v.challenge.id} view={v} myTeamId={myTeamId} closesAt={night.closesAt} />
              ))}
            </Stack>
          </Section>
        )}

        {lists.settled.length > 0 && (
          <Section title="Settled">
            <RowCard>
              {lists.settled.map((v) => {
                // No winner means the two teams tied, and no points moved.
                const tied = !v.leader;
                const winner = v.leader ?? v.from;
                const loser = winner.teamId === v.from.teamId ? v.to : v.from;
                return (
                  <Row key={v.challenge.id} mine={v.from.teamId === myTeamId || v.to.teamId === myTeamId}>
                    <TeamAvatar team={winner} mine={winner.teamId === myTeamId} />
                    <RowText
                      primary={
                        <Box component="span" sx={{ whiteSpace: 'normal' }}>
                          {tied ? `${winner.teamName} and ${loser.teamName} tied on ${v.machine.name}` : `${winner.teamName} beat ${loser.teamName} on ${v.machine.name}`}
                        </Box>
                      }
                      secondary={`${weekLabel(v.challenge.week)}, ${tied ? 'no points moved' : `won ${points(v.challenge.stake)}`}`}
                    />
                  </Row>
                );
              })}
            </RowCard>
          </Section>
        )}

        {nothing && <EmptyNote>No challenges yet. {night.open ? 'Be the first: pick a team and a machine, and see who posts the better score.' : 'They start on league night.'}</EmptyNote>}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Challenge a team</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Team"
              value={toTeamId}
              onChange={(e) => setToTeamId(e.target.value)}
              helperText={toTeam && note(toTeam) ? `${toTeam.teamName} ${toTeam.firstWeek > night.week.week ? 'has not started yet' : 'has not checked in tonight'}. They may not answer.` : undefined}
            >
              {others.map((t) => (
                <MenuItem key={t.teamId} value={t.teamId} disabled={taken(t.teamId)} sx={{ minHeight: 44 }}>
                  {t.teamName}
                  {taken(t.teamId) ? ' (already challenged tonight)' : note(t)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Machine"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              helperText="Only machines that count tonight."
            >
              {machines.map((m) => (
                <MenuItem key={m.machineId} value={m.machineId} sx={{ minHeight: 44 }}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Points to put on it"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              helperText={most < 10 ? `You have ${points(most)}, so that is the most you can put up.` : 'The most is 10. They come out of the points you have now.'}
            >
              {Array.from({ length: Math.max(most, 1) }, (_, i) => i + 1).map((n) => (
                <MenuItem key={n} value={n} sx={{ minHeight: 44 }}>
                  {points(n)}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              They can accept or pass. If they accept, the better score on that machine when the night closes at {clock(night.closesAt)} wins, and the loser's {points(stake)} go to the winner. A tie moves nothing.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button variant="contained" color="secondary" disabled={!toTeam || !pickedMachine || repeat || most < 1} onClick={send} sx={{ minHeight: 44 }}>
            Send challenge
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
