const { Router } = require('express');
const { validarListado, validarComentario } = require('./middlewares');

// Se monta bajo /api/v1/tickets: GET y POST /:id/comentarios
const crearRutasComentarios = (ctrl) => {
  const router = Router();
  router.get('/:id/comentarios', validarListado, ctrl.listar);
  router.post('/:id/comentarios', validarComentario, ctrl.comentar);
  return router;
};

module.exports = { crearRutasComentarios };
