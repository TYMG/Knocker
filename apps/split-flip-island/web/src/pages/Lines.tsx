// Lines: where a team signs up for a machine before playing it on league night.
//
// Two states. Not in a line: every machine offers a sign-up button. In a line: a status card says
// where the team stands, its own line offers "Leave" and the others offer "Switch".
// A team is in one line at a time, and leaves it on its own when it submits a score there.

import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { lineCount, lineFor, linesView, nightStatus, placeInLine, type LineView, type MyLine } from '../sample/league';
import { sample } from '../sample/slice';
import { clock, clockLabel, longDate, ordinal } from '../sample/time';
import { showToast } from '../store';
import EmptyNote from '../ui/EmptyNote';
import MachineArt from '../ui/MachineArt';
import Page from '../ui/Page';
import Tag from '../ui/Tag';
import { capital, Fact, Facts, smallLabel, teamsBeforeYou } from './lineWords';
import { useTopOfPage } from './useTopOfPage';

/** The highlighted card at the top when the team is in a line. */
function MyLineCard({ mine }: { mine: MyLine }) {
  const name = mine.machine.name;
  const title =
    mine.position === 1 ? `It is your turn on ${name}` : mine.position === 2 ? `You are next on ${name}` : `You are ${ordinal(mine.position)} in line for ${name}`;
  let detail: string;
  if (mine.position === 1) detail = 'Walk up and play one game, then submit your score. Submitting takes you out of this line.';
  else if (mine.position === 2) detail = `${mine.ahead[0]?.teamName ?? 'One team'} is playing. You go when they finish.`;
  // Teams choose on the sign-up form whether to get a message, so say which one applies.
  else detail = `${teamsBeforeYou(mine.ahead.length)} ${mine.notify ? 'We tell you when you are next.' : 'You asked not to get a message, so keep an eye on this page.'}`;

  return (
    <Card role="status" sx={{ p: 2, borderWidth: 2, borderColor: 'primary.main', bgcolor: 'action.selected' }}>
      <Typography sx={smallLabel}>Signed up at {clock(mine.joinedAt)}</Typography>
      <Typography variant="h4" component="p" sx={{ my: 0.25 }}>
        {title}
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>{detail}</Typography>
      {mine.position === 1 && (
        <Button component={RouterLink} to={`/submit?machine=${mine.machine.machineId}`} variant="contained" color="secondary" size="large" fullWidth sx={{ mt: 1.5 }}>
          Submit a score on {name}
        </Button>
      )}
    </Card>
  );
}

/** One machine and its line. `mine` is the team's own line anywhere tonight, if it has one. */
function LineCard({ line, mine, myTeamId, onLeave }: { line: LineView; mine: MyLine | undefined; myTeamId: string; onLeave: () => void }) {
  const { machine } = line;
  const to = `/machines/${machine.machineId}`;

  if (line.out) {
    // No line and no button: the machine broke, so nobody can play it tonight.
    return (
      <Card sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', borderStyle: 'dashed', bgcolor: 'transparent' }}>
        <Box sx={{ opacity: 0.45, display: 'flex' }}>
          <MachineArt machine={machine} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
            <Link component={RouterLink} to={to} color="inherit">
              {machine.name}
            </Link>
            : Out tonight
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {capital(line.out.reason)}, since {clock(line.out.at)}. Scores from tonight do not count.
          </Typography>
        </Box>
      </Card>
    );
  }

  const isMine = mine?.machine.machineId === machine.machineId;
  const count = line.teams.length;
  const who = (teamId: string, teamName: string) => (teamId === myTeamId ? 'you' : teamName);
  const playing = line.playing ? capital(who(line.playing.teamId, line.playing.teamName)) : 'Nobody. Walk up.';
  const waiting = line.waiting.length ? capital(line.waiting.map((t) => who(t.teamId, t.teamName)).join(', then ')) : 'Nobody';
  const spot = isMine ? capital(placeInLine(mine.position)) : count === 0 ? 'You could play right now' : count === 1 ? 'You would be next' : `You would be ${ordinal(count + 1)}`;

  return (
    <Card sx={{ p: 2, ...(isMine && { borderWidth: 2, borderColor: 'primary.main' }) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <MachineArt machine={machine} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h4" component="h3">
            <Link component={RouterLink} to={to} color="inherit">
              {machine.name}
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {lineCount(count)}
          </Typography>
        </Box>
        {/* The outline alone would be color only, so the card also says it in words. */}
        {isMine && <Tag tone="good">Your line</Tag>}
      </Box>
      <Facts>
        <Fact label="Playing">{playing}</Fact>
        <Fact label="Waiting">{waiting}</Fact>
        <Fact label="Your spot">{spot}</Fact>
      </Facts>
      <Box sx={{ mt: 2 }}>
        {isMine ? (
          <Button variant="outlined" size="large" fullWidth onClick={onLeave}>
            Leave this line
          </Button>
        ) : (
          <Button
            component={RouterLink}
            to={`/lines/join/${machine.machineId}`}
            variant="outlined"
            size="large"
            fullWidth
            // Three buttons with the same words would be confusing read aloud, so name the machine.
            aria-label={mine ? `Switch to the ${machine.name} line` : undefined}
          >
            {mine ? 'Switch to this line' : `Sign up for ${machine.name}`}
          </Button>
        )}
      </Box>
    </Card>
  );
}

export default function Lines() {
  useTopOfPage();
  const league = useLeague();
  const me = useMe();
  const dispatch = useAppDispatch();
  const night = nightStatus(league);
  const lines = linesView(league);
  const mine = lineFor(league, me.team.teamId);

  if (!night.open) {
    const next = league.weeks.find((w) => w.state === 'upcoming');
    return (
      <Page title="Lines">
        <Card sx={{ p: 2 }}>
          <Typography variant="h4" component="p">
            Lines open with the night
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
            League night is closed, so there is nothing to sign up for. Lines open at {clockLabel(league.night.opensAt)} on league night
            {next ? `. The next one is ${longDate(next.date)}.` : '.'}
          </Typography>
          <Button component={RouterLink} to="/standings" variant="outlined" sx={{ mt: 1.5, minHeight: 44 }}>
            See the standings
          </Button>
        </Card>
      </Page>
    );
  }

  const leave = () => {
    if (!mine) return;
    dispatch(sample.leaveLine());
    dispatch(showToast(`You left the ${mine.machine.name} line.`));
  };

  return (
    <Page
      title="Lines"
      subtitle={mine ? 'You are signed up. Play one game when it is your turn, then sign up again if others are waiting.' : 'Sign up for a machine before you play it.'}
    >
      <Stack spacing={1.5}>
        {mine ? (
          <MyLineCard mine={mine} />
        ) : (
          <Card role="status" sx={{ p: 2 }}>
            <Typography variant="h4" component="p">
              You are not in a line
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>Pick a machine below to sign up. One line at a time.</Typography>
          </Card>
        )}
        {lines.length === 0 && <EmptyNote>No machines are picked for tonight yet.</EmptyNote>}
        {lines.map((line) => (
          <LineCard key={line.machine.machineId} line={line} mine={mine} myTeamId={me.team.teamId} onLeave={leave} />
        ))}
      </Stack>
    </Page>
  );
}
