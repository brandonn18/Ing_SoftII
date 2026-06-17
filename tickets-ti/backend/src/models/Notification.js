const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false },
  ticketId: { type: DataTypes.STRING(20), allowNull: true },
  tipo: { type: DataTypes.STRING(50), allowNull: false },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  leida: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'notifications',
  updatedAt: false,
});

module.exports = Notification;
