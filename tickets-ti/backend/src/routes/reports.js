const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const slaCtrl = require('../controllers/sla.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');

router.use(authenticate);

// Admin endpoints
router.get('/summary', authorize('administrador'), ctrl.summary);
router.get('/tickets-by-period', authorize('administrador'), ctrl.ticketsByPeriod);
router.get('/technician-performance', authorize('administrador'), ctrl.technicianPerformance);
router.get('/sla-compliance', authorize('administrador'), ctrl.slaCompliance);

// Technician endpoint
router.get('/my-dashboard', authorize('administrador', 'tecnico'), ctrl.myDashboard);

// User endpoint
router.get('/my-tickets-summary', ctrl.myTicketsSummary);

// Legacy endpoints
router.get('/resumen', authorize('administrador', 'tecnico'), ctrl.resumen);
router.get('/sla', authorize('administrador', 'tecnico'), ctrl.slaReport);
router.get('/por-tecnico', authorize('administrador', 'tecnico'), ctrl.porTecnico);
router.get('/sla-config', slaCtrl.getAll);
router.put('/sla-config/:id', authorize('administrador'), slaCtrl.update);

module.exports = router;
