// Capa de DATOS: lectura mínima de un ticket para decidir permisos.
// domain-service es dueño de la tabla tickets, así que se lee directo.

const crearTicketsDAO = (sequelize) => {
  if (!sequelize) throw new Error('ticketsDAO requiere una conexión sequelize');

  const buscarPorId = async (id) => {
    const [filas] = await sequelize.query(
      'SELECT id, "usuarioId", "tecnicoId", estado FROM tickets WHERE id = :id AND "deletedAt" IS NULL',
      { replacements: { id } },
    );
    return filas[0] || null;
  };

  return { buscarPorId };
};

module.exports = { crearTicketsDAO };
