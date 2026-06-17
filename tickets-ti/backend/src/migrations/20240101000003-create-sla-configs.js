'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sla_configs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      prioridad: {
        type: Sequelize.ENUM('baja', 'media', 'alta', 'critica'),
        allowNull: false,
        unique: true,
      },
      tiempo_horas: { type: Sequelize.INTEGER, allowNull: false },
      porcentaje_alerta: { type: Sequelize.INTEGER, defaultValue: 80 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sla_configs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sla_configs_prioridad";');
  },
};
