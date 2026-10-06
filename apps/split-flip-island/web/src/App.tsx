import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout';
import RequireTeam from './components/RequireTeam';
import Welcome from './pages/Welcome';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Home from './pages/Home';
import Submit from './pages/Submit';
import Standings from './pages/Standings';
import AuditLog from './pages/AuditLog';
import RequireAdmin from './pages/admin/RequireAdmin';
import AdminHome from './pages/admin/AdminHome';
import AdminTeams from './pages/admin/AdminTeams';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/join" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/log" element={<AuditLog />} />
          <Route element={<RequireTeam />}>
            <Route path="/" element={<Home />} />
            <Route path="/submit" element={<Submit />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/teams" element={<AdminTeams />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
