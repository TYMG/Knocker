import { Link as RouterLink, Outlet, useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import Toaster from '../ui/Toaster';
import SampleBar from './SampleBar';
import ThemeToggle from './ThemeToggle';
import TourDrawer from './TourDrawer';

/** The frame around the admin pages. No bottom bar: every admin page is reached from Admin home. */
export default function AdminLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const me = useMe();
  const adminName = useLeague().adminName;
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 'appBar' }}>
        <SampleBar />
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ gap: { xs: 0.5, sm: 1 } }}>
            <Typography component={RouterLink} to="/admin" variant="h3" noWrap sx={{ color: 'inherit', textDecoration: 'none', fontSize: { xs: '0.85rem', sm: '1.25rem' }, minWidth: 0 }}>
              Split Flipper Island
            </Typography>
            <Typography sx={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.8rem', border: 2, borderColor: 'currentColor', borderRadius: 1, px: 0.75, lineHeight: 1.5, flexShrink: 0 }}>ADMIN</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ThemeToggle />
            {me.isAdmin && (
              <Tooltip title={`Log out admin ${adminName}`}>
                <IconButton
                  color="inherit"
                  aria-label="Log out of admin"
                  onClick={() => {
                    dispatch(sample.logOut());
                    navigate('/');
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
        </AppBar>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, px: 2, pt: 3, pb: 6 }}>
        <Outlet />
      </Box>
      <Toaster />
      <TourDrawer />
    </Box>
  );
}
