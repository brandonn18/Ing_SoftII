const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Error de validación',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token inválido' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = { errorHandler };
