const router = require('express').Router();
const ctrl = require('../controllers/notifications.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.getMias);
router.get('/count', ctrl.getCount);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
