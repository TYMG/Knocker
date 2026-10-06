import { StrictMode } from 'react';
import '@fontsource/bungee/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/doto/800.css';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import { store } from './store';
import { theme } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline enableColorScheme />
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
