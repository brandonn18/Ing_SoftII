module.exports = {
  ROLES: { USUARIO: 'usuario', TECNICO: 'tecnico', ADMIN: 'administrador' },
  ESTADOS: ['abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado'],
  PRIORIDADES: ['baja', 'media', 'alta', 'critica'],
  TIPOS: ['incidente', 'solicitud'],
  CATEGORIAS: ['hardware', 'software', 'red', 'accesos', 'servicios_ti'],
  SLA_HORAS: { critica: 4, alta: 8, media: 24, baja: 72 },
};
