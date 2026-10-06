// Call-outs: a friendly side bet between two teams on one machine. The best score tonight wins.
// It is for bragging rights only and never changes league points.
// A team sends call-outs from here, answers the ones sent to it, and watches live and settled ones.

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
import { approvedTeams, callOuts, countedMachines, machine as machineOf, nightStatus, weekLabel, type CallOutView } from '../sample/league';
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

/** One side of a live call-out: photo, name and best score tonight. */
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

function LiveCard({ view, myTeamId, closesAt }: { view: CallOutView; myTeamId: string; closesAt: string }) {
  const mine = view.from.teamId === myTeamId || view.to.teamId === myTeamId;
  // callOutView names no leader when the scores are level or neither team has one.
  const standing = view.leader ? `${view.leader.teamId === myTeamId ? 'You lead' : `${view.leader.teamName} leads`}.` : 'Level so far.';
  return (
    <Card sx={{ p: 2, ...(mine && { borderWidth: 2, borderColor: 'primary.main' }) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="h4" component="h4" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Link component={RouterLink} to={`/machines/${view.machine.machineId}`} color="inherit">
            {view.machine.name}
          </Link>
        </Typography>
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
        {standing} Ends when the night closes at {clock(closesAt)}.
      </Typography>
    </Card>
  );
}

export default function CallOuts() {
  useTopOfPage();
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();

  const myTeamId = me.team.teamId;
  const night = nightStatus(league);
  const lists = callOuts(league, myTeamId);
  const others = approvedTeams(league).filter((t) => t.teamId !== myTeamId);
  const machines = night.open ? countedMachines(league, night.week).map((id) => machineOf(league, id)) : [];

  const [open, setOpen] = useState(false);
  const [toTeamId, setToTeamId] = useState('');
  const [machineId, setMachineId] = useState('');

  // "Call them out" on a team's page sends people here with ?team=<id>: open the form with that
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
  // Two call-outs between the same teams on the same machine tonight would be the same bet twice.
  const repeat =
    !!toTeam &&
    !!pickedMachine &&
    league.callOuts.some(
      (c) =>
        c.week === night.week.week &&
        c.machineId === machineId &&
        (c.status === 'waiting' || c.status === 'live') &&
        ((c.fromTeamId === myTeamId && c.toTeamId === toTeamId) || (c.fromTeamId === toTeamId && c.toTeamId === myTeamId))
    );

  const start = () => {
    setToTeamId('');
    setMachineId('');
    setOpen(true);
  };

  const send = () => {
    if (!toTeam || !pickedMachine || repeat) return;
    dispatch(sample.callOut({ toTeamId: toTeam.teamId, machineId: pickedMachine.machineId }));
    dispatch(showToast(`You called out ${toTeam.teamName} on ${pickedMachine.name}.`));
    setOpen(false);
  };

  const answer = (view: CallOutView, accept: boolean) => {
    dispatch(sample.answerCallOut({ id: view.callOut.id, accept }));
    dispatch(showToast(accept ? `Call-out accepted. Best ${view.machine.name} score tonight wins.` : `You passed on ${view.from.teamName}'s call-out.`));
  };

  const nothing = lists.waitingOnMe.length + lists.sentByMe.length + lists.live.length + lists.settled.length === 0;
  const note = (t: STeam) => (t.firstWeek > night.week.week ? ` (starts week ${t.firstWeek})` : league.checkIns[t.teamId] ? '' : ' (not here tonight)');

  return (
    <Page title="Call-outs" subtitle="Pick a team and a machine. Best score tonight wins. Bragging rights only, no league points.">
      <Stack spacing={4}>
        <Box>
          <Button variant="contained" color="secondary" size="large" fullWidth disabled={!night.open || machines.length === 0} onClick={start}>
            Call out a team
          </Button>
          {!night.open ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              League night is closed. Call-outs open with the night.
            </Typography>
          ) : (
            machines.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                No machines are in play tonight, so there is nothing to call a team out on.
              </Typography>
            )
          )}
        </Box>

        {lists.waitingOnMe.length > 0 && (
          <Section title="Waiting on you">
            <Stack spacing={1.5}>
              {lists.waitingOnMe.map((v) => (
                <Card key={v.callOut.id} sx={{ p: 2, borderColor: 'secondary.main', borderLeftWidth: 5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TeamAvatar team={v.from} size={44} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {v.from.teamName} called you out on {v.machine.name}.
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Sent {ago(v.callOut.at, league.now)}. Accept and the best score tonight wins.
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <Button fullWidth size="large" onClick={() => answer(v, false)} aria-label={`Pass on ${v.from.teamName}'s call-out`}>
                      Pass
                    </Button>
                    <Button fullWidth size="large" variant="outlined" onClick={() => answer(v, true)} aria-label={`Accept ${v.from.teamName}'s call-out`}>
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
                <Card key={v.callOut.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TeamAvatar team={v.to} size={44} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        You called out {v.to.teamName} on {v.machine.name}.
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Sent {ago(v.callOut.at, league.now)}. They have not answered yet.
                      </Typography>
                    </Box>
                  </Box>
                  {/* Nobody is on the other phone in the sample, so this stands in for their answer. */}
                  <Button
                    size="small"
                    sx={{ mt: 1, ml: -0.5, minHeight: 44 }}
                    onClick={() => {
                      dispatch(sample.theyAccepted(v.callOut.id));
                      dispatch(showToast(`${v.to.teamName} accepted. The call-out is live.`));
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
                <LiveCard key={v.callOut.id} view={v} myTeamId={myTeamId} closesAt={night.closesAt} />
              ))}
            </Stack>
          </Section>
        )}

        {lists.settled.length > 0 && (
          <Section title="Settled">
            <RowCard>
              {lists.settled.map((v) => {
                const winner = v.leader ?? v.from;
                const loser = winner.teamId === v.from.teamId ? v.to : v.from;
                return (
                  <Row key={v.callOut.id} mine={v.from.teamId === myTeamId || v.to.teamId === myTeamId}>
                    <TeamAvatar team={winner} mine={winner.teamId === myTeamId} />
                    <RowText
                      primary={
                        <Box component="span" sx={{ whiteSpace: 'normal' }}>
                          {winner.teamName} beat {loser.teamName} on {v.machine.name}
                        </Box>
                      }
                      secondary={weekLabel(v.callOut.week)}
                    />
                  </Row>
                );
              })}
            </RowCard>
          </Section>
        )}

        {nothing && <EmptyNote>No call-outs yet. {night.open ? 'Be the first: pick a team and a machine, and see who posts the better score.' : 'They start on league night.'}</EmptyNote>}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Call out a team</DialogTitle>
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
                <MenuItem key={t.teamId} value={t.teamId} sx={{ minHeight: 44 }}>
                  {t.teamName}
                  {note(t)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Machine"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              helperText={repeat ? `You and ${toTeam?.teamName} already have a call-out on ${pickedMachine?.name} tonight.` : 'Only machines that count tonight.'}
              error={repeat}
            >
              {machines.map((m) => (
                <MenuItem key={m.machineId} value={m.machineId} sx={{ minHeight: 44 }}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              They can accept or pass. If they accept, the better score on that machine when the night closes at {clock(night.closesAt)} wins.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button variant="contained" color="secondary" disabled={!toTeam || !pickedMachine || repeat} onClick={send} sx={{ minHeight: 44 }}>
            Send call-out
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
