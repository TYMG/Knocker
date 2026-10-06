// Small pieces shared by the "running the night" admin pages (check-in, scores, lines, lineup,
// night settings). They live here, next to those pages, because nothing else in the app uses them.

import { Link as RouterLink } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { checkLabel } from '../../sample/league';
import type { SScore } from '../../sample/types';
import { colors } from '../../theme';
import type { Tone } from '../../ui/Tag';

/** Every "night" admin page goes back to the same place. */
export const ADMIN_HOME = { to: '/admin', label: 'Admin home' } as const;

/**
 * Styling for a sentence that needs the admin's attention, such as why a score was flagged.
 * Coral on the dark scheme. On the light scheme coral on white is too faint to read, so it stays
 * the main text color and relies on its weight and the coral tag or edge next to it.
 * (Typography's `color` prop cannot do this: in MUI 9 it ignores theme paths like "secondary.main".)
 */
export function attention(extra: Record<string, string | number> = {}): SxProps<Theme> {
  return [{ color: 'text.primary', fontWeight: 700, ...extra }, (theme) => theme.applyStyles('dark', { color: colors.coral })];
}

/**
 * Styling for a row of choice buttons (the score filters, the week switcher, In / Out). The chosen
 * one is filled so it is obvious at arm's length in both color schemes; MUI's own tint is too faint.
 */
export const choiceSx = {
  '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, minHeight: 48, px: 0.75, lineHeight: 1.2, color: 'text.primary' },
  '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
  // Read-only (a finished week): the chosen side stays filled so it can be read, but faded.
  '& .MuiToggleButton-root.Mui-disabled:not(.Mui-selected)': { color: 'text.disabled' },
  '& .MuiToggleButton-root.Mui-disabled.Mui-selected': { opacity: 0.55 }
} as const;

/** "1 minute", "48 minutes", "1 hour 15 minutes". Spelled out because it is read at a glance in a bar. */
export function minutesWords(minutes: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? plural(hours, 'hour') : `${plural(hours, 'hour')} ${plural(rest, 'minute')}`;
}

/** "Venom", "Venom and Jaws", "Venom, Jaws and Godzilla" */
export function listWords(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The short status for a score's Tag. `checkLabel` gives the full sentence ("Needs a look: photo
 * came from the library..."), which is too long for a Tag, so the Tag takes the part before the
 * colon and the page prints the reason as ordinary text beside it.
 */
export function scoreStatus(score: SScore): { label: string; tone: Tone } {
  const label = checkLabel(score).split(':')[0]!;
  if (score.status === 'voided') return { label, tone: 'bad' };
  if (score.check === 'flagged') return { label, tone: 'warn' };
  if (score.check === 'checked') return { label, tone: 'good' };
  return { label, tone: 'plain' };
}

/**
 * What a page shows instead of its controls when no league night is open. `children` says what
 * the page cannot do right now. Reopening lives on Night settings, so the button goes there.
 */
export function NightClosed({ week, children }: { week: number; children: string }) {
  return (
    <Alert severity="info">
      <Typography sx={{ fontWeight: 700 }}>Week {week} is closed</Typography>
      {children}
      {/* Under the text, not beside it: on a phone a side button squeezes the sentence into a thin column. */}
      <Box sx={{ mt: 1 }}>
        <Button component={RouterLink} to="/admin/night" variant="outlined" color="inherit" sx={{ minHeight: 44 }}>
          Night settings
        </Button>
      </Box>
    </Alert>
  );
}
