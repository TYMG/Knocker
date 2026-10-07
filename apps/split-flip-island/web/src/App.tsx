import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector, useMe } from './hooks';
import { sample } from './sample/slice';
import { setPendingRole } from './store';
import AdminLayout from './layout/AdminLayout';
import BareLayout from './layout/BareLayout';
import { AdminOnly, TeamOnly } from './layout/guards';
import PlayerLayout from './layout/PlayerLayout';
import CallOuts from './pages/CallOuts';
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
import Weeks from './pages/admin/Weeks';
import Finals from './pages/standings/Finals';
import LeagueLog from './pages/standings/LeagueLog';
import Season from './pages/standings/Season';
import StandingsLayout from './pages/standings/StandingsLayout';
import Tonight from './pages/standings/Tonight';

/** "/" is the team's home once logged in, and the front door for everyone else. */
function Root() {
  return useMe().isTeam ? <TeamHome /> : <FrontDoor />;
}

/**
 * Second half of switching away from admin in the sample strip. The strip sends the app home
 * first; once the address is no longer an admin page, this changes who you are. It lives here,
 * above the page frames, because the strip itself is replaced when the frame changes.
 */
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

// Every address in the app. sample/tour.ts describes each page; keep the two in step.
export default function App() {
  return (
    <BrowserRouter>
      <FinishRoleSwitch />
      <Routes>
        <Route element={<PlayerLayout />}>
          <Route path="/" element={<Root />} />
          <Route path="/join" element={<SignUp />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/tour" element={<Tour />} />

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
            <Route path="/lines" element={<Lines />} />
            <Route path="/lines/join/:machineId" element={<LineJoin />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/call-outs" element={<CallOuts />} />
          </Route>
        </Route>

        <Route element={<AdminLayout />}>
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
          </Route>
        </Route>

        <Route element={<BareLayout />}>
          <Route path="/tv" element={<Tv />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
