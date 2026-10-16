// Mismo requerimiento, tres arquitecturas con API JSON (hexagonal, capas,
// OOP): las tres deben responder exactamente igual a los mismos casos.
// MVC responde HTML y tiene sus propios tests (mvc_comentarios/).
const request = require('supertest');
const { abrirServidorDePrueba, USUARIOS } = require('../http/servidorDePrueba');
const { definirModeloComentario } = require('../../src/modules/hexagonal_comentarios');

const { admin, ana, beto, luis, maria } = USUARIOS;
const TODOS = { comentarios: true, capas: true, mvc: true, oop: true };
const ARQUITECTURAS = [
  ['hexagonal', '/api/v1/tickets'],
  ['capas', '/api/v1/capas/tickets'],
  ['OOP', '/api/v1/oop/tickets'],
];
let s;

const crearTicket = async () => (await s.como(luis).post('/api/tickets').send({
  titulo: 'Monitor', descripcion: 'No enciende', tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
})).body.data;
const cerrar = async (id) => {
  for (const estado of ['en_proceso', 'resuelto', 'cerrado']) {
    // eslint-disable-next-line no-await-in-loop
    await s.como(admin).patch(`/api/tickets/${id}/status`).send({ estado });
  }
};

beforeAll(async () => {
  s = await abrirServidorDePrueba();
  await definirModeloComentario(s.bd.sequelize).sync({ force: true });
});
beforeEach(async () => {
  await s.reiniciar({ modulos: TODOS });
  await s.bd.sequelize.query('TRUNCATE ticket_comentarios RESTART IDENTITY');
});
afterAll(async () => { await s.cerrar(); });

describe.each(ARQUITECTURAS)('Contrato de comentarios — %s (%s)', (_nombre, base) => {
  const ruta = (id) => `${base}/${id}/comentarios`;
  const comentar = (usuario, id, texto) => s.como(usuario).post(ruta(id)).send({ texto });

  it('debería crear con 201, sin HTML y con el autor del token', async () => {
    const t = await crearTicket();
    const res = await comentar(luis, t.id, '  <b>Sigue</b> igual<script>x()</script> ');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Comentario agregado',
      data: { id: 1, ticketId: t.id, texto: 'Sigue igual', createdAt: expect.any(String), autor: { id: luis.id, nombre: 'Luis Usuario', rol: 'usuario' } },
    });
  });

  it('debería dejar comentar al técnico asignado y al admin, no a otro técnico ni a otra usuaria', async () => {
    const t = await crearTicket();
    const asignado = t.tecnico.id === ana.id ? ana : beto;
    const otro = asignado === ana ? beto : ana;
    expect((await comentar(asignado, t.id, 'Voy')).status).toBe(201);
    expect((await comentar(admin, t.id, 'Ok')).status).toBe(201);
    expect((await comentar(otro, t.id, 'Hola')).status).toBe(403);
    expect((await comentar(maria, t.id, 'Hola')).status).toBe(403);
  });

  it('debería responder 400 con texto vacío, demasiado largo o que solo era HTML', async () => {
    const t = await crearTicket();
    const vacio = await comentar(luis, t.id, '   ');
    expect(vacio.status).toBe(400);
    expect(vacio.body).toMatchObject({ success: false, message: 'Datos inválidos' });
    expect((await comentar(luis, t.id, 'a'.repeat(2001))).status).toBe(400);
    expect((await comentar(luis, t.id, '<img src=x>')).status).toBe(400);
  });

  it('debería responder 400 con un id mal formado, 404 si no existe y 400 si está cerrado', async () => {
    const t = await crearTicket();
    await cerrar(t.id);
    expect((await comentar(luis, 'abc', 'hola')).status).toBe(400);
    expect((await comentar(luis, 'TKT-2026-9999', 'hola')).status).toBe(404);
    expect((await comentar(luis, t.id, 'hola')).status).toBe(400);
  });

  it('debería listar en orden y negar el hilo a quien no ve el ticket', async () => {
    const t = await crearTicket();
    await comentar(luis, t.id, 'primero');
    await comentar(admin, t.id, 'segundo');
    const res = await s.como(luis).get(ruta(t.id));
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.texto)).toEqual(['primero', 'segundo']);
    expect((await s.como(maria).get(ruta(t.id))).status).toBe(403);
    expect((await request(s.app).get(ruta(t.id))).status).toBe(401);
  });

  it('no debería existir con su flag apagado', async () => {
    await s.reiniciar();
    const t = await crearTicket();
    expect((await s.como(luis).get(ruta(t.id))).status).toBe(404);
  });
});

describe('Las arquitecturas comparten los datos', () => {
  it('debería ver desde las cuatro un comentario creado por cualquiera de ellas', async () => {
    const t = await crearTicket();
    await s.como(luis).post(`/api/v1/capas/tickets/${t.id}/comentarios`).send({ texto: 'desde capas' });
    await s.como(luis).post(`/api/v1/oop/tickets/${t.id}/comentarios`).send({ texto: 'desde OOP' });
    const hexagonal = await s.como(luis).get(`/api/v1/tickets/${t.id}/comentarios`);
    expect(hexagonal.body.data.map((c) => c.texto)).toEqual(['desde capas', 'desde OOP']);
    const mvc = await s.como(admin).get(`/api/v1/mvc/tickets/${t.id}/comentarios`);
    expect(mvc.text).toContain('desde capas');
    expect(mvc.text).toContain('desde OOP');
  });
});
