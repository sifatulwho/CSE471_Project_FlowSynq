const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  portName: { type: String, trim: true, maxlength: 160, default: '' },
  tier: { type: String, enum: ['full-demo'], default: 'full-demo' },
  amountCents: { type: Number, required: true, default: 10000 },
  currency: { type: String, default: 'usd' },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'approved', 'rejected', 'expired'],
    default: 'pending_payment',
    index: true,
  },
  stripeSessionId: { type: String, unique: true, sparse: true },
  stripePaymentIntentId: { type: String, default: '' },
  demoUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
