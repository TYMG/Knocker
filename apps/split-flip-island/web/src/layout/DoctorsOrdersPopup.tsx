// "Doctor's orders": the Love Dr.'s pop-up. It appears on its own at three moments, once each:
//   - after a team is checked in for the night, with advice from how it played in earlier weeks
//   - with 20 minutes left, if the team still has a machine it has not played
//   - when the night has closed, with the check-up
// The team can open the full analysis or close it and carry on.
//
// It stays away while someone is posting a score or joining a line, in calm mode, and when the
// team has switched the Dr.'s pop-ups off on the Love Dr. card. The same pop-up can be opened by
// hand from that card at any time.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector, useCalm, useLeague, useMe } from '../hooks';
import { Mascot } from '../pages/LoveDr';
import { currentWeek, teamTonight } from '../sample/league';
import { closingOrders, doctorsOrders, lateOrders } from '../sample/loveDr';
import { setOrdersOpen } from '../store';
import { PopIn } from '../ui/motion';

const BUSY = ['/submit', '/admin', '/lines/join', '/tour'];

export default function DoctorsOrdersPopup() {
  const league = useLeague();
  const me = useMe();
  const calm = useCalm();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const asked = useAppSelector((s) => s.ui.ordersOpen);
  const popups = useAppSelector((s) => s.ui.drPopups);
  const [auto, setAuto] = useState(false);

  const playing = me.isTeam && me.team.status === 'approved';
  const teamId = me.team.teamId;
  const checkedIn = playing && !!teamTonight(league, teamId).checkedInAt;
  // The latest moment wins: the check-up once the night has closed, then the 20-minute warning,
  // then the orders from check-in.
  const closing = playing ? closingOrders(league, teamId) : undefined;
  const late = playing ? lateOrders(league, teamId) : undefined;
  const start = playing ? doctorsOrders(league, teamId) : undefined;
  const kind = closing ? 'closing' : late ? 'late' : 'start';
  const orders = closing ?? late ?? start;
  const busy = BUSY.some((p) => pathname.startsWith(p));
  // The first pop-up waits for check-in. The later two do not: they matter either way.
  const ready = !!orders && (kind !== 'start' || checkedIn) && !calm && popups && !busy;
  // Each moment shows once per night for each team, in this browser tab.
  const seenKey = `sfi-orders:${kind}:${currentWeek(league).week}:${teamId}`;

  useEffect(() => {
    if (!ready) return;
    try {
      if (window.sessionStorage.getItem(seenKey)) return;
      window.sessionStorage.setItem(seenKey, '1');
    } catch {
      return; // Storage is blocked: better no pop-up than one on every page.
    }
    setAuto(true);
  }, [ready, seenKey]);

  if (!orders) return null;
  const close = () => {
    setAuto(false);
    dispatch(setOrdersOpen(false));
  };
  const seeAnalysis = () => {
    close();
    navigate('/love-dr');
  };

  return (
    <Dialog open={asked || auto} onClose={close} fullWidth maxWidth="xs" aria-labelledby="doctors-orders-title">
      <PopIn>
      <DialogContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <Mascot size={64} />
          <Box>
            <Typography id="doctors-orders-title" variant="h3" component="h2">
              Doctor's orders
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>{orders.heading}, from the Love Dr.</Typography>
          </Box>
        </Stack>
        <Stack component="ul" spacing={1.25} sx={{ m: 0, pl: 2.5 }}>
          {orders.lines.map((line) => (
            <Typography component="li" key={line}>
              {line}
            </Typography>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={seeAnalysis} variant="outlined" sx={{ minHeight: 44 }}>
          See the analysis
        </Button>
        <Button onClick={close} variant="contained" color="secondary" sx={{ minHeight: 44 }}>
          {kind === 'closing' ? 'Got it' : "Let's play"}
        </Button>
      </DialogActions>
      </PopIn>
    </Dialog>
  );
}
