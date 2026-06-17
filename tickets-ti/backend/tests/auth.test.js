const request = require('supertest');
const app = require('../src/app');
const { sequelize, User } = require('../src/models');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await sequelize.sync({ force: true });
  await User.create({ nombre: 'Test Admin', email: 'admin@test.com', password: 'Admin123!', rol: 'administrador' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/auth/login', () => {
  it('debe retornar token con credenciales válidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('debe retornar 401 con contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('debe retornar 401 con email inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'noexiste@test.com', password: 'Admin123!' });
    expect(res.status).toBe(401);
  });

  it('debe validar campos requeridos', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/register', () => {
  it('debe registrar un nuevo usuario', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Nuevo Usuario', email: 'nuevo@test.com', password: 'Nuevo123!',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('debe rechazar contraseña débil', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Test', email: 'test2@test.com', password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('debe rechazar email duplicado', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nombre: 'Duplicado', email: 'admin@test.com', password: 'Admin123!',
    });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/auth/me', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin123!' });
    token = res.body.data.token;
  });

  it('debe retornar usuario autenticado', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@test.com');
  });

  it('debe retornar 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
