const { manejar, ok } = require('../../../../infrastructure/http/controllers/manejar');
const { sanitizarTexto } = require('../../../../infrastructure/http/presentadores');

const presentarComentario = (comentario) => ({
  id: comentario.id,
  ticketId: comentario.ticketId,
  texto: comentario.texto,
  createdAt: comentario.createdAt,
  autor: { id: comentario.autorId, nombre: comentario.autor_nombre, rol: comentario.autor_rol },
});

// Solo traduce HTTP → caso de uso. casos: { comentar, listar }
const crearComentariosController = (casos) => ({
  listar: manejar(async (req, res) => {
    const comentarios = await casos.listar.ejecutar(req.params.id, req.actor);
    ok(res, comentarios.map(presentarComentario));
  }),
  comentar: manejar(async (req, res) => {
    const comentario = await casos.comentar.ejecutar(req.params.id, sanitizarTexto(req.body.texto), req.actor);
    ok(res, presentarComentario(comentario), 'Comentario agregado', 201);
  }),
});

module.exports = { crearComentariosController, presentarComentario };
