const mongoose = require('mongoose');

const shipmentRequestSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organizationName: { type: String, required: true, trim: true },
  commodityType: { type: String, required: true, trim: true, index: true },
  vesselName: { type: String, required: true, trim: true, index: true },
  vesselImoNumber: { type: String, trim: true, default: '' },
  cargoQuantity: { type: Number, required: true, min: 0 },
  requestedArrivalTime: { type: Date, required: true, index: true },
  startingPort: { type: mongoose.Schema.Types.Mixed, default: null },
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sanctioned'],
    default: 'pending',
    index: true,
  },
  sanctionCheck: {
    checkedAt: { type: Date, default: null },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isSanctioned: { type: Boolean, default: false },
    reasons: { type: [String], default: [] },
    matchedEntities: { type: [String], default: [] },
  },
  reviewReason: { type: String, trim: true, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  createdShipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },
}, { timestamps: true });

module.exports = mongoose.model('ShipmentRequest', shipmentRequestSchema);
