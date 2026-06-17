const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.STRING(20), primaryKey: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  tipo: {
    type: DataTypes.ENUM('incidente', 'solicitud'),
    allowNull: false,
  },
  categoria: {
    type: DataTypes.ENUM('hardware', 'software', 'red', 'accesos', 'servicios_ti'),
    allowNull: false,
  },
  prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
    defaultValue: 'media',
  },
  estado: {
    type: DataTypes.ENUM('abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado'),
    defaultValue: 'abierto',
  },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false },
  tecnicoId: { type: DataTypes.INTEGER, allowNull: true },
  categoriaId: { type: DataTypes.INTEGER, allowNull: true },
  reabierto: { type: DataTypes.BOOLEAN, defaultValue: false },
  motivo_reapertura: { type: DataTypes.TEXT, allowNull: true },
  sla_limite: { type: DataTypes.DATE, allowNull: true },
  sla_alerta_enviada: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'tickets',
  timestamps: true,
  paranoid: true,
});

module.exports = Ticket;
