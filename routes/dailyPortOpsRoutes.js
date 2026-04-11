const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getDaySnapshot,
  upsertDailyOps,
  listDailyOps,
  getDailyById,
  deleteDailyById,
} = require('../controllers/dailyPortOpsController');

router.use(authenticate);

router.get('/day', getDaySnapshot);
router.get('/', listDailyOps);
router.post('/', upsertDailyOps);
router.get('/:id', getDailyById);
router.delete('/:id', deleteDailyById);

module.exports = router;

