// Submit a score, at "/submit". Used standing at the machine right after a game ends.
// Three steps on one page (machine, photo of the display, the score), then a review step where
// the team compares the typed number with their own photo before it posts. A posted score cannot
// be changed by the team, only by a league admin, so the review is the last chance to fix a typo.
//
// The review step lives at the same address and replaces the form on screen. Everything typed
// is kept in this component, so "Fix it" goes back with nothing lost.
//
// "/submit?machine=godzilla" (what the code on a machine opens) picks the machine for you.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { formatScore, formatScoreInput } from '../lib/format';
import { scorePhoto } from '../sample/art';
import { countedMachines, findMachine, nightStatus, teamTonight, weekLabel, weekOf } from '../sample/league';
import { sample } from '../sample/slice';
import { clockLabel, longDate } from '../sample/time';
import { showToast } from '../store';
import MachineArt from '../ui/MachineArt';
import Page from '../ui/Page';
import PhotoPicker, { type PickedPhoto } from '../ui/PhotoPicker';
import ScoreDisplay from '../ui/ScoreDisplay';
import Section from '../ui/Section';
import TeamAvatar from '../ui/TeamAvatar';

/** A step's heading: its number in a circle, its name, and a tick once it is done. */
function StepTitle({ n, done, children }: { n: number; done: boolean; children: ReactNode }) {
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: '1rem',
          border: 2, borderColor: 'primary.main', bgcolor: done ? 'primary.main' : 'transparent', color: done ? 'primary.contrastText' : 'primary.main'
        }}
      >
        {n}
      </Box>
      <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>Step {n}: </Box>
      {children}
      {done && <CheckCircleIcon titleAccess="Done" sx={{ color: 'primary.main', fontSize: '1.3rem' }} />}
    </Box>
  );
}

