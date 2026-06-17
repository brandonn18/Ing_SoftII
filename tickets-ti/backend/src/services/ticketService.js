const { Ticket, SLAConfig, AuditLog, Notification, User } = require('../models');
const { Op } = require('sequelize');
const { asignarAutomaticamente } = require('./assignmentService');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

const SLA_HORAS = { critica: 4, alta: 8, media: 24, baja: 72 };

const TRANSICIONES_VALIDAS = {
  abierto: ['asignado'],
  asignado: ['en_proceso'],
  en_proceso: ['en_espera', 'resuelto'],
  en_espera: ['en_proceso'],
  resuelto: ['cerrado', 'abierto'],
  cerrado: ['abierto'],
};

const generarId = async () => {
  const anio = new Date().getFullYear();
  const count = await Ticket.count({ where: { id: { [Op.like]: `TKT-${anio}-%` } } });
  return `TKT-${anio}-${String(count + 1).padStart(4, '0')}`;
};

const _slaLimite = async (prioridad) => {
  const cfg = await SLAConfig.findOne({ where: { prioridad } });
  const horas = cfg ? cfg.tiempo_horas : (SLA_HORAS[prioridad] || 24);
  return new Date(Date.now() + horas * 60 * 60 * 1000);
};

const crearTicket = async (data) => {
  const prioridad = data.prioridad || 'media';
  const sla_limite = await _slaLimite(prioridad);
  const id = await generarId();
  const ticket = await Ticket.create({ ...data, id, estado: 'abierto', sla_limite });

  await AuditLog.create({
    usuarioId: data.usuarioId,
    ticketId: ticket.id,
    accion: 'TICKET_CREADO',
    detalle: { titulo: ticket.titulo, categoria: ticket.categoria, prioridad },
  });

  await Notification.create({
    usuarioId: data.usuarioId,
    ticketId: ticket.id,
    tipo: 'creacion',
    mensaje: `Tu ticket ${ticket.id} "${ticket.titulo}" ha sido creado y será asignado a un técnico.`,
  });

  await asignarAutomaticamente(ticket);
  return ticket.reload();
};

const assignTicket = async (ticketId, tecnicoId, adminId) => {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) { const e = new Error('Ticket no encontrado'); e.status = 404; throw e; }
  const tecnico = await User.findOne({ where: { id: tecnicoId, rol: 'tecnico', activo: true } });
  if (!tecnico) { const e = new Error('Técnico no encontrado o inactivo'); e.status = 404; throw e; }

  await ticket.update({ tecnicoId, estado: 'asignado' });
  await AuditLog.create({
    usuarioId: adminId, ticketId: ticket.id,
    accion: 'TICKET_ASIGNADO',
    detalle: { tecnicoId, tecnicoNombre: tecnico.nombre },
  });
  await Notification.create({
    usuarioId: tecnicoId, ticketId: ticket.id,
    tipo: 'asignacion',
    mensaje: `Se te ha asignado el ticket ${ticket.id}: ${ticket.titulo}`,
  });
  notificationService.sendTicketAssignedEmail(tecnico, ticket)
    .catch((err) => console.error('Error email asignación:', err.message));

  return ticket.reload();
};

const autoAssign = async (ticket) => asignarAutomaticamente(ticket);

const updateStatus = async (ticketId, nuevoEstado, usuarioId, comentario) => {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) { const e = new Error('Ticket no encontrado'); e.status = 404; throw e; }

  const permitidos = TRANSICIONES_VALIDAS[ticket.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    const e = new Error(
      `Transición inválida: '${ticket.estado}' → '${nuevoEstado}'. Permitidos: ${permitidos.join(', ') || 'ninguno'}`
    );
    e.status = 400; throw e;
  }

  const estadoAnterior = ticket.estado;
  await ticket.update({ estado: nuevoEstado });
  await AuditLog.create({
    usuarioId, ticketId: ticket.id,
    accion: 'CAMBIO_ESTADO',
    detalle: { de: estadoAnterior, a: nuevoEstado, comentario },
  });

  if (nuevoEstado === 'resuelto' && ticket.usuarioId) {
    await Notification.create({
      usuarioId: ticket.usuarioId, ticketId: ticket.id,
      tipo: 'resolucion',
      mensaje: `Tu ticket ${ticket.id} ha sido resuelto.`,
    });
    socketService.emitToUser(ticket.usuarioId, 'ticket:estado_cambiado', {
      ticketId: ticket.id, estadoAnterior, nuevoEstado,
    });
    const usuario = await User.findByPk(ticket.usuarioId);
    if (usuario) {
      notificationService.sendTicketResolvedEmail(usuario, await ticket.reload())
        .catch((err) => console.error('Error email resolución:', err.message));
    }
  }

  return ticket.reload();
};

const reopenTicket = async (ticketId, usuarioId, motivo) => {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) { const e = new Error('Ticket no encontrado'); e.status = 404; throw e; }
  if (!['resuelto', 'cerrado'].includes(ticket.estado)) {
    const e = new Error('Solo se pueden reabrir tickets resueltos o cerrados'); e.status = 400; throw e;
  }

  const sla_limite = await _slaLimite(ticket.prioridad);
  await ticket.update({
    estado: 'abierto',
    reabierto: true,
    motivo_reapertura: motivo,
    sla_limite,
    sla_alerta_enviada: false,
  });
  await AuditLog.create({
    usuarioId, ticketId: ticket.id,
    accion: 'TICKET_REABIERTO',
    detalle: { motivo },
  });
  return ticket.reload();
};

module.exports = { crearTicket, generarId, assignTicket, autoAssign, updateStatus, reopenTicket };
