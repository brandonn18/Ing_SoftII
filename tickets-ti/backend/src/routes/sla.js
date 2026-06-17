const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/sla.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');

router.use(authenticate);

router.get('/', ctrl.getAll);

router.put('/:id', authorize('administrador'), [
  body('tiempo_horas').optional().isInt({ min: 1 }).withMessage('tiempo_horas debe ser entero positivo'),
  body('porcentaje_alerta').optional().isInt({ min: 1, max: 100 }).withMessage('porcentaje_alerta entre 1 y 100'),
], ctrl.update);

module.exports = router;
