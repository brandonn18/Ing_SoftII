require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { sequelize } = require('./src/config/db');
const cron = require('node-cron');
const { verificarSLAs } = require('./src/services/slaService');
const socketService = require('./src/services/socketService');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Models synchronized.');

    const server = http.createServer(app);
    socketService.init(server);

    // Verificar SLAs cada 15 minutos
    cron.schedule('*/15 * * * *', async () => {
      try {
        const alertas = await verificarSLAs();
        if (alertas > 0) console.log(`SLA check: ${alertas} alertas generadas.`);
      } catch (err) {
        console.error('Error en cron SLA:', err.message);
      }
    });

    // Emitir estadísticas actualizadas al admin-room cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      try {
        const { Ticket, User } = require('./src/models');
        const { Op } = require('sequelize');
        const ahora = new Date();
        const [total, abiertos, enProceso, resueltos, slaVencidos, tecnicosActivos] = await Promise.all([
          Ticket.count(),
          Ticket.count({ where: { estado: 'abierto' } }),
          Ticket.count({ where: { estado: 'en_proceso' } }),
          Ticket.count({ where: { estado: 'resuelto' } }),
          Ticket.count({ where: { sla_limite: { [Op.lt]: ahora }, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } } }),
          User.count({ where: { rol: 'tecnico', activo: true } }),
        ]);
        socketService.emitToAdmin('estadisticas:actualizadas', { total, abiertos, enProceso, resueltos, slaVencidos, tecnicosActivos });
      } catch (err) {
        console.error('Error emitiendo stats:', err.message);
      }
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
