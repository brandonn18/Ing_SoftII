// MODELO: lectura del ticket que encabeza el panel. Usa el modelo Ticket de
// Sequelize que ya define el núcleo (lo recibe; no lo vuelve a definir).
const { ErrorDominio, CODIGOS } = require('../../../domain/errores');

const ATRIBUTOS = ['id', 'titulo', 'estado', 'prioridad', 'usuario_nombre', 'tecnico_nombre'];

const crearTicketModel = (Ticket) => {
  if (!Ticket) throw new Error('TicketModel requiere el modelo Ticket del núcleo');

  const buscar = async (id) => {
    const ticket = await Ticket.findByPk(id, { attributes: ATRIBUTOS, raw: true });
    if (!ticket) throw new ErrorDominio(CODIGOS.NO_ENCONTRADO, 'Ticket no encontrado');
    return ticket;
  };

  return { buscar };
};

module.exports = { crearTicketModel };
