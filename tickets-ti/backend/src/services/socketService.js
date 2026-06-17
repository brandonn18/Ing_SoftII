const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

let io = null;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      socket.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id, rol } = socket.user;
    socket.join(`user-${id}`);
    if (rol === 'administrador') socket.join('admin-room');
    if (rol === 'tecnico') socket.join(`tecnico-${id}`);
  });

  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user-${userId}`).emit(event, data);
};

const emitToTecnico = (tecnicoId, event, data) => {
  if (io) io.to(`tecnico-${tecnicoId}`).emit(event, data);
};

const emitToAdmin = (event, data) => {
  if (io) io.to('admin-room').emit(event, data);
};

module.exports = { init, emitToUser, emitToTecnico, emitToAdmin };
