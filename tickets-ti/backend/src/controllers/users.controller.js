const { validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/notificationService');

const ATTRS_PUBLICOS = ['id', 'nombre', 'email', 'rol', 'activo', 'createdAt'];

const _generarPasswordTemporal = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + '1!';
};

const getAll = async (req, res, next) => {
  try {
    const { rol, activo, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ATTRS_PUBLICOS,
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
    const user = await User.findByPk(req.params.id, { attributes: ATTRS_PUBLICOS });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
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

    const { nombre, email, password, rol } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'El email ya está registrado' });

    const user = await User.create({ nombre, email, password, rol });

    sendWelcomeEmail(user, password)
      .catch((err) => console.error('Error enviando email de bienvenida:', err.message));

    await AuditLog.create({
      usuarioId: req.user.id,
      accion: 'CREAR_USUARIO',
      detalle: { email, rol },
    });

    res.status(201).json({ success: true, data: user, message: 'Usuario creado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { nombre, email, rol, activo } = req.body;
    await user.update({ nombre, email, rol, activo });

    await AuditLog.create({
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_USUARIO',
      detalle: { targetId: user.id, cambios: req.body },
    });

    res.json({ success: true, data: user, message: 'Usuario actualizado' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
    }

    await user.update({ activo: false });

    await AuditLog.create({
      usuarioId: req.user.id,
      accion: 'DESACTIVAR_USUARIO',
      detalle: { targetId: user.id, email: user.email },
    });

    res.json({ success: true, data: null, message: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const tempPassword = _generarPasswordTemporal();
    await user.update({ password: tempPassword, intentos_login: 0, bloqueado_hasta: null });

    sendPasswordResetEmail(user, tempPassword)
      .catch((err) => console.error('Error enviando email de reset:', err.message));

    await AuditLog.create({
      usuarioId: req.user.id,
      accion: 'RESET_PASSWORD',
      detalle: { targetId: user.id, email: user.email },
    });

    res.json({ success: true, data: null, message: `Contraseña temporal enviada al correo ${user.email}` });
  } catch (error) {
    next(error);
  }
};

const toggleActivo = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    await user.update({ activo: !user.activo });
    res.json({ success: true, data: user, message: `Usuario ${user.activo ? 'activado' : 'desactivado'}` });
  } catch (error) {
    next(error);
  }
};

const getTecnicos = async (req, res, next) => {
  try {
    const tecnicos = await User.findAll({
      where: { rol: 'tecnico', activo: true },
      attributes: ['id', 'nombre', 'email'],
      order: [['nombre', 'ASC']],
    });
    res.json({ success: true, data: tecnicos });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, resetPassword, toggleActivo, getTecnicos };