export default function Submit() {
  const league = useLeague();
  const { team } = useMe();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const night = nightStatus(league);
  const week = night.week;
  const counted = countedMachines(league, week);
  const tonight = teamTonight(league, team.teamId, week.week);
  // Still to play first, then the ones already played tonight.
  const choices = [...tonight.toPlay.map((m) => ({ machine: m, played: undefined })), ...tonight.played.map((p) => ({ machine: p.machine, played: p }))];

  // The machine named in the address, if there is one. It is only picked for you when its scores count tonight.
  const asked = params.get('machine');
  const askedMachine = findMachine(league, asked ?? undefined);
  const askedCounts = !!asked && counted.includes(asked);

  const [machineId, setMachineId] = useState<string | null>(askedCounts ? asked : null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [scoreText, setScoreText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // Switching between the form and the review changes the whole screen, so start it at the top.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    top.current?.focus();
  }, [reviewing]);

  // The machine could be taken out, or the list could change, while the form is open.
  const picked = machineId && counted.includes(machineId) ? findMachine(league, machineId) : undefined;
  const score = formatScoreInput(scoreText).value;
  const ready = !!picked && !!photo && score !== null;
  const standIn = scorePhoto(score ?? 0, picked?.name ?? 'Pinball', 'full');

  if (!night.open) {
    const next = weekOf(league, week.week + 1);
    return (
      <Page title="Submit a score">
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700 }}>Scores can only be submitted during league night.</Typography>
            {weekLabel(week.week)} is closed.
            {next && next.week <= 8 ? ` Scores open at ${clockLabel(league.night.opensAt)} on ${longDate(next.date)}.` : ''}
          </Alert>
          <Button component={RouterLink} to="/" variant="outlined" size="large">
            Back to team home
          </Button>
        </Stack>
      </Page>
    );
  }

  // A team approved part-way through the season does not count until its first week.
  if (team.firstWeek > week.week) {
    return (
      <Page title="Submit a score">
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography sx={{ fontWeight: 700 }}>Your team starts in week {team.firstWeek}.</Typography>
            You can submit scores from then on.
          </Alert>
          <Button component={RouterLink} to="/" variant="outlined" size="large">
            Back to team home
          </Button>
        </Stack>
      </Page>
    );
  }

  // ---- The review step ----
  if (reviewing && picked && photo && score !== null) {
    const post = () => {
      dispatch(sample.submitScore({ machineId: picked.machineId, score, photoSource: photo.source, photo: photo.photo }));
      dispatch(showToast(`Score posted on ${picked.name}`));
      navigate('/standings');
    };
    return (
      <Page title="Is this right?" subtitle="Check the number against your photo.">
        <Stack spacing={2} ref={top} tabIndex={-1} sx={{ outline: 'none' }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MachineArt machine={picked} size={52} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" component="p" sx={{ fontSize: '1.25rem' }}>
                  {picked.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                  <TeamAvatar team={team} size={22} />
                  <Typography noWrap>{team.teamName}</Typography>
                </Box>
              </Box>
            </Box>
            <Box component="img" src={photo.photo ?? standIn} alt="Your photo of the score display" sx={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain', bgcolor: 'common.black', borderRadius: 2, border: 1, borderColor: 'divider', mt: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, mb: 1.5 }}>
              Your photo, so you can compare.
            </Typography>
            <ScoreDisplay size="lg" value={score} />
          </Card>

          <Alert severity="warning" icon={<WarningAmberIcon />}>
            You cannot change a score after it posts. A league admin can.
          </Alert>

          {/* Side by side, in the wireframe's order: the way back on the left, the main action on the right. */}
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" size="large" onClick={() => setReviewing(false)} sx={{ flex: '1 1 0' }}>
              Fix it
            </Button>
            <Button variant="contained" color="secondary" size="large" onClick={post} sx={{ flex: '2 1 0' }}>
              Submit score
            </Button>
          </Stack>
        </Stack>
      </Page>
    );
  }

  // ---- The form ----
  const missing = [!picked && 'a machine', !photo && 'a photo', score === null && 'the score'].filter((x): x is string => !!x);

  return (
    <Page title="Submit a score">
      <Stack spacing={3.5} ref={top} tabIndex={-1} sx={{ outline: 'none' }}>
        {asked && !askedCounts && (
          <Alert severity="warning">
            {askedMachine && week.out[askedMachine.machineId]
              ? `${askedMachine.name} is out tonight, so its scores do not count. Pick another machine.`
              : askedMachine
                ? `${askedMachine.name} is not in play tonight. Pick one of tonight's machines.`
                : "That machine was not found. Pick one of tonight's machines."}
          </Alert>
        )}

        <Section title={<StepTitle n={1} done={!!picked}>Machine</StepTitle>}>
          {choices.length === 0 ? (
            <Typography sx={{ color: 'text.secondary' }}>No machines are in play tonight. Ask the league admin.</Typography>
          ) : (
            <Stack spacing={1} role="group" aria-label="Machine">
              {choices.map(({ machine, played }) => {
                const on = picked?.machineId === machine.machineId;
                return (
                  <ButtonBase
                    key={machine.machineId}
                    aria-pressed={on}
                    onClick={() => setMachineId(machine.machineId)}
                    sx={{
                      justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, px: 1.5, py: 1.25, minHeight: 68, borderRadius: 1,
                      border: 2, borderColor: on ? 'primary.main' : 'divider', bgcolor: on ? 'action.selected' : 'background.paper',
                      '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                    }}
                  >
                    <MachineArt machine={machine} size={46} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.25 }}>{machine.name}</Typography>
                      <Typography sx={{ color: 'text.secondary' }} variant="body2">
                        {played ? `Played tonight, best ${formatScore(played.best.score)}` : 'Still to play'}
                      </Typography>
                    </Box>
                    {/* A filled tick as well as the border, so the choice does not rest on color alone. */}
                    {on ? <CheckCircleIcon sx={{ color: 'primary.main' }} /> : <RadioButtonUncheckedIcon sx={{ color: 'text.secondary' }} />}
                  </ButtonBase>
                );
              })}
            </Stack>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Filled in for you when you scan the code on the machine.
          </Typography>
        </Section>

        <Section title={<StepTitle n={2} done={!!photo}>Photo of the score</StepTitle>}>
          <PhotoPicker value={photo} onChange={setPhoto} standIn={standIn} hint="Get the whole score display in the frame. Every score needs one." />
        </Section>

        <Section title={<StepTitle n={3} done={score !== null}>Score</StepTitle>}>
          <TextField
            label="Score"
            value={scoreText}
            onChange={(e) => setScoreText(formatScoreInput(e.target.value).display)}
            helperText="Type it exactly as the display shows it. Commas appear as you type."
            autoComplete="off"
            // The number keypad on a phone. The field is text, not number, so the commas can show.
            slotProps={{ htmlInput: { inputMode: 'numeric', sx: { fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' } } }}
          />
        </Section>

        <Box>
          <Button fullWidth variant="contained" color="secondary" size="large" disabled={!ready} onClick={() => setReviewing(true)}>
            Review score
          </Button>
          {/* A switched-off button with no reason is a dead end, so say what is missing. */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center', minHeight: '1.5em' }} aria-live="polite">
            {missing.length > 0 ? `Still needed: ${missing.join(', ')}.` : 'Nothing posts until you check it on the next step.'}
          </Typography>
        </Box>
      </Stack>
    </Page>
  );
}
