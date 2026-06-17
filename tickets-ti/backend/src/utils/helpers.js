const sanitizeHtml = require('sanitize-html');

const sanitizarTexto = (texto) => {
  if (typeof texto !== 'string') return texto;
  return sanitizeHtml(texto, { allowedTags: [], allowedAttributes: {} }).trim();
};

const calcularSLA = (prioridad, horas) => {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() + horas);
  return ahora;
};

const paginar = (page = 1, limit = 20) => ({
  limit: parseInt(limit),
  offset: (parseInt(page) - 1) * parseInt(limit),
});

module.exports = { calcularSLA, paginar, sanitizarTexto };
