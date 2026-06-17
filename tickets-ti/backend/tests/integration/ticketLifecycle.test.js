const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Ticket, AuditLog, Notification, SLAConfig } = require('../../src/models');

let adminUser, tecnicoUser, tecnico2User, normalUser;
let adminToken, tecnicoToken, tecnico2Token, userToken;

// ─── Setup global ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ]);

  adminUser = await User.create({ nombre: 'Admin Intg', email: 'admin@intg.test', password: 'Admin123!', rol: 'administrador' });
  tecnicoUser = await User.create({ nombre: 'Tecnico Intg', email: 'tec@intg.test', password: 'Tec1234!', rol: 'tecnico' });
  tecnico2User = await User.create({ nombre: 'Tecnico2 Intg', email: 'tec2@intg.test', password: 'Tec1234!', rol: 'tecnico' });
  normalUser = await User.create({ nombre: 'Usuario Intg', email: 'user@intg.test', password: 'User1234!', rol: 'usuario' });

  const [adminRes, tecRes, tec2Res, userRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@intg.test', password: 'Admin123!' }),
    request(app).post('/api/auth/login').send({ email: 'tec@intg.test', password: 'Tec1234!' }),
    request(app).post('/api/auth/login').send({ email: 'tec2@intg.test', password: 'Tec1234!' }),
    request(app).post('/api/auth/login').send({ email: 'user@intg.test', password: 'User1234!' }),
  ]);

  adminToken = adminRes.body.data.token;
  tecnicoToken = tecRes.body.data.token;
  tecnico2Token = tec2Res.body.data.token;
  userToken = userRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

// ─── Flujo 1: Ciclo completo (Happy Path) ─────────────────────────────────────

describe('Flujo 1: Ciclo completo de un ticket (Happy Path)', () => {
  let ticketId;
  let ticketTecnicoId;
  let ticketTecnicoToken;

  test('1. Usuario crea ticket → guardado en DB con ID correcto', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        titulo: 'Impresora no responde en sala de reuniones',
        descripcion: 'La impresora HP del piso 3 no enciende desde ayer.',
        tipo: 'incidente',
        categoria: 'hardware',
        prioridad: 'alta',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^TKT-\d{4}-\d{4}$/);

    ticketId = res.body.data.id;

    const ticketDB = await Ticket.findByPk(ticketId);
    expect(ticketDB).not.toBeNull();
    expect(ticketDB.titulo).toBe('Impresora no responde en sala de reuniones');
    expect(ticketDB.usuarioId).toBe(normalUser.id);
    // La auto-asignación puede cambiar a 'asignado' inmediatamente
    expect(['abierto', 'asignado']).toContain(ticketDB.estado);
  });

  test('2. Sistema asigna automáticamente técnico → tecnicoId != null, Notification para técnico', async () => {
    const ticket = await Ticket.findByPk(ticketId);
    expect(ticket.tecnicoId).not.toBeNull();
    expect(ticket.estado).toBe('asignado');

    ticketTecnicoId = ticket.tecnicoId;
    ticketTecnicoToken = ticket.tecnicoId === tecnicoUser.id ? tecnicoToken : tecnico2Token;

    const notif = await Notification.findOne({
      where: { ticketId, tipo: 'asignacion', usuarioId: ticketTecnicoId },
    });
    expect(notif).not.toBeNull();
    expect(notif.mensaje).toContain(ticketId);
  });

  test('3. Técnico inicia trabajo → estado en_proceso, AuditLog registra cambio', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${ticketTecnicoToken}`)
      .send({ estado: 'en_proceso', comentario: 'Revisando el hardware' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('en_proceso');

    const logs = await AuditLog.findAll({ where: { ticketId, accion: 'CAMBIO_ESTADO' } });
    const logEnProceso = logs.find((l) => l.detalle?.a === 'en_proceso');
    expect(logEnProceso).toBeDefined();
    expect(logEnProceso.detalle.de).toBe('asignado');
  });

  test('4. Técnico resuelve ticket → Notification creada para el usuario que reportó', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${ticketTecnicoToken}`)
      .send({ estado: 'resuelto', comentario: 'Se reemplazó el cable de alimentación' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('resuelto');

    const notif = await Notification.findOne({
      where: { ticketId, tipo: 'resolucion', usuarioId: normalUser.id },
    });
    expect(notif).not.toBeNull();
    expect(notif.mensaje).toContain(ticketId);
  });

  test('5. Admin cierra el ticket → estado cerrado, updatedAt registrado', async () => {
    const antesDelCierre = Date.now();

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'cerrado' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('cerrado');

    const ticket = await Ticket.findByPk(ticketId);
    expect(ticket.estado).toBe('cerrado');
    expect(new Date(ticket.updatedAt).getTime()).toBeGreaterThanOrEqual(antesDelCierre);
  });
});

// ─── Flujo 2: Reapertura de ticket ────────────────────────────────────────────

