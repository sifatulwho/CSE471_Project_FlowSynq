const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const { getTanks, getInventoryLevels, createTank, updateTank, deleteTank } = require('../controllers/tankController');

// All tank routes require authentication
router.use(authenticate);

router.get('/inventory', requireRoles('admin', 'analyst', 'operator'), getInventoryLevels);
router.route('/')
  .get(getTanks)
  .post(requireRoles('admin'), createTank);

router.route('/:id')
  .put(requireRoles('admin'), updateTank)
  .delete(requireRoles('admin'), deleteTank);

module.exports = router;
