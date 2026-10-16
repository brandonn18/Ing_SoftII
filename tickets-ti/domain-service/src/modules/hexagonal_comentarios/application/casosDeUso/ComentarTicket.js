const { Comentario, politicaComentarios } = require('../../domain');
const { ComentarioRepository, TicketsConsultaPort, Clock } = require('../ports');
const { requerirDependencias, ticketOFallar } = require('../../../../application/dependencias');

// Agrega un comentario al hilo de un ticket.
class ComentarTicket {
  constructor(deps) {
    requerirDependencias(deps, { comentarioRepository: ComentarioRepository, tickets: TicketsConsultaPort, clock: Clock });
    this.deps = deps;
  }

  async ejecutar(ticketId, texto, actor) {
    const ticket = await ticketOFallar(this.deps.tickets, ticketId);
    politicaComentarios.exigirComentar(ticket, actor);
    const comentario = Comentario.crear({ ticketId: ticket.id, autor: actor, texto }, { ahora: this.deps.clock.ahora() });
    return this.deps.comentarioRepository.guardar(comentario);
  }
}

module.exports = ComentarTicket;
