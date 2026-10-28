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
import Checkbox from '@mui/material/Checkbox';
import { SaveNumberButton } from '../ui/TextsParts';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { useAppDispatch, useAppSelector, useLeague, useMe } from '../hooks';
import { formatPhoneInput } from '../lib/format';
import { teamPhoto } from '../sample/art';
import { approvedTeams, findTeamByName, pendingTeams } from '../sample/league';
import { sample } from '../sample/slice';
import { showToast } from '../store';
import { PLAYER_NAME_MAX, PRONOUN_CHOICES, PRONOUNS_MAX } from '../../../shared/types';
import { pinProblem } from '../../../shared/pin';
import { live } from '../live/client';
import { refreshLive } from '../live/sync';
import Page from '../ui/Page';
import PhotoPicker, { type PickedPhoto } from '../ui/PhotoPicker';
import TeamAvatar from '../ui/TeamAvatar';
import { SoloQuestions, WantsPicker, type Answers } from '../ui/SoloQuestions';
import type { SoloTraits, Wants } from '../../../shared/league/match';

type Mode = 'pair' | 'solo';

const digitsIn = (text: string) => text.replace(/\D/g, '');
const nameError = (name: string, n: number) => (tidy(name).length >= 1 ? '' : `Enter Player ${n}'s first name.`);
const pronounsError = (p: string) => (tidy(p).length <= PRONOUNS_MAX ? '' : `Up to ${PRONOUNS_MAX} characters.`);