describe('Flujo 2: Reapertura de ticket resuelto', () => {
  let ticketReabierto;

  beforeAll(async () => {
    ticketReabierto = await Ticket.create({
      id: 'TKT-INTG-REOP',
      titulo: 'Ticket para reabrir',
      descripcion: 'Ticket en estado resuelto listo para reapertura',
      tipo: 'solicitud',
      categoria: 'software',
      prioridad: 'media',
      estado: 'resuelto',
      usuarioId: normalUser.id,
      tecnicoId: tecnicoUser.id,
      sla_limite: new Date(Date.now() - 60 * 60 * 1000),
    });
  });

  test('Usuario reabre ticket resuelto → estado abierto, reabierto=true, motivo guardado', async () => {
    const antesReapertura = Date.now();

    const res = await request(app)
      .post(`/api/tickets/${ticketReabierto.id}/reopen`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ motivo_reapertura: 'El problema volvió a ocurrir al día siguiente' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('abierto');
    expect(res.body.data.reabierto).toBe(true);
    expect(res.body.data.motivo_reapertura).toBe('El problema volvió a ocurrir al día siguiente');

    const nuevaFechaLimite = new Date(res.body.data.sla_limite).getTime();
    expect(nuevaFechaLimite).toBeGreaterThan(antesReapertura);
    // Para media (24h), el nuevo límite debe estar al menos 23h en el futuro
    expect(nuevaFechaLimite).toBeGreaterThan(antesReapertura + 23 * 60 * 60 * 1000);
  });

  test('No se puede reabrir un ticket en estado en_proceso', async () => {
    const ticketEnProceso = await Ticket.create({
      id: 'TKT-INTG-NPRO',
      titulo: 'Ticket en proceso no reabrirble',
      descripcion: 'Estado inválido para reapertura',
      tipo: 'incidente',
      categoria: 'red',
      prioridad: 'baja',
      estado: 'en_proceso',
      usuarioId: normalUser.id,
      tecnicoId: tecnicoUser.id,
      sla_limite: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post(`/api/tickets/${ticketEnProceso.id}/reopen`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ motivo_reapertura: 'Intento inválido' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Reapertura requiere motivo_reapertura (400 si falta)', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketReabierto.id}/reopen`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── Flujo 3: Control de acceso por roles ─────────────────────────────────────

describe('Flujo 3: Control de acceso por roles', () => {
  let ticketParaAcceso;

  beforeAll(async () => {
    ticketParaAcceso = await Ticket.create({
      id: 'TKT-INTG-ACC1',
      titulo: 'Ticket para tests de acceso',
      descripcion: 'Usado en tests de control de acceso',
      tipo: 'incidente',
      categoria: 'software',
      prioridad: 'media',
      estado: 'asignado',
      usuarioId: normalUser.id,
      tecnicoId: tecnicoUser.id,
      sla_limite: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  test('Usuario no puede cambiar estado de ticket (requiere rol tecnico/admin) → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketParaAcceso.id}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ estado: 'en_proceso' });

    expect(res.status).toBe(403);
  });

  test('Técnico no puede cambiar estado de ticket asignado a otro técnico → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketParaAcceso.id}/status`)
      .set('Authorization', `Bearer ${tecnico2Token}`)
      .send({ estado: 'en_proceso' });

    expect(res.status).toBe(403);
  });

  test('Técnico no puede acceder a endpoint de admin (GET /api/users) → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect(res.status).toBe(403);
  });

  test('Usuario no autenticado recibe 401 en GET /api/tickets', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  test('Usuario no autenticado recibe 401 en POST /api/tickets', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ titulo: 'Test', descripcion: 'X', tipo: 'incidente', categoria: 'hardware' });

    expect(res.status).toBe(401);
  });
});

// ─── Flujo 4: Paginación y filtros ────────────────────────────────────────────

describe('Flujo 4: Paginación y filtros en listado de tickets', () => {
  const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

  beforeAll(async () => {
    const tickets = Array.from({ length: 15 }, (_, i) => ({
      id: `TKT-PAG-${String(i + 1).padStart(4, '0')}`,
      titulo: `Ticket paginación ${i + 1}`,
      descripcion: `Descripción para prueba de paginación — ticket ${i + 1}`,
      tipo: i % 2 === 0 ? 'incidente' : 'solicitud',
      categoria: ['hardware', 'software', 'red', 'accesos', 'servicios_ti'][i % 5],
      prioridad: PRIORIDADES[i % 4],
      // primeros 8: abierto | sig. 4: asignado | últimos 3: en_proceso
      estado: i < 8 ? 'abierto' : (i < 12 ? 'asignado' : 'en_proceso'),
      usuarioId: normalUser.id,
      tecnicoId: tecnicoUser.id,
      sla_limite: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }));
    await Ticket.bulkCreate(tickets, { ignoreDuplicates: true });
  });

  test('Filtro estado=abierto, page=1, limit=5 → exactamente 5 tickets todos abiertos', async () => {
    const res = await request(app)
      .get('/api/tickets?estado=abierto&page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    res.body.data.forEach((t) => expect(t.estado).toBe('abierto'));
  });

  test('Meta de paginación incluye total, page, limit, totalPages', async () => {
    const res = await request(app)
      .get('/api/tickets?estado=abierto&page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    const { meta } = res.body;
    expect(meta).toHaveProperty('total');
    expect(meta).toHaveProperty('page', 1);
    expect(meta).toHaveProperty('limit', 5);
    expect(meta).toHaveProperty('totalPages');
    expect(meta.total).toBeGreaterThanOrEqual(8);
    expect(meta.totalPages).toBeGreaterThanOrEqual(2);
  });

  test('Página 2 devuelve tickets distintos a página 1 (sin solapamiento)', async () => {
    const [res1, res2] = await Promise.all([
      request(app).get('/api/tickets?estado=abierto&page=1&limit=5').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/tickets?estado=abierto&page=2&limit=5').set('Authorization', `Bearer ${adminToken}`),
    ]);

    expect(res2.status).toBe(200);
    const ids1 = res1.body.data.map((t) => t.id);
    const ids2 = res2.body.data.map((t) => t.id);
    const solapamiento = ids1.filter((id) => ids2.includes(id));
    expect(solapamiento).toHaveLength(0);
  });

  test('Filtro combinado estado=asignado devuelve solo tickets asignados', async () => {
    const res = await request(app)
      .get('/api/tickets?estado=asignado&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((t) => expect(t.estado).toBe('asignado'));
    expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
  });
});
