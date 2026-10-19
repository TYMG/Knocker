// The guided "new league" story: a card that floats over the app and walks through a first
// league night from nothing. Sign up, more couples sign up, the admin approves, the night opens,
// teams check in, the admin confirms, everybody plays, the night closes and the Dr. weighs in.
//
// Each step says what to do and has a button that takes you there (switching between visitor,
// team and admin as needed). A tick shows once the step has really happened. "Next" is always
// allowed, so a demo never gets stuck. It is part of the sample only.

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAppDispatch, useLeague } from '../hooks';
import { HELPERS } from '../sample/fresh';
import { sample } from '../sample/slice';
import type { Role, SampleState } from '../sample/types';
import { colors } from '../theme';

interface Go {
  label: string;
  role?: Role;
  to?: string;
  /** Something the story does for you, like opening the night. */
  act?: () => void;
}

interface Step {
  title: string;
  body: ReactNode;
  done?: (s: SampleState) => boolean;
  go?: Go[];
}

const mine = (s: SampleState) => s.teams.find((t) => t.teamId === s.myTeamId);
const helpersIn = (s: SampleState) => HELPERS.filter(([id]) => s.teams.some((t) => t.teamId === id)).length;
const openWeek = (s: SampleState) => s.weeks.find((w) => w.state === 'open');

