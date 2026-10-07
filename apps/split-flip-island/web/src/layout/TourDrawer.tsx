import { useLocation, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { tourFor } from '../sample/tour';
import { setTourOpen, showToast } from '../store';
import Tag from '../ui/Tag';

const ROLE_NAME = { visitor: 'a visitor', team: 'a logged-in team', admin: 'an admin' } as const;

/** The panel behind "About this page": who the page is for, when they use it and what they do there. */
export default function TourDrawer() {
  const open = useAppSelector((s) => s.ui.tourOpen);
  const league = useLeague();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const page = tourFor(pathname, league.role);
  const close = () => dispatch(setTourOpen(false));
  const me = useMe();
  // An admin who is on a team sees team pages as that team, so they are not "the wrong person" for one.
  const wrongRole = !!page && ((page.role === 'team' && !me.isTeam) || (page.role === 'admin' && !me.isAdmin));

  const label = { fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' } as const;

  return (
    <Drawer anchor="bottom" open={open} onClose={close} slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85dvh' } } }}>
      <Box sx={{ maxWidth: 640, width: '100%', mx: 'auto', p: 2.5, pb: 'calc(20px + env(safe-area-inset-bottom))' }}>
        {page ? (
          <Stack spacing={2}>
            <Box>
              <Tag tone="good">{page.group}</Tag>
              <Typography variant="h2" sx={{ mt: 1 }}>
                {page.title}
              </Typography>
            </Box>
            <Box>
              <Typography sx={label}>Who uses it</Typography>
              <Typography>{page.who}</Typography>
            </Box>
            <Box>
              <Typography sx={label}>When</Typography>
              <Typography>{page.when}</Typography>
            </Box>
            <Box>
              <Typography sx={label}>What they do here</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                {page.does.map((d) => (
                  <li key={d}>
                    <Typography>{d}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
            {page.tryIt && (
              <Box sx={{ border: 1, borderColor: 'primary.main', borderRadius: 2, p: 1.5 }}>
                <Typography sx={{ ...label, color: 'primary.main' }}>Try it</Typography>
                <Typography>{page.tryIt}</Typography>
              </Box>
            )}
            {wrongRole && (
              <Typography color="secondary">
                This page is described as {ROLE_NAME[page!.role]} sees it. You are viewing as {ROLE_NAME[league.role]}.
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography>This page is not in the guide yet.</Typography>
        )}
        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', rowGap: 1.5 }}>
          {wrongRole && (
            <Button variant="contained" onClick={() => { dispatch(sample.setRole(page!.role)); close(); }}>
              View as {ROLE_NAME[page!.role]}
            </Button>
          )}
          <Button variant="outlined" onClick={() => { close(); navigate('/tour'); }}>
            See all pages
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              dispatch(sample.resetSample());
              dispatch(showToast('The sample league is back to 8:12 PM, week 5.'));
              close();
            }}
          >
            Start the sample over
          </Button>
          <Button onClick={close}>Close</Button>
        </Stack>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Everything here is made up and stays in this browser tab. Nothing you do is saved or sent anywhere.
        </Typography>
      </Box>
    </Drawer>
  );
}
