// Sign up, at "/join". A couple signs up as a team; a solo player joins the waitlist instead.
//
// Every new team waits for a league admin to approve it, and a sign-up nobody approves within
// 24 hours is deleted. The page says so up front, so nobody thinks they have a spot when they
// do not yet. After signing up, the team lands on its home page, which shows "Waiting for approval".
//
// The PIN is checked here (4 digits, typed twice) and then dropped. The sample league has no
// use for it, and a PIN must never be kept or sent anywhere it does not need to go.

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { formatPhoneInput } from '../lib/format';
import { teamPhoto } from '../sample/art';
import { approvedTeams, findTeamByName, pendingTeams } from '../sample/league';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import Page from '../ui/Page';
import PhotoPicker, { type PickedPhoto } from '../ui/PhotoPicker';
import TeamAvatar from '../ui/TeamAvatar';

type Mode = 'pair' | 'solo';

const digitsIn = (text: string) => text.replace(/\D/g, '');
const phoneError = (phone: string) => (digitsIn(phone).length === 10 ? '' : 'Enter all 10 digits of the phone number.');
const tidy = (text: string) => text.trim().replace(/\s+/g, ' ');

/** Sends the cursor to the first field that needs fixing, so the person is not left hunting for it. */
function focusFirst(ids: string[]) {
  for (const id of ids) {
    const field = document.getElementById(id);
    if (field) {
      field.focus();
      return;
    }
  }
}

// Phone and PIN fields bring up the number keypad on a phone.
const phoneInput = { htmlInput: { inputMode: 'tel', autoComplete: 'tel-national' } } as const;
// The PIN boxes show dots, like the keypad on a bank card reader. autoComplete is off so the
// browser does not fill in some other saved password.
const pinInput = { htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4, autoComplete: 'off' } } as const;

/** The pair's form: team name, two phones, a PIN typed twice and a photo. */
function PairForm() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  // An error shows once the person has left that field, or has pressed Sign up. Not while typing.
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);

  const teamName = tidy(name);
  const errors = {
    name:
      teamName.length < 2 || teamName.length > 30
        ? 'A team name is 2 to 30 characters.'
        : findTeamByName(league, teamName)
          ? 'That name is taken. Pick another one.'
          : '',
    phone1: phoneError(phone1),
    phone2: phoneError(phone2),
    pin: /^\d{4}$/.test(pin) ? '' : 'A PIN is 4 digits.',
    pinAgain: !pinAgain ? 'Type the PIN again.' : pinAgain !== pin ? 'The two PINs do not match.' : '',
    photo: photo ? '' : 'Add a team photo.'
  };
  type Field = keyof typeof errors;
  const shown = (field: Field) => (tried || left[field] ? errors[field] : '');
  const field = (key: Field, hint?: string) => ({
    id: `join-${key}`,
    error: !!shown(key),
    helperText: shown(key) || hint,
    onBlur: () => setLeft((l) => ({ ...l, [key]: true }))
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const wrong = (Object.keys(errors) as Field[]).filter((key) => errors[key]);
    if (wrong.length > 0) {
      focusFirst(wrong.map((key) => `join-${key}`));
      return;
    }
    // The PIN stops here on purpose. Only the name and the two phone numbers go to the league.
    dispatch(sample.signUp({ teamName, phone1, phone2 }));
    dispatch(showToast(`${teamName} is signed up and waiting for approval`));
    navigate('/');
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" slotProps={{ htmlInput: { maxLength: 30 } }} {...field('name', '2 to 30 characters.')} />
        <TextField label="Player 1 phone" type="tel" value={phone1} onChange={(e) => setPhone1(formatPhoneInput(e.target.value))} slotProps={phoneInput} {...field('phone1')} />
        <TextField label="Player 2 phone" type="tel" value={phone2} onChange={(e) => setPhone2(formatPhoneInput(e.target.value))} slotProps={phoneInput} {...field('phone2')} />
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '8px !important' }}>
          Phone numbers stay private. They never appear in the standings or the league log.
        </Typography>
        <TextField
          label="4-digit PIN"
          type="password"
          value={pin}
          onChange={(e) => setPin(digitsIn(e.target.value).slice(0, 4))}
          slotProps={pinInput}
          {...field('pin', 'You both use it to log in. Pick one you will both remember.')}
        />
        <TextField label="PIN again" type="password" value={pinAgain} onChange={(e) => setPinAgain(digitsIn(e.target.value).slice(0, 4))} slotProps={pinInput} {...field('pinAgain')} />

        <Box>
          <Typography component="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Team photo
          </Typography>
          <PhotoPicker value={photo} onChange={setPhoto} facing="user" standIn={teamPhoto(teamName || 'New Team')} hint="Both of you in the shot. It shows next to your team name in the standings." />
          {shown('photo') && (
            <Typography role="alert" variant="body2" sx={{ color: 'secondary.main', mt: 0.5, fontWeight: 700 }}>
              {shown('photo')}
            </Typography>
          )}
        </Box>

        <Button type="submit" variant="contained" color="secondary" size="large">
          Sign up
        </Button>
      </Stack>
    </Box>
  );
}

