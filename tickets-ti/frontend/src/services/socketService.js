import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
