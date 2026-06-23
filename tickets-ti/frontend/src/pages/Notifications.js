import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';

const TIPO_META = {
  asignacion: {
    icon: (
      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    label: 'Asignación',
    color: 'bg-indigo-50 border-indigo-200',
  },
  creacion: {
    icon: (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Creación',
    color: 'bg-green-50 border-green-200',
  },
  resolucion: {
    icon: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: 'Resolución',
    color: 'bg-emerald-50 border-emerald-200',
  },
  sla_alerta: {
    icon: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    label: 'Alerta SLA',
    color: 'bg-yellow-50 border-yellow-200',
  },
  general: {
    icon: (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    label: 'General',
    color: 'bg-gray-50 border-gray-200',
  },
};

const TIPOS = ['', 'asignacion', 'creacion', 'resolucion', 'sla_alerta', 'general'];

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const { markAllRead } = useNotifications();
  const navigate = useNavigate();

  const cargar = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (tipo) params.append('tipo', tipo);
      const res = await api.get(`/notifications?${params}`).then((r) => r.data);
      setNotifs(res.data);
      setMeta(res.meta);
    } catch {}
    finally { setLoading(false); }
  }, [tipo]);

  useEffect(() => { cargar(1); }, [cargar]);

  const handleMarkRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} notificaciones</p>
        </div>
        <button
          onClick={handleMarkAll}
          className="text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Marcar todas como leídas
        </button>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap mb-4">
        {TIPOS.map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              tipo === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t ? (TIPO_META[t]?.label || t) : 'Todas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Sin notificaciones</div>
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => {
            const meta = TIPO_META[n.tipo] || TIPO_META.general;
            return (
              <li
                key={n.id}
                className={`border rounded-xl px-4 py-3 transition-colors ${meta.color} ${!n.leida ? 'shadow-sm' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.leida ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {n.mensaje}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleString('es-CO')}
                      </span>
                      {n.ticketId && (
                        <button
                          onClick={() => navigate(`/tickets/${n.ticketId}`)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Ver ticket {n.ticketId}
                        </button>
                      )}
                      {!n.leida && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                  {!n.leida && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => cargar(meta.page - 1)}
            disabled={meta.page <= 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            onClick={() => cargar(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
