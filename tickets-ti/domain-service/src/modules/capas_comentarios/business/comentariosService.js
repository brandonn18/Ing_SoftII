// Capa de NEGOCIO: reglas de los comentarios. No conoce HTTP ni SQL: recibe
// los DAO de la capa de datos y devuelve objetos planos.
const { ROLES } = require('../../../domain/catalogos');
const { puedeVer } = require('../../../domain/politicaAcceso');
const { ErrorDominio, CODIGOS, errorValidacion } = require('../../../domain/errores');

const LONGITUD_MAXIMA = 2000;

const _validarTexto = (texto) => {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (!limpio) throw errorValidacion('El comentario no puede estar vacío');
  if (limpio.length > LONGITUD_MAXIMA) throw errorValidacion(`El comentario no puede superar ${LONGITUD_MAXIMA} caracteres`);
  return limpio;
};

const _participa = (ticket, actor) => {
  if (actor.rol === ROLES.ADMIN) return true;
  if (actor.rol === ROLES.TECNICO) return ticket.tecnicoId === actor.id;
  return ticket.usuarioId === actor.id;
};

const _denegar = (mensaje) => new ErrorDominio(CODIGOS.ACCESO_DENEGADO, mensaje);

// dao: { comentarios: { listarPorTicket, insertar }, tickets: { buscarPorId } }
const crearComentariosService = (dao) => {
  if (!dao?.comentarios || !dao?.tickets) throw new Error('comentariosService requiere los DAO de comentarios y tickets');

  const _ticketOFallar = async (ticketId) => {
    const ticket = await dao.tickets.buscarPorId(ticketId);
    if (!ticket) throw new ErrorDominio(CODIGOS.NO_ENCONTRADO, 'Ticket no encontrado');
    return ticket;
  };

  const listar = async (ticketId, actor) => {
    const ticket = await _ticketOFallar(ticketId);
    if (!puedeVer(ticket, actor)) throw _denegar('Sin acceso a este ticket');
    return dao.comentarios.listarPorTicket(ticket.id);
  };

  const comentar = async (ticketId, texto, actor) => {
    const ticket = await _ticketOFallar(ticketId);
    if (!_participa(ticket, actor)) throw _denegar('Solo el solicitante, el técnico asignado o un administrador pueden comentar');
    if (ticket.estado === 'cerrado') throw new ErrorDominio(CODIGOS.TRANSICION_INVALIDA, 'No se puede comentar un ticket cerrado; reábrelo primero');
    return dao.comentarios.insertar({
      ticketId: ticket.id, autorId: actor.id, autorNombre: actor.nombre, autorRol: actor.rol, texto: _validarTexto(texto),
    });
  };

  return { listar, comentar };
};

module.exports = { crearComentariosService, LONGITUD_MAXIMA };
