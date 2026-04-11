const Recommendation = require('../models/Recommendation');

function normalizePortName(req) {
  const role = String(req.user?.role || '').toLowerCase();
  const userPort = String(req.user?.portName || '').trim();
  if (role !== 'admin') return userPort;
  return String(req.body?.portName || req.query?.portName || userPort || '').trim();
}

exports.createRecommendation = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'analyst'].includes(role)) {
      return res.status(403).json({ message: 'Only admins and analysts can create recommendations.' });
    }

    const portName = normalizePortName(req);
    if (!portName) {
      const message = role === 'analyst'
        ? 'Your account is not associated with a port. Please contact an administrator to update your profile.'
        : 'portName is required.';
      return res.status(400).json({ message });
    }

    const {
      commodityType,
      horizonDays,
      recommendedUnits,
      scheduleDates = [],
      timingAdvice,
    } = req.body;

    if (!commodityType) {
      return res.status(400).json({ message: 'commodityType is required.' });
    }

    const rec = await Recommendation.create({
      portName,
      commodityType,
      horizonDays,
      recommendedUnits,
      scheduleDates,
      timingAdvice,
      createdBy: req.user.id,
      status: 'sent',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`port:${portName}`).emit('new_recommendation', {
        id: rec._id,
        title: 'New Import Recommendation',
        message: `Analyst recommends importing ${recommendedUnits} units of ${commodityType} over the next ${horizonDays} days.\nTiming: ${timingAdvice}`,
        timestamp: new Date(),
        severity: 'high'
      });
    }

    return res.status(201).json({ message: 'Recommendation sent to operator.', recommendation: rec });
  } catch (error) {
    console.error('Create recommendation error:', error);
    return res.status(500).json({ message: 'Unable to create recommendation.' });
  }
};

exports.listRecommendations = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const portName = normalizePortName(req);
    if (!portName) {
      const message = role === 'analyst'
        ? 'Your account is not associated with a port. Please contact an administrator to update your profile.'
        : 'portName is required.';
      return res.status(400).json({ message });
    }

    const query = { portName };
    if (req.query.status && ['sent', 'acknowledged', 'forwarded'].includes(String(req.query.status))) {
      query.status = String(req.query.status);
    }

    if (role === 'organization') {
      // org sees only forwarded recommendations
      query.status = 'forwarded';
    }

    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50) || 50));
    const items = await Recommendation.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ items });
  } catch (error) {
    console.error('List recommendations error:', error);
    return res.status(500).json({ message: 'Unable to load recommendations.' });
  }
};

exports.acknowledgeRecommendation = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Operators only.' });
    }

    const portName = normalizePortName(req);
    const rec = await Recommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recommendation not found.' });
    if (role !== 'admin' && rec.portName !== portName) return res.status(403).json({ message: 'Access denied.' });

    rec.status = 'acknowledged';
    await rec.save();
    return res.json({ message: 'Acknowledged.', recommendation: rec });
  } catch (error) {
    console.error('Acknowledge recommendation error:', error);
    return res.status(500).json({ message: 'Unable to acknowledge.' });
  }
};

exports.forwardToOrganization = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['operator', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Operators only.' });
    }

    const portName = normalizePortName(req);
    const rec = await Recommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Recommendation not found.' });
    if (role !== 'admin' && rec.portName !== portName) return res.status(403).json({ message: 'Access denied.' });

    rec.status = 'forwarded';
    await rec.save();
    return res.json({ message: 'Forwarded to organization.', recommendation: rec });
  } catch (error) {
    console.error('Forward recommendation error:', error);
    return res.status(500).json({ message: 'Unable to forward.' });
  }
};

