const SupplyPlan = require('../models/SupplyPlan');
const SupplyPlanConfig = require('../models/SupplyPlanConfig');
const User = require('../models/User');
const { generateDailyPlan } = require('../services/supplyPlanService');
const { emitNotification } = require('../services/notificationService');

const OPERATOR_ROLES = ['operator', 'admin'];
const VIEW_ROLES = ['operator', 'admin', 'analyst', 'organization'];

const getRole = (req) => String(req.user?.role || '').toLowerCase();
const getPort = (req) => String(req.user?.portName || '').trim();

// GET /api/supply-plans
exports.listPlans = async (req, res) => {
  try {
    const role = getRole(req);
    if (!VIEW_ROLES.includes(role)) return res.status(403).json({ message: 'Access denied.' });

    const query = {};

    // Organization can only see approved/active/completed plans
    if (role === 'organization') {
      query.status = { $in: ['approved', 'active', 'completed'] };
    }

    // Non-admins are restricted to their port
    if (role !== 'admin') {
      query.portName = new RegExp(`^${getPort(req)}$`, 'i');
    } else if (req.query.portName) {
      query.portName = new RegExp(`^${req.query.portName}$`, 'i');
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.date) query.planDate = req.query.date;

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));

    const [items, total] = await Promise.all([
      SupplyPlan.find(query).sort({ planDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      SupplyPlan.countDocuments(query),
    ]);

    return res.json({ items, total, page, limit });
  } catch (err) {
    console.error('listPlans error:', err);
    return res.status(500).json({ message: 'Unable to load supply plans.' });
  }
};

// GET /api/supply-plans/today
exports.getTodayPlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!VIEW_ROLES.includes(role)) return res.status(403).json({ message: 'Access denied.' });

    const portName = getPort(req);
    const today = new Date().toISOString().slice(0, 10);

    const query = { planDate: today, portName: new RegExp(`^${portName}$`, 'i') };
    if (role === 'organization') {
      query.status = { $in: ['approved', 'active', 'completed'] };
    }

    const plan = await SupplyPlan.findOne(query);
    if (!plan) return res.status(404).json({ message: 'No plan found for today.' });

    return res.json(plan);
  } catch (err) {
    console.error('getTodayPlan error:', err);
    return res.status(500).json({ message: 'Unable to load today\'s plan.' });
  }
};

// GET /api/supply-plans/:id
exports.getPlanById = async (req, res) => {
  try {
    const role = getRole(req);
    if (!VIEW_ROLES.includes(role)) return res.status(403).json({ message: 'Access denied.' });

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });

    if (role === 'organization' && !['approved', 'active', 'completed'].includes(plan.status)) {
      return res.status(403).json({ message: 'Organization can only view approved plans.' });
    }

    return res.json(plan);
  } catch (err) {
    console.error('getPlanById error:', err);
    return res.status(500).json({ message: 'Unable to load supply plan.' });
  }
};

// POST /api/supply-plans/generate
exports.generatePlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operators and admins can generate plans.' });

    const portName = req.body.portName || getPort(req);
    if (!portName) return res.status(400).json({ message: 'portName is required.' });

    const planDate = req.body.date || new Date().toISOString().slice(0, 10);
    const strategy = req.body.strategy || 'balanced';

    const { plan, warnings, isNew } = await generateDailyPlan({
      planDate,
      portName,
      strategy,
      requestedBy: { userId: req.user.id, userName: req.user.fullName || req.user.username },
    });

    // Notify operators that a new plan is ready
    const io = req.app.get('io');
    const operators = await User.find({ role: { $in: ['operator', 'admin'] }, portName: new RegExp(`^${portName}$`, 'i') }).select('_id role portName');
    await Promise.all(operators.map((op) => emitNotification({
      io,
      recipientUserId: op._id,
      recipientRole: op.role,
      portName: op.portName || '',
      type: 'supply_plan_generated',
      title: isNew ? 'New Supply Plan Generated' : 'Supply Plan Updated',
      message: `Daily supply plan for ${planDate} at ${portName} is ready for review.`,
      relatedEntityType: 'supplyPlan',
      relatedEntityId: String(plan._id),
      navigationPath: op.role === 'operator' ? '/operator/supply-planning' : '/dashboard/supply-planning',
    })));

    return res.status(isNew ? 201 : 200).json({ plan, warnings });
  } catch (err) {
    console.error('generatePlan error:', err);
    return res.status(500).json({ message: err.message || 'Unable to generate supply plan.' });
  }
};

