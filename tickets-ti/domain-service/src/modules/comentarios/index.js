// Punto de entrada del módulo de comentarios y su raíz de composición.
// El núcleo solo conoce esta función: le pasa sus dependencias compartidas y
// recibe { ruta, router } para montarlo. Nada del núcleo importa archivos
// internos del módulo (lo verifica tests/domain/arquitectura.test.js).
const { crearCasosComentarios } = require('./application');
const { definirModeloComentario } = require('./adapters/persistencia/modelo');
const SequelizeComentarioRepository = require('./adapters/persistencia/SequelizeComentarioRepository');
const { crearComentariosController } = require('./adapters/http/comentarios.controller');
const { crearRutasComentarios } = require('./adapters/http/rutas');

const RUTA = '/api/v1/tickets';

// tickets: cualquier implementación de TicketsConsultaPort (el TicketRepository del núcleo)
const crearModuloComentarios = ({ sequelize, tickets, clock }) => {
  const comentarioRepository = new SequelizeComentarioRepository(definirModeloComentario(sequelize));
  const casos = crearCasosComentarios({ comentarioRepository, tickets, clock });
  return { nombre: 'comentarios', ruta: RUTA, router: crearRutasComentarios(crearComentariosController(casos)), casos };
};

module.exports = { crearModuloComentarios, definirModeloComentario };
