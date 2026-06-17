const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Ticket, Notification, SLAConfig } = require('../../src/models');
const ticketService = require('../../src/services/ticketService');

let adminUser, tecnicoUser, normalUser, adminToken, userToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });

  await SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ]);

  adminUser = await User.create({ nombre: 'Admin', email: 'admin@notif.test', password: 'Admin123!', rol: 'administrador' });
  tecnicoUser = await User.create({ nombre: 'Tecnico', email: 'tec@notif.test', password: 'Tec1234!', rol: 'tecnico' });
  normalUser = await User.create({ nombre: 'Usuario', email: 'user@notif.test', password: 'User1234!', rol: 'usuario' });

  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@notif.test', password: 'Admin123!' });
  adminToken = adminRes.body.data.token;

  const userRes = await request(app).post('/api/auth/login').send({ email: 'user@notif.test', password: 'User1234!' });
  userToken = userRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

// ─── CP006: Notificación generada al asignar ticket ──────────────────────

describe('CP006 — Notificación al asignar ticket', () => {
  it('debería crear una notificación inmediatamente al crear ticket (asignación automática)', async () => {
    const antes = Date.now();
    const ticket = await ticketService.crearTicket({
      titulo: 'Test notificación', descripcion: 'Verificar timing',
      tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
      usuarioId: normalUser.id,
    });

    const notificacion = await Notification.findOne({
      where: { ticketId: ticket.id, tipo: 'asignacion' },
    });

    expect(notificacion).not.toBeNull();
    const tiempoTranscurrido = Date.now() - antes;
    // CP006: debe generarse dentro de 5 minutos (300,000 ms)
    expect(tiempoTranscurrido).toBeLessThan(300000);
  });

  it('debería crear notificación de tipo "creacion" para el usuario', async () => {
    const ticket = await ticketService.crearTicket({
      titulo: 'Test creación', descripcion: 'X',
      tipo: 'solicitud', categoria: 'software', prioridad: 'media',
      usuarioId: normalUser.id,
    });

    const notif = await Notification.findOne({ where: { ticketId: ticket.id, tipo: 'creacion', usuarioId: normalUser.id } });
    expect(notif).not.toBeNull();
  });
});

// ─── Badge: contador de no leídas ────────────────────────────────────────

describe('GET /api/notifications/count — badge de no leídas', () => {
  it('debería retornar el contador de notificaciones no leídas', async () => {
    await Notification.create({ usuarioId: normalUser.id, ticketId: null, tipo: 'general', mensaje: 'Test 1' });
    await Notification.create({ usuarioId: normalUser.id, ticketId: null, tipo: 'general', mensaje: 'Test 2' });

    const res = await request(app)
      .get('/api/notifications/count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('unread');
    expect(res.body.data.unread).toBeGreaterThan(0);
  });

  it('debería reducir el contador al marcar como leídas', async () => {
    const countBefore = await request(app)
      .get('/api/notifications/count')
      .set('Authorization', `Bearer ${userToken}`);

    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    const countAfter = await request(app)
      .get('/api/notifications/count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(countAfter.body.data.unread).toBe(0);
    expect(countAfter.body.data.unread).toBeLessThan(countBefore.body.data.unread);
  });
});

// ─── Marcar como leída ───────────────────────────────────────────────────

describe('PATCH /api/notifications/:id/read', () => {
  let notifId;

  beforeAll(async () => {
    const notif = await Notification.create({
      usuarioId: normalUser.id, ticketId: null,
      tipo: 'general', mensaje: 'Notificación para marcar',
    });
    notifId = notif.id;
  });

  it('debería marcar la notificación como leída y actualizar el campo', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leida).toBe(true);

    const notif = await Notification.findByPk(notifId);
    expect(notif.leida).toBe(true);
  });

  it('no debería permitir marcar notificación de otro usuario', async () => {
    const notifAdmin = await Notification.create({
      usuarioId: adminUser.id, ticketId: null,
      tipo: 'general', mensaje: 'Del admin',
    });

    const res = await request(app)
      .patch(`/api/notifications/${notifAdmin.id}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Paginación y filtros ────────────────────────────────────────────────

describe('GET /api/notifications — paginación y filtros', () => {
  it('debería retornar notificaciones paginadas', async () => {
    const res = await request(app)
      .get('/api/notifications?page=1&limit=5')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });
});
