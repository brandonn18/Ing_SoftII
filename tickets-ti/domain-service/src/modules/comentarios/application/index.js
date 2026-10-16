const ComentarTicket = require('./casosDeUso/ComentarTicket');
const ListarComentarios = require('./casosDeUso/ListarComentarios');

// deps: { comentarioRepository, tickets, clock }
const crearCasosComentarios = (deps) => ({
  comentar: new ComentarTicket(deps),
  listar: new ListarComentarios(deps),
});

module.exports = { ComentarTicket, ListarComentarios, crearCasosComentarios, ports: require('./ports') };
