// Settings: everything a person can turn on or off, in one place (the gear in the top bar).
// Look and motion are kept on this phone or computer. Texts belong to the team, so they follow
// the team to any phone. Admins also get the quiet "started a turn" notes here.
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector, useLeague, useMe } from '../hooks';
import { sample } from '../sample/slice';
import { setCalm, setDrPopups, showToast } from '../store';
import { setBlipsMuted, useBlipsMuted } from '../ui/turnClock';
import Page from '../ui/Page';
import Section from '../ui/Section';
import { TextsSetting } from '../ui/TextsParts';

export default function Settings() {
  const me = useMe();
  const league = useLeague();
  return (
    <Page title="Settings">
      <Stack spacing={4}>
        <LookSection />
        <MotionSection />
        {(me.isTeam || me.isAdmin) && (
          <Section title="Alerts">
            <Stack spacing={1.5}>
              {me.isTeam && <TextsSetting team={me.team} />}
              {me.isTeam && <DrPopupsSetting />}
              {me.isAdmin && <BlipsSetting />}
            </Stack>
          </Section>
        )}
        <AccountSection loggedIn={me.isTeam || me.isAdmin} who={me.isAdmin ? `admin ${league.adminName}` : me.isTeam ? me.team.teamName : ''} />
      </Stack>
    </Page>
  );
}

/** One setting: a title and a line under it, with its control. */
function Row({ title, note, control, children }: { title: string; note: ReactNode; control?: ReactNode; children?: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="textSecondary">{note}</Typography>
        </Box>
        {control}
      </Box>
      {children}
    </Card>
  );
}

function LookSection() {
  const { mode, setMode } = useColorScheme();
  const current = mode ?? 'system';
  return (
    <Section title="Look">
      <Row title="Light or dark" note="Auto follows your phone's own setting.">
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={current}
          onChange={(_, v: 'light' | 'dark' | 'system' | null) => v && setMode(v)}
          aria-label="Light or dark"
          sx={{ mt: 1.5, '& .MuiToggleButton-root': { minHeight: 44, gap: 0.75, textTransform: 'none', fontWeight: 700 } }}
        >
          <ToggleButton value="dark"><DarkModeIcon fontSize="small" />Dark</ToggleButton>
          <ToggleButton value="light"><LightModeIcon fontSize="small" />Light</ToggleButton>
          <ToggleButton value="system"><BrightnessAutoIcon fontSize="small" />Auto</ToggleButton>
        </ToggleButtonGroup>
      </Row>
    </Section>
  );
}

function MotionSection() {
  const calm = useAppSelector((s) => s.ui.calm);
  const dispatch = useAppDispatch();
  return (
    <Section title="Motion">
      <Row
        title="Effects"
        note="Confetti, drifting pinballs, rolling numbers and big animations. Turning this off also keeps Doc's pop-ups away. If your phone is set to reduce motion, effects stay off."
        control={<Switch checked={!calm} onChange={(e) => { dispatch(setCalm(!e.target.checked)); dispatch(showToast(e.target.checked ? 'Effects are back on.' : 'Effects off. No confetti or big animations.')); }} slotProps={{ input: { 'aria-label': 'Effects' } }} />}
      />
    </Section>
  );
}

function DrPopupsSetting() {
  const popups = useAppSelector((s) => s.ui.drPopups);
  const dispatch = useAppDispatch();
  return (
    <Row
      title="Pop-ups from Doc"
      note="Doctor's orders after you check in, at 20 minutes left and when the night closes."
      control={<Switch checked={popups} onChange={(e) => dispatch(setDrPopups(e.target.checked))} slotProps={{ input: { 'aria-label': 'Pop-ups from Doc' } }} />}
    />
  );
}

function BlipsSetting() {
  const muted = useBlipsMuted();
  return (
    <Row
      title="Started-a-turn notes (admin)"
      note="A quick note when a team starts a turn. Check-ins and forfeits always pop up."
      control={<Switch checked={!muted} onChange={(e) => setBlipsMuted(!e.target.checked)} slotProps={{ input: { 'aria-label': 'Started-a-turn notes' } }} />}
    />
  );
}

function AccountSection({ loggedIn, who }: { loggedIn: boolean; who: string }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  if (!loggedIn) {
    return (
      <Section title="Account">
        <Typography color="textSecondary">Log in to your team for reminder texts and Doc's pop-ups.</Typography>
        <Link href="/login" sx={{ display: 'inline-block', mt: 1, py: 1, fontWeight: 700 }} onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</Link>
      </Section>
    );
  }
  return (
    <Section title="Account">
      <Typography color="textSecondary" sx={{ mb: 1 }}>Logged in as {who}.</Typography>
      <Button variant="outlined" startIcon={<LogoutIcon />} sx={{ minHeight: 44 }} onClick={() => { navigate('/'); dispatch(sample.logOut()); }}>
        Log out
      </Button>
    </Section>
  );
}
