// Entidad Autor: quién escribe o lee el hilo. Encapsula el rol para que el
// resto de clases pregunte "¿es administrador?" en vez de comparar strings.
const { ROLES } = require('../../../domain/catalogos');
const { errorValidacion } = require('../../../domain/errores');

class Autor {
  #id;
  #nombre;
  #rol;

  constructor({ id, nombre, rol }) {
    if (!Number.isInteger(id)) throw errorValidacion('Autor inválido');
    if (typeof nombre !== 'string' || !nombre.trim()) throw errorValidacion('Nombre del autor requerido');
    if (!Object.values(ROLES).includes(rol)) throw errorValidacion('Rol del autor inválido');
    this.#id = id;
    this.#nombre = nombre;
    this.#rol = rol;
  }

  // actor: claims ya traducidos del JWT { id, nombre, rol }
  static desdeActor(actor) {
    return new Autor(actor ?? {});
  }

  get id() { return this.#id; }

  get nombre() { return this.#nombre; }

  get rol() { return this.#rol; }

  esAdministrador() { return this.#rol === ROLES.ADMIN; }

  esTecnico() { return this.#rol === ROLES.TECNICO; }

  aJSON() { return { id: this.#id, nombre: this.#nombre, rol: this.#rol }; }
}

module.exports = Autor;
