const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const { getDemandForecast } = require('../controllers/forecastController');

router.use(authenticate);

// Decision-support forecast dashboard (admin/analyst)
router.get('/', requireRoles('admin', 'analyst'), getDemandForecast);

module.exports = router;

