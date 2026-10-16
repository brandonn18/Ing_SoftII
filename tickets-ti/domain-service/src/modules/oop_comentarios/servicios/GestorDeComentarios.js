// Servicio GestorDeComentarios: coordina entidades e interfaces. Recibe sus
// colaboradores por constructor (inyección de dependencias) y solo conoce
// las interfaces, nunca las clases concretas de infraestructura.
const { ErrorDominio, CODIGOS } = require('../../../domain/errores');
const Autor = require('../entidades/Autor');
const HiloDeComentarios = require('../entidades/HiloDeComentarios');
const RepositorioDeComentarios = require('../interfaces/RepositorioDeComentarios');
const FuenteDeTickets = require('../interfaces/FuenteDeTickets');

class GestorDeComentarios {
  #repositorio;
  #tickets;

  constructor({ repositorio, tickets } = {}) {
    if (!(repositorio instanceof RepositorioDeComentarios)) throw new TypeError('repositorio debe extender RepositorioDeComentarios');
    if (!(tickets instanceof FuenteDeTickets)) throw new TypeError('tickets debe extender FuenteDeTickets');
    this.#repositorio = repositorio;
    this.#tickets = tickets;
  }

  async #hiloDe(ticketId) {
    const ticket = await this.#tickets.buscar(ticketId);
    if (!ticket) throw new ErrorDominio(CODIGOS.NO_ENCONTRADO, 'Ticket no encontrado');
    return new HiloDeComentarios(ticket);
  }

  async listar(ticketId, actor) {
    const autor = Autor.desdeActor(actor);
    const hilo = await this.#hiloDe(ticketId);
    hilo.exigirLectura(autor);
    return this.#repositorio.listarPorTicket(hilo.ticketId);
  }

  async comentar(ticketId, texto, actor) {
    const autor = Autor.desdeActor(actor);
    const hilo = await this.#hiloDe(ticketId);
    return this.#repositorio.guardar(hilo.comentar(autor, texto));
  }
}

module.exports = GestorDeComentarios;
