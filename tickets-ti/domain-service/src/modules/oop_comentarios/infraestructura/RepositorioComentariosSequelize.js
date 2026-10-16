// Implementación concreta de RepositorioDeComentarios sobre Sequelize.
// Herencia: cumple la interfaz y puede reemplazarla donde se pida (LSP).
const { DataTypes } = require('sequelize');
const RepositorioDeComentarios = require('../interfaces/RepositorioDeComentarios');
const Comentario = require('../entidades/Comentario');
const Autor = require('../entidades/Autor');

const ATRIBUTOS = ['id', 'ticketId', 'autorId', 'autor_nombre', 'autor_rol', 'texto', 'createdAt'];

// Misma tabla que los demás módulos de comentarios; modelo propio para no
// depender de otra carpeta. Idempotente sobre el mismo sequelize.
const definirModelo = (sequelize) => sequelize.models.OopComentario || sequelize.define('OopComentario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticketId: { type: DataTypes.STRING(20), allowNull: false },
  autorId: { type: DataTypes.INTEGER, allowNull: false },
  autor_nombre: { type: DataTypes.STRING(100), allowNull: false },
  autor_rol: { type: DataTypes.STRING(20), allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'ticket_comentarios', timestamps: true, paranoid: true, indexes: [{ fields: ['ticketId'] }] });

class RepositorioComentariosSequelize extends RepositorioDeComentarios {
  #modelo;

  constructor(sequelize) {
    super();
    if (!sequelize) throw new Error('RepositorioComentariosSequelize requiere una conexión sequelize');
    this.#modelo = definirModelo(sequelize);
  }

  static #aEntidad(fila) {
    const autor = new Autor({ id: fila.autorId, nombre: fila.autor_nombre, rol: fila.autor_rol });
    return new Comentario({ id: fila.id, ticketId: fila.ticketId, autor, texto: fila.texto, creadoEn: fila.createdAt });
  }

  async guardar(comentario) {
    const { id, autor, ticketId, texto } = comentario;
    if (id !== null) throw new Error('El comentario ya fue guardado');
    const fila = await this.#modelo.create({ ticketId, texto, autorId: autor.id, autor_nombre: autor.nombre, autor_rol: autor.rol });
    return comentario.persistido(fila.id, fila.createdAt);
  }

  async listarPorTicket(ticketId) {
    const filas = await this.#modelo.findAll({
      attributes: ATRIBUTOS, where: { ticketId }, order: [['createdAt', 'ASC'], ['id', 'ASC']], raw: true,
    });
    return filas.map((fila) => RepositorioComentariosSequelize.#aEntidad(fila));
  }
}

module.exports = RepositorioComentariosSequelize;
