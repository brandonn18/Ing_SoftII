import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/shared/Badge';
import { ticketService } from '../services/ticketService';
import { toast } from 'react-toastify';

const ESTADOS = ['', 'abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado'];
const PRIORIDADES = ['', 'baja', 'media', 'alta', 'critica'];
const CATEGORIAS = ['', 'hardware', 'software', 'red', 'accesos', 'servicios_ti'];

const slaBadge = (ticket) => {
  if (!ticket.sla_limite) return null;
  const ahora = Date.now();
  const limite = new Date(ticket.sla_limite).getTime();
  const creado = new Date(ticket.createdAt).getTime();
  const total = limite - creado;
  const consumido = ahora - creado;
  const pct = total > 0 ? (consumido / total) * 100 : 100;

  if (ahora > limite || pct >= 100) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">SLA vencido</span>;
  }
  if (pct >= 80) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">SLA {Math.round(pct)}%</span>;
  }
  return null;
};

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({ estado: '', prioridad: '', categoria: '' });

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (filtros.estado) params.estado = filtros.estado;
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} ticket{meta.total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/tickets/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Ticket
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o ID..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtros.estado}
          onChange={setFiltro('estado')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ESTADOS.map((e) => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
        </select>
        <select
          value={filtros.prioridad}
          onChange={setFiltro('prioridad')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p || 'Toda prioridad'}</option>)}
        </select>
        <select
          value={filtros.categoria}
          onChange={setFiltro('categoria')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c ? c.replace('_', ' ') : 'Toda categoría'}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No se encontraron tickets</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Prioridad</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Técnico</th>
                <th className="px-4 py-3 text-left">SLA</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline font-medium">
                      {t.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{t.tipo}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{t.categoria?.replace('_', ' ')}</td>
                  <td className="px-4 py-3"><Badge value={t.prioridad} /></td>
                  <td className="px-4 py-3"><Badge value={t.estado} /></td>
                  <td className="px-4 py-3 text-gray-600">{t.tecnico?.nombre || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">{slaBadge(t)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/tickets/${t.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchTickets(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - meta.page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchTickets(p)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      p === meta.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => fetchTickets(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
