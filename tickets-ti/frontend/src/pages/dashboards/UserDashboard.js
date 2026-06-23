import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/shared/Badge';

function SLABar({ ticket }) {
  if (!ticket.sla_limite) return null;
  const ahora = Date.now();
  const pct = Math.min(
    (ahora - new Date(ticket.createdAt)) / (new Date(ticket.sla_limite) - new Date(ticket.createdAt)) * 100,
    100
  );
  const vencido = ahora > new Date(ticket.sla_limite).getTime();
  const color = vencido ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-indigo-500';
  return (
    <div className="mt-1">
      <div className="w-full bg-gray-100 rounded-full h-1">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UserDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [sumRes, tickRes] = await Promise.all([
        api.get('/reports/my-tickets-summary'),
        api.get('/tickets?limit=5'),
      ]);
      setSummary(sumRes.data.data);
      setTickets(tickRes.data.data);
    } catch (err) {
      console.error('Error dashboard usuario:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="text-center py-16 text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight">
          Hola de nuevo, {user?.nombre?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Aquí tienes un resumen de tus solicitudes de soporte técnico.</p>
      </div>

      {/* Botón crear */}
      <Link
        to="/tickets/nuevo"
        className="flex items-center justify-center gap-3 bg-indigo-600 text-white py-3.5 px-6 rounded-xl hover:bg-indigo-700 font-bold text-base transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Crear nuevo ticket
      </Link>

      {/* Resumen bento */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Mis tickets abiertos', value: summary.abiertos,  icon: 'mark_email_unread', badge: 'Activo',  badgeCls: 'bg-blue-50 text-blue-600',  border: 'border-blue-500',   iconBg: 'bg-blue-50',   iconColor: 'text-blue-600'  },
            { label: 'En proceso',           value: summary.enProceso, icon: 'pending',           badge: 'Activo',  badgeCls: 'bg-amber-50 text-amber-600', border: 'border-amber-400',  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600' },
            { label: 'En espera',            value: summary.enEspera,  icon: 'hourglass',         badge: undefined, badgeCls: '',                           border: 'border-purple-400', iconBg: 'bg-purple-50', iconColor: 'text-purple-600'},
            { label: 'Resueltos',            value: summary.resueltos, icon: 'check_circle',      badge: undefined, badgeCls: '',                           border: 'border-green-500',  iconBg: 'bg-green-50',  iconColor: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 border-l-4 ${s.border} p-5 hover:shadow-md transition-all group`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${s.iconBg} group-hover:scale-110 transition-transform`}>
                  <span className={`material-symbols-outlined ${s.iconColor}`} style={{ fontSize: '22px' }}>{s.icon}</span>
                </div>
                {s.badge && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.badgeCls}`}>{s.badge}</span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-medium">{s.label}</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-0.5 font-heading">{s.value ?? '—'}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Mis tickets recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 font-heading">Mis tickets recientes</h2>
          <Link to="/tickets" className="text-sm text-indigo-600 hover:underline font-medium">Ver todos</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 mb-3">Aún no tienes tickets</p>
            <Link to="/tickets/nuevo" className="text-indigo-600 hover:underline text-sm font-medium">Crea tu primer ticket</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/tickets/${t.id}`} className="text-indigo-600 hover:underline font-semibold text-sm">
                      {t.titulo}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {t.id} · <span className="capitalize">{t.categoria?.replace('_', ' ')}</span>
                    </p>
                    {!['resuelto', 'cerrado'].includes(t.estado) && <SLABar ticket={t} />}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge value={t.estado} />
                    <Badge value={t.prioridad} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
