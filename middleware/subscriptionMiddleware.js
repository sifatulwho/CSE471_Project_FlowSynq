const Subscription = require('../models/Subscription');

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

exports.requireActiveShipmentSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ organizationId: req.user.id }).lean();
    const active = subscription
      && ACTIVE_STATUSES.has(subscription.status)
      && subscription.currentPeriodEnd
      && new Date(subscription.currentPeriodEnd) > new Date();

    if (!active) {
      return res.status(402).json({
        message: 'An active monthly subscription is required to submit shipment requests.',
        code: 'SUBSCRIPTION_REQUIRED',
        subscriptionStatus: subscription?.status || 'missing',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
      });
    }

    req.subscription = subscription;
    return next();
  } catch (error) {
    console.error('Subscription authorization error:', error);
    return res.status(503).json({ message: 'Unable to verify subscription status.' });
  }
};
