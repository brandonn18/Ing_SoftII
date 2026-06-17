const { sequelize } = require('../config/db');
const User = require('./User');
const Ticket = require('./Ticket');
const Category = require('./Category');
const Notification = require('./Notification');
const SLAConfig = require('./SLAConfig');
const AuditLog = require('./AuditLog');

// User - Ticket associations
User.hasMany(Ticket, { foreignKey: 'usuarioId', as: 'ticketsCreados' });
User.hasMany(Ticket, { foreignKey: 'tecnicoId', as: 'ticketsAsignados' });
Ticket.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });
Ticket.belongsTo(User, { foreignKey: 'tecnicoId', as: 'tecnico' });

// Ticket - Notification
Ticket.hasMany(Notification, { foreignKey: 'ticketId', as: 'notificaciones' });
Notification.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
User.hasMany(Notification, { foreignKey: 'usuarioId', as: 'notificaciones' });
Notification.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

// Ticket - AuditLog
Ticket.hasMany(AuditLog, { foreignKey: 'ticketId', as: 'auditorias' });
AuditLog.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
User.hasMany(AuditLog, { foreignKey: 'usuarioId', as: 'auditorias' });
AuditLog.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

// Ticket - Category
Category.hasMany(Ticket, { foreignKey: 'categoriaId', as: 'tickets' });
Ticket.belongsTo(Category, { foreignKey: 'categoriaId', as: 'categoriaObj' });

module.exports = { sequelize, User, Ticket, Category, Notification, SLAConfig, AuditLog };