// PATCH /api/supply-plans/:id/modify
exports.modifyPlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operator/admin can modify plans.' });

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });

    if (['approved', 'active', 'completed'].includes(plan.status)) {
      return res.status(400).json({ message: `Cannot modify a plan in '${plan.status}' status.` });
    }

    const { field, oldValue, newValue, allocations, shipmentPriorities } = req.body;

    // Record modification history
    if (field) {
      plan.modificationHistory.push({
        modifiedBy: req.user.id,
        modifiedAt: new Date(),
        field,
        oldValue,
        newValue,
      });
    }

    if (allocations) {
      if (field === undefined) {
        plan.modificationHistory.push({
          modifiedBy: req.user.id,
          modifiedAt: new Date(),
          field: 'allocations',
          oldValue: plan.allocations,
          newValue: allocations,
        });
      }
      plan.allocations = allocations;
    }

    if (shipmentPriorities) {
      plan.shipmentPriorities = shipmentPriorities;
    }

    plan.status = 'draft';
    plan.markModified('modificationHistory');
    plan.markModified('allocations');
    await plan.save();

    return res.json(plan);
  } catch (err) {
    console.error('modifyPlan error:', err);
    return res.status(500).json({ message: 'Unable to modify supply plan.' });
  }
};

// POST /api/supply-plans/:id/approve
exports.approvePlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operator/admin can approve plans.' });

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });
    if (plan.status === 'approved') return res.status(400).json({ message: 'Plan is already approved.' });
    if (['active', 'completed'].includes(plan.status)) {
      return res.status(400).json({ message: `Cannot approve plan in '${plan.status}' status.` });
    }

    plan.status = 'approved';
    plan.approvalInfo = {
      approvedBy: req.user.id,
      approvedAt: new Date(),
      notes: String(req.body.notes || ''),
    };
    await plan.save();

    // Notify all users in port
    const io = req.app.get('io');
    const portName = plan.portName;
    const allPortUsers = await User.find({ portName: new RegExp(`^${portName}$`, 'i') }).select('_id role portName');
    await Promise.all(allPortUsers.map((u) => emitNotification({
      io,
      recipientUserId: u._id,
      recipientRole: u.role,
      portName: u.portName || '',
      type: 'supply_plan_approved',
      title: 'Supply Plan Approved',
      message: `The supply plan for ${plan.planDate} has been approved and is now active.`,
      relatedEntityType: 'supplyPlan',
      relatedEntityId: String(plan._id),
      navigationPath: u.role === 'operator' ? '/operator/supply-planning' : '/dashboard/supply-planning',
    })));

    return res.json({ message: 'Plan approved.', plan });
  } catch (err) {
    console.error('approvePlan error:', err);
    return res.status(500).json({ message: 'Unable to approve supply plan.' });
  }
};

// POST /api/supply-plans/:id/reject
exports.rejectPlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operator/admin can reject plans.' });

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });
    if (['approved', 'active', 'completed', 'rejected'].includes(plan.status)) {
      return res.status(400).json({ message: `Cannot reject plan in '${plan.status}' status.` });
    }

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required.' });

    plan.status = 'rejected';
    plan.rejectionReason = reason;
    await plan.save();

    return res.json({ message: 'Plan rejected.', plan });
  } catch (err) {
    console.error('rejectPlan error:', err);
    return res.status(500).json({ message: 'Unable to reject supply plan.' });
  }
};

// POST /api/supply-plans/:id/execute
exports.executePlan = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operator/admin can execute plans.' });

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });
    if (plan.status !== 'approved') return res.status(400).json({ message: 'Only approved plans can be executed.' });

    plan.status = 'active';
    plan.executionStatus = { startedAt: new Date() };
    await plan.save();

    return res.json({ message: 'Plan execution started.', plan });
  } catch (err) {
    console.error('executePlan error:', err);
    return res.status(500).json({ message: 'Unable to execute supply plan.' });
  }
};

