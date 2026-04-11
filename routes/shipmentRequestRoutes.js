const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  createShipmentRequest,
  listShipmentRequests,
  getShipmentRequestById,
  verifyShipmentRequest,
  approveShipmentRequest,
  rejectShipmentRequest,
} = require('../controllers/shipmentRequestController');

router.use(authenticate);

router.get('/', requireRoles('admin', 'operator', 'analyst', 'organization'), listShipmentRequests);
router.post('/', requireRoles('organization'), createShipmentRequest);
router.get('/:id', requireRoles('admin', 'operator', 'analyst', 'organization'), getShipmentRequestById);
router.post('/:id/verify', requireRoles('admin', 'operator'), verifyShipmentRequest);
router.post('/:id/approve', requireRoles('admin', 'operator'), approveShipmentRequest);
router.post('/:id/reject', requireRoles('admin', 'operator'), rejectShipmentRequest);

module.exports = router;
