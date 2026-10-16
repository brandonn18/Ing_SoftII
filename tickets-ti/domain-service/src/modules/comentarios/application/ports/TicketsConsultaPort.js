const { definirPuerto } = require('../../../../application/ports/definirPuerto');

/**
 * Lo único que el módulo necesita saber de los tickets (ISP): no depende del
 * TicketRepository completo. En la composición lo cumple el TicketRepository
 * del núcleo; en los tests, un doble en memoria.
 *
 * buscarPorId(id) → Promise<{ id, usuarioId, tecnicoId, estado } | null>
 */
module.exports = definirPuerto('TicketsConsultaPort', ['buscarPorId']);
