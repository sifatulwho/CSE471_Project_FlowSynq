const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const {
  getDocks,
  createDock,
  updateDock,
  deleteDock,
} = require('../controllers/dockController');

router.use(authenticate);

router.route('/')
  .get(requireRoles('admin', 'operator'), getDocks)
  .post(requireRoles('admin', 'operator'), createDock);

router.route('/:id')
  .put(requireRoles('admin', 'operator'), updateDock)
  .delete(requireRoles('admin', 'operator'), deleteDock);

module.exports = router;