/** The solo player's form: a first name and a phone, then a confirmation in its place. */
function SoloForm() {
  const league = useLeague();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const [joinedAs, setJoinedAs] = useState<string | null>(null);

  if (joinedAs) {
    const others = league.waitlist.length - 1;
    return (
      <Alert severity="success" role="status">
        <Typography sx={{ fontWeight: 700 }}>You are on the waitlist, {joinedAs}.</Typography>
        If spots are left, the league admin will pair you with another solo player and get in touch.{' '}
        {others > 0 ? `${others} other solo ${others === 1 ? 'player is' : 'players are'} waiting too.` : 'You are the first one on it.'}
        <Box sx={{ mt: 1.5 }}>
          <Button component={RouterLink} to="/standings" variant="outlined" color="inherit">
            See the standings
          </Button>
        </Box>
      </Alert>
    );
  }

  const firstName = tidy(name);
  const errors = { name: firstName ? '' : 'Type your first name.', phone: phoneError(phone) };
  type Field = keyof typeof errors;
  const shown = (key: Field) => (tried || left[key] ? errors[key] : '');
  const field = (key: Field) => ({ id: `solo-${key}`, error: !!shown(key), helperText: shown(key) || undefined, onBlur: () => setLeft((l) => ({ ...l, [key]: true })) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const wrong = (Object.keys(errors) as Field[]).filter((key) => errors[key]);
    if (wrong.length > 0) {
      focusFirst(wrong.map((key) => `solo-${key}`));
      return;
    }
    dispatch(sample.joinWaitlist(firstName));
    dispatch(showToast(`${firstName} joined the waitlist`));
    setJoinedAs(firstName);
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="First name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" slotProps={{ htmlInput: { maxLength: 30 } }} {...field('name')} />
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} slotProps={phoneInput} {...field('phone')} />
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '8px !important' }}>
          Your phone number stays private. It is only used to reach you about a partner.
        </Typography>
        <Button type="submit" variant="contained" color="secondary" size="large">
          Join the waitlist
        </Button>
      </Stack>
    </Box>
  );
}

function ModeButton({ value, mode, children, ...rest }: { value: Mode; mode: Mode; children: ReactNode; disabled?: boolean }) {
  // ToggleButtonGroup passes its own props (selected, onChange...) down to each child, so pass them on.
  return (
    <ToggleButton value={value} {...rest} sx={{ minHeight: 48, textTransform: 'none', fontWeight: 700, fontSize: '1rem', gap: 0.5 }}>
      {/* A tick as well as the color, so the choice does not rest on color alone. */}
      {mode === value && <CheckIcon fontSize="small" />}
      {children}
    </ToggleButton>
  );
}

export default function SignUp() {
  const league = useLeague();
  const me = useMe();
  const taken = approvedTeams(league).length;
  const waiting = pendingTeams(league).length;
  const full = taken >= league.teamCap;
  const [picked, setPicked] = useState<Mode>('pair');
  // With every spot taken, the waitlist is the only way in.
  const mode: Mode = full ? 'solo' : picked;

  // A team that is already logged in has nothing to do here.
  if (me.isTeam) {
    return (
      <Page title="Sign up your team">
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <TeamAvatar team={me.team} size={56} mine />
            <Typography>
              You are logged in as <strong>{me.team.teamName}</strong>. To sign up another team, log out first with the button at the top right.
            </Typography>
          </Stack>
          <Button component={RouterLink} to="/" variant="contained" color="secondary" size="large">
            Go to team home
          </Button>
        </Stack>
      </Page>
    );
  }

  return (
    <Page
      title="Sign up your team"
      subtitle={
        <>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {taken} of {league.teamCap} spots taken
          </Box>
          {waiting > 0 && `. ${waiting} more ${waiting === 1 ? 'sign-up is' : 'sign-ups are'} waiting for approval.`}
        </>
      }
    >
      <Stack spacing={2.5}>
        {full && <Alert severity="info">All {league.teamCap} spots are taken. You can still join the waitlist, as a solo player or to hear about next season.</Alert>}

        <Box>
          <ToggleButtonGroup exclusive fullWidth color="primary" value={mode} onChange={(_, next: Mode | null) => next && setPicked(next)} aria-label="Who is signing up">
            <ModeButton value="pair" mode={mode} disabled={full}>
              We are a pair
            </ModeButton>
            <ModeButton value="solo" mode={mode}>
              I am solo
            </ModeButton>
          </ToggleButtonGroup>
          <Typography sx={{ color: 'text.secondary', mt: 1.5 }}>
            A pair’s sign-up goes to the league admin for approval, and is deleted if nobody approves it within 24 hours. Solo players join the waitlist and get paired if spots are left.
          </Typography>
        </Box>

        {mode === 'pair' ? <PairForm /> : <SoloForm />}

        <Typography sx={{ textAlign: 'center' }}>
          Already signed up?{' '}
          <Link component={RouterLink} to="/login" sx={{ fontWeight: 700, display: 'inline-block', py: 1.25 }}>
            Log in
          </Link>
        </Typography>
      </Stack>
    </Page>
  );
}
