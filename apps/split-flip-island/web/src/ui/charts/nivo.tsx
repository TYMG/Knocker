// What every Nivo chart in the app shares: the look (type, grid, tooltip) for the theme showing
// right now, whether to animate (calm mode says no), and the small tooltip box.

import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { useCalm } from '../../hooks';
import { colors } from '../../theme';
import { useSeriesColors } from '../chartColors';

const font = "'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif";

export function useNivo() {
  const { dark, palette } = useSeriesColors();
  const calm = useCalm();
  const ink = dark ? '#ffffff' : colors.black;
  const quiet = dark ? colors.sand : colors.warmGrey;
  const rule = dark ? 'rgba(164, 154, 135, 0.28)' : 'rgba(92, 83, 87, 0.24)';
  const card = dark ? colors.card : '#ffffff';
  const theme = useMemo(
    () => ({
      text: { fontFamily: font, fontSize: 12, fill: quiet },
      axis: {
        ticks: { text: { fontFamily: font, fontSize: 12, fill: quiet }, line: { stroke: rule } },
        domain: { line: { stroke: 'transparent' } },
        legend: { text: { fontFamily: font, fontSize: 12, fill: quiet } }
      },
      grid: { line: { stroke: rule, strokeWidth: 1 } },
      labels: { text: { fontFamily: font, fontSize: 13, fontWeight: 700 } },
      dots: { text: { fontFamily: font, fontSize: 12, fill: quiet } },
      crosshair: { line: { stroke: quiet, strokeWidth: 1, strokeOpacity: 0.7 } },
      tooltip: { container: { background: card, color: ink, fontFamily: font, fontSize: 13, borderRadius: 8, border: `1px solid ${rule}`, boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)' } }
    }),
    [quiet, rule, card, ink]
  );
  return { theme, animate: !calm, motionConfig: 'gentle' as const, calm, dark, palette, ink, quiet, rule, card };
}

/** The box a chart shows when you point at or tap something. */
export function ChartTip({ children }: { children: ReactNode }) {
  const { card, ink, rule } = useNivo();
  return (
    <Box sx={{ bgcolor: card, color: ink, border: `1px solid ${rule}`, borderRadius: 2, px: 1.25, py: 0.75, fontSize: 13, lineHeight: 1.35, boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)', whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

/** A hex color at a given strength, for fading and for heat. */
export function fade(hex: string, strength: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${strength})`;
}
