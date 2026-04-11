const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getSanctionedEntries,
  createSanctionedEntry,
  updateSanctionedEntry,
  deleteSanctionedEntry,
} = require('../controllers/sanctionedListController');

router.use(authenticate);

router.get('/', requireRoles('admin', 'operator', 'analyst', 'organization'), getSanctionedEntries);
router.post('/', requireRoles('admin'), upload.single('supportingDocument'), createSanctionedEntry);
router.put('/:id', requireRoles('admin'), upload.single('supportingDocument'), updateSanctionedEntry);
router.delete('/:id', requireRoles('admin'), deleteSanctionedEntry);

module.exports = router;
