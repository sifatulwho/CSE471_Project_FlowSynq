const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  listPlans,
  getTodayPlan,
  getPlanById,
  generatePlan,
  modifyPlan,
  approvePlan,
  rejectPlan,
  executePlan,
  updateAllocationStatus,
  getConfig,
  upsertConfig,
} = require('../controllers/supplyPlanController');

router.use(authenticate);

const operatorOnly = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'operator' && role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Operator or Admin role required.' });
  }
  next();
};

// Today's plan
router.route('/today')
  .get(getTodayPlan);

// Generate plan
router.route('/generate')
  .post(operatorOnly, generatePlan);

// Config
router.route('/config')
  .get(getConfig)
  .put(operatorOnly, upsertConfig);

// List plans
router.route('/')
  .get(listPlans);

// Single plan CRUD
router.route('/:id')
  .get(getPlanById);

router.route('/:id/modify')
  .patch(operatorOnly, modifyPlan);

router.route('/:id/approve')
  .post(operatorOnly, approvePlan);

router.route('/:id/reject')
  .post(operatorOnly, rejectPlan);

router.route('/:id/execute')
  .post(operatorOnly, executePlan);

router.route('/:id/allocations/:index/status')
  .patch(operatorOnly, updateAllocationStatus);

module.exports = router;
