const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuarioId: { type: DataTypes.INTEGER, allowNull: true },
  ticketId: { type: DataTypes.STRING(20), allowNull: true },
  accion: { type: DataTypes.STRING(100), allowNull: false },
  detalle: { type: DataTypes.JSONB, allowNull: true },
}, {
  tableName: 'audit_logs',
  updatedAt: false,
});

module.exports = AuditLog;
