const mongoose = require('mongoose');
const Demand = require('../models/Demand');
const DailyPortOps = require('../models/DailyPortOps');
const User = require('../models/User');
const { sendDemandApprovalEmail } = require('../utils/emailService');
const { generateYearlyPortDemo } = require('../utils/generateYearlyPortDemo');

async function mirrorDailyOpsStatusForBatch(batchId, { status, reviewedBy, rejectionReason }) {
  const ids = await Demand.distinct('sourceDailyOpsId', {
    batchId,
    sourceDailyOpsId: { $exists: true, $ne: null },
  });
  const clean = ids.filter(Boolean);
  if (!clean.length) return 0;
  const res = await DailyPortOps.updateMany(
    { _id: { $in: clean } },
    {
      $set: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || '',
      },
    }
  );
  return res.modifiedCount || 0;
}

async function mirrorDailyOpsStatusForDemandDoc(doc, { status, reviewedBy, rejectionReason }) {
  if (!doc?.sourceDailyOpsId) return;
  await DailyPortOps.findByIdAndUpdate(doc.sourceDailyOpsId, {
    $set: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason || '',
    },
  });
}

const NUM_FIELDS = [
  'demand_quantity', 'vessel_count', 'working_vessels', 'waiting_vessels',
  'containers_handled', 'empty_containers',
];

function parseOptionalNum(val) {
  if (val === '' || val === undefined || val === null) return undefined;
  const n = Number(val);
  if (Number.isNaN(n) || n < 0) return NaN;
  return n;
}

function isoDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function makeBatchId({ date, region, userId }) {
  const day = isoDay(date) || 'unknown-date';
  const reg = String(region || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18) || 'region';
  const uid = String(userId || '').slice(-6) || 'user';
  const rand = Math.random().toString(36).slice(2, 6);
  return `DDM-${day}-${reg}-${uid}-${rand}`.toUpperCase();
}

function buildPayload(body, { forCreate, role, userId }) {
  const dateRaw = body.date;
  const region = typeof body.region === 'string' ? body.region.trim() : '';
  const portName = typeof body.portName === 'string' ? body.portName.trim() : '';
  if (!dateRaw || !region) {
    return { error: 'Date and region are required.' };
  }
  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Invalid date.' };
  }

  const location = typeof body.location === 'string'
    ? body.location.trim()
    : (typeof body.location_code === 'string' ? body.location_code.trim() : '');

  const payload = {
    date,
    region,
    portName,
    commodity_type: typeof body.commodity_type === 'string' ? body.commodity_type.trim() : '',
    location,
    // keep legacy field in sync for older views/exports
    location_code: location,
    batchNote: typeof body.batchNote === 'string' ? body.batchNote.trim() : '',
  };

  for (const key of NUM_FIELDS) {
    const v = parseOptionalNum(body[key]);
    if (Number.isNaN(v)) {
      return { error: `Invalid or negative value for ${key.replace(/_/g, ' ')}.` };
    }
    if (v !== undefined) payload[key] = v;
  }

  if (forCreate) {
    payload.submittedBy = userId;
    payload.batchId = typeof body.batchId === 'string' && body.batchId.trim()
      ? body.batchId.trim()
      : makeBatchId({ date, region, userId });
    if (role === 'admin') {
      payload.status = 'approved';
      payload.reviewedBy = userId;
      payload.reviewedAt = new Date();
      payload.rejectionReason = '';
    } else {
      payload.status = 'pending';
    }
  }

  return { payload };
}

function canEditEntry(doc, role, userId) {
  if (role === 'admin') return true;
  if (!doc.submittedBy || doc.submittedBy.toString() !== userId.toString()) return false;
  return doc.status === 'pending' || doc.status === 'rejected';
}

