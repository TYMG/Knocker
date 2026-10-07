import { createTheme } from '@mui/material/styles';

// "Blacklight": the palette Matt picked on 2026-10-06. It is dark first.
// Every color in the app comes from this object, so a new palette is a change to this file only.
export const colors = {
  // Matt's palette (coolors.co/palette/ff616b-000000-a49a87-ffff99-ccff00)
  coral: '#ff616b',
  black: '#000000',
  sand: '#a49a87',
  paleYellow: '#ffff99',
  lime: '#ccff00',
  // Added: a near-black so cards separate from the black page
  card: '#1c1a16',
  // Added for the light theme (Matt, 2026-10-07): a soft pastel pink page with warm grey for
  // quiet text and lines, in place of the pale yellow page, which read as harsh neon.
  blush: '#f4e4e8',
  warmGrey: '#5c5357',
  // Amber dot-matrix score display
  dmdGlass: '#140b02',
  dmdAmber: '#ffa51f'
};

const display = "'Bungee', Impact, 'Arial Black', sans-serif";
const body = "'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    // Dark is Blacklight as picked, and the default. Light is a soft pastel pink page with grey, black type and the same coral.
    light: {
      palette: {
        primary: { main: colors.black, contrastText: '#ffffff' },
        secondary: { main: colors.coral, contrastText: colors.black },
        background: { default: colors.blush, paper: '#ffffff' },
        text: { primary: colors.black, secondary: colors.warmGrey },
        divider: 'rgba(92, 83, 87, 0.28)'
      }
    },
    dark: {
      palette: {
        primary: { main: colors.lime, contrastText: colors.black },
        secondary: { main: colors.coral, contrastText: colors.black },
        success: { main: colors.lime, contrastText: colors.black },
        error: { main: colors.coral, contrastText: colors.black },
        info: { main: colors.sand, contrastText: colors.black },
        background: { default: colors.black, paper: colors.card },
        text: { primary: colors.paleYellow, secondary: colors.sand },
        divider: 'rgba(164, 154, 135, 0.32)'
      }
    }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: body,
    fontSize: 15,
    h1: { fontFamily: display, fontSize: 'clamp(2.4rem, 11vw, 4.5rem)', lineHeight: 0.95, fontWeight: 400 },
    h2: { fontFamily: display, fontSize: '1.75rem', lineHeight: 1.1, fontWeight: 400 },
    h3: { fontFamily: display, fontSize: '1.3rem', lineHeight: 1.15, fontWeight: 400 },
    h4: { fontWeight: 700, fontSize: '1.1rem' },
    button: { textTransform: 'none', fontWeight: 700, fontSize: '1rem' }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { sizeLarge: { minHeight: 52 } }
    },
    // The top bar is sand with black type in both schemes.
    // MUI swaps the bar to the card color in dark mode, so the override is repeated for that scheme.
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => {
          const bar = { '--AppBar-background': colors.sand, '--AppBar-color': colors.black, backgroundColor: colors.sand, color: colors.black, backgroundImage: 'none' };
          return { ...bar, ...theme.applyStyles('dark', bar) };
        }
      }
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { fullWidth: true } }
  }
});
