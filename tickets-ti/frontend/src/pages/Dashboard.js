import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import TechnicianDashboard from './dashboards/TechnicianDashboard';
import UserDashboard from './dashboards/UserDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.rol === 'administrador') return <AdminDashboard />;
  if (user?.rol === 'tecnico') return <TechnicianDashboard user={user} />;
  return <UserDashboard user={user} />;
}
