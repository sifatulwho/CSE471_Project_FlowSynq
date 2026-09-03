const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  createDemoRequest, listDemoRequests, approveDemoRequest, rejectDemoRequest, syncDemoPayment,
} = require('../controllers/demoRequestController');

router.post('/', createDemoRequest);
router.use(authenticate, requireRoles('admin'));
router.get('/', listDemoRequests);
router.post('/:id/sync-payment', syncDemoPayment);
router.post('/:id/approve', approveDemoRequest);
router.post('/:id/reject', rejectDemoRequest);
module.exports = router;
