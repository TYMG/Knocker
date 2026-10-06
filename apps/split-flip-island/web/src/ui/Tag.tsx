import type { ReactNode } from 'react';
import Box from '@mui/material/Box';

export type Tone = 'good' | 'warn' | 'bad' | 'plain' | 'live';

const tones: Record<Tone, { color: string; bg: string; border: string }> = {
  good: { color: 'primary.main', bg: 'transparent', border: 'primary.main' },
  warn: { color: 'secondary.main', bg: 'transparent', border: 'secondary.main' },
  bad: { color: 'secondary.contrastText', bg: 'secondary.main', border: 'secondary.main' },
  plain: { color: 'text.secondary', bg: 'transparent', border: 'divider' },
  live: { color: 'primary.contrastText', bg: 'primary.main', border: 'primary.main' }
};

/**
 * A small status label. good = lime outline ("Checked"), warn = coral outline ("Needs a look"),
 * bad = solid coral ("Voided", "Out tonight"), live = solid lime ("OPEN", "LIVE"), plain = quiet grey.
 */
export default function Tag({ tone = 'plain', children }: { tone?: Tone; children: ReactNode }) {
  const t = tones[tone];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block', px: 1, py: 0.125, borderRadius: 999, border: 1, borderColor: t.border, color: t.color, bgcolor: t.bg,
        fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', verticalAlign: 'middle'
      }}
    >
      {children}
    </Box>
  );
}
