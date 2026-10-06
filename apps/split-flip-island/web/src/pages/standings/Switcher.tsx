// A two-way (or three-way) switch used on the Season and Finals pages: big buttons side by
// side, one of them on. The one that is on also gets a tick, so it is not shown by color alone.

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CheckIcon from '@mui/icons-material/Check';

export default function Switcher<T extends string>({
  value, onChange, options, label
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Read out by screen readers: what the switch chooses. */
  label: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      color="primary"
      value={value}
      // Tapping the option that is already on gives null: keep the current one.
      onChange={(_, next: T | null) => next && onChange(next)}
      aria-label={label}
      sx={{ maxWidth: 520 }}
    >
      {options.map((o) => (
        // A fixed height that holds two lines, so the row does not jump when a long label wraps.
        // Full-strength text on the option that is off: MUI's default grey is too faint on the light theme.
        <ToggleButton key={o.value} value={o.value} sx={{ height: 56, px: 1, gap: 0.5, textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.15, color: 'text.primary', bgcolor: 'background.paper' }}>
          {o.value === value && <CheckIcon sx={{ fontSize: 18 }} />}
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
