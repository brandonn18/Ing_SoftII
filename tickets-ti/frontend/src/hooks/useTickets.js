import { useState, useEffect, useCallback } from 'react';
import { ticketService } from '../services/ticketService';

export const useTickets = (params = {}) => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ticketService.getAll(params);
      setTickets(data.data);
      setTotal(data.meta?.total ?? data.total ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => { fetch(); }, [fetch]);

  return { tickets, total, loading, error, refetch: fetch };
};
