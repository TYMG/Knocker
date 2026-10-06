import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** A titled block within a page. `aside` sits to the right of the title (a count, a link, a small button). */
export default function Section({ title, aside, children, small }: { title: ReactNode; aside?: ReactNode; children: ReactNode; small?: boolean }) {
  return (
    <Box component="section">
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
        <Typography variant={small ? 'overline' : 'h3'} component="h3" sx={{ flexGrow: 1, minWidth: 0, ...(small && { color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, lineHeight: 1.6 }) }}>
          {title}
        </Typography>
        {aside && (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {aside}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}
