import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TicketForm from '../components/forms/TicketForm';
import { ticketService } from '../services/ticketService';

export default function TicketCreate() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const ticket = await ticketService.create(data);
      toast.success('Ticket creado exitosamente');
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Ticket</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <TicketForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
