import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Forbidden() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const destino = role === 'administrador' ? '/dashboard' : '/tickets';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-blue-100 mb-2">403</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
        <p className="text-gray-500 mb-6">
          No tienes permisos para acceder a esta sección.
        </p>
        <button
          onClick={() => navigate(destino, { replace: true })}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
