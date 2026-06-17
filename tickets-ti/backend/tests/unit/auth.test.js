// jest.mock se iza al tope del módulo: intercepta ANTES de que users.controller.js
// importe sendWelcomeEmail, resolviendo el problema de la desestructuración.
jest.mock('../../src/services/notificationService', () => ({
  ...jest.requireActual('../../src/services/notificationService'),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ messageId: 'mock-test' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'mock-test' }),
}));

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User } = require('../../src/models');
const notifService = require('../../src/services/notificationService');

// ─── Setup global ────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await User.create({
    nombre: 'Admin Unit',
    email: 'admin.unit@test.com',
    password: 'Admin123!',
    rol: 'administrador',
  });
});

afterAll(async () => {
  await sequelize.close();
});

// ─── CP007: Login exitoso con credenciales válidas ────────────────────────────

describe('CP007 — Login exitoso con credenciales válidas', () => {
  let usuarioNormal;

  beforeAll(async () => {
    usuarioNormal = await User.create({
      nombre: 'Pedro Usuario',
      email: 'pedro@test.com',
      password: 'Pedro123!',
      rol: 'usuario',
    });
  });

  it('CP007 - Login exitoso retorna token JWT y datos del usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pedro@test.com', password: 'Pedro123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.rol).toBe('usuario');
  });

  it('CP007 - Login responde con nombre y email del usuario sin exponer password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pedro@test.com', password: 'Pedro123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toHaveProperty('nombre');
    expect(res.body.data.user).toHaveProperty('email');
    expect(res.body.data.user.email).toBe('pedro@test.com');
    expect(res.body.data.user.nombre).toBe('Pedro Usuario');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('CP007 - Login con admin retorna token JWT y reinicia intentos fallidos previos', async () => {
    await request(app).post('/api/auth/login').send({ email: 'admin.unit@test.com', password: 'wrong' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.unit@test.com', password: 'Admin123!' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');

    const user = await User.findOne({ where: { email: 'admin.unit@test.com' } });
    expect(user.intentos_login).toBe(0);
  });
});

// ─── Login con credenciales incorrectas ──────────────────────────────────────

describe('Login con contraseña incorrecta', () => {
  let userIntentos;

  beforeAll(async () => {
    userIntentos = await User.create({
      nombre: 'Test Intentos',
      email: 'intentos@test.com',
      password: 'Test123!',
      rol: 'usuario',
    });
  });

  it('debería incrementar intentos_login tras contraseña incorrecta', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'intentos@test.com', password: 'wrong1' });

    await userIntentos.reload();
    expect(userIntentos.intentos_login).toBe(1);
  });

  it('debería retornar 401 con mensaje genérico (no revela si el email existe)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'intentos@test.com', password: 'wrongagain' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Credenciales inválidas');
  });
});

// ─── CP008: Bloqueo de cuenta tras 5 intentos fallidos ───────────────────────

describe('CP008 — Bloqueo de cuenta tras 5 intentos fallidos', () => {
  let userBloqueo;

  beforeAll(async () => {
    userBloqueo = await User.create({
      nombre: 'Test Bloqueo',
      email: 'bloqueo@test.com',
      password: 'Bloqueo123!',
      rol: 'usuario',
    });
  });

  it('CP008 - Bloquea la cuenta en el 5.º intento fallido y retorna 423', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'bloqueo@test.com', password: 'wrongpass' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bloqueo@test.com', password: 'wrongpass' });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/bloqueada/i);

    await userBloqueo.reload();
    expect(userBloqueo.bloqueado_hasta).not.toBeNull();
    expect(new Date(userBloqueo.bloqueado_hasta).getTime()).toBeGreaterThan(Date.now());
  });

  it('CP008 - Cuenta bloqueada rechaza login aunque la contraseña sea correcta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bloqueo@test.com', password: 'Bloqueo123!' });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/bloqueada/i);
  });
});

// ─── Validación de token JWT ──────────────────────────────────────────────────

describe('Validación de token JWT', () => {
  it('debería retornar 401 con token malformado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tokenbasuraquenoesvalido');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('debería retornar 401 sin header de autorización', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('debería retornar 401 con token de firma incorrecta', async () => {
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJpZCI6OTk5LCJlbWFpbCI6ImZha2VAdGVzdC5jb20ifQ.' +
      'FIRMA_INVALIDA_QUE_NO_COINCIDE';

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });
});

// ─── Refresh token ────────────────────────────────────────────────────────────

describe('Refresh token', () => {
  let token;

  beforeAll(async () => {
    const userRefresh = await User.create({
      nombre: 'Test Refresh',
      email: 'refresh@test.com',
      password: 'Refresh123!',
      rol: 'usuario',
    });

    const jwt = require('jsonwebtoken');
    const { jwtSecret } = require('../../src/config/auth');
    token = jwt.sign(
      { id: userRefresh.id, email: userRefresh.email, rol: userRefresh.rol, nombre: userRefresh.nombre },
      jwtSecret,
      { expiresIn: '1800s' } // 30 min → elegible para renovación (< 1h)
    );
  });

  it('debería generar nuevo token válido cuando el actual expira en < 1 hora', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.token).not.toBe(token);
  });
});

// ─── CP011: Admin crea usuario con rol y notificación ────────────────────────

describe('CP011 — Admin crea usuario con rol asignado', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.unit@test.com', password: 'Admin123!' });
    adminToken = res.body.data.token;
  });

  beforeEach(() => {
    notifService.sendWelcomeEmail.mockClear();
  });

  it('CP011 - Admin crea usuario con rol asignado y retorna datos sin password', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Tecnico Nuevo',
        email: 'tecnico.nuevo@test.com',
        password: 'Tecnico123!',
        rol: 'tecnico',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.rol).toBe('tecnico');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('CP011 - Email de bienvenida enviado al crear usuario (mock nodemailer)', async () => {
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Usuario Email Test',
        email: 'emailtest.cp011@test.com',
        password: 'Test123!!',
        rol: 'usuario',
      });

    expect(notifService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    const [llamadoUser] = notifService.sendWelcomeEmail.mock.calls[0];
    expect(llamadoUser).toHaveProperty('email', 'emailtest.cp011@test.com');
  });

  it('no debería crear usuario si el email ya existe', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Duplicado',
        email: 'tecnico.nuevo@test.com',
        password: 'Tecnico123!',
        rol: 'tecnico',
      });

    expect(res.status).toBe(409);
  });

  it('no debería permitir crear usuario si no es administrador', async () => {
    await User.create({
      nombre: 'User Regular',
      email: 'regular@test.com',
      password: 'Regular123!',
      rol: 'usuario',
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@test.com', password: 'Regular123!' });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`)
      .send({ nombre: 'X', email: 'x@test.com', password: 'Test123!', rol: 'usuario' });

    expect(res.status).toBe(403);
  });
});
