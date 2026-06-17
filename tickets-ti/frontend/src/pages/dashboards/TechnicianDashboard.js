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

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>;

  const urgentes = misTickets.filter((t) => {
    if (!t.sla_limite) return false;
    const pct = (Date.now() - new Date(t.createdAt)) / (new Date(t.sla_limite) - new Date(t.createdAt)) * 100;
    return pct >= 80 || t.prioridad === 'critica';
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {user?.nombre}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tickets activos', value: stats.misTickets, color: 'bg-blue-500', icon: '🎫' },
            { label: 'Resueltos hoy', value: stats.resueltoHoy, color: 'bg-green-500', icon: '✅' },
            { label: 'Resueltos esta semana', value: stats.resueltosSemana, color: 'bg-emerald-500', icon: '📊' },
            { label: 'SLA en riesgo', value: stats.slaEnRiesgo + stats.slaVencidos, color: stats.slaVencidos > 0 ? 'bg-red-500' : 'bg-yellow-500', icon: '⚠️' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow p-5 flex items-start gap-3">
              <div className={`${s.color} rounded-lg p-2.5 text-white text-lg flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acceso rápido */}
      <div className="flex gap-3">
        <Link to="/tickets" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Ver mis tickets asignados
        </Link>
        <Link to="/tickets/nuevo" className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
          + Nuevo ticket
        </Link>
      </div>

      {/* Urgentes / SLA en riesgo */}
      {urgentes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="font-semibold text-red-800 mb-3">⚠️ Requieren atención urgente ({urgentes.length})</h2>
          <div className="space-y-2">
            {urgentes.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline font-mono text-xs">{t.id}</Link>
                <span className="text-gray-700 text-sm flex-1 mx-3 truncate">{t.titulo}</span>
                <div className="flex items-center gap-2">
                  <Badge value={t.prioridad} />
                  <SLAPct ticket={t} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todos mis tickets activos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mis tickets activos ({misTickets.length})</h2>
        </div>
        {misTickets.length === 0 ? (
          <p className="text-center py-10 text-gray-400">Sin tickets activos asignados</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Prioridad</th>
                <th className="px-4 py-3 text-left">SLA</th>
              </tr>
            </thead>
            <tbody>
              {misTickets.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline font-mono text-xs">{t.id}</Link>
                  </td>
                  <td className="px-4 py-2 text-gray-800 truncate max-w-xs">{t.titulo}</td>
                  <td className="px-4 py-2"><Badge value={t.estado} /></td>
                  <td className="px-4 py-2"><Badge value={t.prioridad} /></td>
                  <td className="px-4 py-2"><SLAPct ticket={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