exports.getDemands = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const portName = String(req.user.portName || '').trim();

    if (role === 'analyst' && !portName) {
      return res.status(400).json({ message: 'Your account is not associated with a port. Please contact an administrator to update your profile.' });
    }

    const {
      page = '1',
      limit = '20',
      dateFrom,
      dateTo,
      commodity_type,
      region,
      search,
      preset,
      status: statusFilter,
      view,
      scope,
      batchId,
    } = req.query;

    const and = [];

    if (role === 'operator' || role === 'analyst') {
      and.push({ portName });
    }

    if (view === 'pending' && role === 'admin') {
      and.push({ status: 'pending' });
    } else if (view === 'mine' && (role === 'analyst' || role === 'admin')) {
      and.push({ submittedBy: new mongoose.Types.ObjectId(userId) });
    } else if (role === 'admin' && scope === 'all' && statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      and.push({ status: statusFilter });
    } else if (role === 'admin' && scope === 'all' && !statusFilter) {
      // no status constraint (admin full list)
    } else if (role === 'admin' && statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      and.push({ status: statusFilter });
    } else {
      and.push({ status: 'approved' });
    }

    const now = new Date();
    if (preset === '7d') {
      const fromD = new Date(now);
      fromD.setDate(fromD.getDate() - 7);
      and.push({ date: { $gte: fromD, $lte: now } });
    } else if (preset === '30d') {
      const fromD = new Date(now);
      fromD.setDate(fromD.getDate() - 30);
      and.push({ date: { $gte: fromD, $lte: now } });
    } else {
      const range = {};
      if (dateFrom) {
        const fromD = new Date(dateFrom);
        if (!Number.isNaN(fromD.getTime())) range.$gte = fromD;
      }
      if (dateTo) {
        const toD = new Date(dateTo);
        toD.setHours(23, 59, 59, 999);
        if (!Number.isNaN(toD.getTime())) range.$lte = toD;
      }
      if (Object.keys(range).length) and.push({ date: range });
    }

    if (commodity_type && String(commodity_type).trim()) {
      and.push({ commodity_type: new RegExp(String(commodity_type).trim(), 'i') });
    }
    if (region && String(region).trim() && !(search && String(search).trim())) {
      and.push({ region: new RegExp(String(region).trim(), 'i') });
    }
    if (batchId && String(batchId).trim()) {
      and.push({ batchId: String(batchId).trim() });
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({
        $or: [
          { region: rx },
          { commodity_type: rx },
          { location: rx },
          { location_code: rx },
        ],
      });
    }

    if (!and.length) {
      and.push({ status: 'approved' });
    }
    const query = and.length === 1 ? and[0] : { $and: and };

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      Demand.find(query)
        .populate('submittedBy', 'fullName email')
        .populate('reviewedBy', 'fullName email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      Demand.countDocuments(query),
    ]);

    return res.json({
      items,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l) || 1,
    });
  } catch (error) {
    console.error('Get demands error:', error);
    return res.status(500).json({ message: 'Unable to load demand records.' });
  }
};

