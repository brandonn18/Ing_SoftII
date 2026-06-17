const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/users.controller');
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(verifyToken);

// Técnicos disponibles (accesible por admin y técnico para asignaciones)
router.get('/technicians/available', requireRole('administrador', 'tecnico'), ctrl.getTecnicos);

// Alias legacy para compatibilidad con el frontend actual
router.get('/tecnicos', requireRole('administrador', 'tecnico'), ctrl.getTecnicos);

router.get('/', requireRole('administrador'), ctrl.getAll);
router.get('/:id', requireRole('administrador'), ctrl.getById);

router.post('/', requireRole('administrador'), [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos 1 mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos 1 número'),
  body('rol').isIn(['usuario', 'tecnico', 'administrador']).withMessage('Rol inválido'),
], ctrl.create);

router.put('/:id', requireRole('administrador'), [
  body('nombre').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('rol').optional().isIn(['usuario', 'tecnico', 'administrador']).withMessage('Rol inválido'),
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano'),
], ctrl.update);

// Soft-delete: desactiva el usuario (activo=false)
router.delete('/:id', requireRole('administrador'), ctrl.remove);

router.post('/:id/reset-password', requireRole('administrador'), ctrl.resetPassword);

// Legacy toggle para el frontend
router.patch('/:id/toggle-activo', requireRole('administrador'), ctrl.toggleActivo);

module.exports = router;
