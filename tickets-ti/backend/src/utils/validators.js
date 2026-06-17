const { body } = require('express-validator');

const passwordRules = (field = 'password') => [
  body(field).isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
  body(field).matches(/[A-Z]/).withMessage('Debe tener al menos 1 mayúscula'),
  body(field).matches(/[0-9]/).withMessage('Debe tener al menos 1 número'),
];

const emailRule = (field = 'email') =>
  body(field).isEmail().normalizeEmail().withMessage('Email inválido');

module.exports = { passwordRules, emailRule };
