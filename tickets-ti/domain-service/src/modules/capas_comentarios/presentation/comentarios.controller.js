// Capa de PRESENTACIÓN: traduce HTTP ↔ capa de negocio y da forma al JSON.
const { manejar, ok } = require('../../../infrastructure/http/controllers/manejar');
const { sanitizarTexto } = require('../../../infrastructure/http/presentadores');

const presentarComentario = (fila) => ({
  id: fila.id,
  ticketId: fila.ticketId,
  texto: fila.texto,
  createdAt: fila.createdAt,
  autor: { id: fila.autorId, nombre: fila.autor_nombre, rol: fila.autor_rol },
});

// servicio: capa de negocio { listar, comentar }
const crearComentariosController = (servicio) => ({
  listar: manejar(async (req, res) => {
    const filas = await servicio.listar(req.params.id, req.actor);
    ok(res, filas.map(presentarComentario));
  }),
  comentar: manejar(async (req, res) => {
    const fila = await servicio.comentar(req.params.id, sanitizarTexto(req.body.texto), req.actor);
    ok(res, presentarComentario(fila), 'Comentario agregado', 201);
  }),
});

module.exports = { crearComentariosController, presentarComentario };
