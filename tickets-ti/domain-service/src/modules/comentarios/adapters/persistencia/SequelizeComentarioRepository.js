const { Comentario } = require('../../domain');
const { ComentarioRepository } = require('../../application/ports');

const ATRIBUTOS = ['id', 'ticketId', 'autorId', 'autor_nombre', 'autor_rol', 'texto', 'createdAt'];

const _aEntidad = (fila) => Comentario.desdePersistencia(
  Object.fromEntries(ATRIBUTOS.map((campo) => [campo, fila.get(campo)])),
);

class SequelizeComentarioRepository extends ComentarioRepository {
  constructor(modelo) {
    super();
    if (!modelo) throw new Error('SequelizeComentarioRepository requiere el modelo TicketComentario');
    this.modelo = modelo;
  }

  // createdAt lo asigna la base de datos (igual que en el resto de tablas)
  async guardar(comentario) {
    const { id, createdAt, ...datos } = comentario.aPrimitivos();
    return _aEntidad(await this.modelo.create(datos));
  }

  async listarPorTicket(ticketId) {
    const filas = await this.modelo.findAll({
      attributes: ATRIBUTOS, where: { ticketId }, order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    return filas.map(_aEntidad);
  }
}

module.exports = SequelizeComentarioRepository;
