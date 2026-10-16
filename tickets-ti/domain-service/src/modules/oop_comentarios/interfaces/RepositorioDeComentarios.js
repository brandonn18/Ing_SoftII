// Interfaz (clase abstracta): JavaScript no tiene `interface`, así que no se
// puede instanciar y cada método lanza si la subclase no lo implementa.
class RepositorioDeComentarios {
  constructor() {
    if (new.target === RepositorioDeComentarios) throw new TypeError('RepositorioDeComentarios es abstracta');
  }

  // comentario: Comentario sin id → Promise<Comentario> con id y fecha
  async guardar(comentario) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} no implementa guardar`);
  }

  // → Promise<Comentario[]> del más antiguo al más nuevo
  async listarPorTicket(ticketId) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} no implementa listarPorTicket`);
  }
}

module.exports = RepositorioDeComentarios;
