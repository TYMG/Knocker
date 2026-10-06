// Wording and small pieces shared by the pages about lines: Lines, the line sign-up form and the
// machine page. Kept in one place so the three pages always describe a line the same way.

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ordinal } from '../sample/time';

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "Two teams go before you." Counts above ten are written as digits. */
export function teamsBeforeYou(count: number): string {
  const word = COUNT_WORDS[count] ?? String(count);
  return count === 1 ? 'One team goes before you.' : `${word} teams go before you.`;
}

/** The label for a place in a line: Playing, Next, 3rd, 4th... (position 1 is the team playing). */
export const spotLabel = (position: number) => (position === 1 ? 'Playing' : position === 2 ? 'Next' : ordinal(position));

/** Makes the first letter a capital: "playing now" becomes "Playing now". */
export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The style of the small grey capital labels: PLAYING, WAITING, YOUR SPOT. */
export const smallLabel = { fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 1.6 } as const;

/** A list of label and value pairs. Put <Fact> elements inside. */
export function Facts({ children }: { children: ReactNode }) {
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', rowGap: 0.75 }}>
      {children}
    </Box>
  );
}

/** One label and its value, side by side: "PLAYING  Drain Gang". */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
      <Typography component="dt" sx={{ ...smallLabel, width: 88, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, minWidth: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}