// PATCH /api/supply-plans/:id/allocations/:index/status
exports.updateAllocationStatus = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Only operator can update execution status.' });

    const { status } = req.body;
    if (!['pending', 'fulfilled', 'partial'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const plan = await SupplyPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Supply plan not found.' });
    if (plan.status !== 'active') return res.status(400).json({ message: 'Can only update allocations on an active plan.' });

    const index = parseInt(req.params.index);
    if (isNaN(index) || !plan.allocations[index]) {
      return res.status(404).json({ message: 'Allocation not found.' });
    }

    const oldStatus = plan.allocations[index].status;
    plan.allocations[index].status = status;

    // Log modification
    plan.modificationHistory.push({
      modifiedBy: req.user.id,
      modifiedAt: new Date(),
      field: `allocation[${index}].status`,
      oldValue: oldStatus,
      newValue: status,
    });

    // If all fulfilled, maybe mark plan as completed? 
    const allDone = plan.allocations.every(a => a.status === 'fulfilled');
    if (allDone) {
      plan.status = 'completed';
      plan.executionStatus.completedAt = new Date();
    }

    await plan.save();
    return res.json(plan);
  } catch (err) {
    console.error('updateAllocationStatus error:', err);
    return res.status(500).json({ message: 'Unable to update allocation status.' });
  }
};

// GET /api/supply-plans/config
exports.getConfig = async (req, res) => {
  try {
    const role = getRole(req);
    if (!VIEW_ROLES.includes(role)) return res.status(403).json({ message: 'Access denied.' });

    const portName = getPort(req) || String(req.query.portName || '').trim();
    let cfg = portName
      ? await SupplyPlanConfig.findOne({ portName: new RegExp(`^${portName}$`, 'i') }).lean()
      : await SupplyPlanConfig.findOne().lean();

    if (!cfg) {
      // Return sensible defaults if no config exists yet
      cfg = {
        portName: portName || 'Default',
        autoGenerationTime: '06:00',
        lookAheadDays: 3,
        safetyStockPercentage: 15,
        allocationStrategy: 'balanced',
        approvalRequired: true,
        constraints: {
          minimumAllocationQuantity: 100,
          maximumDailyTransfers: 10,
          maximumDockLoad: 90,
          safetyStockLimit: 10,
        },
      };
    }
    return res.json(cfg);
  } catch (err) {
    console.error('getConfig error:', err);
    return res.status(500).json({ message: 'Unable to load configuration.' });
  }
};

// PUT /api/supply-plans/config
exports.upsertConfig = async (req, res) => {
  try {
    const role = getRole(req);
    if (!OPERATOR_ROLES.includes(role)) return res.status(403).json({ message: 'Access denied.' });

    const portName = getPort(req) || String(req.body.portName || '').trim();
    if (!portName) return res.status(400).json({ message: 'portName is required to save config.' });

    const update = {
      portName,
      autoGenerationTime: req.body.autoGenerationTime || '06:00',
      lookAheadDays: Number(req.body.lookAheadDays || 3),
      safetyStockPercentage: Number(req.body.safetyStockPercentage || 15),
      allocationStrategy: req.body.allocationStrategy || 'balanced',
      approvalRequired: req.body.approvalRequired !== false,
      constraints: {
        minimumAllocationQuantity: Number(req.body.constraints?.minimumAllocationQuantity || 100),
        maximumDailyTransfers: Number(req.body.constraints?.maximumDailyTransfers || 10),
        maximumDockLoad: Number(req.body.constraints?.maximumDockLoad || 90),
        safetyStockLimit: Number(req.body.constraints?.safetyStockLimit || 10),
      },
    };

    const cfg = await SupplyPlanConfig.findOneAndUpdate(
      { portName: new RegExp(`^${portName}$`, 'i') },
      { $set: update },
      { new: true, upsert: true }
    );
    return res.json(cfg);
  } catch (err) {
    console.error('upsertConfig error:', err);
    return res.status(500).json({ message: 'Unable to save configuration.' });
  }
};
