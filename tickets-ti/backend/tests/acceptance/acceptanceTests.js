#!/usr/bin/env node
/**
 * Script de pruebas de aceptación — Sistema de Gestión de Tickets TI
 * Ejecutar: node tests/acceptance/acceptanceTests.js
 *           npm run acceptance   (desde backend/)
 *
 * Cubre todos los casos del Plan de Pruebas: CP001–CP012
 * Usa supertest sobre el app Express; no requiere servidor externo.
 */

// Configurar el entorno ANTES de cargar cualquier módulo de la app
process.env.NODE_ENV   = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_minimo_32_caracteres_ok!';
process.env.JWT_EXPIRES_IN = '8h';
process.env.EMAIL_HOST = 'localhost';
process.env.EMAIL_USER = 'test@test.local';
process.env.EMAIL_PASS = 'test';

const request  = require('supertest');
const app      = require('../../src/app');
const { sequelize, User, Ticket, Notification, SLAConfig } = require('../../src/models');
const { checkSLAStatus } = require('../../src/services/slaService');

// ─── Utilidades de salida ─────────────────────────────────────────────────────
const C = {
  green:  '\x1b[32m', red:    '\x1b[31m', yellow: '\x1b[33m',
  blue:   '\x1b[34m', bold:   '\x1b[1m',  reset:  '\x1b[0m',
  gray:   '\x1b[90m', cyan:   '\x1b[36m',
};

const fmt = {
  pass: `${C.green}✅ PASS${C.reset}`,
  fail: `${C.red}❌ FAIL${C.reset}`,
  sep:  '─'.repeat(62),
  dbl:  '═'.repeat(62),
};

// ─── Registro de resultados ───────────────────────────────────────────────────
const results = [];

function log(cp, ok, detail) {
  results.push({ cp, ok, detail });
  const icon = ok ? fmt.pass : fmt.fail;
  console.log(`  ${icon} — ${detail}`);
}

