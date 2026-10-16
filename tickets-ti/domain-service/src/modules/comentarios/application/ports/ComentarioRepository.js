const { definirPuerto } = require('../../../../application/ports/definirPuerto');

/**
 * Persistencia de comentarios. Trabaja con entidades Comentario del dominio.
 *
 * guardar(comentario)        → Promise<Comentario>  con id y createdAt asignados
 * listarPorTicket(ticketId)  → Promise<Comentario[]> del más antiguo al más nuevo
 */
module.exports = definirPuerto('ComentarioRepository', ['guardar', 'listarPorTicket']);
