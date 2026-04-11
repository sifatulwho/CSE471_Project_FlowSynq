const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const { getCostPerformanceAnalytics } = require('../controllers/analyticsController');

router.use(authenticate);

router.get(
  '/cost-performance',
  requireRoles('admin', 'operator', 'analyst', 'organization'),
  getCostPerformanceAnalytics,
);

module.exports = router;
