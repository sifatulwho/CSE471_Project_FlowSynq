const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  createImportRequest,
  listImportRequests,
  getImportRequestById,
  respondToImportRequest,
  getDemandReferences,
  listOrganizationsByCommodity,
} = require('../controllers/importRequestController');

router.use(authenticate);

router.get('/', requireRoles('admin', 'operator', 'organization'), listImportRequests);
router.post('/', requireRoles('admin', 'operator'), createImportRequest);
router.get('/demand-references', requireRoles('admin', 'operator'), getDemandReferences);
router.get('/organizations', requireRoles('admin', 'operator'), listOrganizationsByCommodity);
router.get('/:id', requireRoles('admin', 'operator', 'organization'), getImportRequestById);
router.post('/:id/respond', requireRoles('organization'), respondToImportRequest);

module.exports = router;
