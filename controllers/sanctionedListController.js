const SanctionedEntry = require('../models/SanctionedEntry');

const normalize = (v) => String(v || '').trim();

const buildQuery = (req) => {
  const query = {};
  const type = normalize(req.query.type);
  const status = normalize(req.query.status);
  const search = normalize(req.query.search);
  if (type && type !== 'all') query.entryType = type;
  if (status && status !== 'all') query.status = status;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { identifier: new RegExp(search, 'i') },
      { reason: new RegExp(search, 'i') },
    ];
  }
  return query;
};

exports.getSanctionedEntries = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const query = buildQuery(req);
    const [items, total] = await Promise.all([
      SanctionedEntry.find(query)
        .populate('sanctionedBy', 'fullName email role')
        .sort({ sanctionedDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SanctionedEntry.countDocuments(query),
    ]);
    return res.json({ items, total, page, limit });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch sanctioned list.' });
  }
};

exports.createSanctionedEntry = async (req, res) => {
  try {
    const entryType = normalize(req.body.entryType).toLowerCase();
    const name = normalize(req.body.name);
    const identifier = normalize(req.body.identifier);
    const reason = normalize(req.body.reason);
    if (!['organization', 'commodity', 'vessel'].includes(entryType)) {
      return res.status(400).json({ message: 'entryType must be organization, commodity, or vessel.' });
    }
    if (!name || !reason) {
      return res.status(400).json({ message: 'name and reason are required.' });
    }
    const exists = await SanctionedEntry.findOne({ entryType, name, identifier });
    if (exists) {
      return res.status(409).json({ message: 'Duplicate sanctioned entry exists.' });
    }
    const created = await SanctionedEntry.create({
      entryType,
      name,
      identifier,
      reason,
      additionalDetails: normalize(req.body.additionalDetails),
      supportingDocument: req.file ? `/uploads/${req.file.filename}` : '',
      sanctionedBy: req.user.id,
      lastUpdatedBy: req.user.id,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create sanctioned entry.' });
  }
};

exports.updateSanctionedEntry = async (req, res) => {
  try {
    const entry = await SanctionedEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found.' });
    if (req.body.name !== undefined) entry.name = normalize(req.body.name);
    if (req.body.identifier !== undefined) entry.identifier = normalize(req.body.identifier);
    if (req.body.reason !== undefined) entry.reason = normalize(req.body.reason);
    if (req.body.additionalDetails !== undefined) entry.additionalDetails = normalize(req.body.additionalDetails);
    if (req.body.status !== undefined) entry.status = normalize(req.body.status).toLowerCase() === 'inactive' ? 'inactive' : 'active';
    if (req.file) entry.supportingDocument = `/uploads/${req.file.filename}`;
    entry.lastUpdatedBy = req.user.id;
    await entry.save();
    return res.json(entry);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update sanctioned entry.' });
  }
};

exports.deleteSanctionedEntry = async (req, res) => {
  try {
    const entry = await SanctionedEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found.' });
    entry.status = 'inactive';
    entry.lastUpdatedBy = req.user.id;
    await entry.save();
    return res.json({ message: 'Entry deactivated.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to deactivate sanctioned entry.' });
  }
};
