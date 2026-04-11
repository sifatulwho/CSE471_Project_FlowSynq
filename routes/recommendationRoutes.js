const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  createRecommendation,
  listRecommendations,
  acknowledgeRecommendation,
  forwardToOrganization,
} = require('../controllers/recommendationController');

router.use(authenticate);

router.get('/', requireRoles('admin', 'analyst', 'operator', 'organization'), listRecommendations);
router.post('/', requireRoles('admin', 'analyst'), createRecommendation);
router.put('/:id/ack', requireRoles('admin', 'operator'), acknowledgeRecommendation);
router.put('/:id/forward', requireRoles('admin', 'operator'), forwardToOrganization);

module.exports = router;

