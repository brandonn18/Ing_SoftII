const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/tickets.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

router.post('/', [
  body('titulo').notEmpty().withMessage('Título requerido'),
  body('descripcion').notEmpty().withMessage('Descripción requerida'),
  body('tipo').isIn(['incidente', 'solicitud']).withMessage('Tipo inválido'),
  body('categoria').isIn(['hardware', 'software', 'red', 'accesos', 'servicios_ti']).withMessage('Categoría inválida'),
  body('prioridad').optional().isIn(['baja', 'media', 'alta', 'critica']),
], ctrl.create);

router.patch('/:id/status', authorize('administrador', 'tecnico'), [
  body('estado').isIn(['abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado'])
    .withMessage('Estado inválido'),
  body('comentario').optional().isString(),
], ctrl.updateStatus);

router.put('/:id', authorize('administrador', 'tecnico'), [
  body('estado').optional().isIn(['abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado']),
  body('prioridad').optional().isIn(['baja', 'media', 'alta', 'critica']),
], ctrl.update);

router.post('/:id/assign', authorize('administrador'), [
  body('tecnicoId').isInt().withMessage('tecnicoId inválido'),
], ctrl.assign);

router.post('/:id/reopen', [
  body('motivo_reapertura').notEmpty().withMessage('Motivo de reapertura requerido'),
], ctrl.reopen);

router.delete('/:id', authorize('administrador'), ctrl.remove);

module.exports = router;
