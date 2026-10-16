// Rutas del módulo OOP. Se monta bajo /api/v1/oop/tickets.
const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../../../../infrastructure/http/middlewares/validar');
const Comentario = require('../../entidades/Comentario');

const idTicket = param('id').matches(/^TKT-\d{4}-\d{4}$/).withMessage('id de ticket inválido');
const texto = body('texto').isString().withMessage('texto requerido')
  .bail().trim().isLength({ min: 1, max: Comentario.LONGITUD_MAXIMA })
  .withMessage(`texto entre 1 y ${Comentario.LONGITUD_MAXIMA} caracteres`);

// controlador: instancia de ControladorComentarios
const crearRutas = (controlador) => {
  const router = Router();
  router.get('/:id/comentarios', idTicket, validar, controlador.listar);
  router.post('/:id/comentarios', idTicket, texto, validar, controlador.comentar);
  return router;
};

module.exports = { crearRutas };
