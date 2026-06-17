/**
 * factories.js — helpers para crear datos de prueba reutilizables.
 * Cada función acepta overrides para personalizar los valores por defecto.
 * Requiere que la DB ya esté sincronizada (sequelize.sync) antes de usarse.
 */
const { User, Ticket, SLAConfig } = require('../../src/models');
const request = require('supertest');
const app = require('../../src/app');

// Contador simple para garantizar unicidad dentro del proceso
let _seq = 0;
const seq = () => String(++_seq).padStart(4, '0');

// ─── Usuarios ─────────────────────────────────────────────────────────────

const crearAdmin = (overrides = {}) =>
  User.create({
    nombre: `Admin ${seq()}`,
    email: `admin${seq()}@factory.test`,
    password: 'Admin123!',
    rol: 'administrador',
    ...overrides,
  });

const crearTecnico = (overrides = {}) =>
  User.create({
    nombre: `Tecnico ${seq()}`,
    email: `tec${seq()}@factory.test`,
    password: 'Tecnico123!',
    rol: 'tecnico',
    ...overrides,
  });

const crearUsuario = (overrides = {}) =>
  User.create({
    nombre: `Usuario ${seq()}`,
    email: `usr${seq()}@factory.test`,
    password: 'Usuario123!',
    rol: 'usuario',
    ...overrides,
  });

// ─── Autenticación ─────────────────────────────────────────────────────────

const obtenerToken = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.data?.token || null;
};

// ─── Tickets ───────────────────────────────────────────────────────────────

const crearTicket = (overrides = {}) => {
  const anio = new Date().getFullYear();
  const rand = String(8000 + _seq).padStart(4, '0'); seq();
  return Ticket.create({
    id: `TKT-${anio}-F${rand}`,
    titulo: 'Ticket generado por factory',
    descripcion: 'Descripción generada por factory para tests',
    tipo: 'incidente',
    categoria: 'hardware',
    prioridad: 'media',
    estado: 'abierto',
    sla_limite: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  });
};

// ─── SLA configs ───────────────────────────────────────────────────────────

const crearSLAConfigs = () =>
  SLAConfig.bulkCreate([
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ], { ignoreDuplicates: true });

module.exports = { crearAdmin, crearTecnico, crearUsuario, obtenerToken, crearTicket, crearSLAConfigs };
