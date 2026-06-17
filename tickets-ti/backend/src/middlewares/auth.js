const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { User } = require('../models');
const blacklist = require('../utils/tokenBlacklist');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (blacklist.has(decoded.jti || token)) {
      return res.status(401).json({ success: false, message: 'Token invalidado' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.activo) {
      return res.status(401).json({ success: false, message: 'Usuario no válido o inactivo' });
    }

    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// Alias para compatibilidad con código existente
const authenticate = verifyToken;

module.exports = { verifyToken, authenticate };
