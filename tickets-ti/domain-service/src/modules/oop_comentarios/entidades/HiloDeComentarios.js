// Entidad HiloDeComentarios: el ticket visto desde los comentarios. Decide
// quién lee y quién escribe, y fabrica los comentarios nuevos (Creator).
const { puedeVer } = require('../../../domain/politicaAcceso');
const { ErrorDominio, CODIGOS } = require('../../../domain/errores');
const Comentario = require('./Comentario');

class HiloDeComentarios {
  #ticket;

  // ticket: { id, usuarioId, tecnicoId, estado }
  constructor(ticket) {
    if (!ticket?.id) throw new Error('HiloDeComentarios requiere un ticket');
    this.#ticket = { id: ticket.id, usuarioId: ticket.usuarioId, tecnicoId: ticket.tecnicoId, estado: ticket.estado };
  }

  get ticketId() { return this.#ticket.id; }

  estaCerrado() { return this.#ticket.estado === 'cerrado'; }

  puedeLeer(autor) { return puedeVer(this.#ticket, { id: autor.id, rol: autor.rol }); }

  puedeComentar(autor) {
    if (autor.esAdministrador()) return true;
    if (autor.esTecnico()) return this.#ticket.tecnicoId === autor.id;
    return this.#ticket.usuarioId === autor.id;
  }

  exigirLectura(autor) {
    if (!this.puedeLeer(autor)) throw new ErrorDominio(CODIGOS.ACCESO_DENEGADO, 'Sin acceso a este ticket');
  }

  comentar(autor, texto) {
    if (!this.puedeComentar(autor)) {
      throw new ErrorDominio(CODIGOS.ACCESO_DENEGADO, 'Solo el solicitante, el técnico asignado o un administrador pueden comentar');
    }
    if (this.estaCerrado()) throw new ErrorDominio(CODIGOS.TRANSICION_INVALIDA, 'No se puede comentar un ticket cerrado; reábrelo primero');
    return new Comentario({ ticketId: this.#ticket.id, autor, texto });
  }
}

module.exports = HiloDeComentarios;
