import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/**
 * A big tappable row that goes to one job: a title, a line saying what is waiting there, and an
 * arrow. `alert` draws the coral edge used when something needs attention.
 */
export default function ActionCard({ to, title, note, alert, icon }: { to: string; title: ReactNode; note?: ReactNode; alert?: boolean; icon?: ReactNode }) {
  return (
    <Card sx={alert ? { borderColor: 'secondary.main', borderLeftWidth: 5 } : undefined}>
      <CardActionArea component={RouterLink} to={to} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, minHeight: 64 }}>
        {icon && <Box sx={{ display: 'flex', color: alert ? 'secondary.main' : 'primary.main' }}>{icon}</Box>}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</Typography>
          {note && (
            <Typography variant="body2" color={alert ? 'secondary.main' : 'text.secondary'}>
              {note}
            </Typography>
          )}
        </Box>
        <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </CardActionArea>
    </Card>
  );
}
