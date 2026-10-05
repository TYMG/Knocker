import { createTheme } from '@mui/material/styles';

// Palette pulled from a pinball playfield at a beach bar:
// lagoon teal, flipper-button yellow, and an amber dot-matrix display.
export const colors = {
  lagoon: '#0f6e6a',
  lagoonBright: '#3fb8af',
  flipper: '#f5b700',
  ink: '#13212b',
  mist: '#eef4f2',
  night: '#0c1a22',
  nightPaper: '#13252f',
  dmdGlass: '#140b02',
  dmdAmber: '#ffa51f'
};

const display = "'Bungee', Impact, 'Arial Black', sans-serif";
const body = "'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: colors.lagoon },
        secondary: { main: colors.flipper, contrastText: colors.ink },
        background: { default: colors.mist, paper: '#ffffff' },
        text: { primary: colors.ink }
      }
    },
    dark: {
      palette: {
        primary: { main: colors.lagoonBright, contrastText: colors.night },
        secondary: { main: colors.flipper, contrastText: colors.ink },
        background: { default: colors.night, paper: colors.nightPaper },
        text: { primary: '#e7f0ee' }
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
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { fullWidth: true } }
  }
});
