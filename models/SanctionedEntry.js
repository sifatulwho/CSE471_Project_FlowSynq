const mongoose = require('mongoose');

const sanctionedEntrySchema = new mongoose.Schema({
  entryType: {
    type: String,
    enum: ['organization', 'commodity', 'vessel'],
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, index: true },
  identifier: { type: String, trim: true, default: '', index: true },
  reason: { type: String, required: true, trim: true },
  additionalDetails: { type: String, trim: true, default: '' },
  supportingDocument: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  sanctionedDate: { type: Date, default: Date.now, index: true },
  sanctionedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

sanctionedEntrySchema.index({ entryType: 1, name: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model('SanctionedEntry', sanctionedEntrySchema);
