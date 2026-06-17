import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Reports() {
  const [resumen, setResumen] = useState(null);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/resumen').then((r) => r.data),
      api.get('/reports/sla').then((r) => r.data),
    ]).then(([r, s]) => { setResumen(r); setSla(s); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando reportes...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Tickets por Estado</h2>
          <div className="space-y-3">
            {resumen?.porEstado?.map((e) => (
              <div key={e.estado} className="flex justify-between items-center">
                <span className="capitalize text-gray-600">{e.estado?.replace('_', ' ')}</span>
                <span className="font-bold text-gray-900">{e.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">SLA</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Tickets vencidos</span>
              <span className="font-bold text-red-600">{sla?.vencidos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">En riesgo (próx. 2h)</span>
              <span className="font-bold text-yellow-600">{sla?.enRiesgo}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 md:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">Por Prioridad</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {resumen?.porPrioridad?.map((p) => (
              <div key={p.prioridad} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{p.total}</p>
                <p className="text-gray-500 text-sm capitalize">{p.prioridad}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
