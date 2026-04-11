const DailyPortOps = require('../models/DailyPortOps');
const Shipment = require('../models/Shipment');
const { syncDailyOpsToDemand } = require('../utils/syncDailyOpsToDemand');

function dayRangeUtc(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function normalizePortName(req) {
  const role = String(req.user?.role || '').toLowerCase();
  const userPort = String(req.user?.portName || '').trim();
  if (role === 'operator' || role === 'analyst') return userPort;
  return String(req.query.portName || req.body?.portName || userPort || '').trim();
}

function recomputeCommodityDerived(row) {
  const containerCount = Math.max(0, Number(row.containerCount || 0) || 0);
  const containerDelivered = Math.max(0, Number(row.containerDelivered || 0) || 0);
  const remaining = Math.max(0, containerCount - containerDelivered);
  return { ...row, containerCount, containerDelivered, remainingCommodityContainer: remaining };
}

function sumDelivered(commodities) {
  return (commodities || []).reduce((acc, r) => acc + (Number(r.containerDelivered || 0) || 0), 0);
}

exports.getDaySnapshot = async (req, res) => {
  try {
    const portName = normalizePortName(req);
    if (!portName) {
      const role = String(req.user?.role || '').toLowerCase();
      const message = role === 'analyst'
        ? 'Your account is not associated with a port. Please contact an administrator to update your profile.'
        : 'portName is required.';
      return res.status(400).json({ message });
    }

    const dateStr = String(req.query.date || '');
    const range = dayRangeUtc(dateStr);
    if (!range) return res.status(400).json({ message: 'Valid date is required (YYYY-MM-DD).' });

    const [ops, prevOps, dockedShipments] = await Promise.all([
      DailyPortOps.findOne({ portName, date: { $gte: range.start, $lte: range.end } }).lean(),
      DailyPortOps.findOne({ portName, date: { $lt: range.start } }).sort({ date: -1 }).lean(),
      Shipment.find({
        portName,
        status: 'Docked',
      })
        .sort({ arrivalTime: 1 })
        .select('shipName containerCount cargoQuantity arrivalTime commodityType')
        .lean(),
    ]);

    const previousRemainingContainer = Number(prevOps?.remainingContainer || 0) || 0;

    const shipments = (dockedShipments || []).map((s) => ({
      shipName: s.shipName,
      containerCount: Number(s.containerCount || 0) || 0,
      cargoQuantity: Number(s.cargoQuantity || 0) || 0,
      commodityType: s.commodityType || '',
    }));

    const totalContainer = shipments.reduce((acc, s) => acc + (Number(s.containerCount || 0) || 0), 0);
    const totalQuantity = shipments.reduce((acc, s) => acc + (Number(s.cargoQuantity || 0) || 0), 0);

    const berthCapacity = Number(ops?.berthCapacity || req.query.berthCapacity || 0) || 0;
    const totalDelivered = Number(ops?.totalDelivered || 0) || 0;
    const berthVacancy = berthCapacity - (totalContainer + previousRemainingContainer - totalDelivered);

    return res.json({
      portName,
      date: range.start.toISOString().slice(0, 10),
      dockedShipments: shipments,
      totalsFromShipments: { totalContainer, totalQuantity },
      saved: ops || null,
      previousRemainingContainer,
      computed: {
        berthCapacity,
        totalDelivered,
        berthVacancy,
      },
    });
  } catch (error) {
    console.error('DailyPortOps day snapshot error:', error);
    return res.status(500).json({ message: 'Unable to load daily snapshot.' });
  }
};

exports.upsertDailyOps = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'analyst'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and analysts can submit daily ops data.' });
    }
    const portName = normalizePortName(req);
    if (!portName) {
      const message = role === 'analyst'
        ? 'Your account is not associated with a port. Please contact an administrator to update your profile.'
        : 'portName is required.';
      return res.status(400).json({ message });
    }

    const range = dayRangeUtc(req.body?.date);
    if (!range) return res.status(400).json({ message: 'Valid date is required.' });

    const berthLocation = typeof req.body.berthLocation === 'string' ? req.body.berthLocation.trim() : '';
    const berthCapacity = Math.max(0, Number(req.body.berthCapacity || 0) || 0);

    const shipments = Array.isArray(req.body.shipments) ? req.body.shipments : [];
    const normalizedShipments = shipments
      .filter((s) => s && s.shipName)
      .map((s) => ({
        shipName: String(s.shipName).trim(),
        containerCount: Math.max(0, Number(s.containerCount || 0) || 0),
        cargoQuantity: Math.max(0, Number(s.cargoQuantity || 0) || 0),
      }));

    const commodities = Array.isArray(req.body.commodities) ? req.body.commodities : [];
    const normalizedCommodities = commodities
      .filter((r) => r && r.commodityType)
      .map((r) => recomputeCommodityDerived({
        commodityType: String(r.commodityType).trim(),
        containerCount: r.containerCount,
        commodityQuantity: r.commodityQuantity,
        containerDelivered: r.containerDelivered,
      }));

    const totalContainer = Math.max(0, Number(req.body.totalContainer || normalizedShipments.reduce((a, s) => a + s.containerCount, 0)) || 0);
    const totalQuantity = Math.max(0, Number(req.body.totalQuantity || normalizedShipments.reduce((a, s) => a + s.cargoQuantity, 0)) || 0);
    const totalHandled = Math.max(0, Number(req.body.totalHandled || 0) || 0);
    const remainingContainer = Math.max(0, Number(req.body.remainingContainer || (totalContainer - totalHandled)) || 0);
    const totalDelivered = Math.max(0, Number(req.body.totalDelivered || sumDelivered(normalizedCommodities)) || 0);

    const prevOps = await DailyPortOps.findOne({ portName, date: { $lt: range.start } }).sort({ date: -1 }).lean();
    const previousRemainingContainer = Number(prevOps?.remainingContainer || 0) || 0;
    const berthVacancy = berthCapacity - (totalContainer + previousRemainingContainer - totalDelivered);

    const status = role === 'admin' ? 'approved' : 'pending';
    const doc = await DailyPortOps.findOneAndUpdate(
      { portName, date: { $gte: range.start, $lte: range.end } },
      {
        $set: {
          portName,
          date: range.start,
          shipments: normalizedShipments,
          totalContainer,
          totalQuantity,
          totalHandled,
          remainingContainer,
          berthLocation,
          berthCapacity,
          berthVacancy,
          totalDelivered,
          commodities: normalizedCommodities,
          submittedBy: req.user.id,
          status,
          reviewedBy: role === 'admin' ? req.user.id : undefined,
          reviewedAt: role === 'admin' ? new Date() : undefined,
          rejectionReason: '',
        },
      },
      { new: true, upsert: true }
    );

    // Sync into Demand rows so existing approvals + views keep working.
    await syncDailyOpsToDemand(doc);

    return res.status(201).json({ message: 'Daily entry saved.', daily: doc });
  } catch (error) {
    console.error('DailyPortOps upsert error:', error);
    return res.status(500).json({ message: 'Unable to save daily entry.' });
  }
};

