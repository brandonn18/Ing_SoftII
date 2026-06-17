const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { jwtSecret, jwtExpiresIn, maxLoginAttempts, lockDurationMinutes } = require('../config/auth');
const blacklist = require('../utils/tokenBlacklist');

const _generarToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (user.bloqueado_hasta && new Date() < new Date(user.bloqueado_hasta)) {
      await AuditLog.create({ usuarioId: user.id, accion: 'LOGIN_FALLIDO', detalle: { motivo: 'cuenta_bloqueada', email } });
      return res.status(423).json({ success: false, message: 'Cuenta bloqueada temporalmente. Intenta más tarde.' });
    }

    const valid = await user.validarPassword(password);
    if (!valid) {
      const intentos = user.intentos_login + 1;
      const bloqueado_hasta = intentos >= maxLoginAttempts
        ? new Date(Date.now() + lockDurationMinutes * 60 * 1000)
        : null;
      await user.update({ intentos_login: intentos, bloqueado_hasta });
      await AuditLog.create({
        usuarioId: user.id,
        accion: 'LOGIN_FALLIDO',
        detalle: { motivo: 'password_incorrecto', intentos, bloqueado: !!bloqueado_hasta },
      });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      await AuditLog.create({ usuarioId: user.id, accion: 'LOGIN_FALLIDO', detalle: { motivo: 'cuenta_inactiva' } });
      return res.status(403).json({ success: false, message: 'Cuenta inactiva' });
    }

    await user.update({ intentos_login: 0, bloqueado_hasta: null });

    const token = _generarToken(user);
    await AuditLog.create({ usuarioId: user.id, accion: 'LOGIN_EXITOSO', detalle: { email } });

    res.json({ success: true, data: { token, user }, message: 'Login exitoso' });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Invalida el token agregándolo a la blacklist hasta su expiración
    const jti = req.tokenDecoded?.jti || req.token;
    blacklist.add(jti);

    await AuditLog.create({ usuarioId: req.user.id, accion: 'LOGOUT', detalle: {} });

    res.json({ success: true, data: null, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const decoded = req.tokenDecoded;
    const ahora = Math.floor(Date.now() / 1000);
    const expiracionEn = decoded.exp - ahora;

    // Solo renueva si el token expira en menos de 1 hora (3600 s)
    if (expiracionEn > 3600) {
      return res.status(400).json({
        success: false,
        message: 'El token aún tiene más de 1 hora de vigencia. No es necesario renovar.',
      });
    }

    const token = _generarToken(req.user);
    res.json({ success: true, data: { token }, message: 'Token renovado' });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const { nombre, email, password } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'El email ya está registrado' });

    const user = await User.create({ nombre, email, password, rol: 'usuario' });
    const token = _generarToken(user);

    res.status(201).json({ success: true, data: { token, user }, message: 'Registro exitoso' });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const { passwordActual, passwordNuevo } = req.body;
    const valid = await req.user.validarPassword(passwordActual);
    if (!valid) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });

    await req.user.update({ password: passwordNuevo });
    res.json({ success: true, data: null, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, logout, refresh, me, changePassword };
