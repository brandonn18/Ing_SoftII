// Capa de DATOS: único lugar de la arquitectura en capas que habla con la
// base. SQL parametrizado (replacements), sin reglas de negocio.

const COLUMNAS = 'id, "ticketId", "autorId", autor_nombre, autor_rol, texto, "createdAt"';

const crearComentariosDAO = (sequelize) => {
  if (!sequelize) throw new Error('comentariosDAO requiere una conexión sequelize');

  const listarPorTicket = async (ticketId) => {
    const [filas] = await sequelize.query(
      `SELECT ${COLUMNAS} FROM ticket_comentarios
       WHERE "ticketId" = :ticketId AND "deletedAt" IS NULL
       ORDER BY "createdAt" ASC, id ASC`,
      { replacements: { ticketId } },
    );
    return filas;
  };

  const insertar = async ({ ticketId, autorId, autorNombre, autorRol, texto }) => {
    const [filas] = await sequelize.query(
      `INSERT INTO ticket_comentarios ("ticketId", "autorId", autor_nombre, autor_rol, texto, "createdAt", "updatedAt")
       VALUES (:ticketId, :autorId, :autorNombre, :autorRol, :texto, NOW(), NOW())
       RETURNING ${COLUMNAS}`,
      { replacements: { ticketId, autorId, autorNombre, autorRol, texto } },
    );
    return filas[0];
  };

  return { listarPorTicket, insertar };
};

module.exports = { crearComentariosDAO };
