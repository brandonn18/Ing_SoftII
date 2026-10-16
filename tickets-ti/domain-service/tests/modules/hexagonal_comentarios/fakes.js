// Doble en memoria del puerto ComentarioRepository del módulo.
const { Comentario } = require('../../../src/modules/hexagonal_comentarios/domain');
const { ComentarioRepository } = require('../../../src/modules/hexagonal_comentarios/application/ports');

class ComentarioRepositoryEnMemoria extends ComentarioRepository {
  constructor() { super(); this.filas = []; }

  async guardar(comentario) {
    const guardado = Comentario.desdePersistencia({ ...comentario.aPrimitivos(), id: this.filas.length + 1 });
    this.filas.push(guardado);
    return guardado;
  }

  async listarPorTicket(ticketId) {
    return this.filas.filter((c) => c.ticketId === ticketId)
      .sort((a, b) => (a.createdAt - b.createdAt) || (a.id - b.id));
  }
}

module.exports = { ComentarioRepositoryEnMemoria };
