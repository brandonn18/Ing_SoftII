import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import api from '../../services/api';
import { getSocket } from '../../services/socketService';
import Badge from '../../components/shared/Badge';

const COLORS_ESTADO = ['#3b82f6', '#f59e0b', '#f97316', '#a855f7', '#22c55e', '#6b7280'];
const COLORS_PRIO = { critica: '#ef4444', alta: '#f97316', media: '#eab308', baja: '#22c55e' };

function KPICard({ label, value, sub, colorClass = 'bg-blue-500', icon }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex items-start gap-4">
      <div className={`${colorClass} rounded-lg p-3 text-white text-xl flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [slaAlerts, setSlaAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [sumRes, perfRes, tickRes, slaRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/technician-performance'),
        api.get('/tickets?limit=10'),
        api.get('/tickets?estado=abierto&limit=20'),
      ]);
      setSummary(sumRes.data.data);
      setPerformance(perfRes.data.data);
      setRecentTickets(tickRes.data.data);

      const ahora = Date.now();
      const alertas = slaRes.data.data.filter((t) => {
        if (!t.sla_limite) return false;
        const pct = (ahora - new Date(t.createdAt)) / (new Date(t.sla_limite) - new Date(t.createdAt)) * 100;
        return pct >= 80;
      });
      setSlaAlerts(alertas);
    } catch (err) {
      console.error('Error cargando dashboard admin:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const socket = getSocket();
    if (socket) {
      socket.on('estadisticas:actualizadas', cargar);
      return () => socket.off('estadisticas:actualizadas', cargar);
    }
  }, [cargar]);

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando dashboard...</div>;
  if (!summary) return null;

  const estadoData = summary.ticketsPorPrioridad?.map((e) => ({ name: e.prioridad, value: parseInt(e.total) })) || [];
  const prioData = summary.ticketsPorPrioridad?.map((e) => ({ name: e.prioridad, total: parseInt(e.total), fill: COLORS_PRIO[e.prioridad] || '#6b7280' })) || [];
  const catData = summary.ticketsPorCategoria?.map((e) => ({ name: e.categoria?.replace('_', ' '), total: parseInt(e.total) })) || [];

  const donutData = [
    { name: 'Abiertos', value: summary.abiertos },
    { name: 'Asignados', value: summary.asignados },
    { name: 'En proceso', value: summary.enProceso },
    { name: 'En espera', value: summary.enEspera },
    { name: 'Resueltos', value: summary.resueltos },
    { name: 'Cerrados', value: summary.cerrados },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrador</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visión general del sistema en tiempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total tickets" value={summary.totalTickets} icon="🎫" colorClass="bg-blue-500" />
        <KPICard label="En proceso" value={summary.enProceso} icon="⚙️" colorClass="bg-orange-500" />
        <KPICard label="SLA vencidos" value={summary.slaVencidos} icon="⚠️" colorClass="bg-red-500" />
        <KPICard label="Técnicos activos" value={summary.tecnicosActivos} icon="👷" colorClass="bg-green-500" />
        <KPICard label="Abiertos" value={summary.abiertos} icon="📂" colorClass="bg-yellow-500" />
        <KPICard label="Resueltos" value={summary.resueltos} icon="✅" colorClass="bg-emerald-500" />
        <KPICard label="SLA cumplidos" value={summary.slaCumplidos} icon="🏆" colorClass="bg-teal-500" />
        <KPICard label="Prom. resolución" value={`${summary.promedioResolucionHoras}h`} icon="⏱" colorClass="bg-purple-500" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut por estado */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Tickets por estado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {donutData.map((_, i) => <Cell key={i} fill={COLORS_ESTADO[i % COLORS_ESTADO.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar por prioridad */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Tickets por prioridad</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prioData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {prioData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar por categoría */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Tickets por categoría</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={catData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas SLA activas */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Alertas SLA activas ({slaAlerts.length})</h2>
          {slaAlerts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin alertas activas</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {slaAlerts.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm border-b pb-1">
                  <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline font-mono text-xs">{t.id}</Link>
                  <span className="text-gray-600 truncate mx-2 flex-1">{t.titulo}</span>
                  <Badge value={t.prioridad} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tabla técnicos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Rendimiento de técnicos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Técnico</th>
              <th className="px-4 py-3 text-right">Asignados</th>
              <th className="px-4 py-3 text-right">Resueltos</th>
              <th className="px-4 py-3 text-right">Prom. (h)</th>
              <th className="px-4 py-3 text-right">SLA Vencidos</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((t) => (
              <tr key={t.tecnicoId} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.nombre}</td>
                <td className="px-4 py-3 text-right text-gray-600">{t.ticketsAsignados}</td>
                <td className="px-4 py-3 text-right text-gray-600">{t.ticketsResueltos}</td>
                <td className="px-4 py-3 text-right text-gray-600">{t.promedioResolucionHoras}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${t.slasVencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {t.slasVencidos}
                  </span>
                </td>
              </tr>
            ))}
            {performance.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin técnicos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Últimos 10 tickets */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Últimos tickets</h2>
          <Link to="/tickets" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Prioridad</th>
              <th className="px-4 py-3 text-left">Técnico</th>
            </tr>
          </thead>
          <tbody>
            {recentTickets.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline">{t.id}</Link>
                </td>
                <td className="px-4 py-2 text-gray-800 truncate max-w-xs">{t.titulo}</td>
                <td className="px-4 py-2"><Badge value={t.estado} /></td>
                <td className="px-4 py-2"><Badge value={t.prioridad} /></td>
                <td className="px-4 py-2 text-gray-600">{t.tecnico?.nombre || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
