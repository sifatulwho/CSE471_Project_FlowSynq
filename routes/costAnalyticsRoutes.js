const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getCostSummary } = require('../controllers/costAnalyticsController');

router.use(authenticate);

router.get('/summary', getCostSummary);

module.exports = router;
