import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const TIPO_ICONO = {
  asignacion: (
    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  creacion: (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  resolucion: (
    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  sla_alerta: (
    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  general: (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
};

export default function Navbar() {
  const { user } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const recientes = notifications.slice(0, 5);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm px-8 py-3.5 flex items-center justify-between">
      {/* Buscador cosmético */}
      <div className="relative flex-1 max-w-md">
        <svg
          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar tickets, usuarios..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-full text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-slate-700 placeholder-slate-400 border-none"
          readOnly
          onClick={() => navigate('/tickets')}
        />
      </div>

      <div className="flex items-center gap-3 ml-6">
        {/* Notificaciones */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-800">Notificaciones</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Marcar todas
                  </button>
                )}
              </div>

              {recientes.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">Sin notificaciones</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {recientes.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        if (n.ticketId) { navigate(`/tickets/${n.ticketId}`); setOpen(false); }
                      }}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.leida ? 'bg-indigo-50/50' : ''}`}
                    >
                      <div className="flex gap-2">
                        <span className="mt-0.5 shrink-0">{TIPO_ICONO[n.tipo] || TIPO_ICONO.general}</span>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${!n.leida ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                            {n.mensaje}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-2.5 border-t border-slate-100">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-indigo-600 hover:text-indigo-800 py-1 font-medium"
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* Usuario */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.nombre}</p>
            <p className="text-[11px] text-slate-400 capitalize font-medium">{user?.rol}</p>
          </div>
          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm border-2 border-indigo-50 flex-shrink-0">
            {user?.nombre?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
