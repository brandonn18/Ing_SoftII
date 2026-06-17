require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Category, SLAConfig } = require('../models');

const seed = async () => {
  await sequelize.sync({ force: true });
  console.log('Tablas recreadas.');

  // El hook beforeCreate del modelo User hashea la contraseña automáticamente
  await User.findOrCreate({
    where: { email: 'admin@empresa.com' },
    defaults: { nombre: 'Administrador', password: 'Admin123!', rol: 'administrador' },
  });

  await User.findOrCreate({
    where: { email: 'tecnico1@empresa.com' },
    defaults: { nombre: 'Carlos Técnico', password: 'Tecnico123!', rol: 'tecnico' },
  });
  await User.findOrCreate({
    where: { email: 'tecnico2@empresa.com' },
    defaults: { nombre: 'Laura Técnica', password: 'Tecnico123!', rol: 'tecnico' },
  });

  await User.findOrCreate({
    where: { email: 'usuario1@empresa.com' },
    defaults: { nombre: 'Pedro Usuario', password: 'Usuario123!', rol: 'usuario' },
  });
  await User.findOrCreate({
    where: { email: 'usuario2@empresa.com' },
    defaults: { nombre: 'María Usuario', password: 'Usuario123!', rol: 'usuario' },
  });
  await User.findOrCreate({
    where: { email: 'usuario3@empresa.com' },
    defaults: { nombre: 'Juan Usuario', password: 'Usuario123!', rol: 'usuario' },
  });

  const categorias = [
    { nombre: 'Hardware', descripcion: 'Problemas con equipos físicos' },
    { nombre: 'Software', descripcion: 'Problemas con aplicaciones y sistemas' },
    { nombre: 'Red', descripcion: 'Problemas de conectividad y red' },
    { nombre: 'Accesos', descripcion: 'Gestión de permisos y accesos' },
    { nombre: 'Servicios TI', descripcion: 'Servicios generales de TI' },
  ];
  for (const cat of categorias) {
    await Category.findOrCreate({ where: { nombre: cat.nombre }, defaults: cat });
  }

  const slaConfigs = [
    { prioridad: 'critica', tiempo_horas: 4, porcentaje_alerta: 80 },
    { prioridad: 'alta', tiempo_horas: 8, porcentaje_alerta: 80 },
    { prioridad: 'media', tiempo_horas: 24, porcentaje_alerta: 80 },
    { prioridad: 'baja', tiempo_horas: 72, porcentaje_alerta: 80 },
  ];
  for (const sla of slaConfigs) {
    await SLAConfig.findOrCreate({ where: { prioridad: sla.prioridad }, defaults: sla });
  }

  console.log('Seeders ejecutados exitosamente.');
  await sequelize.close();
};

seed().catch((err) => { console.error(err); process.exit(1); });
