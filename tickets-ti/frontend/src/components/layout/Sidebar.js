import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard',  icon: 'dashboard',          roles: ['usuario', 'tecnico', 'administrador'] },
  { to: '/tickets',   label: 'Tickets',    icon: 'confirmation_number', roles: ['usuario', 'tecnico', 'administrador'] },
  { to: '/users',     label: 'Usuarios',   icon: 'group',               roles: ['administrador'] },
  { to: '/reports',   label: 'Reportes',   icon: 'analytics',           roles: ['administrador', 'tecnico'] },
  { to: '/profile',   label: 'Perfil',     icon: 'account_circle',      roles: ['usuario', 'tecnico', 'administrador'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0">
      {/* Logo */}
      <div className="p-5 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}
            >
              confirmation_number
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold text-indigo-600 font-heading leading-tight">Tickets TI</h1>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-medium leading-none mt-0.5">
              Helpdesk Central
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 space-y-0.5">
        {links
          .filter((l) => l.roles.includes(user?.rol))
          .map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-semibold ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50 duration-150'
                }`
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {l.icon}
              </span>
              <span>{l.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-semibold"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
