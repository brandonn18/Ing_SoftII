// Controlador como clase: recibe el gestor por constructor y expone handlers
// de Express ya enlazados (campos de clase con funciones flecha).
const { manejar, ok } = require('../../../../infrastructure/http/controllers/manejar');
const { sanitizarTexto } = require('../../../../infrastructure/http/presentadores');
const GestorDeComentarios = require('../../servicios/GestorDeComentarios');

class ControladorComentarios {
  #gestor;

  constructor(gestor) {
    if (!(gestor instanceof GestorDeComentarios)) throw new TypeError('ControladorComentarios requiere un GestorDeComentarios');
    this.#gestor = gestor;
  }

  listar = manejar(async (req, res) => {
    const comentarios = await this.#gestor.listar(req.params.id, req.actor);
    ok(res, comentarios.map((c) => c.aJSON()));
  });

  comentar = manejar(async (req, res) => {
    const comentario = await this.#gestor.comentar(req.params.id, sanitizarTexto(req.body.texto), req.actor);
    ok(res, comentario.aJSON(), 'Comentario agregado', 201);
  });
}

module.exports = ControladorComentarios;
