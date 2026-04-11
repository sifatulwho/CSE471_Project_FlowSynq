const ShipmentRequest = require('../models/ShipmentRequest');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { ALLOWED_COMMODITIES, normalizeCommodity } = require('../constants/commodities');
const { checkShipmentSanctions } = require('../services/sanctionCheckService');
const { emitNotification } = require('../services/notificationService');

const norm = (v) => String(v || '').trim();

const canAccessRequest = (req, requestDoc) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'operator') return true;
  if (role === 'organization') return String(requestDoc.organizationId) === String(req.user.id);
  return role === 'analyst';
};

exports.createShipmentRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'organization') {
      return res.status(403).json({ message: 'Only organization can submit shipment requests.' });
    }

    const org = await User.findById(req.user.id).lean();
    if (!org) return res.status(404).json({ message: 'Organization account not found.' });
    const commodityType = normalizeCommodity(req.body.commodityType);
    if (!ALLOWED_COMMODITIES.includes(commodityType)) {
      return res.status(400).json({ message: 'Invalid commodityType.' });
    }
    if (!Array.isArray(org.exportCommodities) || !org.exportCommodities.includes(commodityType)) {
      return res.status(400).json({ message: 'commodityType must be one of organization exportCommodities.' });
    }
    if (!norm(req.body.vesselName) || !req.body.cargoQuantity || !req.body.requestedArrivalTime) {
      return res.status(400).json({ message: 'vesselName, cargoQuantity and requestedArrivalTime are required.' });
    }

    const created = await ShipmentRequest.create({
      organizationId: org._id,
      organizationName: org.fullName || org.username,
      commodityType,
      vesselName: norm(req.body.vesselName),
      vesselImoNumber: norm(req.body.vesselImoNumber),
      cargoQuantity: Number(req.body.cargoQuantity),
      requestedArrivalTime: req.body.requestedArrivalTime,
      startingPort: req.body.startingPort || null,
      notes: norm(req.body.notes),
    });

    const operators = await User.find({ role: { $in: ['operator', 'admin'] }, portName: org.portName || req.user.portName }).select('_id role portName');
    const io = req.app.get('io');
    await Promise.all(operators.map((op) => emitNotification({
      io,
      recipientUserId: op._id,
      recipientRole: op.role,
      portName: op.portName || '',
      type: 'shipment_request_created',
      title: 'New shipment request received',
      message: `New shipment request from ${created.organizationName} for ${created.commodityType}.`,
      relatedEntityType: 'shipmentRequest',
      relatedEntityId: String(created._id),
      navigationPath: '/operator/shipment-requests',
    })));

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to submit shipment request.' });
  }
};

exports.listShipmentRequests = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const status = norm(req.query.status).toLowerCase();
    const search = norm(req.query.search);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { organizationName: new RegExp(search, 'i') },
        { commodityType: new RegExp(search, 'i') },
        { vesselName: new RegExp(search, 'i') },
      ];
    }
    if (role === 'organization') query.organizationId = req.user.id;
    const [items, total] = await Promise.all([
      ShipmentRequest.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ShipmentRequest.countDocuments(query),
    ]);
    return res.json({ items, total, page, limit });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load shipment requests.' });
  }
};

exports.getShipmentRequestById = async (req, res) => {
  try {
    const doc = await ShipmentRequest.findById(req.params.id).populate('createdShipmentId', 'shipName status assignedDock');
    if (!doc) return res.status(404).json({ message: 'Shipment request not found.' });
    if (!canAccessRequest(req, doc)) return res.status(403).json({ message: 'Access denied.' });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load shipment request.' });
  }
};

