const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, SLAConfig } = require('../../src/models');

const USUARIOS_CONCURRENTES = 10;
const TIMEOUT_MS = 2000;

let tokens = [];

// ─── Setup global ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ]);

  // Crear un técnico para que la auto-asignación funcione
  await User.create({ nombre: 'Tecnico Load', email: 'tec.load@test.com', password: 'Tec1234!', rol: 'tecnico' });

  // Crear 10 usuarios y obtener sus tokens
  // User.create dispara el hook beforeCreate (bcrypt hash); bulkCreate no lo hace
  const usuarios = await Promise.all(
    Array.from({ length: USUARIOS_CONCURRENTES }, (_, i) =>
      User.create({
        nombre: `Usuario Carga ${i + 1}`,
        email: `carga${i + 1}@load.test`,
        password: 'Carga123!',
        rol: 'usuario',
      })
    )
  );

  tokens = await Promise.all(
    usuarios.map(async (u) => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: u.email, password: 'Carga123!' });
      return res.body.data.token;
    })
  );
}, 60000);

afterAll(async () => {
  await sequelize.close();
});

// ─── Test de carga concurrente ─────────────────────────────────────────────────

describe('Carga concurrente — 10 usuarios creando tickets simultáneamente', () => {
  test('Todos los requests retornan 201 sin errores de concurrencia', async () => {
    const resultados = await Promise.all(
      tokens.map(async (token, i) => {
        const inicio = Date.now();
        const res = await request(app)
          .post('/api/tickets')
          .set('Authorization', `Bearer ${token}`)
          .send({
            titulo: `Ticket de carga concurrente #${i + 1}`,
            descripcion: `Ticket creado por el usuario ${i + 1} en el test de carga`,
            tipo: i % 2 === 0 ? 'incidente' : 'solicitud',
            categoria: ['hardware', 'software', 'red', 'accesos', 'servicios_ti'][i % 5],
            prioridad: ['baja', 'media', 'alta', 'critica'][i % 4],
          });
        return { status: res.status, duracion: Date.now() - inicio, id: res.body.data?.id };
      })
    );

    // Todos deben retornar 201
    resultados.forEach(({ status }, i) => {
      expect(status).toBe(201);
    });

    // Verificar que no haya IDs duplicados (no hubo colisiones)
    const ids = resultados.map((r) => r.id).filter(Boolean);
    const idsUnicos = new Set(ids);
    expect(idsUnicos.size).toBe(ids.length);
  }, 30000);

  test('Tiempo de respuesta P95 < 2000ms bajo carga concurrente', async () => {
    const duraciones = await Promise.all(
      tokens.map(async (token, i) => {
        const inicio = Date.now();
        await request(app)
          .post('/api/tickets')
          .set('Authorization', `Bearer ${token}`)
          .send({
            titulo: `Ticket timing #${i + 1}`,
            descripcion: `Test de tiempo de respuesta bajo concurrencia`,
            tipo: 'incidente',
            categoria: 'software',
            prioridad: 'media',
          });
        return Date.now() - inicio;
      })
    );

    duraciones.sort((a, b) => a - b);

    // P95: con 10 muestras, el percentil 95 es el valor máximo (índice 9)
    const p95 = duraciones[Math.ceil(duraciones.length * 0.95) - 1];
    const promedio = Math.round(duraciones.reduce((s, d) => s + d, 0) / duraciones.length);

    // eslint-disable-next-line no-console
    console.log(`Tiempos (ms): [${duraciones.join(', ')}] | P95: ${p95}ms | Promedio: ${promedio}ms`);

    expect(p95).toBeLessThan(TIMEOUT_MS);
  }, 30000);
});

// ─── Estabilidad bajo reintentos secuenciales ──────────────────────────────────

describe('Estabilidad bajo requests secuenciales repetidos', () => {
  test('50 requests secuenciales de lectura sin degradación > 500ms', async () => {
    const token = tokens[0];
    const duraciones = [];

    for (let i = 0; i < 50; i++) {
      const inicio = Date.now();
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${token}`);
      duraciones.push(Date.now() - inicio);
      expect(res.status).toBe(200);
    }

    const p95 = [...duraciones].sort((a, b) => a - b)[Math.ceil(duraciones.length * 0.95) - 1];
    expect(p95).toBeLessThan(500);
  }, 60000);
});
