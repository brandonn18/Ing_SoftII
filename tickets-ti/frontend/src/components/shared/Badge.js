const COLORS = {
  abierto: 'bg-blue-100 text-blue-800',
  asignado: 'bg-indigo-100 text-indigo-800',
  en_proceso: 'bg-orange-100 text-orange-800',
  en_espera: 'bg-gray-200 text-gray-700',
  resuelto: 'bg-green-100 text-green-800',
  cerrado: 'bg-gray-700 text-white',
  baja: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-orange-100 text-orange-800',
  critica: 'bg-red-100 text-red-800',
};

export default function Badge({ value }) {
  const color = COLORS[value] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {value?.replace('_', ' ')}
    </span>
  );
}
