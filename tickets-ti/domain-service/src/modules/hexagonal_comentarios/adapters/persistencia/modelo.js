const { DataTypes } = require('sequelize');

// Tabla propia del módulo. Sin asociaciones hacia tickets ni usuarios: la FK a
// tickets la crea la migración y el autor es un snapshot (authcore es dueño de
// los usuarios). Idempotente: se puede llamar más de una vez con el mismo sequelize.
const definirModeloComentario = (sequelize) => sequelize.models.TicketComentario || sequelize.define('TicketComentario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticketId: { type: DataTypes.STRING(20), allowNull: false },
  autorId: { type: DataTypes.INTEGER, allowNull: false },
  autor_nombre: { type: DataTypes.STRING(100), allowNull: false },
  autor_rol: { type: DataTypes.STRING(20), allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'ticket_comentarios',
  timestamps: true,
  paranoid: true,
  indexes: [{ fields: ['ticketId'] }],
});

module.exports = { definirModeloComentario };
