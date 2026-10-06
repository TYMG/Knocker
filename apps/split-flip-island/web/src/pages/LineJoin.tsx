// Sign up for a line: the short form a team confirms before it joins a machine's line.
// It asks for three things and nothing more: the machine, the team (from the login) and whether
// to send a message when the team is next. It also says what spot the team would get.

import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { findMachine, lineCount, lineFor, linesView, nightStatus, placeInLine, type LineView } from '../sample/league';
import { sample } from '../sample/slice';
import { clock, ordinal } from '../sample/time';
import { showToast } from '../store';
import Page from '../ui/Page';
import TeamAvatar from '../ui/TeamAvatar';
import { capital, smallLabel } from './lineWords';
import { useTopOfPage } from './useTopOfPage';

const BACK = { to: '/lines', label: 'All lines' };

/** What the team is told about the spot it would get. `teams` are the teams already in that line. */
function spotWords(teams: LineView['teams']): { title: string; detail: string } {
  const [playing, next, ...rest] = teams;
  if (!playing) return { title: 'You will be first', detail: 'Nobody is on it. You can play right now.' };
  if (!next) return { title: 'You will be next', detail: `${playing.teamName} is playing. You go when they finish.` };
  const others = rest.map((t) => `then ${t.teamName}, `).join('');
  return { title: `You will be ${ordinal(teams.length + 1)} in line`, detail: `${playing.teamName} is playing. ${next.teamName} goes next, ${others}then you.` };
}

export default function LineJoin() {
  // Not keyed on the machine: picking another machine in the list must not jump the page.
  useTopOfPage();
  const { machineId } = useParams();
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // On by default: most teams wander off to another machine while they wait.
  const [notify, setNotify] = useState(true);

  const night = nightStatus(league);
  const lines = linesView(league);
  const line = lines.find((l) => l.machine.machineId === machineId);
  const mine = lineFor(league, me.team.teamId);

  if (!night.open) {
    return (
      <Page back={BACK} title="Sign up for a line">
        <Typography sx={{ color: 'text.secondary' }}>League night is closed. Lines open with the night.</Typography>
      </Page>
    );
  }

  if (!line || line.out) {
    const known = findMachine(league, machineId);
    return (
      <Page back={BACK} title="Sign up for a line">
        <Card sx={{ p: 2 }}>
          <Typography variant="h4" component="p">
            {line?.out ? `${line.machine.name} is out tonight` : known ? `${known.name} is not in play tonight` : 'We could not find that machine'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
            {line?.out
              ? `${capital(line.out.reason)}, since ${clock(line.out.at)}. It has no line. Pick another machine.`
              : known
                ? 'It was not picked this week, so it has no line. Pick another machine.'
                : 'The address may be wrong. Pick a machine from the list of lines.'}
          </Typography>
          <Button component={RouterLink} to="/lines" variant="outlined" sx={{ mt: 1.5, minHeight: 44 }}>
            See all lines
          </Button>
        </Card>
      </Page>
    );
  }

  const { machine } = line;
  const alreadyHere = mine?.machine.machineId === machine.machineId;
  const spot = spotWords(line.teams);

  const signUp = () => {
    dispatch(sample.joinLine({ machineId: machine.machineId, notify }));
    dispatch(showToast(`Signed up for ${machine.name}. ${line.teams.length === 0 ? 'You can play right now.' : `You are ${placeInLine(line.teams.length + 1)}.`}`));
    navigate('/lines');
  };

  const leave = () => {
    dispatch(sample.leaveLine());
    dispatch(showToast(`You left the ${machine.name} line.`));
    navigate('/lines');
  };

  return (
    <Page back={BACK} title="Sign up for a line" subtitle="Check the details, then sign up.">
      <Stack spacing={2.5}>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel component="legend" sx={{ ...smallLabel, mb: 0.5, '&.Mui-focused': { color: 'text.secondary' } }}>
            Machine
          </FormLabel>
          <Card>
            {/* The address always names the selected machine, so a refresh or a shared link shows the same choice. */}
            <RadioGroup value={machine.machineId} onChange={(_, value) => navigate(`/lines/join/${value}`, { replace: true })}>
              {lines.map((l) => (
                <FormControlLabel
                  key={l.machine.machineId}
                  value={l.machine.machineId}
                  disabled={!!l.out}
                  control={<Radio />}
                  disableTypography
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, width: '100%' }}>
                      <Typography component="span" sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0, ...(l.out && { color: 'text.secondary' }) }}>
                        {l.machine.name}
                      </Typography>
                      <Typography component="span" variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                        {l.out ? 'Out tonight' : lineCount(l.teams.length)}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, pl: 0.5, pr: 2, minHeight: 52, '& + &': { borderTop: 1, borderColor: 'divider' } }}
                />
              ))}
            </RadioGroup>
          </Card>
        </FormControl>

        <Box>
          <Typography sx={{ ...smallLabel, mb: 0.5 }}>Team</Typography>
          <Card sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25 }}>
            <TeamAvatar team={me.team} size={44} mine />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{me.team.teamName}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                From your login
              </Typography>
            </Box>
          </Card>
        </Box>

        {alreadyHere ? (
          // Already in this line: there is nothing to sign up for, so offer the way out instead.
          <>
            <Card role="status" sx={{ p: 2, borderWidth: 2, borderColor: 'primary.main', bgcolor: 'action.selected' }}>
              <Typography variant="h4" component="p">
                You are already in this line
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                You signed up for {machine.name} at {clock(mine.joinedAt)} and you are {placeInLine(mine.position)}. Pick another machine above to switch, or leave this line.
              </Typography>
            </Card>
            <Stack spacing={1}>
              <Button variant="outlined" size="large" fullWidth onClick={leave}>
                Leave the {machine.name} line
              </Button>
              <Button component={RouterLink} to="/lines" size="large" fullWidth>
                Back to all lines
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Card role="status" sx={{ p: 2, borderWidth: 2, borderColor: 'primary.main', bgcolor: 'action.selected' }}>
              <Typography variant="h4" component="p">
                {spot.title}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{spot.detail}</Typography>
              {mine && (
                <Typography sx={{ mt: 1 }}>
                  You are {placeInLine(mine.position)} for {mine.machine.name} right now. Signing up here takes you out of that line.
                </Typography>
              )}
            </Card>

            <Card sx={{ px: 2, py: 0.75 }}>
              <FormControlLabel
                control={<Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
                labelPlacement="start"
                disableTypography
                label={
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>Tell us when we are next</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      A message on this phone
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, width: '100%', minHeight: 52, gap: 1.5 }}
              />
            </Card>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              One line at a time. Signing up here takes you out of any other line. Play one game, then sign up again if others are waiting.
            </Typography>

            <Stack spacing={1}>
              <Button variant="contained" color="secondary" size="large" fullWidth onClick={signUp}>
                Sign up for {machine.name}
              </Button>
              <Button component={RouterLink} to="/lines" size="large" fullWidth>
                Cancel
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Page>
  );
}
