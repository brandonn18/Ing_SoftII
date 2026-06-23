import { useForm } from 'react-hook-form';

const TIPOS = ['incidente', 'solicitud'];
const CATEGORIAS = ['hardware', 'software', 'red', 'accesos', 'servicios_ti'];
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

export default function TicketForm({ onSubmit, loading, defaultValues = {} }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          {...register('titulo', { required: 'Título requerido', minLength: { value: 5, message: 'Mínimo 5 caracteres' } })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.titulo && <p className="text-red-600 text-sm mt-1">{errors.titulo.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
        <textarea
          {...register('descripcion', { required: 'Descripción requerida' })}
          rows={4}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.descripcion && <p className="text-red-600 text-sm mt-1">{errors.descripcion.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select {...register('tipo', { required: true })} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Seleccionar...</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
          <select {...register('categoria', { required: true })} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Seleccionar...</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select {...register('prioridad')} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
      >
        {loading ? 'Guardando...' : 'Guardar Ticket'}
      </button>
    </form>
  );
}