// ─── Estado compartido entre CPs ──────────────────────────────────────────────
let adminUser, tecnico1, tecnico2, normalUser;
let adminToken, tecnico1Token, userToken;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getToken(email, password) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.token;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ─── Preparación de la base de datos ──────────────────────────────────────────
async function setupDB() {
  process.stdout.write(`${C.gray}  Sincronizando DB de prueba...${C.reset}`);
  await sequelize.sync({ force: true });
  process.stdout.write(' OK\n');

  await SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4,  porcentaje_alerta: 80 },
    { prioridad: 'alta',    tiempo_horas: 8,  porcentaje_alerta: 80 },
    { prioridad: 'media',   tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja',    tiempo_horas: 72, porcentaje_alerta: 80 },
  ]);

  adminUser  = await User.create({ nombre: 'Admin AC',    email: 'admin@ac.test',  password: 'Admin123!',  rol: 'administrador' });
  tecnico1   = await User.create({ nombre: 'Tecnico1 AC', email: 'tec1@ac.test',   password: 'Tec1234!',   rol: 'tecnico' });
  tecnico2   = await User.create({ nombre: 'Tecnico2 AC', email: 'tec2@ac.test',   password: 'Tec1234!',   rol: 'tecnico' });
  normalUser = await User.create({ nombre: 'Usuario AC',  email: 'user@ac.test',   password: 'User1234!',  rol: 'usuario' });

  adminToken    = await getToken('admin@ac.test',  'Admin123!');
  tecnico1Token = await getToken('tec1@ac.test',   'Tec1234!');
  userToken     = await getToken('user@ac.test',   'User1234!');

  console.log(`${C.gray}  Usuarios creados: admin, tecnico1, tecnico2, usuario.${C.reset}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CP001 — Registro de nuevo ticket → ID único, estado inicial correcto
// ─────────────────────────────────────────────────────────────────────────────
async function cp001() {
  console.log(`\n${C.bold}  CP001 — Registro de nuevo ticket${C.reset}`);
  try {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        titulo:      'Impresora HP sin respuesta',
        descripcion: 'No enciende desde ayer en sala 203',
        tipo:        'incidente',
        categoria:   'hardware',
        prioridad:   'alta',
      });

    assert(res.status === 201, `HTTP ${res.status} (esperado 201)`);
    assert(/^TKT-\d{4}-\d{4}$/.test(res.body.data.id), `ID inválido: ${res.body.data.id}`);
    assert(['abierto', 'asignado'].includes(res.body.data.estado), `Estado inesperado: ${res.body.data.estado}`);

    const enDB = await Ticket.findByPk(res.body.data.id);
    assert(enDB !== null, 'Ticket no aparece en la DB');
    assert(enDB.usuarioId === normalUser.id, 'usuarioId incorrecto en DB');

    log('CP001', true, `Ticket ${res.body.data.id} creado, estado='${res.body.data.estado}', registrado en DB`);
  } catch (e) { log('CP001', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP002 — Clasificación automática por categoría (5 categorías válidas)
// ─────────────────────────────────────────────────────────────────────────────
async function cp002() {
  console.log(`\n${C.bold}  CP002 — Clasificación por categoría${C.reset}`);
  const categorias = ['hardware', 'software', 'red', 'accesos', 'servicios_ti'];
  let ok = 0;
  const errores = [];
  for (const cat of categorias) {
    try {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ titulo: `Prueba ${cat}`, descripcion: 'Clasificación', tipo: 'incidente', categoria: cat });
      assert(res.status === 201, `HTTP ${res.status} para '${cat}'`);
      assert(res.body.data.categoria === cat, `Guardado '${res.body.data.categoria}' en lugar de '${cat}'`);
      ok++;
    } catch (e) { errores.push(e.message); }
  }
  if (ok === 5) {
    log('CP002', true, `Las 5 categorías guardadas correctamente: ${categorias.join(', ')}`);
  } else {
    log('CP002', false, `${ok}/5 OK — ${errores.join('; ')}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP003 — Asignación automática al técnico con menor carga
// ─────────────────────────────────────────────────────────────────────────────
async function cp003() {
  console.log(`\n${C.bold}  CP003 — Asignación al técnico con menor carga${C.reset}`);
  try {
    // Cargar tecnico1 con 1 ticket activo
    await Ticket.create({
      id: 'TKT-CP03-CARGA', titulo: 'Carga de tec1', descripcion: 'X',
      tipo: 'incidente', categoria: 'hardware', prioridad: 'media', estado: 'asignado',
      usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 24 * 3600000),
    });

    // Nuevo ticket → debería ir a tecnico2 (0 tickets activos)
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ titulo: 'Debe ir a técnico libre', descripcion: 'Asignación equilibrada', tipo: 'incidente', categoria: 'hardware', prioridad: 'media' });

    assert(res.status === 201, `HTTP ${res.status}`);
    const ticket = await Ticket.findByPk(res.body.data.id);
    assert(ticket.tecnicoId !== null, 'Sin técnico asignado (tecnicoId=null)');
    assert(ticket.tecnicoId === tecnico2.id,
      `Asignado a tecnico ${ticket.tecnicoId}, esperado tecnico2 (${tecnico2.id})`);

    log('CP003', true, `Ticket asignado a '${tecnico2.nombre}' (0 tickets activos vs 1 de ${tecnico1.nombre})`);
  } catch (e) { log('CP003', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP004 — Cambio de estado por técnico (transiciones válidas e inválidas)
// ─────────────────────────────────────────────────────────────────────────────
async function cp004() {
  console.log(`\n${C.bold}  CP004 — Cambio de estado por técnico${C.reset}`);
  try {
    const ticket = await Ticket.create({
      id: 'TKT-CP04-0001', titulo: 'Ticket cambio estado', descripcion: 'X',
      tipo: 'incidente', categoria: 'software', prioridad: 'alta', estado: 'asignado',
      usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 8 * 3600000),
    });

    // Transición válida: asignado → en_proceso
    const resOK = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${tecnico1Token}`)
      .send({ estado: 'en_proceso', comentario: 'Iniciando diagnóstico' });
    assert(resOK.status === 200, `HTTP ${resOK.status}`);
    assert(resOK.body.data.estado === 'en_proceso', `Estado: ${resOK.body.data.estado}`);

    // Transición inválida: en_proceso → cerrado
    const resKO = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${tecnico1Token}`)
      .send({ estado: 'cerrado' });
    assert(resKO.status === 400, `Transición inválida debería ser 400, fue ${resKO.status}`);

    // Técnico ajeno no puede modificar ticket
    const resAjeno = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${await getToken('tec2@ac.test', 'Tec1234!')}`)
      .send({ estado: 'resuelto' });
    assert(resAjeno.status === 403, `Técnico ajeno debe recibir 403, recibió ${resAjeno.status}`);

    log('CP004', true, `asignado→en_proceso OK. en_proceso→cerrado rechazado (400). Técnico ajeno → 403`);
  } catch (e) { log('CP004', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP005 — Reapertura de ticket resuelto
// ─────────────────────────────────────────────────────────────────────────────
async function cp005() {
  console.log(`\n${C.bold}  CP005 — Reapertura de ticket resuelto${C.reset}`);
  try {
    const ticket = await Ticket.create({
      id: 'TKT-CP05-0001', titulo: 'Ticket para reabrir', descripcion: 'Ya estaba resuelto',
      tipo: 'solicitud', categoria: 'software', prioridad: 'media', estado: 'resuelto',
      usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() - 3600000),  // ya vencido
    });
    const slaAntes = ticket.sla_limite;

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/reopen`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ motivo_reapertura: 'El fallo reapareció en otro equipo del mismo piso' });

    assert(res.status === 200, `HTTP ${res.status}`);
    assert(res.body.data.estado === 'abierto', `Estado: ${res.body.data.estado}`);
    assert(res.body.data.reabierto === true, 'reabierto debe ser true');
    assert(res.body.data.motivo_reapertura.length > 0, 'motivo_reapertura vacío');

    const nuevoSLA = new Date(res.body.data.sla_limite);
    assert(nuevoSLA > new Date(), 'Nuevo SLA debe estar en el futuro');
    assert(nuevoSLA > new Date(slaAntes), 'Nuevo SLA debe ser mayor al anterior (vencido)');

    log('CP005', true, `estado='abierto', reabierto=true, motivo guardado, nuevo sla_limite: ${nuevoSLA.toLocaleString()}`);
  } catch (e) { log('CP005', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP006 — Notificación generada al asignar ticket
// ─────────────────────────────────────────────────────────────────────────────
async function cp006() {
  console.log(`\n${C.bold}  CP006 — Notificación al asignar ticket${C.reset}`);
  try {
    const antes = Date.now();
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ titulo: 'Ticket con notificación', descripcion: 'Verificar creación de notif', tipo: 'incidente', categoria: 'red', prioridad: 'alta' });

    assert(res.status === 201, `HTTP ${res.status}`);

    const notif = await Notification.findOne({
      where: { ticketId: res.body.data.id, tipo: 'asignacion' },
    });
    assert(notif !== null, 'No se creó notificación de asignación en DB');
    assert(notif.mensaje.includes(res.body.data.id), 'El mensaje no contiene el ID del ticket');

    const elapsed = Date.now() - antes;
    assert(elapsed < 300000, `Tardó más de 5 min (${elapsed}ms)`);

    const notifCreacion = await Notification.findOne({
      where: { ticketId: res.body.data.id, tipo: 'creacion', usuarioId: normalUser.id },
    });
    assert(notifCreacion !== null, 'No se creó notificación de creación para el usuario');

    log('CP006', true, `Notificación tipo='asignacion' en DB. Notif de creación para usuario. Generada en <5 min`);
  } catch (e) { log('CP006', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP007 — Autenticación con credenciales válidas
// ─────────────────────────────────────────────────────────────────────────────
async function cp007() {
  console.log(`\n${C.bold}  CP007 — Autenticación con credenciales válidas${C.reset}`);
  try {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@ac.test', password: 'User1234!' });

    assert(res.status === 200, `HTTP ${res.status}`);
    assert(res.body.data?.token, 'Token no presente');
    assert(res.body.data.user?.nombre, 'nombre ausente en respuesta');
    assert(res.body.data.user?.email, 'email ausente en respuesta');
    assert(!res.body.data.user?.password, 'password expuesto en respuesta');
    assert(res.body.data.user.rol === 'usuario', `Rol: ${res.body.data.user.rol}`);

    // GET /api/auth/me con el token recibido
    const resMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    assert(resMe.status === 200, `GET /api/auth/me: HTTP ${resMe.status}`);

    // Token inválido → 401
    const resInv = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tokenmalformado12345');
    assert(resInv.status === 401, `Token inválido debe dar 401, dio ${resInv.status}`);

    log('CP007', true, `Login OK. Token válido en /auth/me. Sin password en respuesta. Token inválido → 401`);
  } catch (e) { log('CP007', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP008 — Bloqueo de cuenta tras 5 intentos fallidos
// ─────────────────────────────────────────────────────────────────────────────
async function cp008() {
  console.log(`\n${C.bold}  CP008 — Bloqueo tras 5 intentos fallidos${C.reset}`);
  try {
    const userBloqueo = await User.create({
      nombre: 'Bloqueo Test', email: 'bloqueo@ac.test',
      password: 'Bloqueo123!', rol: 'usuario',
    });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'bloqueo@ac.test', password: 'wrongpassword' });
    }

    // Intento 6 con contraseña incorrecta → 423
    const res6 = await request(app).post('/api/auth/login').send({ email: 'bloqueo@ac.test', password: 'wrongpassword' });
    assert(res6.status === 423, `Intento 6 debe dar 423, dio ${res6.status}`);
    assert(/bloqueada/i.test(res6.body.message), `Mensaje esperado 'bloqueada': ${res6.body.message}`);

    // Contraseña correcta también rechazada mientras está bloqueada
    const resCorrect = await request(app).post('/api/auth/login').send({ email: 'bloqueo@ac.test', password: 'Bloqueo123!' });
    assert(resCorrect.status === 423, `Correcta en cuenta bloqueada debe dar 423, dio ${resCorrect.status}`);

    await userBloqueo.reload();
    assert(userBloqueo.bloqueado_hasta !== null, 'bloqueado_hasta debe estar en DB');
    assert(new Date(userBloqueo.bloqueado_hasta) > new Date(), 'bloqueado_hasta debe ser en el futuro');

    log('CP008', true, `Cuenta bloqueada tras 5 fallos → 423. Contraseña correcta rechazada. bloqueado_hasta en DB`);
  } catch (e) { log('CP008', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP009 — Dashboard diferenciado por rol (3 roles)
// ─────────────────────────────────────────────────────────────────────────────
async function cp009() {
  console.log(`\n${C.bold}  CP009 — Dashboard diferenciado por rol (3 roles)${C.reset}`);
  try {
    // Rol: administrador → /api/reports/summary
    const resAdmin = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(resAdmin.status === 200, `Admin summary HTTP ${resAdmin.status}`);
    assert(resAdmin.body.data.totalTickets !== undefined, 'Admin: sin campo totalTickets');
    assert(resAdmin.body.data.abiertos     !== undefined, 'Admin: sin campo abiertos');
    assert(resAdmin.body.data.resueltos    !== undefined, 'Admin: sin campo resueltos');
    assert(resAdmin.body.data.tecnicosActivos !== undefined, 'Admin: sin campo tecnicosActivos');

    // Rol: técnico → /api/reports/my-dashboard
    const resTec = await request(app)
      .get('/api/reports/my-dashboard')
      .set('Authorization', `Bearer ${tecnico1Token}`);
    assert(resTec.status === 200, `Técnico my-dashboard HTTP ${resTec.status}`);
    assert(resTec.body.data.misTickets !== undefined, 'Técnico: sin campo misTickets');

    // Rol: usuario → acceso a summary denegado (403)
    const resUser = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${userToken}`);
    assert(resUser.status === 403, `Usuario debe recibir 403 en summary, recibió ${resUser.status}`);

    log('CP009', true,
      `Admin: totalTickets=${resAdmin.body.data.totalTickets}, tecnicosActivos=${resAdmin.body.data.tecnicosActivos}. ` +
      `Técnico: misTickets=${resTec.body.data.misTickets}. Usuario → 403`);
  } catch (e) { log('CP009', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP010 — Alerta SLA al 80% del tiempo consumido
// ─────────────────────────────────────────────────────────────────────────────
async function cp010() {
  console.log(`\n${C.bold}  CP010 — Alerta SLA al 80%${C.reset}`);
  try {
    const slaConfig = { tiempo_horas: 8, porcentaje_alerta: 80 };
    const ahora = Date.now();

    // Ticket con 81.25% consumido (6.5h de 8h)
    const res81 = checkSLAStatus(
      { prioridad: 'alta', createdAt: new Date(ahora - 6.5 * 3600000), sla_limite: new Date(ahora + 1.5 * 3600000), sla_alerta_enviada: false },
      slaConfig
    );
    assert(res81.porcentaje >= 80, `Porcentaje: ${res81.porcentaje.toFixed(1)}% (esperado ≥80%)`);
    assert(res81.alertar === true, 'alertar debe ser true al 81%');

    // Ticket con 20% consumido (1.6h de 8h)
    const res20 = checkSLAStatus(
      { prioridad: 'alta', createdAt: new Date(ahora - 1.6 * 3600000), sla_limite: new Date(ahora + 6.4 * 3600000), sla_alerta_enviada: false },
      slaConfig
    );
    assert(res20.porcentaje < 80, `Porcentaje debería ser <80%, es ${res20.porcentaje.toFixed(1)}%`);
    assert(res20.alertar === false, `alertar debe ser false al ${Math.round(res20.porcentaje)}%`);

    // Alerta ya enviada → no alertar de nuevo
    const resYaAvisado = checkSLAStatus(
      { prioridad: 'alta', createdAt: new Date(ahora - 7 * 3600000), sla_limite: new Date(ahora + 1 * 3600000), sla_alerta_enviada: true },
      slaConfig
    );
    assert(resYaAvisado.alertar === false, 'No debe alertar si sla_alerta_enviada=true');

    // Ticket vencido
    const resVencido = checkSLAStatus(
      { prioridad: 'alta', createdAt: new Date(ahora - 10 * 3600000), sla_limite: new Date(ahora - 2 * 3600000), sla_alerta_enviada: false },
      slaConfig
    );
    assert(resVencido.vencido === true, 'Ticket debería estar vencido');

    log('CP010', true,
      `81% → alertar=true. 20% → alertar=false. Ya avisado → alertar=false. ` +
      `SLA vencido detectado correctamente`);
  } catch (e) { log('CP010', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP011 — Registro de usuario por administrador
// ─────────────────────────────────────────────────────────────────────────────
async function cp011() {
  console.log(`\n${C.bold}  CP011 — Registro de usuario por administrador${C.reset}`);
  try {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Nuevo Tecnico CP11', email: 'nuevo.tec.cp11@ac.test', password: 'Nuevo123!', rol: 'tecnico' });

    assert(res.status === 201, `HTTP ${res.status}`);
    assert(res.body.data?.id, 'Sin id en respuesta');
    assert(res.body.data.rol === 'tecnico', `Rol: ${res.body.data.rol}`);
    assert(!res.body.data.password, 'password expuesto en la respuesta');

    // El nuevo usuario puede iniciar sesión
    const loginNuevo = await request(app).post('/api/auth/login').send({ email: 'nuevo.tec.cp11@ac.test', password: 'Nuevo123!' });
    assert(loginNuevo.status === 200, `Nuevo usuario no puede iniciar sesión: HTTP ${loginNuevo.status}`);

    // Email duplicado → 409
    const resDup = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Duplicado', email: 'nuevo.tec.cp11@ac.test', password: 'Dup12345!', rol: 'usuario' });
    assert(resDup.status === 409, `Email duplicado debe dar 409, dio ${resDup.status}`);

    // Usuario sin rol admin → 403
    const resForbid = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ nombre: 'X', email: 'x@ac.test', password: 'X1234567!', rol: 'usuario' });
    assert(resForbid.status === 403, `Usuario sin admin debe recibir 403, recibió ${resForbid.status}`);

    log('CP011', true,
      `Usuario id=${res.body.data.id} creado, sin password. ` +
      `Login exitoso. Email duplicado → 409. Sin admin → 403`);
  } catch (e) { log('CP011', false, e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CP012 — Cierre de ticket resuelto
// ─────────────────────────────────────────────────────────────────────────────
async function cp012() {
  console.log(`\n${C.bold}  CP012 — Cierre de ticket resuelto${C.reset}`);
  try {
    const ticket = await Ticket.create({
      id: 'TKT-CP12-0001', titulo: 'Ticket listo para cerrar', descripcion: 'Resuelto correctamente',
      tipo: 'incidente', categoria: 'accesos', prioridad: 'baja', estado: 'resuelto',
      usuarioId: normalUser.id, tecnicoId: tecnico1.id,
      sla_limite: new Date(Date.now() + 72 * 3600000),
    });

    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'cerrado' });

    assert(res.status === 200, `HTTP ${res.status}`);
    assert(res.body.data.estado === 'cerrado', `Estado HTTP: ${res.body.data.estado}`);

    const enDB = await Ticket.findByPk(ticket.id);
    assert(enDB.estado === 'cerrado', `Estado en DB: ${enDB.estado}`);

    // Transición inválida desde cerrado (cerrado solo puede ir a abierto por reapertura)
    const resKO = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'en_proceso' });
    assert(resKO.status === 400, `cerrado→en_proceso debe ser 400, fue ${resKO.status}`);

    log('CP012', true, `Ticket cerrado en HTTP y DB. Transición cerrado→en_proceso rechazada con 400`);
  } catch (e) { log('CP012', false, e.message); }
}

// ─── Reporte final ────────────────────────────────────────────────────────────
function imprimirReporte() {
  const total    = results.length;
  const pasados  = results.filter((r) => r.ok).length;
  const fallidos = results.filter((r) => !r.ok);
  const pct      = Math.round((pasados / total) * 100);

  console.log('\n' + fmt.dbl);
  console.log(`${C.bold}${C.blue}  REPORTE DE ACEPTACIÓN — Sistema de Gestión de Tickets TI${C.reset}`);
  console.log(`${C.bold}${C.blue}  Ingeniería de Software II · Universidad de Pamplona${C.reset}`);
  console.log(fmt.dbl);
  console.log('');

  results.forEach(({ cp, ok, detail }) => {
    const icon = ok ? `${C.green}✅ PASS${C.reset}` : `${C.red}❌ FAIL${C.reset}`;
    console.log(`  ${cp}: ${icon} — ${detail}`);
  });

  console.log('');
  console.log(fmt.sep);
  const colorTotal = pasados === total ? C.green : C.red;
  console.log(`  ${C.bold}Total: ${colorTotal}${pasados}/${total} PASS (${pct}%)${C.reset}`);
  console.log('');

  if (pasados === total) {
    console.log(`  ${C.green}${C.bold}🎉 Todos los casos de prueba de aceptación pasaron exitosamente.${C.reset}`);
  } else {
    console.log(`  ${C.red}${C.bold}⚠️  ${fallidos.length} caso(s) fallaron:${C.reset}`);
    fallidos.forEach(({ cp, detail }) => {
      console.log(`    ${C.red}• ${cp}: ${detail}${C.reset}`);
    });
  }
  console.log(fmt.dbl + '\n');
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C.bold}${C.blue}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.blue}║  PRUEBAS DE ACEPTACIÓN — Ing. de Software II · UP 2026      ║${C.reset}`);
  console.log(`${C.bold}${C.blue}╚══════════════════════════════════════════════════════════════╝${C.reset}`);

  try {
    await setupDB();

    await cp001();
    await cp002();
    await cp003();
    await cp004();
    await cp005();
    await cp006();
    await cp007();
    await cp008();
    await cp009();
    await cp010();
    await cp011();
    await cp012();

  } catch (err) {
    console.error(`\n${C.red}Error fatal durante la ejecución:${C.reset}`, err.message);
  } finally {
    imprimirReporte();
    await sequelize.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

main();
