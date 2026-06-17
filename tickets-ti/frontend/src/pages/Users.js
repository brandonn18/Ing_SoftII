import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ROL_BADGE = {
  administrador: 'bg-purple-100 text-purple-800',
  tecnico: 'bg-blue-100 text-blue-800',
  usuario: 'bg-gray-100 text-gray-700',
};

const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'usuario', activo: true };

// ─── Modal creación / edición ────────────────────────────────────────────────

function UserModal({ user, onClose, onSaved }) {
  const esEdicion = !!user;
  const [form, setForm] = useState(esEdicion
    ? { nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo, password: '' }
    : { ...FORM_VACIO });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const validar = () => {
    const er = {};
    if (!form.nombre.trim()) er.nombre = 'Nombre requerido';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) er.email = 'Email inválido';
    if (!esEdicion) {
      if (!form.password) er.password = 'Contraseña requerida';
      else if (form.password.length < 8) er.password = 'Mínimo 8 caracteres';
      else if (!/[A-Z]/.test(form.password)) er.password = 'Debe tener al menos 1 mayúscula';
      else if (!/[0-9]/.test(form.password)) er.password = 'Debe tener al menos 1 número';
    }
    if (!form.rol) er.rol = 'Rol requerido';
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validar();
    if (Object.keys(er).length) return setErrors(er);

    setSaving(true);
    try {
      const payload = { nombre: form.nombre, email: form.email, rol: form.rol };
      if (!esEdicion) payload.password = form.password;
      if (esEdicion) payload.activo = form.activo;

      if (esEdicion) {
        await api.put(`/users/${user.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', payload);
        toast.success('Usuario creado');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar usuario' : 'Crear usuario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={set('nombre')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Juan Pérez"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@empresa.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {!esEdicion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={form.rol}
              onChange={set('rol')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="usuario">Usuario</option>
              <option value="tecnico">Técnico</option>
              <option value="administrador">Administrador</option>
            </select>
            {errors.rol && <p className="text-red-500 text-xs mt-1">{errors.rol}</p>}
          </div>

          {esEdicion && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo}
                onChange={set('activo')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="activo" className="text-sm text-gray-700">Cuenta activa</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Users() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [modal, setModal] = useState(null); // null | 'crear' | user object (editar)

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      if (filtroRol) params.append('rol', filtroRol);
      if (filtroActivo !== '') params.append('activo', filtroActivo);

      const res = await api.get(`/users?${params}`);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [search, filtroRol, filtroActivo]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleReset = async (user) => {
    if (!window.confirm(`¿Resetear contraseña de ${user.nombre}?`)) return;
    try {
      await api.post(`/users/${user.id}/reset-password`);
      toast.success(`Contraseña temporal enviada a ${user.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al resetear contraseña');
    }
  };

  const handleToggle = async (user) => {
    const accion = user.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${accion} a ${user.nombre}?`)) return;
    try {
      if (user.activo) {
        await api.delete(`/users/${user.id}`);
        toast.success('Usuario desactivado');
      } else {
        await api.put(`/users/${user.id}`, { activo: true });
        toast.success('Usuario activado');
      }
      fetchUsers(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar usuario');
    }
  };

  const onSaved = () => {
    setModal(null);
    fetchUsers(modal === 'crear' ? 1 : meta.page);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} usuarios registrados</p>
        </div>
        <button
          onClick={() => setModal('crear')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los roles</option>
          <option value="usuario">Usuario</option>
          <option value="tecnico">Técnico</option>
          <option value="administrador">Administrador</option>
        </select>
        <select
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No se encontraron usuarios</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${ROL_BADGE[u.rol] || 'bg-gray-100'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setModal(u)}
                        title="Editar"
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReset(u)}
                        title="Resetear contraseña"
                        className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggle(u)}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded transition-colors ${u.activo ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                      >
                        {u.activo ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                onClick={() => fetchUsers(meta.page - 1)}
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
                    onClick={() => fetchUsers(p)}
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
                onClick={() => fetchUsers(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'crear' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
