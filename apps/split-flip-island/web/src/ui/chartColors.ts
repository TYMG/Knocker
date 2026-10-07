import { useColorScheme } from '@mui/material/styles';

// The eight colors charts use to tell things apart (teams in the season charts, weeks in the
// bubble chart). They were checked so that people with color-blindness can separate them, on a
// white card and on a near-black one, which is why they are not the brand colors. Keep the
// order: slot 1 is always the same thing wherever it appears.
const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
};

/** The eight chart colors for the theme showing right now, and whether that theme is dark. */
export function useSeriesColors() {
  // The theme uses CSS variables, so ask for the active scheme rather than reading theme.palette.
  const { mode, systemMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) === 'dark';
  return { dark, palette: dark ? SERIES_COLORS.dark : SERIES_COLORS.light };
}

/**
 * Eight colors are as many as an eye can keep apart, and a league can have twelve teams. So the
 * ninth team onward reuses the colors with a dashed line, and the seventeenth with a dotted one:
 * color and line style together are what make each team unique.
 */
export const LINE_STYLES = [
  { name: 'solid', dash: undefined },
  { name: 'dashed', dash: '7 5' },
  { name: 'dotted', dash: '2 5' }
] as const;
