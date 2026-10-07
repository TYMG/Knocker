// Tonight's prescription: the Love Dr.'s one piece of advice on what to play next.
// Shown on team home while the night is open. The picking is in sample/loveDr.ts.

import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLeague } from '../hooks';
import { prescription } from '../sample/loveDr';
import Section from '../ui/Section';
import { Mascot } from './LoveDr';

export default function DrPrescription({ teamId }: { teamId: string }) {
  const league = useLeague();
  const rx = prescription(league, teamId);
  if (!rx) return null;
  return (
    <Section title="Tonight's prescription" aside="From the Love Dr.">
      <Card sx={{ p: 2, borderColor: 'primary.main' }} data-testid="prescription">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Mascot size={48} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="p">
              {rx.phrase}: {rx.machine.name}
            </Typography>
            <Typography sx={{ mt: 0.5 }}>{rx.says}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
              {rx.lineNote}
              {rx.second ? ` Second choice: ${rx.second.machine.name}.` : ''}
            </Typography>
          </Box>
        </Stack>
        {/* Outlined, not coral: the one main action on team home is still "Submit a score". */}
        {rx.action && (
          <Button component={RouterLink} to={rx.action.to} variant="outlined" fullWidth sx={{ mt: 1.5, minHeight: 48 }}>
            {rx.action.label}
          </Button>
        )}
      </Card>
    </Section>
  );
}
