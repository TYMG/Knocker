import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { errorMessage, useAuditQuery } from '../api';
import { timeAgo } from '../lib/format';

export default function AuditLog() {
  const { data, error, isLoading } = useAuditQuery(undefined, { pollingInterval: 30000 });

  if (isLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />;
  if (error || !data) return <Alert severity="error">{errorMessage(error)}</Alert>;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>
        League log
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Every sign-up, score, and correction, newest first. Admin changes always include a reason.
      </Typography>
      {data.entries.length === 0 ? (
        <Typography color="text.secondary">Nothing has happened yet. Sign-ups and scores will show up here.</Typography>
      ) : (
        <Card>
          {data.entries.map((e) => (
            <Box key={e.id} sx={{ px: 2, py: 1.25, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
              <Typography>{e.action}</Typography>
              {e.reason && (
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Reason: {e.reason}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {timeAgo(e.at)}
              </Typography>
            </Box>
          ))}
        </Card>
      )}
    </Box>
  );
}
