// In-memory blacklist. En producción reemplazar por Redis (SET con TTL = exp del token).
const _blacklist = new Set();

const add = (jti) => _blacklist.add(jti);
const has = (jti) => _blacklist.has(jti);

module.exports = { add, has };
