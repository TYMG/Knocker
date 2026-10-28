// The matchmaker's questions on the solo sign-up form: four about how you play, and who you'd
// like to play with. The answers are shared as traits on nameless cards; who you'd like to play
// with never is.
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { QUESTIONS, WANTS_CHOICES, type SoloTraits, type Wants } from '../../../shared/league/match';

export type Answers = Partial<SoloTraits>;

export function SoloQuestions({ answers, onChange, errors }: { answers: Answers; onChange: (a: Answers) => void; errors: Partial<Record<keyof SoloTraits, string>> }) {
  return (
    <Stack spacing={2}>
      {QUESTIONS.map((q) => (
        <FormControl key={q.key} error={!!errors[q.key]} component="fieldset">
          <FormLabel component="legend" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, '&.Mui-focused': { color: 'text.primary' } }}>{q.label}</FormLabel>
          <RadioGroup name={`solo-${q.key}`} value={answers[q.key] ?? ''} onChange={(e) => onChange({ ...answers, [q.key]: e.target.value })}>
            {(q.choices as { value: string; label: string }[]).map((c, i) => (
              <FormControlLabel key={c.value} value={c.value} label={c.label} control={<Radio id={i === 0 ? `solo-${q.key}` : undefined} />} sx={{ minHeight: 40 }} />
            ))}
          </RadioGroup>
          {errors[q.key] && <FormHelperText>{errors[q.key]}</FormHelperText>}
        </FormControl>
      ))}
    </Stack>
  );
}

export function WantsPicker({ value, onChange }: { value: Wants; onChange: (w: Wants) => void }) {
  return (
    <TextField
      select
      id="solo-wants"
      label="Who would you like to play with?"
      value={value}
      onChange={(e) => onChange(e.target.value as Wants)}
      helperText="Never shown to anyone. You only see players who fit, and only players you fit see you. We go by pronouns."
    >
      {WANTS_CHOICES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
    </TextField>
  );
}
