// Entidad Comentario. Inmutable y sin dependencias de frameworks.
// El autor se guarda como snapshot (id, nombre, rol): los usuarios viven en
// authcore y domain-service no tiene tabla de usuarios.
const { errorValidacion } = require('../../../domain/errores');

const LONGITUD_MAXIMA = 2000;

const _exigirAutor = (autor) => {
  if (!autor || !Number.isInteger(autor.id)) throw errorValidacion('Autor inválido');
  if (typeof autor.nombre !== 'string' || !autor.nombre.trim()) throw errorValidacion('Nombre del autor requerido');
};

const _textoValido = (texto) => {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (!limpio) throw errorValidacion('El comentario no puede estar vacío');
  if (limpio.length > LONGITUD_MAXIMA) throw errorValidacion(`El comentario no puede superar ${LONGITUD_MAXIMA} caracteres`);
  return limpio;
};

class Comentario {
  constructor(props) {
    Object.assign(this, props);
    Object.freeze(this);
  }

  // autor: actor del JWT { id, nombre, rol } | ahora: Date del puerto Clock
  static crear({ ticketId, autor, texto }, { ahora }) {
    if (typeof ticketId !== 'string' || !ticketId) throw errorValidacion('Ticket requerido');
    _exigirAutor(autor);
    return new Comentario({
      id: null,
      ticketId,
      autorId: autor.id,
      autor_nombre: autor.nombre,
      autor_rol: autor.rol,
      texto: _textoValido(texto),
      createdAt: ahora,
    });
  }

  static desdePersistencia(props) {
    return new Comentario(props);
  }

  aPrimitivos() {
    return { ...this };
  }
}

module.exports = { Comentario, LONGITUD_MAXIMA };
