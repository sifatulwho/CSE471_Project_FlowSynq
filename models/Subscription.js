const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  stripeCustomerId: { type: String, default: '', index: true },
  stripeSubscriptionId: { type: String, default: null, unique: true, sparse: true, index: true },
  stripePriceId: { type: String, default: '' },
  status: {
    type: String,
    enum: ['incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete_expired', 'paused', 'expired'],
    default: 'incomplete',
    index: true,
  },
  currentPeriodStart: { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null, index: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  lastInvoiceId: { type: String, default: '' },
  lastPaymentFailure: { type: String, default: '' },
  lastWebhookEventId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
