// Interfaz (clase abstracta): de dónde salen los datos del ticket que el hilo
// necesita para decidir permisos.
class FuenteDeTickets {
  constructor() {
    if (new.target === FuenteDeTickets) throw new TypeError('FuenteDeTickets es abstracta');
  }

  // → Promise<{ id, usuarioId, tecnicoId, estado } | null>
  async buscar(ticketId) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} no implementa buscar`);
  }
}

module.exports = FuenteDeTickets;
