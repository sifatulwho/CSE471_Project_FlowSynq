const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  getDemands,
  getDemandById,
  createDemand,
  createDemandBatch,
  updateDemand,
  deleteDemand,
  approveDemand,
  rejectDemand,
  getDemandBatches,
  approveDemandBatch,
  rejectDemandBatch,
  generateDemoDemandData,
  generateSimpleDemand365,
} = require('../controllers/demandController');

router.use(authenticate);

router.get('/', getDemands);
router.post('/', requireRoles('admin', 'analyst'), createDemand);
router.post('/batch', requireRoles('admin', 'analyst'), createDemandBatch);
router.post('/demo/generate', requireRoles('admin', 'analyst'), generateDemoDemandData);
router.post('/demo/generate-simple', requireRoles('admin'), generateSimpleDemand365);
router.get('/batches', requireRoles('admin'), getDemandBatches);
router.post('/batches/:batchId/approve', requireRoles('admin'), approveDemandBatch);
router.post('/batches/:batchId/reject', requireRoles('admin'), rejectDemandBatch);
router.post('/:id/approve', requireRoles('admin'), approveDemand);
router.post('/:id/reject', requireRoles('admin'), rejectDemand);
router.get('/:id', getDemandById);
router.put('/:id', requireRoles('admin', 'analyst'), updateDemand);
router.delete('/:id', requireRoles('admin', 'analyst'), deleteDemand);

module.exports = router;
