'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ticketId: {
        type: Sequelize.STRING(20),
        allowNull: true,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      accion: { type: Sequelize.STRING(100), allowNull: false },
      detalle: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('audit_logs', ['ticketId']);
    await queryInterface.addIndex('audit_logs', ['usuarioId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
