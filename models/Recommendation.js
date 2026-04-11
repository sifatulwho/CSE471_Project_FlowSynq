const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  portName: { type: String, required: true, trim: true, index: true },
  commodityType: { type: String, required: true, trim: true, index: true },
  horizonDays: { type: Number, min: 1, max: 3650, default: 30 },

  recommendedUnits: { type: Number, min: 0, default: 0 },
  scheduleDates: { type: [String], default: [] }, // YYYY-MM-DD
  timingAdvice: { type: String, trim: true, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['sent', 'acknowledged', 'forwarded'], default: 'sent', index: true },
}, { timestamps: true });

recommendationSchema.index({ portName: 1, createdAt: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);

