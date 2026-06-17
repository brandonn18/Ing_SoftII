const { validationResult } = require('express-validator');
const { Ticket, User, AuditLog } = require('../models');
const ticketService = require('../services/ticketService');
const { Op } = require('sequelize');
const { sanitizarTexto } = require('../utils/helpers');

const getAll = async (req, res, next) => {
  try {
    const {
      estado, prioridad, tipo, categoria, tecnicoId,
      fechaDesde, fechaHasta, search,
      page = 1, limit = 20,
    } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (tecnicoId) where.tecnicoId = tecnicoId;
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt[Op.gte] = new Date(fechaDesde);
      if (fechaHasta) where.createdAt[Op.lte] = new Date(fechaHasta + 'T23:59:59');
    }
    if (search) {
      where[Op.or] = [
        { titulo: { [Op.iLike]: `%${search}%` } },
        { id: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (req.user.rol === 'usuario') where.usuarioId = req.user.id;
    if (req.user.rol === 'tecnico') where.tecnicoId = req.user.id;

    const offset = (page - 1) * limit;
    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'email'] },
        { model: User, as: 'tecnico', attributes: ['id', 'nombre', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
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

const getById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'email'] },
        { model: User, as: 'tecnico', attributes: ['id', 'nombre', 'email'] },
        {
          model: AuditLog, as: 'auditorias',
          include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre'] }],
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
    });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    if (req.user.rol === 'usuario' && ticket.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso a este ticket' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    const body = {
      ...req.body,
      titulo: sanitizarTexto(req.body.titulo),
      descripcion: sanitizarTexto(req.body.descripcion),
      usuarioId: req.user.id,
    };
    const ticket = await ticketService.crearTicket(body);
    res.status(201).json({ success: true, data: ticket, message: 'Ticket creado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    if (req.user.rol === 'tecnico' && ticket.tecnicoId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso para modificar este ticket' });
    }

    const updated = await ticketService.updateStatus(
      req.params.id, req.body.estado, req.user.id, req.body.comentario
    );
    res.json({ success: true, data: updated, message: 'Estado actualizado' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    await ticket.update(req.body);
    res.json({ success: true, data: ticket, message: 'Ticket actualizado' });
  } catch (error) {
    next(error);
  }
};

const assign = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    const ticket = await ticketService.assignTicket(req.params.id, req.body.tecnicoId, req.user.id);
    res.json({ success: true, data: ticket, message: 'Ticket asignado' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

const reopen = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    const ticket = await ticketService.reopenTicket(
      req.params.id, req.user.id, sanitizarTexto(req.body.motivo_reapertura)
    );
    res.json({ success: true, data: ticket, message: 'Ticket reabierto' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    await ticket.destroy();
    res.json({ success: true, data: null, message: 'Ticket eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, updateStatus, assign, reopen, remove };
