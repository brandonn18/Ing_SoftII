const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Ticket, SLAConfig } = require('../../src/models');
const ticketService = require('../../src/services/ticketService');
const { findBestTechnician } = require('../../src/services/assignmentService');
const { checkSLAStatus } = require('../../src/services/slaService');

let adminUser, tecnico1, tecnico2;
let adminToken, tecnico1Token, userToken, normalUser;

// ─── Setup global ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ]);

  adminUser = await User.create({ nombre: 'Admin', email: 'admin@unit.test', password: 'Admin123!', rol: 'administrador' });
  tecnico1 = await User.create({ nombre: 'Tecnico 1', email: 'tec1@unit.test', password: 'Tec1234!', rol: 'tecnico' });
  tecnico2 = await User.create({ nombre: 'Tecnico 2', email: 'tec2@unit.test', password: 'Tec1234!', rol: 'tecnico' });
  normalUser = await User.create({ nombre: 'Usuario Normal', email: 'user@unit.test', password: 'User1234!', rol: 'usuario' });

  const [adminRes, tec1Res, userRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@unit.test', password: 'Admin123!' }),
    request(app).post('/api/auth/login').send({ email: 'tec1@unit.test', password: 'Tec1234!' }),
    request(app).post('/api/auth/login').send({ email: 'user@unit.test', password: 'User1234!' }),
  ]);

  adminToken = adminRes.body.data.token;
  tecnico1Token = tec1Res.body.data.token;
  userToken = userRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

// ─── CP001: crearTicket genera ID TKT-YYYY-NNNN ───────────────────────────────