exports.getDemandById = async (req, res) => {
  try {
    const doc = await Demand.findById(req.params.id)
      .populate('submittedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');
    if (!doc) {
      return res.status(404).json({ message: 'Demand entry not found.' });
    }
    const role = req.user.role;
    const userId = req.user.id;
    const portName = String(req.user.portName || '').trim();
    if ((role === 'operator' || role === 'analyst') && doc.portName !== portName) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (role !== 'admin' && doc.status === 'approved' && doc.submittedBy?._id?.toString() !== userId) {
      // anyone logged in can view approved via list; single id still ok for approved public data
    }
    if (doc.status !== 'approved' && role !== 'admin' && doc.submittedBy?._id?.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    return res.json(doc);
  } catch (error) {
    console.error('Get demand error:', error);
    return res.status(500).json({ message: 'Unable to load demand record.' });
  }
};

exports.createDemand = async (req, res) => {
  try {
    const role = req.user.role;
    if (!['admin', 'analyst'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and analysts can submit demand data.' });
    }
    if (role !== 'admin') {
      req.body.region = req.user.portName;
      req.body.portName = req.user.portName;
    } else if (!req.body.portName && typeof req.body.region === 'string') {
      req.body.portName = req.body.region;
    }
    const built = buildPayload(req.body, { forCreate: true, role, userId: req.user.id });
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }
    const demand = await Demand.create(built.payload);
    const populated = await Demand.findById(demand._id)
      .populate('submittedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');
    const msg = role === 'admin'
      ? 'Demand record saved.'
      : 'Data submitted successfully for approval.';
    return res.status(201).json({ message: msg, demand: populated });
  } catch (error) {
    console.error('Create demand error:', error);
    return res.status(500).json({ message: error.message || 'Unable to save demand record.' });
  }
};

exports.createDemandBatch = async (req, res) => {
  try {
    const role = req.user.role;
    if (!['admin', 'analyst'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and analysts can submit demand data.' });
    }

    const { date, region, note, rows } = req.body || {};
    const portName = role === 'admin'
      ? (typeof req.body?.portName === 'string' ? req.body.portName.trim() : (String(region || '').trim()))
      : String(req.user.portName || '').trim();

    const effectiveRegion = role === 'admin' ? String(region || '').trim() : portName;
    if (!date || !effectiveRegion) {
      return res.status(400).json({ message: 'Date and region are required.' });
    }
    if (!Array.isArray(rows) || rows.length < 1) {
      return res.status(400).json({ message: 'At least one row is required.' });
    }

    const batchId = makeBatchId({ date, region: effectiveRegion, userId: req.user.id });
    const batchNote = typeof note === 'string' ? note.trim() : '';

    const docs = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const built = buildPayload(
        {
          ...r,
          date,
          region: effectiveRegion,
          portName,
          batchId,
          batchNote,
        },
        { forCreate: true, role, userId: req.user.id }
      );
      if (built.error) {
        return res.status(400).json({ message: `Row ${i + 1}: ${built.error}` });
      }
      if (!built.payload.commodity_type) {
        return res.status(400).json({ message: `Row ${i + 1}: Commodity type is required.` });
      }
      if (!built.payload.location) {
        return res.status(400).json({ message: `Row ${i + 1}: Location is required.` });
      }
      if (built.payload.demand_quantity === undefined) {
        return res.status(400).json({ message: `Row ${i + 1}: Demand quantity is required.` });
      }
      docs.push(built.payload);
    }

    // Prevent accidental duplicates within the same batch.
    const seen = new Set();
    for (let i = 0; i < docs.length; i++) {
      const key = `${docs[i].commodity_type.toLowerCase()}||${docs[i].location.toLowerCase()}`;
      if (seen.has(key)) {
        return res.status(400).json({ message: `Duplicate commodity + location in row ${i + 1}.` });
      }
      seen.add(key);
    }

    const inserted = await Demand.insertMany(docs, { ordered: true });
    return res.status(201).json({
      message: role === 'admin' ? 'Batch saved.' : 'Batch submitted successfully for approval.',
      batchId,
      rowsInserted: inserted.length,
    });
  } catch (error) {
    console.error('Create demand batch error:', error);
    return res.status(500).json({ message: error.message || 'Unable to save demand batch.' });
  }
};

exports.getDemandBatches = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admins only.' });
    }
    const status = (req.query.status || 'pending').toString();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter.' });
    }

    const pipeline = [
      { $match: { status, batchId: { $ne: '' } } },
      { $sort: { date: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$batchId',
          batchId: { $first: '$batchId' },
          date: { $first: '$date' },
          region: { $first: '$region' },
          batchNote: { $first: '$batchNote' },
          submittedBy: { $first: '$submittedBy' },
          rows: { $sum: 1 },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { date: -1, createdAt: -1 } },
      { $limit: 500 },
    ];

    const batches = await Demand.aggregate(pipeline);
    await User.populate(batches, { path: 'submittedBy', select: 'fullName email' });
    return res.json({ items: batches });
  } catch (error) {
    console.error('Get demand batches error:', error);
    return res.status(500).json({ message: 'Unable to load demand batches.' });
  }
};

exports.approveDemandBatch = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admins only.' });
    }
    const { batchId } = req.params;
    if (!batchId) return res.status(400).json({ message: 'Batch id is required.' });

    const first = await Demand.findOne({ batchId });
    if (!first) return res.status(404).json({ message: 'Batch not found.' });

    const result = await Demand.updateMany(
      { batchId, status: 'pending' },
      {
        $set: {
          status: 'approved',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          rejectionReason: '',
        },
      }
    );

    await mirrorDailyOpsStatusForBatch(batchId, {
      status: 'approved',
      reviewedBy: req.user.id,
      rejectionReason: '',
    });

    const submitter = first.submittedBy ? await User.findById(first.submittedBy).select('email fullName') : null;
    if (submitter?.email) {
      await sendDemandApprovalEmail({
        to: submitter.email,
        analystName: submitter.fullName,
        region: first.region,
        date: first.date,
      });
    }

    return res.json({ message: 'Batch approved.', modified: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Approve demand batch error:', error);
    return res.status(500).json({ message: 'Unable to approve demand batch.' });
  }
};

