// Phone notifications for this phone: on or off, with what to do when the phone can't yet.
// Shown in Settings (teams and solo players) and on the solo partner page.
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useLiveOn } from '../hooks';
import { pushState, turnOff, turnOn, type PushState } from '../live/push';
import { showToast } from '../store';

const NOTE: Record<PushState, string> = {
  'unsupported': "This browser can't show notifications. Try Chrome or Safari.",
  'needs-install': 'On an iPhone, add the app to your Home Screen first: tap Share, then Add to Home Screen. Open it from there and turn this on.',
  'blocked': "Notifications are blocked for this site. Allow them in your phone's settings for this browser, then come back.",
  'off': '',
  'on': ''
};

export default function PushToggle({ what }: { what: string }) {
  const liveOn = useLiveOn();
  const dispatch = useAppDispatch();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void pushState().then(setState); }, []);

  const flip = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await turnOn() : await turnOff();
      setState(next);
      dispatch(showToast(next === 'on' ? 'Notifications on for this phone.' : on ? NOTE[next] || 'Notifications stay off.' : 'Notifications off for this phone.'));
    } catch (err) {
      dispatch(showToast((err as Error).message || "Couldn't turn notifications on. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const usable = state === 'on' || state === 'off';
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>Phone notifications</Typography>
          <Typography variant="body2" color="textSecondary">
            {!liveOn ? 'They work on the live league. Free, no texts.' : `${what} Free, no texts. Just for this phone.`}
          </Typography>
          {liveOn && state && NOTE[state] && <Typography variant="body2" sx={{ mt: 1, color: 'secondary.main', fontWeight: 700 }}>{NOTE[state]}</Typography>}
        </Box>
        <Switch
          checked={state === 'on'}
          disabled={!liveOn || !usable || busy}
          onChange={(e) => void flip(e.target.checked)}
          slotProps={{ input: { 'aria-label': 'Phone notifications' } }}
        />
      </Box>
    </Card>
  );
}
