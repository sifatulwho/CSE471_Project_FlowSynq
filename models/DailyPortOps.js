const mongoose = require('mongoose');

const shipmentSnapshotSchema = new mongoose.Schema({
  shipName: { type: String, required: true, trim: true },
  status: { type: String, trim: true, default: '' },
  arrivalTime: { type: Date, default: null },
  containerCount: { type: Number, min: 0, default: 0 },
  cargoQuantity: { type: Number, min: 0, default: 0 },
}, { _id: false });

const commodityRowSchema = new mongoose.Schema({
  commodityType: { type: String, required: true, trim: true },
  containerCount: { type: Number, min: 0, default: 0 },
  commodityQuantity: { type: Number, min: 0, default: 0 },
  containerDelivered: { type: Number, min: 0, default: 0 },
  remainingCommodityContainer: { type: Number, min: 0, default: 0 },
}, { _id: true });

const dailyPortOpsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  portName: { type: String, required: true, trim: true, index: true },

  shipments: { type: [shipmentSnapshotSchema], default: [] },

  totalContainer: { type: Number, min: 0, default: 0 },
  totalQuantity: { type: Number, min: 0, default: 0 },
  totalHandled: { type: Number, min: 0, default: 0 },
  remainingContainer: { type: Number, min: 0, default: 0 },
  totalShipments: { type: Number, min: 0, default: 0 },
  totalDelayedShipments: { type: Number, min: 0, default: 0 },

  berthLocation: { type: String, trim: true, default: '' },
  berthCapacity: { type: Number, min: 0, default: 0 },
  berthVacancy: { type: Number, default: 0 },

  totalDelivered: { type: Number, min: 0, default: 0 },

  commodities: { type: [commodityRowSchema], default: [] },

  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String, trim: true, default: '' },
}, { timestamps: true });

dailyPortOpsSchema.index({ portName: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyPortOps', dailyPortOpsSchema);

