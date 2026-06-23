import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socketService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=50').then((r) => r.data);
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.leida).length);
    } catch {}
  }, []);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/count').then((r) => r.data.data);
      setUnreadCount(res.unread);
    } catch {}
  }, []);

  const connectSocket = useCallback((token) => {
    const socket = initSocket(token);
    socketRef.current = socket;

    socket.on('notificacion:nueva', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      toast.info(notif.mensaje, { autoClose: 4000 });
    });

    socket.on('ticket:nuevo', ({ ticketId, titulo }) => {
      toast.info(`Nuevo ticket asignado: ${titulo}`, { autoClose: 5000 });
      fetchCount();
    });

    socket.on('ticket:estado_cambiado', ({ ticketId, nuevoEstado }) => {
      toast.info(`Tu ticket ${ticketId} cambió a: ${nuevoEstado.replace('_', ' ')}`, { autoClose: 4000 });
    });

    socket.on('ticket:sla_alerta', ({ ticketId, porcentaje }) => {
      toast.warn(`Alerta SLA: ticket ${ticketId} al ${porcentaje}%`, { autoClose: 6000 });
    });

    socket.on('estadisticas:actualizadas', () => {
      // Las páginas del dashboard escuchan esto directamente si quieren
    });
  }, [fetchCount]);

  const disconnectCurrentSocket = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount,
      fetchNotifications, fetchCount,
      markRead, markAllRead,
      connectSocket, disconnectCurrentSocket,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
