import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['usuario', 'tecnico', 'administrador'] },
  { to: '/tickets', label: 'Tickets', icon: '🎫', roles: ['usuario', 'tecnico', 'administrador'] },
  { to: '/users', label: 'Usuarios', icon: '👥', roles: ['administrador'] },
  { to: '/reports', label: 'Reportes', icon: '📈', roles: ['administrador', 'tecnico'] },
  { to: '/profile', label: 'Perfil', icon: '👤', roles: ['usuario', 'tecnico', 'administrador'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">Tickets TI</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{user?.rol}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links
          .filter((l) => l.roles.includes(user?.rol))
          .map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
