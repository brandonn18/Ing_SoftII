const { body, param } = require('express-validator');
const { LONGITUD_MAXIMA } = require('../../domain');
const { validar } = require('../../../../infrastructure/http/middlewares/validar');

// Validaciones de entrada propias del módulo. La autenticación (verificarToken)
// la pone app.js al montar el módulo, igual que en el resto de rutas.
const idTicket = param('id').matches(/^TKT-\d{4}-\d{4}$/).withMessage('id de ticket inválido');

const validarListado = [idTicket, validar];

const validarComentario = [
  idTicket,
  body('texto').isString().withMessage('texto requerido')
    .bail().trim().isLength({ min: 1, max: LONGITUD_MAXIMA }).withMessage(`texto entre 1 y ${LONGITUD_MAXIMA} caracteres`),
  validar,
];

module.exports = { validarListado, validarComentario };
