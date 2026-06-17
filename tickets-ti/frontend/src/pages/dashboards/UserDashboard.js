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
  const color = vencido ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500';
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

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sistema de Gestión de Tickets TI</p>
      </div>

      {/* Botón crear */}
      <Link
        to="/tickets/nuevo"
        className="flex items-center justify-center gap-3 bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors shadow-md"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Crear nuevo ticket
      </Link>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: summary.total, color: 'border-blue-400' },
            { label: 'Abiertos', value: summary.abiertos, color: 'border-yellow-400' },
            { label: 'En espera', value: summary.enEspera, color: 'border-purple-400' },
            { label: 'Resueltos', value: summary.resueltos, color: 'border-green-400' },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl shadow p-4 border-l-4 ${s.color}`}>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mis tickets recientes */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mis tickets recientes</h2>
          <Link to="/tickets" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 mb-3">Aún no tienes tickets</p>
            <Link to="/tickets/nuevo" className="text-blue-600 hover:underline text-sm">Crea tu primer ticket</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {tickets.map((t) => (
              <li key={t.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                      {t.titulo}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{t.id} · {t.categoria?.replace('_', ' ')}</p>
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