export default function StoryCard() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(true);
  if (!league.story) return null;

  const steps: Step[] = [
    {
      title: 'A brand-new league',
      body: "It's 6:30 PM on the first league night at Lyman's. Nobody has signed up yet. You're a visitor at the front door.",
      go: [{ label: 'Go to the front door', role: 'visitor', to: '/' }]
    },
    {
      title: 'Sign up your team',
      body: 'Tap "Sign up your team" and fill it in: a team name, both phone numbers and a team photo.',
      done: (s) => !!mine(s),
      go: [{ label: 'Open the sign-up form', role: 'visitor', to: '/join' }]
    },
    {
      title: 'Other couples sign up too',
      body: 'Four more couples sign up. Every new team waits for a league admin to approve it.',
      done: (s) => helpersIn(s) === HELPERS.length,
      go: [{ label: 'Bring in four couples', act: () => dispatch(sample.storyHelpersSignUp()) }]
    },
    {
      title: 'Approve the teams',
      body: 'Now you are the league admin. Approve each new team. Sign-ups nobody approves are cleared out after 24 hours.',
      done: (s) => s.teams.length > 0 && s.teams.every((t) => t.status === 'approved'),
      go: [{ label: 'Switch to admin', role: 'admin', to: '/admin/teams' }]
    },
    {
      title: 'Seven o\'clock: the night opens',
      body: 'Teams can check in from 6:30. In the last 5 minutes, a team that hasn\'t checked in sees a countdown; at 1 minute it also offers a sub. League night opens on its own at 7 PM. In this story you open it.',
      done: (s) => !!openWeek(s),
      go: [
        { label: 'See 6:55 as my team', role: 'team', to: '/', act: () => dispatch(sample.sampleSetClock('18:55')) },
        { label: 'Skip to 6:59', act: () => dispatch(sample.sampleSetClock('18:59')) },
        { label: 'Open week 1', act: () => dispatch(sample.storyOpenNight()) }
      ]
    },
    {
      title: 'Check in',
      body: 'Back as your team: tap "I\'m here" on team home. The other couples walk in and do the same.',
      done: (s) => !!s.checkInRequests?.[s.myTeamId] || !!s.checkIns[s.myTeamId],
      go: [
        { label: 'Switch to my team', role: 'team', to: '/' },
        { label: 'The others arrive', act: () => dispatch(sample.storyHelpersArrive()) }
      ]
    },
    {
      title: 'The admin confirms',
      body: 'As the admin, open Check in teams. Everyone who tapped "I\'m here" is at the top. Confirm each one.',
      done: (s) => Object.keys(s.checkInRequests ?? {}).length === 0 && Object.keys(s.checkIns).length > 0,
      go: [{ label: 'Switch to admin', role: 'admin', to: '/admin/check-in' }]
    },
    {
      title: 'Play',
      body: 'Back as your team: get in a line for a machine, play, then submit your score with a photo of the display.',
      done: (s) => s.scores.some((x) => x.teamId === s.myTeamId),
      go: [
        { label: 'Lines', role: 'team', to: '/lines' },
        { label: 'Submit a score', role: 'team', to: '/submit' }
      ]
    },
    {
      title: 'The room fills up',
      body: 'Skip ahead half an hour at a time while the other couples play. Watch the standings move.',
      done: (s) => s.scores.some((x) => x.teamId !== s.myTeamId),
      go: [
        { label: 'Skip ahead 30 minutes', act: () => dispatch(sample.storyFastForward()) },
        { label: 'Standings', to: '/standings' }
      ]
    },
    {
      title: 'Close the night',
      body: 'As the admin, close week 1 from the night settings. Points lock in and the lines empty.',
      done: (s) => s.weeks[0]?.state === 'final',
      go: [{ label: 'Switch to admin', role: 'admin', to: '/admin/night' }]
    },
    {
      title: 'The Dr. weighs in',
      body: "Back as your team: the Doc tab has the check-up on your night, and Season shows where you stand. That's a league night.",
      go: [
        { label: 'See the Doc tab', role: 'team', to: '/?tab=doc' },
        { label: 'Back to the full demo', act: () => { dispatch(sample.resetSample()); navigate('/'); } }
      ]
    }
  ];

  const at = Math.min(league.story.step, steps.length - 1);
  const step = steps[at]!;
  const done = step.done?.(league) ?? false;

  const follow = (g: Go) => {
    if (g.act) g.act();
    if (g.role) {
      // Viewing as your team only makes sense once you have one.
      if (g.role === 'team' && !mine(league)) return;
      if (g.role === 'admin') dispatch(sample.setAdminOnTeam(false));
      dispatch(sample.setRole(g.role));
    }
    // Changing who you are re-routes home first (an admin has no team home, for one), so the
    // move to the step's page waits a beat and lands after that.
    if (g.to) {
      const to = g.to;
      if (g.role) window.setTimeout(() => navigate(to), 80);
      else navigate(to);
    }
  };

  const panel = {
    position: 'fixed' as const,
    zIndex: 1300,
    left: 12,
    right: wide ? 'auto' : 12,
    bottom: wide ? 16 : 'calc(env(safe-area-inset-bottom) + 68px)',
    width: wide ? 380 : 'auto',
    bgcolor: colors.black,
    color: colors.paleYellow,
    border: `2px dashed ${colors.lime}`,
    borderRadius: 2,
    boxShadow: '0 6px 24px rgba(0,0,0,0.35)'
  };

  if (!open) {
    return (
      <Box sx={{ ...panel, right: 'auto', width: 'auto' }}>
        <Button onClick={() => setOpen(true)} endIcon={<ExpandLessIcon />} sx={{ color: colors.paleYellow, fontWeight: 700, px: 1.5 }}>
          Story: step {at + 1} of {steps.length}
        </Button>
      </Box>
    );
  }

  return (
    <Box role="region" aria-label="New league story" sx={{ ...panel, p: 1.75 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: colors.lime, flex: 1 }}>
          NEW LEAGUE STORY · STEP {at + 1} OF {steps.length}
        </Typography>
        <IconButton size="small" aria-label="Hide the story" onClick={() => setOpen(false)} sx={{ color: colors.paleYellow }}>
          <ExpandMoreIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
        {done && <CheckCircleIcon sx={{ color: colors.lime, fontSize: '1.2rem' }} />}
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{step.title}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ mt: 0.5, color: '#f3f0dc' }}>{step.body}</Typography>
      {step.go && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {step.go.map((g) => (
            <Button key={g.label} size="small" variant="outlined" onClick={() => follow(g)} sx={{ color: colors.paleYellow, borderColor: 'rgba(255,255,153,0.5)', minHeight: 36 }}>
              {g.label}
            </Button>
          ))}
        </Stack>
      )}
      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
        <Button size="small" disabled={at === 0} onClick={() => dispatch(sample.setStoryStep(at - 1))} sx={{ color: colors.paleYellow }}>
          Back
        </Button>
        {at < steps.length - 1 ? (
          <Button size="small" variant="contained" onClick={() => dispatch(sample.setStoryStep(at + 1))} sx={{ bgcolor: done ? colors.lime : colors.paleYellow, color: colors.black, fontWeight: 700, '&:hover': { bgcolor: colors.lime } }}>
            Next
          </Button>
        ) : (
          <Button size="small" onClick={() => { dispatch(sample.resetSample()); navigate('/'); }} sx={{ color: colors.paleYellow }}>
            Leave the story
          </Button>
        )}
      </Stack>
    </Box>
  );
}
