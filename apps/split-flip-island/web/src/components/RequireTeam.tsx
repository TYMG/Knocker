import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../hooks';

export default function RequireTeam() {
  const token = useAppSelector((s) => s.auth.token);
  return token ? <Outlet /> : <Navigate to="/welcome" replace />;
}
