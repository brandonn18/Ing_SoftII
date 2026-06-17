const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SLAConfig = sequelize.define('SLAConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
    allowNull: false,
  },
  tiempo_horas: { type: DataTypes.INTEGER, allowNull: false },
  porcentaje_alerta: { type: DataTypes.INTEGER, defaultValue: 80 },
}, {
  tableName: 'sla_configs',
  indexes: [{ unique: true, fields: ['prioridad'] }],
});

module.exports = SLAConfig;
