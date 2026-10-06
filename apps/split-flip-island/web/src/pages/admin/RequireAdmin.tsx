import { Outlet } from 'react-router';
import { useAppSelector } from '../../hooks';
import AdminLogin from './AdminLogin';

/** Admin pages show the admin log in until someone is signed in as an admin. */
export default function RequireAdmin() {
  const token = useAppSelector((s) => s.admin.token);
  return token ? <Outlet /> : <AdminLogin />;
}
