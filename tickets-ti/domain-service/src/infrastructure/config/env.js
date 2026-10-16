// Lectura de variables de entorno con fail fast: si falta una obligatoria,
// el servicio no arranca en vez de usar un valor por defecto inseguro.

const requerirEnv = (nombre) => {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno obligatoria ${nombre}`);
  }
  return valor;
};

const configDB = () => ({
  database: requerirEnv('DB_NAME'),
  username: requerirEnv('DB_USER'),
  password: requerirEnv('DB_PASSWORD'),
  host: requerirEnv('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true',
});

const configAuthcore = () => ({
  baseUrl: requerirEnv('AUTHCORE_URL'),
  internalKey: requerirEnv('AUTHCORE_INTERNAL_KEY'),
  timeoutMs: parseInt(process.env.AUTHCORE_TIMEOUT_MS || '3000', 10),
});

// Feature flags de los módulos de src/modules/. Apagados por defecto: sin la
// variable, el servicio se comporta exactamente como antes del módulo.
const modulosHabilitados = () => ({
  comentarios: process.env.MODULO_COMENTARIOS === 'true', // hexagonal_comentarios
  capas: process.env.MODULO_CAPAS === 'true',
  mvc: process.env.MODULO_MVC === 'true',
  oop: process.env.MODULO_OOP === 'true',
});

module.exports = { requerirEnv, configDB, configAuthcore, modulosHabilitados };
