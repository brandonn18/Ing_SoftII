// Arquitectura en capas: presentation → business → data, y nunca al revés.
// Este archivo apila las tres capas; el núcleo solo conoce esta función.
const { crearComentariosDAO } = require('./data/comentariosDAO');
const { crearTicketsDAO } = require('./data/ticketsDAO');
const { crearComentariosService } = require('./business/comentariosService');
const { crearComentariosController } = require('./presentation/comentarios.controller');
const { crearRutasComentarios } = require('./presentation/rutas');

const RUTA = '/api/v1/capas/tickets';

const crearModuloCapas = ({ sequelize }) => {
  const dao = { comentarios: crearComentariosDAO(sequelize), tickets: crearTicketsDAO(sequelize) };
  const servicio = crearComentariosService(dao);
  return { nombre: 'capas_comentarios', ruta: RUTA, router: crearRutasComentarios(crearComentariosController(servicio)) };
};

module.exports = { crearModuloCapas };
