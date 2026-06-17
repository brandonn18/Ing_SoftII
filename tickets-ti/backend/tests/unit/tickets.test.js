const { sequelize, User, Ticket, SLAConfig } = require('../../src/models');
const ticketService = require('../../src/services/ticketService');
const { findBestTechnician } = require('../../src/services/assignmentService');
const { checkSLAStatus } = require('../../src/services/slaService');

let adminUser, tecnico1, tecnico2;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
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
});

afterAll(async () => {
  await sequelize.close();
});

// ─── CP001: createTicket genera ID TKT-YYYY-NNNN ────────────────────────────

describe('crearTicket', () => {
  it('debería generar ID en formato TKT-YYYY-NNNN', async () => {
    const ticket = await ticketService.crearTicket({
      titulo: 'Test ticket', descripcion: 'Descripción de prueba',
      tipo: 'incidente', categoria: 'hardware', prioridad: 'media',
      usuarioId: adminUser.id,
    });

    expect(ticket.id).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(ticket.id).toContain(new Date().getFullYear().toString());
  });

  it('debería calcular sla_limite según prioridad crítica (4h)', async () => {
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

  it('debería registrar en AuditLog accion TICKET_CREADO', async () => {
    const { AuditLog } = require('../../src/models');
    const ticket = await ticketService.crearTicket({
      titulo: 'Audit test', descripcion: 'Verificar log',
      tipo: 'solicitud', categoria: 'software', prioridad: 'baja',
      usuarioId: adminUser.id,
    });

    const log = await AuditLog.findOne({ where: { ticketId: ticket.id, accion: 'TICKET_CREADO' } });
    expect(log).not.toBeNull();
  });
});

// ─── CP003: autoAssign selecciona técnico con menor carga ───────────────────

describe('CP003 — autoAssign selecciona técnico con menor carga', () => {
  beforeAll(async () => {
    // tecnico1 tiene 3 tickets activos en hardware → más cargado
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

  it('debería asignar al técnico con menor carga en la categoría', async () => {
    const elegido = await findBestTechnician('hardware');
    expect(elegido).not.toBeNull();
    // tecnico2 tiene 0 tickets en hardware, debe ser elegido
    expect(elegido.id).toBe(tecnico2.id);
  });
});

// ─── CP004: updateStatus valida transiciones ────────────────────────────────

describe('CP004 — updateStatus valida transiciones de estado', () => {
  let ticket;

  beforeEach(async () => {
    const anio = new Date().getFullYear();
    const count = await Ticket.count();
    ticket = await Ticket.create({
      id: `TKT-${anio}-U${String(count).padStart(3, '0')}`,
      titulo: 'Test transición', descripcion: 'X',
      tipo: 'incidente', categoria: 'software', prioridad: 'alta',
      estado: 'asignado', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 8 * 60 * 60 * 1000),
    });
  });

  it('debería rechazar transición inválida asignado→cerrado', async () => {
    await expect(
      ticketService.updateStatus(ticket.id, 'cerrado', adminUser.id, null)
    ).rejects.toThrow(/inválida/i);
  });

  it('debería rechazar transición inválida abierto→resuelto', async () => {
    await ticket.update({ estado: 'abierto' });
    await expect(
      ticketService.updateStatus(ticket.id, 'resuelto', adminUser.id, null)
    ).rejects.toThrow(/inválida/i);
  });

  it('debería permitir transición válida asignado→en_proceso', async () => {
    const updated = await ticketService.updateStatus(ticket.id, 'en_proceso', tecnico1.id, 'Iniciando');
    expect(updated.estado).toBe('en_proceso');
  });

  it('debería registrar cambio en AuditLog', async () => {
    const { AuditLog } = require('../../src/models');
    await ticketService.updateStatus(ticket.id, 'en_proceso', adminUser.id, 'test');
    const log = await AuditLog.findOne({ where: { ticketId: ticket.id, accion: 'CAMBIO_ESTADO' } });
    expect(log).not.toBeNull();
    expect(log.detalle.de).toBe('asignado');
    expect(log.detalle.a).toBe('en_proceso');
  });
});

// ─── CP005: reopenTicket valida estado previo ────────────────────────────────

describe('CP005 — reopenTicket', () => {
  it('debería fallar si el estado es "en_proceso"', async () => {
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

  it('debería fallar si el estado es "asignado"', async () => {
    const ticket = await Ticket.create({
      id: 'TKT-9996-0002', titulo: 'No reabrir 2', descripcion: 'X',
      tipo: 'solicitud', categoria: 'red', prioridad: 'baja',
      estado: 'asignado', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    await expect(
      ticketService.reopenTicket(ticket.id, adminUser.id, 'Intento')
    ).rejects.toThrow(/resueltos o cerrados/i);
  });

  it('debería reabrir ticket resuelto y resetear SLA', async () => {
    const antes = Date.now();
    const ticket = await Ticket.create({
      id: 'TKT-9996-0003', titulo: 'Reabrir OK', descripcion: 'X',
      tipo: 'solicitud', categoria: 'red', prioridad: 'alta',
      estado: 'resuelto', usuarioId: adminUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() - 1000), // ya vencido
      sla_alerta_enviada: true,
    });

    const reabierto = await ticketService.reopenTicket(ticket.id, adminUser.id, 'El problema persiste');
    expect(reabierto.estado).toBe('abierto');
    expect(reabierto.reabierto).toBe(true);
    expect(reabierto.motivo_reapertura).toBe('El problema persiste');
    expect(new Date(reabierto.sla_limite).getTime()).toBeGreaterThan(antes);
    expect(reabierto.sla_alerta_enviada).toBe(false);
  });
});

// ─── CP010: checkSLAStatus calcula porcentaje ────────────────────────────────

describe('CP010 — checkSLAStatus', () => {
  it('debería calcular ~0% al inicio del SLA', () => {
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

  it('debería detectar alerta al superar el 80% (7h de 8h = 87.5%)', () => {
    const ticket = {
      prioridad: 'alta',
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      sla_limite: new Date(Date.now() + 1 * 60 * 60 * 1000),
      sla_alerta_enviada: false,
    };
    const { porcentaje, vencido, alertar } = checkSLAStatus(ticket, { tiempo_horas: 8, porcentaje_alerta: 80 });
    expect(porcentaje).toBeGreaterThan(80);
    expect(vencido).toBe(false);
    expect(alertar).toBe(true);
  });

  it('debería marcar vencido=true y porcentaje=100 cuando SLA expiró', () => {
    const ticket = {
      prioridad: 'critica',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      sla_limite: new Date(Date.now() - 60 * 60 * 1000), // venció hace 1h
      sla_alerta_enviada: false,
    };
    const { porcentaje, vencido } = checkSLAStatus(ticket, { tiempo_horas: 4, porcentaje_alerta: 80 });
    expect(porcentaje).toBe(100);
    expect(vencido).toBe(true);
  });

  it('no debería activar alerta si ya fue enviada', () => {
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
