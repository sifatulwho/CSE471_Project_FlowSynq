const mongoose = require('mongoose');

const importRequestSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  operatorName: { type: String, required: true, trim: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organizationName: { type: String, required: true, trim: true },
  commodityType: { type: String, required: true, trim: true, index: true },
  requestedQuantity: { type: Number, required: true, min: 0 },
  deliveryTimeframe: { type: String, trim: true, default: '' },
  demandReferenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Demand', default: null },
  demandDetails: { type: String, trim: true, default: '' },
  termsDetails: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  responseMessage: { type: String, trim: true, default: '' },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ImportRequest', importRequestSchema);
