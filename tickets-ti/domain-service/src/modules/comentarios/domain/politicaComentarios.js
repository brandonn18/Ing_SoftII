// Quién puede leer y escribir en el hilo de comentarios de un ticket.
// Leer: quien puede ver el ticket (reutiliza la política del núcleo).
// Escribir: el administrador, el técnico asignado y el dueño del ticket;
// nadie comenta un ticket cerrado (hay que reabrirlo primero).
const { ROLES } = require('../../../domain/catalogos');
const { puedeVer } = require('../../../domain/politicaAcceso');
const { ErrorDominio, CODIGOS } = require('../../../domain/errores');

const _participa = (ticket, actor) => {
  if (actor.rol === ROLES.ADMIN) return true;
  if (actor.rol === ROLES.TECNICO) return ticket.tecnicoId === actor.id;
  return ticket.usuarioId === actor.id;
};

const exigirLeer = (ticket, actor) => {
  if (!puedeVer(ticket, actor)) throw new ErrorDominio(CODIGOS.ACCESO_DENEGADO, 'Sin acceso a este ticket');
};

const exigirComentar = (ticket, actor) => {
  if (!_participa(ticket, actor)) {
    throw new ErrorDominio(CODIGOS.ACCESO_DENEGADO, 'Solo el solicitante, el técnico asignado o un administrador pueden comentar');
  }
  if (ticket.estado === 'cerrado') {
    throw new ErrorDominio(CODIGOS.TRANSICION_INVALIDA, 'No se puede comentar un ticket cerrado; reábrelo primero');
  }
};

module.exports = { exigirLeer, exigirComentar };