exports.rejectDemandBatch = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admins only.' });
    }
    const { batchId } = req.params;
    const { reason } = req.body || {};
    if (!batchId) return res.status(400).json({ message: 'Batch id is required.' });

    const first = await Demand.findOne({ batchId });
    if (!first) return res.status(404).json({ message: 'Batch not found.' });

    const reasonTrim = typeof reason === 'string' ? reason.trim() : '';

    const result = await Demand.updateMany(
      { batchId, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          rejectionReason: reasonTrim,
        },
      }
    );

    await mirrorDailyOpsStatusForBatch(batchId, {
      status: 'rejected',
      reviewedBy: req.user.id,
      rejectionReason: reasonTrim,
    });

    return res.json({ message: 'Batch rejected.', modified: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Reject demand batch error:', error);
    return res.status(500).json({ message: 'Unable to reject demand batch.' });
  }
};

exports.updateDemand = async (req, res) => {
  try {
    const doc = await Demand.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Demand entry not found.' });
    }
    const role = req.user.role;
    const userId = req.user.id;
    const portName = String(req.user.portName || '').trim();
    if (role !== 'admin' && doc.portName !== portName) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (!canEditEntry(doc, role, userId)) {
      return res.status(403).json({ message: 'You cannot edit this entry.' });
    }
    if (role !== 'admin') {
      req.body.region = req.user.portName;
      req.body.portName = req.user.portName;
    } else if (!req.body.portName && typeof req.body.region === 'string') {
      req.body.portName = req.body.region;
    }
    const built = buildPayload(req.body, { forCreate: false, role, userId });
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }
    Object.assign(doc, built.payload);
    if (role === 'analyst' && (doc.status === 'rejected' || doc.status === 'pending')) {
      doc.status = 'pending';
      doc.rejectionReason = '';
      doc.reviewedBy = undefined;
      doc.reviewedAt = undefined;
    }
    await doc.save();
    const populated = await Demand.findById(doc._id)
      .populate('submittedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');
    return res.json({ message: 'Demand record updated.', demand: populated });
  } catch (error) {
    console.error('Update demand error:', error);
    return res.status(500).json({ message: error.message || 'Unable to update demand record.' });
  }
};

exports.deleteDemand = async (req, res) => {
  try {
    const doc = await Demand.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Demand entry not found.' });
    }
    const role = req.user.role;
    const userId = req.user.id;
    const portName = String(req.user.portName || '').trim();
    if (role !== 'admin' && doc.portName !== portName) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (!canEditEntry(doc, role, userId)) {
      return res.status(403).json({ message: 'You cannot delete this entry.' });
    }
    await Demand.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Demand record deleted.' });
  } catch (error) {
    console.error('Delete demand error:', error);
    return res.status(500).json({ message: 'Unable to delete demand record.' });
  }
};

exports.approveDemand = async (req, res) => {
  try {
    const doc = await Demand.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Demand entry not found.' });
    }
    if (doc.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending entries can be approved.' });
    }

    if (doc.batchId && doc.sourceDailyOpsId) {
      await Demand.updateMany(
        { batchId: doc.batchId, portName: doc.portName, status: 'pending' },
        {
          $set: {
            status: 'approved',
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            rejectionReason: '',
          },
        }
      );
      await mirrorDailyOpsStatusForBatch(doc.batchId, {
        status: 'approved',
        reviewedBy: req.user.id,
        rejectionReason: '',
      });
    } else {
      doc.status = 'approved';
      doc.reviewedBy = req.user.id;
      doc.reviewedAt = new Date();
      doc.rejectionReason = '';
      await doc.save();
      await mirrorDailyOpsStatusForDemandDoc(doc, {
        status: 'approved',
        reviewedBy: req.user.id,
        rejectionReason: '',
      });
    }

    const submitter = await User.findById(doc.submittedBy).select('email fullName');
    if (submitter?.email) {
      await sendDemandApprovalEmail({
        to: submitter.email,
        analystName: submitter.fullName,
        region: doc.region,
        date: doc.date,
      });
    }

    const populated = await Demand.findById(doc._id)
      .populate('submittedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');
    return res.json({ message: 'Entry approved.', demand: populated });
  } catch (error) {
    console.error('Approve demand error:', error);
    return res.status(500).json({ message: 'Unable to approve demand record.' });
  }
};

