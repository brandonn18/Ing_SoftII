import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const ROL_BADGE = { administrador: 'bg-purple-100 text-purple-800', tecnico: 'bg-blue-100 text-blue-800', usuario: 'bg-gray-100 text-gray-700' };

const TIPO_ICONO = {
  asignacion: '🎫',
  creacion: '✅',
  resolucion: '✔️',
  sla_alerta: '⚠️',
  general: '🔔',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Cierra el panel al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const recientes = notifications.slice(0, 5);

  return (
    <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
        <span className="font-bold text-gray-900 text-sm">Tickets TI</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm text-gray-800">Notificaciones</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800">
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {recientes.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-sm">Sin notificaciones</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {recientes.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => { markRead(n.id); if (n.ticketId) { navigate(`/tickets/${n.ticketId}`); setOpen(false); } }}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex gap-2">
                        <span className="text-base mt-0.5 shrink-0">{TIPO_ICONO[n.tipo] || '🔔'}</span>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${!n.leida ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {n.mensaje}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-2 border-t">
                <Link to="/notifications" onClick={() => setOpen(false)}
                  className="block text-center text-xs text-blue-600 hover:text-blue-800 py-1">
                  Ver todas las notificaciones
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.nombre}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize hidden sm:block ${ROL_BADGE[user?.rol] || ''}`}>
            {user?.rol}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:block">Salir</span>
        </button>
      </div>
    </header>
  );
}
