// Entidad Comentario: campos privados (#) y solo lectura desde afuera.
// Un comentario recién escrito no tiene id ni fecha hasta que se persiste.
const { errorValidacion } = require('../../../domain/errores');
const Autor = require('./Autor');

class Comentario {
  static LONGITUD_MAXIMA = 2000;

  #id;
  #ticketId;
  #autor;
  #texto;
  #creadoEn;

  constructor({ id = null, ticketId, autor, texto, creadoEn = null }) {
    if (typeof ticketId !== 'string' || !ticketId) throw errorValidacion('Ticket requerido');
    if (!(autor instanceof Autor)) throw errorValidacion('Autor inválido');
    this.#id = id;
    this.#ticketId = ticketId;
    this.#autor = autor;
    this.#texto = Comentario.#validarTexto(texto);
    this.#creadoEn = creadoEn;
  }

  static #validarTexto(texto) {
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (!limpio) throw errorValidacion('El comentario no puede estar vacío');
    if (limpio.length > Comentario.LONGITUD_MAXIMA) {
      throw errorValidacion(`El comentario no puede superar ${Comentario.LONGITUD_MAXIMA} caracteres`);
    }
    return limpio;
  }

  get id() { return this.#id; }

  get ticketId() { return this.#ticketId; }

  get autor() { return this.#autor; }

  get texto() { return this.#texto; }

  get creadoEn() { return this.#creadoEn; }

  // La persistencia devuelve una copia con id y fecha: la instancia original no cambia
  persistido(id, creadoEn) {
    return new Comentario({ id, ticketId: this.#ticketId, autor: this.#autor, texto: this.#texto, creadoEn });
  }

  aJSON() {
    return { id: this.#id, ticketId: this.#ticketId, texto: this.#texto, createdAt: this.#creadoEn, autor: this.#autor.aJSON() };
  }
}

module.exports = Comentario;