exports.rejectDemand = async (req, res) => {
  try {
    const { reason } = req.body;
    const doc = await Demand.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Demand entry not found.' });
    }
    if (doc.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending entries can be rejected.' });
    }
    const reasonTrim = typeof reason === 'string' ? reason.trim() : '';

    if (doc.batchId && doc.sourceDailyOpsId) {
      await Demand.updateMany(
        { batchId: doc.batchId, portName: doc.portName, status: 'pending' },
        {
          $set: {
            status: 'rejected',
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            rejectionReason: reasonTrim,
          },
        }
      );
      await mirrorDailyOpsStatusForBatch(doc.batchId, {
        status: 'rejected',
        reviewedBy: req.user.id,
        rejectionReason: reasonTrim,
      });
    } else {
      doc.status = 'rejected';
      doc.reviewedBy = req.user.id;
      doc.reviewedAt = new Date();
      doc.rejectionReason = reasonTrim;
      await doc.save();
      await mirrorDailyOpsStatusForDemandDoc(doc, {
        status: 'rejected',
        reviewedBy: req.user.id,
        rejectionReason: reasonTrim,
      });
    }

    const populated = await Demand.findById(doc._id)
      .populate('submittedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');
    return res.json({ message: 'Entry rejected.', demand: populated });
  } catch (error) {
    console.error('Reject demand error:', error);
    return res.status(500).json({ message: 'Unable to reject demand record.' });
  }
};

exports.generateDemoDemandData = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'analyst'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and analysts can generate demo data.' });
    }

    const DAYS_DEFAULT = 365;
    const daysRaw = req.body?.days ?? req.query.days;
    const days = Math.min(3650, Math.max(1, Number(daysRaw || DAYS_DEFAULT) || DAYS_DEFAULT));

    const userPort = String(req.user.portName || '').trim();
    const portName = role === 'admin'
      ? (typeof req.body?.portName === 'string' && req.body.portName.trim()
        ? req.body.portName.trim()
        : '')
      : userPort;

    if (!portName && role !== 'admin') {
      return res.status(400).json({ message: 'Your account needs a port name to generate demo data.' });
    }

    const berthCapacity = Math.max(0, Number(req.body?.berthCapacity || 2500) || 2500);
    const startDate = req.body?.startDate ?? req.query?.startDate;

    const result = await generateYearlyPortDemo({
      portName,
      days,
      berthCapacity,
      startDate,
      userId: req.user.id,
      role,
    });

    return res.status(201).json({
      message:
        role === 'admin'
          ? `Generated ${result.days} days of docked shipments, daily port entries, and demand rows (approved for forecasting).`
          : `Generated ${result.days} days of demo data. Submissions are pending admin approval before forecasts use them.`,
      ...result,
    });
  } catch (error) {
    console.error('Generate demo demand error:', error);
    const dup = String(error?.message || '').includes('E11000') || String(error?.code) === '11000';
    return res.status(500).json({
      message: dup
        ? 'Demo generation failed: data for this port/date range may already exist. Clear overlapping DailyPortOps/Shipment rows or use a different port/start date.'
        : error.message || 'Unable to generate demo demand data.',
    });
  }
};

// Admin-only: simple 365-row generator (one series) as requested
exports.generateSimpleDemand365 = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') return res.status(403).json({ message: 'Admins only.' });

    const days = Math.max(1, Math.min(3650, Number(req.body?.days || 365) || 365));
    const portName = typeof req.body?.portName === 'string' ? req.body.portName.trim() : 'Chattogram Port';
    const commodity_type = typeof req.body?.commodity_type === 'string' ? req.body.commodity_type.trim() : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : 'MAIN JETTIES';

    const start = typeof req.body?.startDate === 'string' ? req.body.startDate.trim() : '';
    const startDate = start ? new Date(`${start}T00:00:00.000Z`) : new Date(Date.now() - (days - 1) * 86400000);
    startDate.setUTCHours(0, 0, 0, 0);

    const docs = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const qty = Math.floor(Math.random() * (9000 - 7000 + 1)) + 7000;
      docs.push({
        date: d,
        region: portName,
        portName,
        commodity_type,
        commodity_quantity: qty,
        batchId: `DEMO-${d.toISOString().slice(0, 10)}`,
        batchNote: 'Auto-generated demo data (simple 365 rows).',
        status: 'approved',
        submittedBy: req.user._id || req.user.id,
        reviewedBy: req.user._id || req.user.id,
        reviewedAt: new Date(),
        rejectionReason: '',
      });
    }

    const inserted = await Demand.insertMany(docs, { ordered: false });
    return res.status(201).json({
      message: `Generated ${inserted.length} demand rows for ${portName}.`,
      rowsInserted: inserted.length,
      portName,
      commodity_type,
      days,
    });
  } catch (error) {
    console.error('Generate simple demand error:', error);
    return res.status(500).json({ message: 'Unable to generate simple demo demand data.' });
  }
};
