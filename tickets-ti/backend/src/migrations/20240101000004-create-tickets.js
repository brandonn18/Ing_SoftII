'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: { type: Sequelize.STRING(20), primaryKey: true },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false },
      tipo: {
        type: Sequelize.ENUM('incidente', 'solicitud'),
        allowNull: false,
      },
      categoria: {
        type: Sequelize.ENUM('hardware', 'software', 'red', 'accesos', 'servicios_ti'),
        allowNull: false,
      },
      prioridad: {
        type: Sequelize.ENUM('baja', 'media', 'alta', 'critica'),
        defaultValue: 'media',
      },
      estado: {
        type: Sequelize.ENUM('abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado'),
        defaultValue: 'abierto',
      },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tecnicoId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      categoriaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reabierto: { type: Sequelize.BOOLEAN, defaultValue: false },
      motivo_reapertura: { type: Sequelize.TEXT, allowNull: true },
      sla_limite: { type: Sequelize.DATE, allowNull: true },
      sla_alerta_enviada: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('tickets', ['estado']);
    await queryInterface.addIndex('tickets', ['tecnicoId']);
    await queryInterface.addIndex('tickets', ['usuarioId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_categoria";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_prioridad";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_estado";');
  },
};
