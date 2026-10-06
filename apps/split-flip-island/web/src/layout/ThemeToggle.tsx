import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const next = { system: 'light', light: 'dark', dark: 'system' } as const;
  const current = mode ?? 'system';
  const icon = { system: <BrightnessAutoIcon />, light: <LightModeIcon />, dark: <DarkModeIcon /> }[current];
  return (
    <Tooltip title={`Theme: ${current}. Tap to switch.`}>
      <IconButton color="inherit" aria-label="Switch theme" onClick={() => setMode(next[current])}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}
