const router = require('express').Router();
const { body } = require('express-validator');
const { login, register, logout, refresh, me, changePassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
], login);

router.post('/register', [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos 1 mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos 1 número'),
], register);

router.post('/logout', verifyToken, logout);

router.post('/refresh', verifyToken, refresh);

router.get('/me', verifyToken, me);

router.put('/change-password', verifyToken, [
  body('passwordActual').notEmpty().withMessage('Contraseña actual requerida'),
  body('passwordNuevo')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos 1 mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos 1 número'),
], changePassword);

module.exports = router;
