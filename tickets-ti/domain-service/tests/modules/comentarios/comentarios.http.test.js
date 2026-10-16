// /api/v1/tickets/:id/comentarios de punta a punta: app real, PostgreSQL de
// pruebas y JWT firmado como authcore. También verifica el feature flag.
const request = require('supertest');
const { abrirServidorDePrueba, USUARIOS } = require('../../http/servidorDePrueba');
const { definirModeloComentario } = require('../../../src/modules/comentarios');

const { admin, ana, beto, luis, maria } = USUARIOS;
let s;

const rutaDe = (id) => `/api/v1/tickets/${id}/comentarios`;
const crearTicket = async () => (await s.como(luis).post('/api/tickets').send({
  titulo: 'Monitor', descripcion: 'No enciende', tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
})).body.data;
const comentar = (usuario, id, texto) => s.como(usuario).post(rutaDe(id)).send({ texto });

beforeAll(async () => {
  s = await abrirServidorDePrueba();
  await definirModeloComentario(s.bd.sequelize).sync({ force: true });
});
beforeEach(async () => {
  await s.reiniciar({ modulos: { comentarios: true } });
  await s.bd.sequelize.models.TicketComentario.destroy({ truncate: true, force: true });
});
afterAll(async () => { await s.cerrar(); });

describe('POST /api/v1/tickets/:id/comentarios', () => {
  it('debería crear el comentario con 201, sin HTML y con el autor del token', async () => {
    // Arrange
    const t = await crearTicket();
    // Act
    const res = await comentar(luis, t.id, '  <b>Sigue</b> sin encender<script>x()</script> ');
    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true, message: 'Comentario agregado',
      data: { ticketId: t.id, texto: 'Sigue sin encender', autor: { id: luis.id, nombre: 'Luis Usuario', rol: 'usuario' } },
    });
  });

  it('debería permitir comentar al técnico asignado y al administrador, no a otro técnico', async () => {
    const t = await crearTicket();
    const asignado = t.tecnico.id === ana.id ? ana : beto;
    const otro = asignado === ana ? beto : ana;
    expect((await comentar(asignado, t.id, 'Voy en camino')).status).toBe(201);
    expect((await comentar(admin, t.id, 'Prioridad confirmada')).status).toBe(201);
    expect((await comentar(otro, t.id, 'Hola')).status).toBe(403);
  });

  it('debería responder 400 con errors si el texto falta o es muy largo', async () => {
    const t = await crearTicket();
    const vacio = await comentar(luis, t.id, '   ');
    expect(vacio.status).toBe(400);
    expect(vacio.body).toMatchObject({ success: false, message: 'Datos inválidos' });
    expect(vacio.body.errors.length).toBeGreaterThan(0);
    expect((await comentar(luis, t.id, 'a'.repeat(2001))).status).toBe(400);
  });

  it('debería responder 400 si el texto queda vacío al quitar el HTML', async () => {
    const t = await crearTicket();
    expect((await comentar(luis, t.id, '<img src=x>')).status).toBe(400);
  });

  it('debería responder 400 con un id mal formado y 404 si el ticket no existe', async () => {
    expect((await comentar(luis, 'abc', 'hola')).status).toBe(400);
    expect((await comentar(luis, 'TKT-2026-9999', 'hola')).status).toBe(404);
  });

  it('debería responder 400 al comentar un ticket cerrado', async () => {
    const t = await crearTicket();
    for (const estado of ['en_proceso', 'resuelto', 'cerrado']) {
      // eslint-disable-next-line no-await-in-loop
      await s.como(admin).patch(`/api/tickets/${t.id}/status`).send({ estado });
    }
    expect((await comentar(luis, t.id, 'hola')).status).toBe(400);
  });
});

describe('GET /api/v1/tickets/:id/comentarios', () => {
  it('debería devolver el hilo en orden a quien puede ver el ticket', async () => {
    const t = await crearTicket();
    await comentar(luis, t.id, 'primero');
    await comentar(admin, t.id, 'segundo');
    const res = await s.como(luis).get(rutaDe(t.id));
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.texto)).toEqual(['primero', 'segundo']);
  });

  it('debería responder 403 a un usuario que no es dueño del ticket', async () => {
    const t = await crearTicket();
    expect((await s.como(maria).get(rutaDe(t.id))).status).toBe(403);
  });

  it('debería exigir token', async () => {
    const t = await crearTicket();
    expect((await request(s.app).get(rutaDe(t.id))).status).toBe(401);
  });
});

describe('Feature flag MODULO_COMENTARIOS', () => {
  it('no debería montar la ruta con el módulo apagado y el resto de la API sigue igual', async () => {
    // Arrange
    await s.reiniciar();
    const t = await crearTicket();
    // Act
    const res = await s.como(luis).get(rutaDe(t.id));
    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Ruta no encontrada', errors: [] });
    expect((await s.como(luis).get(`/api/tickets/${t.id}`)).status).toBe(200);
  });
});
