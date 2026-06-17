'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ticketId: {
        type: Sequelize.STRING(20),
        allowNull: true,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tipo: { type: Sequelize.STRING(50), allowNull: false },
      mensaje: { type: Sequelize.TEXT, allowNull: false },
      leida: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('notifications', ['usuarioId', 'leida']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
