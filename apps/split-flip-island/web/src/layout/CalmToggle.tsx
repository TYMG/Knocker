import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MotionPhotosOffIcon from '@mui/icons-material/MotionPhotosOff';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setCalm, showToast } from '../store';

/** The switch in the top bar that turns the app's effects off and on. See ui/calm.ts. */
export default function CalmToggle() {
  const calm = useAppSelector((s) => s.ui.calm);
  const dispatch = useAppDispatch();
  const flip = () => {
    dispatch(setCalm(!calm));
    dispatch(showToast(calm ? 'Effects are back on.' : 'Calm mode is on. No confetti or big animations.'));
  };
  return (
    <Tooltip title={calm ? 'Calm mode is on. Tap to turn effects back on.' : 'Effects are on. Tap for calm mode.'}>
      <IconButton color="inherit" aria-label="Calm mode" aria-pressed={calm} onClick={flip}>
        {calm ? <MotionPhotosOffIcon /> : <AutoAwesomeIcon />}
      </IconButton>
    </Tooltip>
  );
}
