const { politicaComentarios } = require('../../domain');
const { ComentarioRepository, TicketsConsultaPort } = require('../ports');
const { requerirDependencias, ticketOFallar } = require('../../../../application/dependencias');

// Devuelve el hilo de comentarios de un ticket que el actor puede ver.
class ListarComentarios {
  constructor(deps) {
    requerirDependencias(deps, { comentarioRepository: ComentarioRepository, tickets: TicketsConsultaPort });
    this.deps = deps;
  }

  async ejecutar(ticketId, actor) {
    const ticket = await ticketOFallar(this.deps.tickets, ticketId);
    politicaComentarios.exigirLeer(ticket, actor);
    return this.deps.comentarioRepository.listarPorTicket(ticket.id);
  }
}

module.exports = ListarComentarios;
