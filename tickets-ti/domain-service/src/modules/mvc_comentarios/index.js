// Modelo-Vista-Controlador: models/ (datos y reglas), views/ (HTML),
// controllers/ (orquesta). Panel de administración que responde HTML.
const { crearComentarioModel } = require('./models/ComentarioModel');
const { crearTicketModel } = require('./models/TicketModel');
const { crearComentariosController } = require('./controllers/ComentariosController');
const { crearRutas } = require('./rutas');

const RUTA = '/api/v1/mvc/tickets';

// modelos: los modelos Sequelize del núcleo (usa Ticket)
const crearModuloMVC = ({ sequelize, modelos }) => {
  const ctrl = crearComentariosController({
    comentarioModel: crearComentarioModel(sequelize),
    ticketModel: crearTicketModel(modelos?.Ticket),
  });
  return { nombre: 'mvc_comentarios', ruta: RUTA, router: crearRutas(ctrl) };
};

module.exports = { crearModuloMVC };
