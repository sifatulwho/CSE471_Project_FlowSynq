const ImportRequest = require('../models/ImportRequest');
const User = require('../models/User');
const Demand = require('../models/Demand');
const { ALLOWED_COMMODITIES, normalizeCommodity } = require('../constants/commodities');
const { emitNotification } = require('../services/notificationService');

const norm = (v) => String(v || '').trim();

exports.createImportRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Only operator/admin can create import requests.' });
    const organizationId = norm(req.body.organizationId);
    const commodityType = normalizeCommodity(req.body.commodityType);
    if (!organizationId || !ALLOWED_COMMODITIES.includes(commodityType) || !req.body.requestedQuantity) {
      return res.status(400).json({ message: 'organizationId, commodityType, requestedQuantity are required.' });
    }
    const org = await User.findById(organizationId).lean();
    if (!org || String(org.role).toLowerCase() !== 'organization') {
      return res.status(404).json({ message: 'Organization not found.' });
    }
    if (!Array.isArray(org.exportCommodities) || !org.exportCommodities.includes(commodityType)) {
      return res.status(400).json({ message: 'Selected organization does not export this commodity.' });
    }
    const duplicatePending = await ImportRequest.findOne({
      organizationId,
      commodityType,
      status: 'pending',
    });
    if (duplicatePending) {
      return res.status(409).json({ message: 'A pending import request already exists for this organization and commodity.' });
    }

    const doc = await ImportRequest.create({
      operatorId: req.user.id,
      operatorName: req.user.email || 'Operator',
      organizationId: org._id,
      organizationName: org.fullName || org.username,
      commodityType,
      requestedQuantity: Number(req.body.requestedQuantity),
      deliveryTimeframe: norm(req.body.deliveryTimeframe),
      demandReferenceId: req.body.demandReferenceId || null,
      demandDetails: norm(req.body.demandDetails),
      termsDetails: norm(req.body.termsDetails),
    });

    const io = req.app.get('io');
    await emitNotification({
      io,
      recipientUserId: org._id,
      recipientRole: 'organization',
      portName: org.portName || '',
      type: 'import_request_created',
      title: 'New import request received',
      message: `New import request for ${commodityType} from operator.`,
      relatedEntityType: 'importRequest',
      relatedEntityId: String(doc._id),
      navigationPath: '/dashboard/import-requests',
    });

    return res.status(201).json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create import request.' });
  }
};

exports.listImportRequests = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const query = {};
    if (role === 'organization') query.organizationId = req.user.id;
    else if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Access denied.' });
    else if (role === 'operator') query.operatorId = req.user.id;

    const status = norm(req.query.status).toLowerCase();
    const commodityType = normalizeCommodity(req.query.commodityType);
    const search = norm(req.query.search);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    if (status) query.status = status;
    if (commodityType) query.commodityType = commodityType;
    if (search) {
      query.$or = [
        { organizationName: new RegExp(search, 'i') },
        { operatorName: new RegExp(search, 'i') },
      ];
    }
    const [items, total] = await Promise.all([
      ImportRequest.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ImportRequest.countDocuments(query),
    ]);
    return res.json({ items, total, page, limit });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch import requests.' });
  }
};

exports.getImportRequestById = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const doc = await ImportRequest.findById(req.params.id).populate('demandReferenceId');
    if (!doc) return res.status(404).json({ message: 'Import request not found.' });
    if (role === 'organization' && String(doc.organizationId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (role === 'operator' && String(doc.operatorId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch import request.' });
  }
};

exports.respondToImportRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'organization') return res.status(403).json({ message: 'Only organization can respond.' });
    const decision = norm(req.body.decision).toLowerCase();
    const responseMessage = norm(req.body.responseMessage);
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'decision must be approve or reject.' });
    if (decision === 'reject' && !responseMessage) return res.status(400).json({ message: 'Reason for declining is required.' });
    const doc = await ImportRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Import request not found.' });
    if (String(doc.organizationId) !== String(req.user.id)) return res.status(403).json({ message: 'Access denied.' });
    if (doc.status !== 'pending') return res.status(400).json({ message: 'Import request already responded.' });

    doc.status = decision === 'approve' ? 'approved' : 'rejected';
    doc.responseMessage = responseMessage;
    doc.respondedBy = req.user.id;
    doc.respondedAt = new Date();
    await doc.save();

    const operator = await User.findById(doc.operatorId).lean();
    const io = req.app.get('io');
    await emitNotification({
      io,
      recipientUserId: doc.operatorId,
      recipientRole: operator?.role || 'operator',
      portName: operator?.portName || '',
      type: decision === 'approve' ? 'import_request_approved' : 'import_request_rejected',
      title: `Organization ${decision === 'approve' ? 'approved' : 'declined'} your import request`,
      message: decision === 'approve'
        ? `${doc.organizationName} approved your import request for ${doc.commodityType}.`
        : `${doc.organizationName} declined your import request: ${responseMessage}`,
      relatedEntityType: 'importRequest',
      relatedEntityId: String(doc._id),
      navigationPath: '/operator/import-requests',
    });

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to respond to import request.' });
  }
};

exports.getDemandReferences = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Access denied.' });
    const items = await Demand.find().sort({ date: -1 }).limit(50).select('date portName commodity_type commodity_quantity total_delivered');
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch demand references.' });
  }
};

exports.listOrganizationsByCommodity = async (req, res) => {
  try {
    const commodityType = normalizeCommodity(req.query.commodityType);
    const query = { role: 'organization' };
    if (commodityType) query.exportCommodities = commodityType;
    const items = await User.find(query).select('fullName username email country portName exportCommodities').sort({ fullName: 1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load organizations.' });
  }
};
