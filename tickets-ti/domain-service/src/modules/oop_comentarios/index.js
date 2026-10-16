// Diseño orientado a objetos: entidades con estado privado, interfaces
// (clases abstractas), un servicio que solo conoce interfaces y clases
// concretas en infraestructura. Aquí se instancian y se conectan.
const GestorDeComentarios = require('./servicios/GestorDeComentarios');
const RepositorioComentariosSequelize = require('./infraestructura/RepositorioComentariosSequelize');
const FuenteDeTicketsDelNucleo = require('./infraestructura/FuenteDeTicketsDelNucleo');
const ControladorComentarios = require('./infraestructura/http/ControladorComentarios');
const { crearRutas } = require('./infraestructura/http/rutas');

const RUTA = '/api/v1/oop/tickets';

const crearModuloOOP = ({ sequelize, ticketRepository }) => {
  const gestor = new GestorDeComentarios({
    repositorio: new RepositorioComentariosSequelize(sequelize),
    tickets: new FuenteDeTicketsDelNucleo(ticketRepository),
  });
  return { nombre: 'oop_comentarios', ruta: RUTA, router: crearRutas(new ControladorComentarios(gestor)) };
};

module.exports = { crearModuloOOP };