exports.listDailyOps = async (req, res) => {
  try {
    const portName = normalizePortName(req);
    if (!portName) return res.status(400).json({ message: 'portName is required.' });

    const query = { portName };
    if (req.query.dateFrom || req.query.dateTo) {
      const range = {};
      if (req.query.dateFrom) {
        const d = new Date(req.query.dateFrom);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (req.query.dateTo) {
        const d = new Date(req.query.dateTo);
        if (!Number.isNaN(d.getTime())) range.$lte = d;
      }
      if (Object.keys(range).length) query.date = range;
    }

    const limit = Math.min(365, Math.max(1, Number(req.query.limit || 60) || 60));
    const items = await DailyPortOps.find(query).sort({ date: -1 }).limit(limit).lean();
    return res.json({ items });
  } catch (error) {
    console.error('List DailyPortOps error:', error);
    return res.status(500).json({ message: 'Unable to load daily entries.' });
  }
};

exports.getDailyById = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();

    const doc = await DailyPortOps.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Daily entry not found.' });
    if (role !== 'admin' && doc.portName !== userPort) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    return res.json(doc);
  } catch (error) {
    console.error('Get DailyPortOps error:', error);
    return res.status(500).json({ message: 'Unable to load daily entry.' });
  }
};

exports.deleteDailyById = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();

    const doc = await DailyPortOps.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Daily entry not found.' });
    if (role !== 'admin' && doc.portName !== userPort) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    await DailyPortOps.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Daily entry deleted.' });
  } catch (error) {
    console.error('Delete DailyPortOps error:', error);
    return res.status(500).json({ message: 'Unable to delete daily entry.' });
  }
};

