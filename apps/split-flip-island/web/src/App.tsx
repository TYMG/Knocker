import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { startLiveRefresh } from './live/sync';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector, useMe } from './hooks';
import { sample } from './sample/slice';
import { setPendingRole } from './store';
import BareLayout from './layout/BareLayout';
import { AdminOnly, TeamOnly } from './layout/guards';
import PlayerLayout from './layout/PlayerLayout';
import Challenges from './pages/Challenges';
import LoveDrAnalysis from './pages/LoveDrAnalysis';
import FrontDoor from './pages/FrontDoor';
import LineJoin from './pages/LineJoin';
import Lines from './pages/Lines';
import LogIn from './pages/Login';
import Machine from './pages/Machine';
import SignUp from './pages/SignUp';
import Submit from './pages/Submit';
import TeamHome from './pages/TeamHome';
import TeamPage from './pages/TeamPage';
import Tour from './pages/Tour';
import Tv from './pages/Tv';
import AdminHome from './pages/admin/AdminHome';
import AdminLines from './pages/admin/AdminLines';
import RunFinals from './pages/admin/RunFinals';
import Texts from './pages/admin/Texts';
import LeagueSetup from './pages/admin/LeagueSetup';
import Settings from './pages/Settings';
import CheckInGate from './layout/CheckInGate';
import AdminLogIn from './pages/admin/AdminLogin';
import CheckIn from './pages/admin/CheckIn';
import EnterScore from './pages/admin/EnterScore';
import Lineup from './pages/admin/Lineup';
import Machines from './pages/admin/Machines';
import Message from './pages/admin/Message';
import NightSettings from './pages/admin/NightSettings';
import ScoreDetail from './pages/admin/ScoreDetail';
import Scores from './pages/admin/Scores';
import TeamDetail from './pages/admin/TeamDetail';
import Teams from './pages/admin/Teams';
import WeekDetail from './pages/admin/WeekDetail';

// Season Wrapped brings GSAP with it, so it downloads only when someone opens it.
const Wrapped = lazy(() => import('./pages/Wrapped'));
import Weeks from './pages/admin/Weeks';
import Finals from './pages/standings/Finals';
import LeagueLog from './pages/standings/LeagueLog';
import Season from './pages/standings/Season';
import StandingsLayout from './pages/standings/StandingsLayout';
import Tonight from './pages/standings/Tonight';

/**
 * "/" is the team's home once logged in, the standings for an admin who is not on a team, and
 * the front door for everyone else.
 */
function Root() {
  const me = useMe();
  if (me.isTeam) return <TeamHome />;
  if (me.isAdmin) return <Navigate to="/standings" replace />;
  return <FrontDoor />;
}

/**
 * Second half of switching away from admin in the sample strip. The strip sends the app home
 * first; once the address is no longer an admin page, this changes who you are. It lives here,
 * above the page frames, because the strip itself is replaced when the frame changes.
 */
/** Keeps the live league fresh while the Live switch is on. */
function LiveRefresh() {
  useEffect(() => startLiveRefresh(), []);
  return null;
}

function FinishRoleSwitch() {
  const pending = useAppSelector((s) => s.ui.pendingRole);
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!pending || pathname.startsWith('/admin')) return;
    dispatch(sample.setRole(pending));
    dispatch(setPendingRole(null));
  }, [pending, pathname, dispatch]);
  return null;
}

/**
 * On the live league, the pages wait for the first load from the server. Otherwise a page
 * opened straight from its address would see the sample league for a moment (and an admin page
 * would send you to the log-in).
 */
function LiveLoading() {
  const live = useAppSelector((s) => s.live);
  if (!live.on || live.version > 0 || live.error) return null;
  return (
    <Box role="status" sx={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Typography sx={{ fontWeight: 700 }}>Loading the live league…</Typography>
    </Box>
  );
}

function LiveReady({ children }: { children: ReactNode }) {
  const live = useAppSelector((s) => s.live);
  return !live.on || live.version > 0 || live.error ? <>{children}</> : null;
}

// Every address in the app. sample/tour.ts describes each page; keep the two in step.
export default function App() {
  return (
    <BrowserRouter>
      <FinishRoleSwitch />
      <LiveRefresh />
      <LiveLoading />
      <LiveReady>
      <Routes>
        <Route element={<PlayerLayout />}>
          <Route path="/" element={<Root />} />
          <Route path="/join" element={<SignUp />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/tour" element={<Tour />} />
          <Route path="/settings" element={<Settings />} />

          {/* Open to anyone with the link */}
          <Route path="/standings" element={<StandingsLayout />}>
            <Route index element={<Tonight />} />
            <Route path="season" element={<Season />} />
            <Route path="finals" element={<Finals />} />
            <Route path="log" element={<LeagueLog />} />
          </Route>
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/machines/:machineId" element={<Machine />} />

          {/* A logged-in team */}
          <Route element={<TeamOnly />}>
            <Route element={<CheckInGate />}>
              <Route path="/lines" element={<Lines />} />
              <Route path="/lines/join/:machineId" element={<LineJoin />} />
              <Route path="/submit" element={<Submit />} />
            </Route>
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/love-dr" element={<LoveDrAnalysis />} />
            <Route path="/wrapped" element={<Suspense fallback={null}><Wrapped /></Suspense>} />
          </Route>
          {/* The page's first name. Old links still work. */}
          <Route path="/call-outs" element={<Navigate to="/challenges" replace />} />

          {/* An admin: the same frame and bottom bar as a team, plus the Admin tab */}
          <Route path="/admin/login" element={<AdminLogIn />} />
          <Route element={<AdminOnly />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/check-in" element={<CheckIn />} />
            <Route path="/admin/scores" element={<Scores />} />
            <Route path="/admin/scores/:scoreId" element={<ScoreDetail />} />
            <Route path="/admin/enter-score" element={<EnterScore />} />
            <Route path="/admin/message" element={<Message />} />
            <Route path="/admin/lines" element={<AdminLines />} />
            <Route path="/admin/lineup" element={<Lineup />} />
            <Route path="/admin/night" element={<NightSettings />} />
            <Route path="/admin/teams" element={<Teams />} />
            <Route path="/admin/teams/:teamId" element={<TeamDetail />} />
            <Route path="/admin/weeks" element={<Weeks />} />
            <Route path="/admin/weeks/:week" element={<WeekDetail />} />
            <Route path="/admin/machines" element={<Machines />} />
            <Route path="/admin/finals" element={<RunFinals />} />
            <Route path="/admin/texts" element={<Texts />} />
            <Route path="/admin/league" element={<LeagueSetup />} />
          </Route>
        </Route>

        <Route element={<BareLayout />}>
          <Route path="/tv" element={<Tv />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </LiveReady>
    </BrowserRouter>
  );
}
