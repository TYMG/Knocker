import Box from '@mui/material/Box';
import { colors } from '../theme';
import { formatScore } from '../lib/format';

/**
 * Scores render like a pinball dot-matrix display: amber dots on dark glass.
 * This is the app's one loud visual moment; everything else stays quiet.
 */
export default function ScoreDisplay({ value, size = 'md', label }: { value: number | null; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const fontSize = { sm: '1.05rem', md: '1.6rem', lg: 'clamp(2rem, 10vw, 3.4rem)' }[size];
  const pad = { sm: '4px 10px', md: '8px 14px', lg: '18px 20px' }[size];
  return (
    <Box
      role="img"
      aria-label={label ?? (value === null ? 'No score yet' : `Score ${formatScore(value)}`)}
      sx={{
        display: 'inline-flex',
        justifyContent: 'flex-end',
        minWidth: size === 'lg' ? '100%' : undefined,
        p: pad,
        borderRadius: '6px',
        bgcolor: colors.dmdGlass,
        backgroundImage: 'radial-gradient(rgba(255,165,31,0.10) 1px, transparent 1.2px)',
        backgroundSize: '4px 4px',
        boxShadow: 'inset 0 0 0 1px rgba(255,165,31,0.18)',
        fontFamily: "'Doto', 'Courier New', monospace",
        fontWeight: 800,
        fontSize,
        lineHeight: 1,
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
        color: colors.dmdAmber,
        textShadow: '0 0 6px rgba(255,165,31,0.55)',
        whiteSpace: 'nowrap'
      }}
    >
      {value === null ? '––' : formatScore(value)}
    </Box>
  );
}
