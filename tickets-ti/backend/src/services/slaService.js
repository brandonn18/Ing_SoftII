const { Ticket, SLAConfig, User } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

const SLA_HORAS_DEFAULT = { critica: 4, alta: 8, media: 24, baja: 72 };

const checkSLAStatus = (ticket, slaConfig) => {
  const ahora = new Date();
  const horasSLA = slaConfig?.tiempo_horas || SLA_HORAS_DEFAULT[ticket.prioridad] || 24;
  const tiempoTotalMs = horasSLA * 60 * 60 * 1000;
  const tiempoConsumidoMs = ahora.getTime() - new Date(ticket.createdAt).getTime();
  const porcentaje = Math.min((tiempoConsumidoMs / tiempoTotalMs) * 100, 100);
  const vencido = ahora > new Date(ticket.sla_limite);
  const porcentajeAlerta = slaConfig?.porcentaje_alerta || 80;
  const alertar = porcentaje >= porcentajeAlerta && !ticket.sla_alerta_enviada;
  return { porcentaje, vencido, alertar };
};

const verificarSLAs = async () => {
  const ticketsActivos = await Ticket.findAll({
    where: {
      estado: { [Op.notIn]: ['resuelto', 'cerrado'] },
      sla_alerta_enviada: false,
      sla_limite: { [Op.not]: null },
      tecnicoId: { [Op.not]: null },
    },
    include: [{ model: User, as: 'tecnico', attributes: ['id', 'nombre', 'email'] }],
  });

  let alertas = 0;

  for (const ticket of ticketsActivos) {
    const slaConfig = await SLAConfig.findOne({ where: { prioridad: ticket.prioridad } });
    const { porcentaje, alertar } = checkSLAStatus(ticket, slaConfig);

    if (alertar) {
      await notificationService.crear({
        usuarioId: ticket.tecnicoId,
        ticketId: ticket.id,
        tipo: 'sla_alerta',
        mensaje: `Alerta SLA: El ticket ${ticket.id} lleva el ${Math.round(porcentaje)}% del tiempo consumido. Límite: ${new Date(ticket.sla_limite).toLocaleString()}.`,
      });
      if (ticket.tecnico) {
        notificationService.sendSLAAlertEmail(ticket.tecnico, ticket, porcentaje)
          .catch((err) => console.error('Error email SLA:', err.message));
      }
      socketService.emitToTecnico(ticket.tecnicoId, 'ticket:sla_alerta', { ticketId: ticket.id, porcentaje: Math.round(porcentaje) });
      socketService.emitToAdmin('ticket:sla_alerta', { ticketId: ticket.id, porcentaje: Math.round(porcentaje) });
      await ticket.update({ sla_alerta_enviada: true });
      alertas++;
    }
  }

  return alertas;
};

const startSLAMonitor = () => {
  const cron = require('node-cron');
  return cron.schedule('*/15 * * * *', async () => {
    try {
      const alertas = await verificarSLAs();
      if (alertas > 0) console.log(`[SLA] ${alertas} alerta(s) generadas`);
    } catch (err) {
      console.error('[SLA] Error en verificación:', err.message);
    }
  });
};

module.exports = { verificarSLAs, checkSLAStatus, startSLAMonitor };
