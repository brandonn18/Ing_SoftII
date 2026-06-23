import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../../services/api';
import { getSocket } from '../../services/socketService';
import Badge from '../../components/shared/Badge';

const COLORS_ESTADO = ['#3b82f6', '#6366f1', '#f97316', '#9ca3af', '#22c55e', '#374151'];
const COLORS_PRIO = { critica: '#ef4444', alta: '#f97316', media: '#eab308', baja: '#22c55e' };

function KPICard({ label, value, icon, iconBg, iconColor, badge }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: '22px' }}>{icon}</span>
        </div>
        {badge && (
          <span className="text-green-600 text-xs font-bold flex items-center bg-green-50 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-xs font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-0.5 font-heading">{value ?? '—'}</h3>
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
        api.get('/tickets?limit=8'),
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

  const donutData = [
    { name: 'Abiertos', value: summary.abiertos },
    { name: 'Asignados', value: summary.asignados },
    { name: 'En proceso', value: summary.enProceso },
    { name: 'En espera', value: summary.enEspera },
    { name: 'Resueltos', value: summary.resueltos },
    { name: 'Cerrados', value: summary.cerrados },
  ].filter((d) => d.value > 0);

  const prioData = summary.ticketsPorPrioridad?.map((e) => ({
    name: e.prioridad,
    total: parseInt(e.total),
    fill: COLORS_PRIO[e.prioridad] || '#6b7280',
  })) || [];

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight">Dashboard General</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen de la operación de soporte técnico en tiempo real.</p>
        </div>
        <span className="text-xs text-slate-400 font-semibold tracking-wide bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
          {fechaHoy}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Total de Tickets"   value={summary.totalTickets}              icon="confirmation_number" iconBg="bg-slate-100"   iconColor="text-slate-600" badge="+4%" />
        <KPICard label="Abiertos"           value={summary.abiertos}                  icon="fiber_new"          iconBg="bg-blue-50"    iconColor="text-blue-500" />
        <KPICard label="En Proceso"         value={summary.enProceso}                 icon="pending"            iconBg="bg-amber-50"   iconColor="text-amber-500" />
        <KPICard label="Resueltos"          value={summary.resueltos}                 icon="check_circle"       iconBg="bg-green-50"   iconColor="text-green-500" />
        <div className="bg-red-600 text-white p-5 rounded-xl shadow-sm border-none relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute -right-3 -top-3 opacity-10">
            <span className="material-symbols-outlined" style={{ fontSize: '72px' }}>priority_high</span>
          </div>
          <div className="p-2 bg-white/20 rounded-lg inline-block mb-3 relative z-10">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '22px' }}>alarm</span>
          </div>
          <p className="text-white/80 text-xs font-medium relative z-10">SLA Crítico</p>
          <h3 className="text-2xl font-bold mt-0.5 relative z-10">
            {summary.slaVencidos}{' '}
            <span className="text-sm font-normal text-white/80">Tickets</span>
          </h3>
        </div>
      </div>

      {/* Layout 2 columnas: main (2/3) + sidebar derecha (1/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Columna principal */}
        <div className="xl:col-span-2 space-y-5">

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-700 mb-4 font-heading">Distribución por estado</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {donutData.map((_, i) => <Cell key={i} fill={COLORS_ESTADO[i % COLORS_ESTADO.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-700 mb-4 font-heading">Tickets por prioridad</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={prioData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {prioData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tickets recientes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-700 font-heading">Últimos Tickets</h2>
              <Link to="/tickets" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Ver todos →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">ID</th>
                  <th className="px-6 py-4 text-left">Título</th>
                  <th className="px-6 py-4 text-left">Prioridad</th>
                  <th className="px-6 py-4 text-left">Estado</th>
                  <th className="px-6 py-4 text-left">Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">
                      <Link to={`/tickets/${t.id}`} className="text-indigo-600 hover:underline">{t.id}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium truncate max-w-xs">{t.titulo}</td>
                    <td className="px-6 py-4"><Badge value={t.prioridad} /></td>
                    <td className="px-6 py-4"><Badge value={t.estado} /></td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{t.tecnico?.nombre || '—'}</td>
                  </tr>
                ))}
                {recentTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">Sin tickets recientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rendimiento técnicos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-bold text-slate-700 font-heading">Rendimiento de técnicos</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">Técnico</th>
                  <th className="px-6 py-4 text-right">Asignados</th>
                  <th className="px-6 py-4 text-right">Resueltos</th>
                  <th className="px-6 py-4 text-right">Prom. (h)</th>
                  <th className="px-6 py-4 text-right">SLA vencidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performance.map((t) => (
                  <tr key={t.tecnicoId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{t.nombre}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{t.ticketsAsignados}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{t.ticketsResueltos}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{t.promedioResolucionHoras}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${t.slasVencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {t.slasVencidos}
                      </span>
                    </td>
                  </tr>
                ))}
                {performance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">Sin técnicos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar derecha (1/3) */}
        <div className="space-y-5">

          {/* Alertas SLA */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-700 font-heading">Alertas de SLA</h2>
              {slaAlerts.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {slaAlerts.length}
                </span>
              )}
            </div>
            {slaAlerts.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400">Sin alertas activas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {slaAlerts.map((t) => {
                  const ahora = Date.now();
                  const pct = (ahora - new Date(t.createdAt)) / (new Date(t.sla_limite) - new Date(t.createdAt)) * 100;
                  const vencido = ahora > new Date(t.sla_limite).getTime();
                  return (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className={`block rounded-xl p-3 border transition-colors hover:shadow-sm ${
                        vencido ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${vencido ? 'text-red-700' : 'text-yellow-700'}`}>
                        {vencido ? 'VENCIDO' : `SLA ${Math.round(pct)}%`} · {t.prioridad}
                      </p>
                      <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{t.titulo}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{t.id}</p>
                    </Link>
                  );
                })}
              </div>
            )}
            <Link
              to="/tickets"
              className="block text-center text-xs text-indigo-600 hover:text-indigo-800 mt-3 pt-3 border-t"
            >
              Ver todas las alertas
            </Link>
          </div>

          {/* Por categoría */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-700 font-heading mb-4">Por categoría</h2>
            {(summary.ticketsPorCategoria || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {(summary.ticketsPorCategoria || []).map((c) => (
                  <div key={c.categoria} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600 capitalize flex-1 min-w-0 truncate">
                      {c.categoria?.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500"
                          style={{ width: `${Math.min((parseInt(c.total) / (summary.totalTickets || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-5 text-right">{c.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
