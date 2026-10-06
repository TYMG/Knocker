import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ScoreDisplay from '../components/ScoreDisplay';

export default function Welcome() {
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h1" color="primary" sx={{ mb: 2 }}>
        Split Flipper Island
      </Typography>
      <Typography sx={{ fontSize: '1.2rem', lineHeight: 1.5, mb: 3 }}>
        Two players share one pinball machine. You take the left flipper, your partner takes the right, and you each get one
        hand. Eight weeks of league nights at Lyman's, then a championship.
      </Typography>
      <Box sx={{ mb: 4 }}>
        <ScoreDisplay value={24680135} size="lg" label="Example pinball score" />
      </Box>
      <Stack spacing={1.5}>
        <Button component={RouterLink} to="/join" variant="contained" color="secondary" size="large">
          Sign up your team
        </Button>
        <Button component={RouterLink} to="/login" variant="outlined" size="large">
          Log in
        </Button>
        <Button component={RouterLink} to="/standings" size="large">
          See the standings
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ mt: 4, textAlign: 'center' }}>
        <Link component={RouterLink} to="/admin" color="text.secondary" sx={{ display: 'inline-block', py: 1.5, px: 2 }}>
          League admin
        </Link>
      </Typography>
    </Box>
  );
}
