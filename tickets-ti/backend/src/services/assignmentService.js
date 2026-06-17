const { User, Ticket, Notification } = require('../models');
const { Op } = require('sequelize');
const socketService = require('./socketService');

const getAvailableTechnicians = (categoria) =>
  User.findAll({
    where: { rol: 'tecnico', activo: true },
    attributes: ['id', 'nombre', 'email'],
    order: [['nombre', 'ASC']],
  });

const getTechnicianWorkload = (tecnicoId) =>
  Ticket.count({
    where: { tecnicoId, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } },
  });

const findBestTechnician = async (categoria) => {
  const tecnicos = await getAvailableTechnicians(categoria);
  if (!tecnicos.length) return null;

  const cargas = await Promise.all(
    tecnicos.map(async (t) => {
      const cargaCategoria = await Ticket.count({
        where: { tecnicoId: t.id, categoria, estado: { [Op.notIn]: ['resuelto', 'cerrado'] } },
      });
      const cargaGlobal = await getTechnicianWorkload(t.id);
      return { tecnico: t, cargaCategoria, cargaGlobal };
    })
  );

  // Prioriza por tickets en la misma categoría, luego carga global como desempate
  cargas.sort((a, b) => a.cargaCategoria - b.cargaCategoria || a.cargaGlobal - b.cargaGlobal);
  return cargas[0].tecnico;
};

const asignarAutomaticamente = async (ticket) => {
  const elegido = await findBestTechnician(ticket.categoria);
  if (!elegido) return null;

  await ticket.update({ tecnicoId: elegido.id, estado: 'asignado' });
  await Notification.create({
    usuarioId: elegido.id,
    ticketId: ticket.id,
    tipo: 'asignacion',
    mensaje: `Se te ha asignado automáticamente el ticket ${ticket.id}: ${ticket.titulo}`,
  });
  socketService.emitToTecnico(elegido.id, 'ticket:nuevo', { ticketId: ticket.id, titulo: ticket.titulo });

  return elegido;
};

module.exports = { asignarAutomaticamente, getAvailableTechnicians, getTechnicianWorkload, findBestTechnician };
