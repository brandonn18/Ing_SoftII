import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/shared/Badge';
import { getSocket } from '../../services/socketService';

function SLAPct({ ticket }) {
  if (!ticket.sla_limite) return <span className="text-gray-400 text-xs">—</span>;
  const ahora = Date.now();
  const pct = Math.min(
    (ahora - new Date(ticket.createdAt)) / (new Date(ticket.sla_limite) - new Date(ticket.createdAt)) * 100,
    100
  );
  const vencido = ahora > new Date(ticket.sla_limite).getTime();
  const color = vencido || pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-20">
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs ${vencido ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        {vencido ? 'vencido' : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

export default function TechnicianDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [misTickets, setMisTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [statsRes, tickRes] = await Promise.all([
        api.get('/reports/my-dashboard'),
        api.get('/tickets?limit=50'),
      ]);
      setStats(statsRes.data.data);

      const ahora = Date.now();
      const activos = tickRes.data.data.filter(
        (t) => !['resuelto', 'cerrado'].includes(t.estado)
      );
      // Ordenar: SLA > 80% primero, luego por prioridad
      activos.sort((a, b) => {
        const pctA = a.sla_limite ? (ahora - new Date(a.createdAt)) / (new Date(a.sla_limite) - new Date(a.createdAt)) : 0;
        const pctB = b.sla_limite ? (ahora - new Date(b.createdAt)) / (new Date(b.sla_limite) - new Date(b.createdAt)) : 0;
        return pctB - pctA;
      });
      setMisTickets(activos);
    } catch (err) {
      console.error('Error dashboard técnico:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const socket = getSocket();
    if (socket) {
      socket.on('ticket:nuevo', cargar);
      socket.on('ticket:sla_alerta', cargar);
      return () => { socket.off('ticket:nuevo', cargar); socket.off('ticket:sla_alerta', cargar); };
    }
  }, [cargar]);

  if (loading) return <div className="text-center py-16 text-slate-400">Cargando...</div>;

  const urgentes = misTickets.filter((t) => {
    if (!t.sla_limite) return false;
    const pct = (Date.now() - new Date(t.createdAt)) / (new Date(t.sla_limite) - new Date(t.createdAt)) * 100;
    return pct >= 80 || t.prioridad === 'critica';
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight">Mi Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bienvenido, {user?.nombre}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/tickets"
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            Ver mis tickets
          </Link>
          <Link
            to="/tickets/nuevo"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 text-sm font-bold transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Ticket
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tickets activos',      value: stats.misTickets,                          icon: 'confirmation_number', iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600' },
            { label: 'Resueltos hoy',        value: stats.resueltoHoy,                         icon: 'check_circle',        iconBg: 'bg-green-50',   iconColor: 'text-green-600'  },
            { label: 'Esta semana',          value: stats.resueltosSemana,                     icon: 'analytics',           iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600'},
            { label: 'SLA en riesgo',        value: (stats.slaEnRiesgo ?? 0) + (stats.slaVencidos ?? 0),
              icon: 'alarm', iconBg: stats.slaVencidos > 0 ? 'bg-red-50' : 'bg-amber-50',
              iconColor: stats.slaVencidos > 0 ? 'text-red-600' : 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className={`p-2.5 rounded-lg inline-flex mb-3 ${s.iconBg}`}>
                <span className={`material-symbols-outlined ${s.iconColor}`} style={{ fontSize: '22px' }}>{s.icon}</span>
              </div>
              <p className="text-slate-500 text-xs font-medium">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5 font-heading">{s.value ?? '—'}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Urgentes / SLA en riesgo */}
      {urgentes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="font-bold text-red-800 mb-3 flex items-center gap-2 font-heading">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Requieren atención urgente ({urgentes.length})
          </h2>
          <div className="space-y-2">
            {urgentes.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-red-100 shadow-sm">
                <Link to={`/tickets/${t.id}`} className="text-indigo-600 hover:underline font-mono text-xs font-semibold">{t.id}</Link>
                <span className="text-slate-700 text-sm flex-1 mx-3 truncate">{t.titulo}</span>
                <div className="flex items-center gap-2">
                  <Badge value={t.prioridad} />
                  <SLAPct ticket={t} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de tickets activos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 font-heading">Mis tickets activos ({misTickets.length})</h2>
        </div>
        {misTickets.length === 0 ? (
          <p className="text-center py-10 text-slate-400">Sin tickets activos asignados</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left">ID</th>
                <th className="px-6 py-4 text-left">Título</th>
                <th className="px-6 py-4 text-left">Estado</th>
                <th className="px-6 py-4 text-left">Prioridad</th>
                <th className="px-6 py-4 text-left">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {misTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link to={`/tickets/${t.id}`} className="text-indigo-600 hover:underline font-mono text-xs font-semibold">{t.id}</Link>
                  </td>
                  <td className="px-6 py-3 text-slate-800 font-medium truncate max-w-xs">{t.titulo}</td>
                  <td className="px-6 py-3"><Badge value={t.estado} /></td>
                  <td className="px-6 py-3"><Badge value={t.prioridad} /></td>
                  <td className="px-6 py-3"><SLAPct ticket={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
