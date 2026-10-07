// "Doctor's orders": the Love Dr.'s pop-up. It appears once, on its own, after a team is checked
// in for the night, with advice drawn from how the team played in earlier weeks. The team can open
// the full analysis or close it and start playing.
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
import { teamTonight } from '../sample/league';
import { doctorsOrders } from '../sample/loveDr';
import { setOrdersOpen } from '../store';

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
  const orders = playing ? doctorsOrders(league, teamId) : undefined;
  const checkedIn = playing && !!teamTonight(league, teamId).checkedInAt;
  const busy = BUSY.some((p) => pathname.startsWith(p));
  const ready = !!orders && checkedIn && !calm && popups && !busy;
  // Once per night for each team, in this browser tab.
  const seenKey = `sfi-orders:${orders?.heading ?? ''}:${teamId}`;

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
    navigate('/');
    // Team home scrolls to the top when it opens, so wait a moment before going to the Love Dr.
    window.setTimeout(() => document.getElementById('love-dr')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  return (
    <Dialog open={asked || auto} onClose={close} fullWidth maxWidth="xs" aria-labelledby="doctors-orders-title">
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
          Let's play
        </Button>
      </DialogActions>
    </Dialog>
  );
}
