module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_dev_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptRounds: 12,
  maxLoginAttempts: 5,
  lockDurationMinutes: 15,
};
