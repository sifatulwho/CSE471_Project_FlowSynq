const express = require('express');
const { calculateMarineRoute } = require('../controllers/marineRouteController');

const router = express.Router();

// POST /api/marine-route/calculate
router.post('/calculate', calculateMarineRoute);

module.exports = router;