const OTHER = 'other';
/** Pronouns: a short list, "Prefer not to say", or "Type my own" for anything else. */
function PronounPicker({ value, onChange, field }: { value: string; onChange: (v: string) => void; field: { id: string; error: boolean; helperText?: string; onBlur: () => void } }) {
  const listed = value === '' || (PRONOUN_CHOICES as readonly string[]).includes(value);
  const [custom, setCustom] = useState(!listed);
  const choice = custom ? OTHER : value;
  return (
    <Box sx={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        select
        label="Pronouns"
        value={choice}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) { setCustom(true); onChange(''); } else { setCustom(false); onChange(v); }
        }}
        id={`${field.id}-pick`}
        helperText={custom ? undefined : field.helperText}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">Prefer not to say</MenuItem>
        {PRONOUN_CHOICES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        <MenuItem value={OTHER}>Type my own</MenuItem>
      </TextField>
      {custom && (
        <TextField
          label="Your pronouns"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, PRONOUNS_MAX))}
          autoFocus
          autoComplete="off"
          id={field.id}
          error={field.error}
          helperText={field.helperText}
          onBlur={field.onBlur}
        />
      )}
    </Box>
  );
}

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
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [pronouns1, setPronouns1] = useState('');
  const [pronouns2, setPronouns2] = useState('');
  // Texts are opt-in, per phone: off until that player ticks it (the carriers require this too).
  const [texts, setTexts] = useState<[boolean, boolean]>([false, false]);
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  // An error shows once the person has left that field, or has pressed Sign up. Not while typing.
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const liveOn = useAppSelector((x) => x.live.on);
  const [failed, setFailed] = useState('');
  const [sending, setSending] = useState(false);

  const teamName = tidy(name);
  const errors = {
    name:
      teamName.length < 2 || teamName.length > 30
        ? 'A team name is 2 to 30 characters.'
        : findTeamByName(league, teamName)
          ? 'That name is taken. Pick another one.'
          : '',
    name1: nameError(name1, 1),
    pronouns1: pronounsError(pronouns1),
    phone1: phoneError(phone1),
    name2: nameError(name2, 2),
    pronouns2: pronounsError(pronouns2),
    phone2: phoneError(phone2) || (digitsIn(phone2).length === 10 && digitsIn(phone2) === digitsIn(phone1) ? 'Each player needs their own phone number.' : ''),
    pin: pinProblem(pin),
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
    // The PIN stops here on purpose. Only the names, pronouns, phones and text choices go to the league.
    const players: [{ name: string; pronouns: string }, { name: string; pronouns: string }] = [
      { name: tidy(name1), pronouns: tidy(pronouns1) },
      { name: tidy(name2), pronouns: tidy(pronouns2) }
    ];
    if (liveOn) {
      // The live league: the photo uploads first, then the server creates the team.
      if (!photo?.photo) { setFailed('Take or choose a real team photo for the live league.'); return; }
      setFailed('');
      setSending(true);
      live.signUp({ teamName, players, phone1, phone2, pin, texts }, photo.photo)
        .then(async () => { await refreshLive(); dispatch(showToast(`${teamName} is signed up and waiting for approval`)); navigate('/'); })
        .catch((err: Error) => setFailed(err.message))
        .finally(() => setSending(false));
      return;
    }
    dispatch(sample.signUp({ teamName, players, phone1, phone2, texts }));
    dispatch(showToast(`${teamName} is signed up and waiting for approval`));
    navigate('/');
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" slotProps={{ htmlInput: { maxLength: 30 } }} {...field('name', '2 to 30 characters.')} />
        {([1, 2] as const).map((n) => {
          const i = n - 1;
          const k = (f: 'name' | 'pronouns' | 'phone') => `${f}${n}` as Field;
          return (
            <Box key={n} component="fieldset" sx={{ border: 1, borderColor: 'divider', borderRadius: 2, m: 0, px: 2, pt: 1, pb: 1.5 }}>
              <Box component="legend" sx={{ px: 0.5, fontWeight: 700 }}>Player {n}</Box>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <TextField
                    label="First name"
                    value={n === 1 ? name1 : name2}
                    onChange={(e) => (n === 1 ? setName1 : setName2)(e.target.value.slice(0, PLAYER_NAME_MAX))}
                    autoComplete="off"
                    sx={{ flex: '1 1 150px' }}
                    {...field(k('name'))}
                  />
                  <PronounPicker
                    value={n === 1 ? pronouns1 : pronouns2}
                    onChange={n === 1 ? setPronouns1 : setPronouns2}
                    field={field(k('pronouns'), 'Optional')}
                  />
                </Box>
                <TextField label="Phone" type="tel" value={n === 1 ? phone1 : phone2} onChange={(e) => (n === 1 ? setPhone1 : setPhone2)(formatPhoneInput(e.target.value))} slotProps={phoneInput} {...field(k('phone'))} />
                <FormControlLabel
                  control={<Checkbox checked={texts[i]} onChange={(e) => setTexts((t) => (i === 0 ? [e.target.checked, t[1]] : [t[0], e.target.checked]))} />}
                  label={
                    <Typography variant="body2">
                      Text this phone a reminder to check in on league nights (about 1 text a league night). Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.
                    </Typography>
                  }
                  sx={{ alignItems: 'flex-start', mx: 0, '& .MuiCheckbox-root': { pt: 0.25 } }}
                />
              </Stack>
            </Box>
          );
        })}
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '8px !important' }}>
          Phone numbers stay private. They never appear in the standings or the league log. Names and pronouns show with your team.{' '}
          <Link href="https://knckr.com/sms.html" target="_blank" rel="noopener">Text terms and privacy</Link>
        </Typography>
        {(texts[0] || texts[1]) && <SaveNumberButton />}
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

        {failed && <Typography role="alert" sx={{ color: 'secondary.main', fontWeight: 700 }}>{failed}</Typography>}
        <Button type="submit" variant="contained" color="secondary" size="large" disabled={sending}>
          {sending ? 'Signing up…' : 'Sign up'}
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * The solo player's form: first name, pronouns, phone, texts, a PIN and the matchmaker's questions.
 * Then they go to their partner page (/solo) to see who else is waiting.
 */
function SoloForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [texts, setTexts] = useState(false);
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [wants, setWants] = useState<Wants>('anyone');
  const liveOn = useAppSelector((x) => x.live.on);
  const [failed, setFailed] = useState('');
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);

  const firstName = tidy(name);
  const pick = 'Pick one.';
  const errors = {
    name: firstName ? '' : 'Type your first name.', pronouns: pronounsError(pronouns), phone: phoneError(phone),
    pin: pinProblem(pin), pinAgain: !pinAgain ? 'Type the PIN again.' : pinAgain !== pin ? 'The two PINs do not match.' : '',
    why: answers.why ? '' : pick, energy: answers.energy ? '' : pick, experience: answers.experience ? '' : pick, style: answers.style ? '' : pick
  };
  type Field = keyof typeof errors;
  const shown = (key: Field) => (tried || left[key] ? errors[key] : '');
  const field = (key: Field, hint?: string) => ({ id: `solo-${key}`, error: !!shown(key), helperText: shown(key) || hint, onBlur: () => setLeft((l) => ({ ...l, [key]: true })) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const wrong = (Object.keys(errors) as Field[]).filter((key) => errors[key]);
    if (wrong.length > 0) {
      focusFirst(wrong.map((key) => `solo-${key}`));
      return;
    }
    const traits = answers as SoloTraits;
    if (liveOn) {
      // The live league: the server keeps the phone and PIN private.
      setFailed('');
      setSending(true);
      live.joinWaitlist({ name: firstName, pronouns: tidy(pronouns), phone, texts, pin, traits, wants })
        .then(async () => { await refreshLive(); dispatch(showToast(`${firstName} joined the waitlist`)); navigate('/solo'); })
        .catch((err: Error) => setFailed(err.message))
        .finally(() => setSending(false));
      return;
    }
    dispatch(sample.joinWaitlist({ name: firstName, pronouns: tidy(pronouns), traits, wants }));
    dispatch(showToast(`${firstName} joined the waitlist`));
    navigate('/solo');
  };

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField label="First name" value={name} onChange={(e) => setName(e.target.value.slice(0, PLAYER_NAME_MAX))} autoComplete="given-name" sx={{ flex: '1 1 150px' }} {...field('name')} />
          <PronounPicker value={pronouns} onChange={setPronouns} field={field('pronouns') as { id: string; error: boolean; helperText?: string; onBlur: () => void }} />
        </Box>
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} slotProps={phoneInput} {...field('phone', 'You log back in with it.')} />
        <TextField label="PIN" type="password" value={pin} onChange={(e) => setPin(digitsIn(e.target.value).slice(0, 4))} slotProps={pinInput} {...field('pin', '4 digits, to log back in and see your matches.')} />
        <TextField label="PIN again" type="password" value={pinAgain} onChange={(e) => setPinAgain(digitsIn(e.target.value).slice(0, 4))} slotProps={pinInput} {...field('pinAgain')} />
        <FormControlLabel
          control={<Checkbox checked={texts} onChange={(e) => setTexts(e.target.checked)} />}
          label={<Typography variant="body2">Text this phone a reminder to check in on league nights once you're on a team (about 1 text a league night). Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.</Typography>}
          sx={{ alignItems: 'flex-start', mx: 0, '& .MuiCheckbox-root': { pt: 0.25 } }}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '8px !important' }}>
          Your phone number stays private. It is only used to log you in, reach you about a partner and, if you tick the box, for the reminder.{' '}
          <Link href="https://knckr.com/sms.html" target="_blank" rel="noopener">Text terms and privacy</Link>
        </Typography>

        <Typography variant="h3" component="h2" sx={{ fontSize: '1.15rem', pt: 1 }}>Find your partner</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: '4px !important' }}>
          Other solo players see your answers, never your name. When you and another player both pick each other, you're a team.
        </Typography>
        <SoloQuestions answers={answers} onChange={setAnswers} errors={{ why: shown('why'), energy: shown('energy'), experience: shown('experience'), style: shown('style') }} />
        <WantsPicker value={wants} onChange={setWants} />

        {failed && <Typography role="alert" sx={{ color: 'secondary.main', fontWeight: 700 }}>{failed}</Typography>}
        <Button type="submit" variant="contained" color="secondary" size="large" disabled={sending}>
          {sending ? 'Joining…' : 'Join the waitlist'}
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
            A pair’s sign-up goes to the league admin for approval, and is deleted if nobody approves it within 24 hours. Solo players join the waitlist and pick a partner from the other solo players.
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
