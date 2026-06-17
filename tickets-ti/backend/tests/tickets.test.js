const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, Ticket } = require('../src/models');

let adminToken, userToken, adminUser, normalUser;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });

  adminUser = await User.create({ nombre: 'Admin', email: 'admin@tickets.test', password: 'Admin123!', rol: 'administrador' });
  normalUser = await User.create({ nombre: 'User', email: 'user@tickets.test', password: 'User1234!', rol: 'usuario' });

  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@tickets.test', password: 'Admin123!' });
  adminToken = adminRes.body.data.token;

  const userRes = await request(app).post('/api/auth/login').send({ email: 'user@tickets.test', password: 'User1234!' });
  userToken = userRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/tickets', () => {
  it('debe crear un ticket con ID en formato TKT-YYYY-NNNN', async () => {
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${userToken}`).send({
      titulo: 'Mi PC no enciende', descripcion: 'La PC no responde al encender', tipo: 'incidente', categoria: 'hardware', prioridad: 'alta',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.id).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(res.body.data.titulo).toBe('Mi PC no enciende');
    expect(res.body.data).toHaveProperty('sla_limite');
  });

  it('debe fallar sin campos requeridos', async () => {
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${userToken}`).send({ titulo: 'Sin datos' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tickets', () => {
  it('admin debe ver todos los tickets', async () => {
    const res = await request(app).get('/api/tickets').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.meta).toHaveProperty('total');
  });

  it('usuario solo ve sus tickets', async () => {
    const res = await request(app).get('/api/tickets').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((t) => expect(t.usuarioId).toBe(normalUser.id));
  });
});

describe('GET /api/tickets/:id', () => {
  let ticketId;
  beforeAll(async () => {
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${userToken}`).send({
      titulo: 'Ticket para buscar', descripcion: 'Descripción', tipo: 'solicitud', categoria: 'software',
    });
    ticketId = res.body.data.id;
  });

  it('debe retornar el ticket por id', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ticketId);
  });

  it('debe retornar 404 para ticket inexistente', async () => {
    const res = await request(app).get('/api/tickets/TKT-9999-9999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