describe('CP001 — Crear ticket genera ID único formato TKT-YYYY-NNNN', () => {
  it('CP001 - Crea ticket con ID en formato correcto vía servicio', async () => {
    const ticket = await ticketService.crearTicket({
      titulo: 'Test ticket', descripcion: 'Descripción de prueba',
      tipo: 'incidente', categoria: 'hardware', prioridad: 'media',
      usuarioId: adminUser.id,
    });

    expect(ticket.id).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(ticket.id).toContain(new Date().getFullYear().toString());
    // Estado puede ser 'abierto' o 'asignado' según disponibilidad de técnicos
    expect(['abierto', 'asignado']).toContain(ticket.estado);
  });

  it('CP001 - Crea ticket vía HTTP con ID correcto y estado abierto', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        titulo: 'PC no enciende', descripcion: 'La PC no responde',
        tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(['abierto', 'asignado']).toContain(res.body.data.estado);
  });

  it('CP001 - Ticket creado tiene todos los campos requeridos no nulos', async () => {
    const ticket = await ticketService.crearTicket({
      titulo: 'Campos completos', descripcion: 'Verificación de campos',
      tipo: 'solicitud', categoria: 'software', prioridad: 'alta',
      usuarioId: adminUser.id,
    });

    expect(ticket.titulo).not.toBeNull();
    expect(ticket.descripcion).not.toBeNull();
    expect(ticket.tipo).not.toBeNull();
    expect(ticket.categoria).not.toBeNull();
    expect(ticket.prioridad).not.toBeNull();
    expect(ticket.sla_limite).not.toBeNull();
    expect(['abierto', 'asignado']).toContain(ticket.estado);
    expect(new Date(ticket.sla_limite).getTime()).toBeGreaterThan(Date.now());
  });

  it('CP001 - Calcula sla_limite correctamente para prioridad crítica (4h)', async () => {
    const antes = Date.now();
    const ticket = await ticketService.crearTicket({
      titulo: 'Crítico', descripcion: 'Urgente',
      tipo: 'incidente', categoria: 'red', prioridad: 'critica',
      usuarioId: adminUser.id,
    });

    const limite = new Date(ticket.sla_limite).getTime();
    const esperado = antes + 4 * 60 * 60 * 1000;
    expect(limite).toBeGreaterThanOrEqual(esperado - 5000);
    expect(limite).toBeLessThanOrEqual(esperado + 10000);
  });

  it('CP001 - Registra en AuditLog con acción TICKET_CREADO', async () => {
    const { AuditLog } = require('../../src/models');
    const ticket = await ticketService.crearTicket({
      titulo: 'Audit test', descripcion: 'Verificar log',
      tipo: 'solicitud', categoria: 'software', prioridad: 'baja',
      usuarioId: adminUser.id,
    });

    const log = await AuditLog.findOne({ where: { ticketId: ticket.id, accion: 'TICKET_CREADO' } });
    expect(log).not.toBeNull();
  });

  it('debería fallar sin campos requeridos vía HTTP', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ titulo: 'Sin datos' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── CP002: Clasificación correcta por categoría ─────────────────────────────

describe('CP002 — Clasificación correcta por categoría', () => {
  const CATEGORIAS = ['hardware', 'software', 'red', 'accesos', 'servicios_ti'];

  CATEGORIAS.forEach((cat) => {
    it(`CP002 - Crea ticket con categoría "${cat}" y la guarda exactamente`, async () => {
      const ticket = await ticketService.crearTicket({
        titulo: `Ticket ${cat}`, descripcion: `Prueba de categoría ${cat}`,
        tipo: 'incidente', categoria: cat, prioridad: 'baja',
        usuarioId: adminUser.id,
      });

      expect(ticket.categoria).toBe(cat);
    });
  });
});

// ─── CP003: autoAssign selecciona técnico con menor carga ─────────────────────

describe('CP003 — Asignación automática al técnico con menor carga', () => {
  beforeAll(async () => {
    // tecnico1 recibe 3 tickets en hardware → más cargado
    for (let i = 1; i <= 3; i++) {
      await Ticket.create({
        id: `TKT-9998-00${i}0`,
        titulo: `Carga ${i}`, descripcion: 'X',
        tipo: 'incidente', categoria: 'hardware', prioridad: 'baja',
        estado: 'en_proceso', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
        sla_limite: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
    }
  });

  it('CP003 - Asigna al técnico con menor carga en la categoría (tecnico2 con 0 tickets)', async () => {
    const elegido = await findBestTechnician('hardware');
    expect(elegido).not.toBeNull();
    expect(elegido.id).toBe(tecnico2.id);
  });

  it('CP003 - Auto-asignación funciona cuando solo hay un técnico disponible', async () => {
    // tecnico3 es el único técnico en categoría "accesos" (nuevo)
    const tecnico3 = await User.create({
      nombre: 'Tecnico Solo', email: 'tecsolov@unit.test', password: 'Tec1234!', rol: 'tecnico',
    });

    const ticket = await ticketService.crearTicket({
      titulo: 'Solo un técnico', descripcion: 'Test',
      tipo: 'solicitud', categoria: 'accesos', prioridad: 'media',
      usuarioId: normalUser.id,
    });

    const reloaded = await ticket.reload();
    // Con al menos un técnico disponible, debe quedar asignado
    expect(reloaded.estado).toBe('asignado');
    expect(reloaded.tecnicoId).not.toBeNull();
    await tecnico3.destroy({ force: true });
  });
});

// ─── CP004: updateStatus valida transiciones ──────────────────────────────────

describe('CP004 — Cambio de estado y validación de transiciones', () => {
  let ticketAsignado;

  beforeEach(async () => {
    const anio = new Date().getFullYear();
    const count = await Ticket.count();
    ticketAsignado = await Ticket.create({
      id: `TKT-${anio}-U${String(count).padStart(3, '0')}`,
      titulo: 'Test transición', descripcion: 'X',
      tipo: 'incidente', categoria: 'software', prioridad: 'alta',
      estado: 'asignado', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 8 * 60 * 60 * 1000),
    });
  });

  it('CP004 - Técnico puede cambiar estado de su ticket asignado (asignado→en_proceso) vía HTTP', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketAsignado.id}/status`)
      .set('Authorization', `Bearer ${tecnico1Token}`)
      .send({ estado: 'en_proceso', comentario: 'Iniciando atención' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('en_proceso');
  });

  it('CP004 - Transición inválida de estado es rechazada vía HTTP (abierto→cerrado)', async () => {
    await ticketAsignado.update({ estado: 'abierto' });

    const res = await request(app)
      .patch(`/api/tickets/${ticketAsignado.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'cerrado' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('CP004 - Rechaza transición inválida asignado→cerrado vía servicio', async () => {
    await expect(
      ticketService.updateStatus(ticketAsignado.id, 'cerrado', adminUser.id, null)
    ).rejects.toThrow(/inválida/i);
  });

  it('CP004 - Rechaza transición inválida abierto→resuelto vía servicio', async () => {
    await ticketAsignado.update({ estado: 'abierto' });
    await expect(
      ticketService.updateStatus(ticketAsignado.id, 'resuelto', adminUser.id, null)
    ).rejects.toThrow(/inválida/i);
  });

  it('CP004 - Permite transición válida asignado→en_proceso y registra AuditLog', async () => {
    const { AuditLog } = require('../../src/models');
    const updated = await ticketService.updateStatus(ticketAsignado.id, 'en_proceso', tecnico1.id, 'Iniciando');
    expect(updated.estado).toBe('en_proceso');

    const log = await AuditLog.findOne({ where: { ticketId: ticketAsignado.id, accion: 'CAMBIO_ESTADO' } });
    expect(log).not.toBeNull();
    expect(log.detalle.de).toBe('asignado');
    expect(log.detalle.a).toBe('en_proceso');
  });
});

// ─── CP005: Reapertura de ticket resuelto ─────────────────────────────────────

describe('CP005 — Reapertura de ticket resuelto', () => {
  it('CP005 - Reabre ticket resuelto vía HTTP y verifica estado abierto + reabierto=true', async () => {
    const ticketResuelto = await Ticket.create({
      id: 'TKT-9995-0001', titulo: 'Para reabrir HTTP', descripcion: 'X',
      tipo: 'incidente', categoria: 'red', prioridad: 'alta',
      estado: 'resuelto', usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post(`/api/tickets/${ticketResuelto.id}/reopen`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ motivo_reapertura: 'El problema persiste después del cierre' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('abierto');
    expect(res.body.data.reabierto).toBe(true);
  });

  it('CP005 - Reapertura vía servicio resetea SLA y sla_alerta_enviada', async () => {
    const antes = Date.now();
    const ticket = await Ticket.create({
      id: 'TKT-9996-0003', titulo: 'Reabrir OK', descripcion: 'X',
      tipo: 'solicitud', categoria: 'red', prioridad: 'alta',
      estado: 'resuelto', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() - 1000),
      sla_alerta_enviada: true,
    });

    const reabierto = await ticketService.reopenTicket(ticket.id, adminUser.id, 'El problema persiste');
    expect(reabierto.estado).toBe('abierto');
    expect(reabierto.reabierto).toBe(true);
    expect(reabierto.motivo_reapertura).toBe('El problema persiste');
    expect(new Date(reabierto.sla_limite).getTime()).toBeGreaterThan(antes);
    expect(reabierto.sla_alerta_enviada).toBe(false);
  });

  it('CP005 - Falla si el estado es "en_proceso" (no reabrible)', async () => {
    const ticket = await Ticket.create({
      id: 'TKT-9996-0001', titulo: 'No reabrir', descripcion: 'X',
      tipo: 'incidente', categoria: 'accesos', prioridad: 'media',
      estado: 'en_proceso', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await expect(
      ticketService.reopenTicket(ticket.id, adminUser.id, 'Intento inválido')
    ).rejects.toThrow(/resueltos o cerrados/i);
  });
});

// ─── CP010: checkSLAStatus calcula porcentaje ─────────────────────────────────

describe('CP010 — Alerta SLA al 80% del tiempo consumido', () => {
  it('CP010 - Alerta al 80% con ticket en 6.5h de 8h (alta = 81% consumido)', () => {
    const ticket = {
      prioridad: 'alta',
      createdAt: new Date(Date.now() - 6.5 * 60 * 60 * 1000), // hace 6.5h
      sla_limite: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // vence en 1.5h
      sla_alerta_enviada: false,
    };
    const { porcentaje, vencido, alertar } = checkSLAStatus(ticket, { tiempo_horas: 8, porcentaje_alerta: 80 });

    expect(porcentaje).toBeGreaterThanOrEqual(80);
    expect(vencido).toBe(false);
    expect(alertar).toBe(true);
  });

  it('CP010 - Calcula ~0% al inicio del SLA', () => {
    const ticket = {
      prioridad: 'alta',
      createdAt: new Date(),
      sla_limite: new Date(Date.now() + 8 * 60 * 60 * 1000),
      sla_alerta_enviada: false,
    };
    const { porcentaje, vencido, alertar } = checkSLAStatus(ticket, { tiempo_horas: 8, porcentaje_alerta: 80 });
    expect(porcentaje).toBeGreaterThanOrEqual(0);
    expect(porcentaje).toBeLessThan(5);
    expect(vencido).toBe(false);
    expect(alertar).toBe(false);
  });

  it('CP010 - Detecta alerta al superar el 80% (7h de 8h = 87.5%)', () => {
    const ticket = {
      prioridad: 'alta',
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      sla_limite: new Date(Date.now() + 1 * 60 * 60 * 1000),
      sla_alerta_enviada: false,
    };
    const { porcentaje, alertar } = checkSLAStatus(ticket, { tiempo_horas: 8, porcentaje_alerta: 80 });
    expect(porcentaje).toBeGreaterThan(80);
    expect(alertar).toBe(true);
  });

  it('CP010 - Marca vencido=true cuando SLA ya expiró', () => {
    const ticket = {
      prioridad: 'critica',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      sla_limite: new Date(Date.now() - 60 * 60 * 1000),
      sla_alerta_enviada: false,
    };
    const { porcentaje, vencido } = checkSLAStatus(ticket, { tiempo_horas: 4, porcentaje_alerta: 80 });
    expect(porcentaje).toBe(100);
    expect(vencido).toBe(true);
  });

  it('CP010 - No activa alerta si ya fue enviada anteriormente', () => {
    const ticket = {
      prioridad: 'alta',
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      sla_limite: new Date(Date.now() + 1 * 60 * 60 * 1000),
      sla_alerta_enviada: true,
    };
    const { alertar } = checkSLAStatus(ticket, { tiempo_horas: 8, porcentaje_alerta: 80 });
    expect(alertar).toBe(false);
  });
});

// ─── CP012: Cierre de ticket resuelto ─────────────────────────────────────────

describe('CP012 — Cierre de ticket resuelto', () => {
  it('CP012 - Técnico cierra ticket resuelto vía HTTP (resuelto→cerrado)', async () => {
    const ticketResuelto = await Ticket.create({
      id: 'TKT-9994-0001', titulo: 'Para cerrar', descripcion: 'X',
      tipo: 'incidente', categoria: 'software', prioridad: 'media',
      estado: 'resuelto', usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .patch(`/api/tickets/${ticketResuelto.id}/status`)
      .set('Authorization', `Bearer ${tecnico1Token}`)
      .send({ estado: 'cerrado', comentario: 'Problema confirmado resuelto por el usuario' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('cerrado');
    expect(res.body.data.updatedAt).not.toBeNull();
  });

  it('CP012 - Admin puede cerrar ticket resuelto vía servicio', async () => {
    const ticket = await Ticket.create({
      id: 'TKT-9994-0002', titulo: 'Admin cierra', descripcion: 'X',
      tipo: 'solicitud', categoria: 'accesos', prioridad: 'baja',
      estado: 'resuelto', usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const cerrado = await ticketService.updateStatus(ticket.id, 'cerrado', adminUser.id, 'Cerrado por admin');
    expect(cerrado.estado).toBe('cerrado');
  });
});
