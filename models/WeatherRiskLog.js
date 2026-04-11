const mongoose = require('mongoose');

const weatherRiskLogSchema = new mongoose.Schema({
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  predictedDelayHours: { type: Number, default: 0 },
  reason: { type: String, trim: true },
  weatherDetails: { type: mongoose.Schema.Types.Mixed }, // Detailed weather data at time of assessment
  assessedAt: { type: Date, default: Date.now },
  triggeredBy: { type: String, default: 'System' }
}, {
  timestamps: true
});

module.exports = mongoose.model('WeatherRiskLog', weatherRiskLogSchema);
