import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/shared/Badge';
import { ticketService } from '../services/ticketService';
import { toast } from 'react-toastify';

const STATUS_TABS = [
  { label: 'Todos',      value: '' },
  { label: 'Abiertos',   value: 'abierto' },
  { label: 'Asignados',  value: 'asignado' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'En espera',  value: 'en_espera' },
  { label: 'Resueltos',  value: 'resuelto' },
  { label: 'Cerrados',   value: 'cerrado' },
];

const PRIORIDADES = ['', 'baja', 'media', 'alta', 'critica'];
const CATEGORIAS  = ['', 'hardware', 'software', 'red', 'accesos', 'servicios_ti'];

const PRIORIDAD_DOT = {
  critica: 'bg-red-600 text-red-700',
  alta:    'bg-orange-500 text-orange-600',
  media:   'bg-yellow-400 text-yellow-600',
  baja:    'bg-emerald-500 text-emerald-600',
};

function PrioridadDot({ value }) {
  const cls = PRIORIDAD_DOT[value] || 'bg-slate-400 text-slate-500';
  const [dot, text] = cls.split(' ');
  return (
    <span className={`flex items-center gap-1.5 font-semibold text-sm ${text}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className="capitalize">{value}</span>
    </span>
  );
}

function CategoriaBadge({ value }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold uppercase tracking-wide">
      {value.replace('_', ' ')}
    </span>
  );
}

const slaBadge = (ticket) => {
  if (!ticket.sla_limite) return null;
  const ahora   = Date.now();
  const limite  = new Date(ticket.sla_limite).getTime();
  const creado  = new Date(ticket.createdAt).getTime();
  const total   = limite - creado;
  const pct     = total > 0 ? ((ahora - creado) / total) * 100 : 100;
  if (ahora > limite || pct >= 100)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">SLA vencido</span>;
  if (pct >= 80)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100">SLA {Math.round(pct)}%</span>;
  return null;
};

export default function Tickets() {
  const [tickets, setTickets]   = useState([]);
  const [meta, setMeta]         = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filtros, setFiltros]   = useState({ estado: '', prioridad: '', categoria: '' });

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search)          params.search    = search;
      if (filtros.estado)  params.estado    = filtros.estado;
      if (filtros.prioridad) params.prioridad = filtros.prioridad;
      if (filtros.categoria) params.categoria = filtros.categoria;
      const res = await ticketService.getAll(params);
      setTickets(res.data);
      setMeta(res.meta);
    } catch {
      toast.error('Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  }, [search, filtros]);

  useEffect(() => { fetchTickets(1); }, [fetchTickets]);

  const setFiltro = (key) => (e) => setFiltros((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <nav className="flex text-xs text-slate-400 mb-1.5 gap-1.5 items-center">
            <span>Soporte</span>
            <span>/</span>
            <span className="text-slate-600 font-medium">Gestión de Tickets</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-slate-800 font-heading">Gestión de Tickets</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {meta.total} ticket{meta.total !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/tickets/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all text-sm font-bold active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Ticket
          </Link>
        </div>
      </div>

      {/* Tabs de estado */}
      <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 px-2">
        <div className="flex overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFiltros((f) => ({ ...f, estado: tab.value }))}
              className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                filtros.estado === tab.value
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros secundarios */}
      <div className="bg-white/80 backdrop-blur-sm border border-t-0 border-slate-200 rounded-b-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filtrar:
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o ID..."
          className="flex-1 min-w-44 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400"
        />
        <select
          value={filtros.prioridad}
          onChange={setFiltro('prioridad')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
        >
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p || 'Cualquier prioridad'}</option>)}
        </select>
        <select
          value={filtros.categoria}
          onChange={setFiltro('categoria')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c ? c.replace('_', ' ') : 'Cualquier categoría'}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Cargando tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No se encontraron tickets</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Título / Descripción</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Prioridad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Técnico</th>
                <th className="px-6 py-4">SLA</th>
                <th className="px-6 py-4 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold whitespace-nowrap">
                    <Link to={`/tickets/${t.id}`} className="text-indigo-600 hover:underline">
                      {t.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/tickets/${t.id}`} className="block hover:text-indigo-700 transition-colors">
                      <p className="font-semibold text-slate-800 text-sm leading-snug">{t.titulo}</p>
                      {t.tipo && (
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{t.tipo}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <CategoriaBadge value={t.categoria} />
                  </td>
                  <td className="px-6 py-4">
                    <PrioridadDot value={t.prioridad} />
                  </td>
                  <td className="px-6 py-4">
                    <Badge value={t.estado} />
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {t.tecnico?.nombre || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4">{slaBadge(t)}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs font-medium whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Mostrando{' '}
              <span className="font-semibold text-slate-700">
                {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}
              </span>{' '}
              de <span className="font-semibold text-slate-700">{meta.total}</span> tickets
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchTickets(meta.page - 1)}
                disabled={meta.page <= 1}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - meta.page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchTickets(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === meta.page
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => fetchTickets(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
