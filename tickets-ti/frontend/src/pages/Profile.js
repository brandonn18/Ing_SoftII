import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ passwordActual: '', passwordNuevo: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.passwordNuevo !== form.confirmar) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ passwordActual: form.passwordActual, passwordNuevo: form.passwordNuevo });
      toast.success('Contraseña actualizada');
      setForm({ passwordActual: '', passwordNuevo: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="space-y-3 text-sm">
          <div><span className="text-gray-500">Nombre:</span> <span className="font-medium ml-2">{user?.nombre}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-2">{user?.email}</span></div>
          <div><span className="text-gray-500">Rol:</span> <span className="font-medium ml-2 capitalize">{user?.rol}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Cambiar Contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {['passwordActual', 'passwordNuevo', 'confirmar'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field === 'passwordActual' ? 'Contraseña actual' : field === 'passwordNuevo' ? 'Nueva contraseña' : 'Confirmar nueva'}
              </label>
              <input
                type="password" name={field} value={form[field]} onChange={handleChange} required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
