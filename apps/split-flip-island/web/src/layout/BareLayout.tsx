import { Outlet } from 'react-router';
import Box from '@mui/material/Box';
import Toaster from '../ui/Toaster';
import SampleBar from './SampleBar';
import TourDrawer from './TourDrawer';

/** For the bar TV: just the sample strip, then the page fills the rest of the screen. */
export default function BareLayout() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <SampleBar />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
      <Toaster />
      <TourDrawer />
    </Box>
  );
}
