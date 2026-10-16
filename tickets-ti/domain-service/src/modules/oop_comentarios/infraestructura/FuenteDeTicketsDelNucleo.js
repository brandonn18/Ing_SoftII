// Implementación concreta de FuenteDeTickets: adapta el TicketRepository
// del núcleo (composición en vez de herencia: lo envuelve, no lo extiende).
const FuenteDeTickets = require('../interfaces/FuenteDeTickets');

class FuenteDeTicketsDelNucleo extends FuenteDeTickets {
  #ticketRepository;

  constructor(ticketRepository) {
    super();
    if (typeof ticketRepository?.buscarPorId !== 'function') throw new TypeError('Se requiere un repositorio con buscarPorId');
    this.#ticketRepository = ticketRepository;
  }

  async buscar(ticketId) {
    const ticket = await this.#ticketRepository.buscarPorId(ticketId);
    if (!ticket) return null;
    return { id: ticket.id, usuarioId: ticket.usuarioId, tecnicoId: ticket.tecnicoId, estado: ticket.estado };
  }
}

module.exports = FuenteDeTicketsDelNucleo;
