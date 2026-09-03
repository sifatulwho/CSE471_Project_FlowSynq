const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
  syncSubscription,
} = require('../controllers/billingController');

router.use(authenticate, requireRoles('organization'));
router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);
router.post('/sync', syncSubscription);

module.exports = router;
