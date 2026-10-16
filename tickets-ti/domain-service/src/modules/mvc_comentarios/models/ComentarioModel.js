// MODELO: datos y reglas de los comentarios ("modelo gordo"). Valida el
// texto y bloquea tickets cerrados; no sabe nada de HTTP ni de HTML.
const { DataTypes } = require('sequelize');
const { ErrorDominio, CODIGOS, errorValidacion } = require('../../../domain/errores');

const LONGITUD_MAXIMA = 2000;
const ATRIBUTOS = ['id', 'ticketId', 'autorId', 'autor_nombre', 'autor_rol', 'texto', 'createdAt'];

// Misma tabla que los demás módulos de comentarios, con su propio modelo.
const _definir = (sequelize) => sequelize.models.MvcComentario || sequelize.define('MvcComentario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticketId: { type: DataTypes.STRING(20), allowNull: false },
  autorId: { type: DataTypes.INTEGER, allowNull: false },
  autor_nombre: { type: DataTypes.STRING(100), allowNull: false },
  autor_rol: { type: DataTypes.STRING(20), allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'ticket_comentarios', timestamps: true, paranoid: true, indexes: [{ fields: ['ticketId'] }] });

const _validarTexto = (texto) => {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (!limpio) throw errorValidacion('El comentario no puede estar vacío');
  if (limpio.length > LONGITUD_MAXIMA) throw errorValidacion(`El comentario no puede superar ${LONGITUD_MAXIMA} caracteres`);
  return limpio;
};

const crearComentarioModel = (sequelize) => {
  if (!sequelize) throw new Error('ComentarioModel requiere una conexión sequelize');
  const Modelo = _definir(sequelize);

  const listarPorTicket = (ticketId) => Modelo.findAll({
    attributes: ATRIBUTOS, where: { ticketId }, order: [['createdAt', 'ASC'], ['id', 'ASC']], raw: true,
  });

  // ticket: el que devuelve TicketModel.buscar | autor: actor del JWT
  const crear = async ({ ticket, autor, texto }) => {
    if (ticket.estado === 'cerrado') throw new ErrorDominio(CODIGOS.TRANSICION_INVALIDA, 'No se puede comentar un ticket cerrado; reábrelo primero');
    const fila = await Modelo.create({
      ticketId: ticket.id, autorId: autor.id, autor_nombre: autor.nombre, autor_rol: autor.rol, texto: _validarTexto(texto),
    });
    return fila.get({ plain: true });
  };

  return { listarPorTicket, crear };
};

module.exports = { crearComentarioModel, LONGITUD_MAXIMA };
