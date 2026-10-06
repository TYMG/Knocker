import Snackbar from '@mui/material/Snackbar';
import { useAppDispatch, useAppSelector } from '../hooks';
import { hideToast } from '../store';

/** Shows the short confirmations pages send with showToast(). Mounted once, in the layouts. */
export default function Toaster() {
  const toast = useAppSelector((s) => s.ui.toast);
  const dispatch = useAppDispatch();
  return <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => dispatch(hideToast())} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: { xs: 9, md: 0 } }} />;
}