exports.verifyShipmentRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Only operator/admin can verify requests.' });

    const doc = await ShipmentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Shipment request not found.' });
    if (!['pending', 'sanctioned'].includes(doc.status)) return res.status(400).json({ message: 'Only pending or sanctioned requests can be verified.' });

    const result = await checkShipmentSanctions({
      organizationName: doc.organizationName,
      commodityType: doc.commodityType,
      vesselName: doc.vesselName,
      vesselImoNumber: doc.vesselImoNumber,
    });

    doc.sanctionCheck = {
      checkedAt: new Date(),
      checkedBy: req.user.id,
      isSanctioned: result.isSanctioned,
      reasons: result.reasons,
      matchedEntities: result.matchedEntities,
    };
    if (result.isSanctioned) {
      doc.status = 'sanctioned';
      doc.reviewReason = result.reasons.join('; ');
      doc.reviewedAt = new Date();
      doc.reviewedBy = req.user.id;
    } else {
      if (doc.status === 'sanctioned') {
        doc.status = 'pending';
        doc.reviewReason = '';
      }
    }
    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to verify shipment request.' });
  }
};

exports.approveShipmentRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Only operator/admin can approve requests.' });
    const doc = await ShipmentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Shipment request not found.' });
    if (doc.status !== 'pending') return res.status(400).json({ message: `Cannot approve request in ${doc.status} status.` });
    if (!doc.sanctionCheck?.checkedAt) return res.status(400).json({ message: 'Run sanction verification before approval.' });
    if (doc.sanctionCheck?.isSanctioned) return res.status(400).json({ message: 'Sanctioned request cannot be approved.' });

    const shipment = await Shipment.create({
      shipName: doc.vesselName,
      arrivalTime: doc.requestedArrivalTime,
      cargoQuantity: doc.cargoQuantity,
      commodityType: doc.commodityType,
      gasType: doc.commodityType,
      portName: req.user.portName || '',
      assignedDock: '',
      status: 'En Route',
      notes: doc.notes ? [{ text: `From shipment request ${doc._id}: ${doc.notes}`, author: 'System' }] : [],
      startingPort: doc.startingPort || null,
      estimatedArrivalTime: doc.requestedArrivalTime,
    });

    doc.status = 'approved';
    doc.createdShipmentId = shipment._id;
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user.id;
    doc.reviewReason = norm(req.body.reason);
    await doc.save();

    const io = req.app.get('io');
    await emitNotification({
      io,
      recipientUserId: doc.organizationId,
      recipientRole: 'organization',
      portName: req.user.portName || '',
      type: 'shipment_request_approved',
      title: 'Your shipment request was approved',
      message: `Shipment request ${doc._id} approved and shipment created.`,
      relatedEntityType: 'shipmentRequest',
      relatedEntityId: String(doc._id),
      navigationPath: '/dashboard/shipment-requests',
      metadata: { createdShipmentId: String(shipment._id) },
    });

    return res.json({ message: 'Shipment request approved.', request: doc, shipment });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to approve shipment request.' });
  }
};

exports.rejectShipmentRequest = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) return res.status(403).json({ message: 'Only operator/admin can reject requests.' });
    const doc = await ShipmentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Shipment request not found.' });
    if (!['pending', 'sanctioned'].includes(doc.status)) return res.status(400).json({ message: `Cannot reject request in ${doc.status} status.` });
    const reason = norm(req.body.reason);
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required.' });
    doc.status = doc.sanctionCheck?.isSanctioned ? 'sanctioned' : 'rejected';
    doc.reviewReason = reason;
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user.id;
    await doc.save();

    const io = req.app.get('io');
    await emitNotification({
      io,
      recipientUserId: doc.organizationId,
      recipientRole: 'organization',
      portName: req.user.portName || '',
      type: 'shipment_request_rejected',
      title: 'Your shipment request was rejected',
      message: `Request ${doc._id} rejected: ${reason}`,
      relatedEntityType: 'shipmentRequest',
      relatedEntityId: String(doc._id),
      navigationPath: '/dashboard/shipment-requests',
    });
    return res.json({ message: 'Shipment request rejected.', request: doc });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to reject shipment request.' });
  }
};
