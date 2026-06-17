const { Notification } = require('../models');
const { Op } = require('sequelize');

const getMias = async (req, res, next) => {
  try {
    const { tipo, page = 1, limit = 20 } = req.query;
    const where = { usuarioId: req.user.id };
    if (tipo) where.tipo = tipo;

    const offset = (page - 1) * limit;
    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['leida', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: rows,
      meta: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { usuarioId: req.user.id, leida: false } });
    res.json({ success: true, data: { unread: count } });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, usuarioId: req.user.id },
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    await notification.update({ leida: true });
    res.json({ success: true, data: notification, message: 'Notificación marcada como leída' });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.update({ leida: true }, { where: { usuarioId: req.user.id, leida: false } });
    res.json({ success: true, data: null, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMias, getCount, markRead, markAllRead };
