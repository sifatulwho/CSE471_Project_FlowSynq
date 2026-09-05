const Stripe = require('stripe');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const configuredSubscriptionSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
const subscriptionWebhookSecret = configuredSubscriptionSecret
  && !configuredSubscriptionSecret.includes('your_subscription_webhook_secret')
  ? configuredSubscriptionSecret
  : process.env.STRIPE_WEBHOOK_SECRET;
const PRICE_CENTS = 10000;
const CURRENCY = 'usd';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const getClientUrl = (req) => {
  const explicit = req.body?.clientUrl;
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  const resolved = explicit || origin || CLIENT_URL;
  return String(resolved).replace(/\/$/, '');
};

const toDate = (seconds) => (seconds ? new Date(seconds * 1000) : null);
const getPeriodTimestamp = (subscription, item, field) => subscription[field] || item?.[field];

const safeSubscription = (subscription) => ({
  status: subscription?.status || 'missing',
  stripeCustomerId: subscription?.stripeCustomerId || '',
  currentPeriodStart: subscription?.currentPeriodStart || null,
  currentPeriodEnd: subscription?.currentPeriodEnd || null,
  cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
  monthlyPriceUsd: 100,
  currency: CURRENCY,
});

const saveStripeSubscription = async (stripeSubscription, organizationId, eventId = '') => {
  const item = stripeSubscription.items?.data?.[0];
  const data = {
    organizationId,
    stripeCustomerId: String(stripeSubscription.customer || ''),
    stripeSubscriptionId: String(stripeSubscription.id),
    stripePriceId: String(item?.price?.id || ''),
    status: stripeSubscription.status,
    currentPeriodStart: toDate(getPeriodTimestamp(stripeSubscription, item, 'current_period_start')),
    currentPeriodEnd: toDate(getPeriodTimestamp(stripeSubscription, item, 'current_period_end')),
    cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
    lastWebhookEventId: eventId,
  };
  return Subscription.findOneAndUpdate(
    { organizationId },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

exports.getBillingStatus = async (req, res) => {
  const subscription = await Subscription.findOne({ organizationId: req.user.id }).lean();
  return res.json(safeSubscription(subscription));
};

exports.createCheckoutSession = async (req, res) => {
  if (!stripe) return res.status(503).json({ message: 'Subscription payments are not configured on the backend.' });

  const organization = await User.findById(req.user.id).select('email fullName').lean();
  if (!organization) return res.status(404).json({ message: 'Organization account not found.' });

  const existing = await Subscription.findOne({ organizationId: req.user.id }).lean();
  if (existing?.status === 'active' && existing.currentPeriodEnd > new Date()) {
    return res.status(409).json({ message: 'Your monthly subscription is already active.' });
  }

  try {
    const clientUrl = getClientUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: organization.email,
      line_items: [{
        price_data: {
          currency: CURRENCY,
          product_data: { name: 'FlowSynq Organization Monthly Subscription' },
          unit_amount: PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { organizationId: String(req.user.id) },
      subscription_data: { metadata: { organizationId: String(req.user.id) } },
      success_url: `${clientUrl}/dashboard/shipment-requests?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/dashboard/billing?subscription=cancelled`,
    });
    return res.status(201).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Organization subscription checkout error:', error);
    return res.status(502).json({ message: 'Unable to start subscription checkout.' });
  }
};

exports.createPortalSession = async (req, res) => {
  if (!stripe) return res.status(503).json({ message: 'Subscription payments are not configured on the backend.' });
  const subscription = await Subscription.findOne({ organizationId: req.user.id }).lean();
  if (!subscription?.stripeCustomerId) {
    return res.status(400).json({ message: 'No billing customer exists yet. Subscribe first.' });
  }
  try {
    const clientUrl = getClientUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${clientUrl}/dashboard/billing`,
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return res.status(502).json({ message: 'Unable to open billing management.' });
  }
};

exports.handleWebhook = async (req, res) => {
  if (!stripe || !subscriptionWebhookSecret) return res.status(503).send('Webhook not configured.');
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      subscriptionWebhookSecret,
    );
  } catch (error) {
    console.error('Subscription webhook signature error:', error.message);
    return res.status(400).send('Invalid webhook signature.');
  }

  const supported = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]);

  if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
    const session = event.data.object;
    const organizationId = session.metadata?.organizationId;
    if (organizationId && session.subscription && stripe) {
      const stripeSubscription = await stripe.subscriptions.retrieve(String(session.subscription));
      await saveStripeSubscription(stripeSubscription, organizationId, event.id);
    }
  } else if (supported.has(event.type)) {
    const stripeSubscription = event.data.object;
    let organizationId = stripeSubscription.metadata?.organizationId;
    const existing = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id }).lean();
    if (existing?.lastWebhookEventId === event.id) return res.json({ received: true, duplicate: true });
    organizationId = organizationId || existing?.organizationId;
    if (organizationId) {
      await saveStripeSubscription(stripeSubscription, organizationId, event.id);
    }
  } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const existing = await Subscription.findOne({ stripeSubscriptionId: String(invoice.subscription || '') });
    if (existing) {
      if (existing.lastWebhookEventId === event.id) return res.json({ received: true, duplicate: true });
      existing.lastInvoiceId = String(invoice.id || '');
      existing.lastWebhookEventId = event.id;
      existing.lastPaymentFailure = event.type === 'invoice.payment_failed'
        ? 'The latest subscription payment failed.'
        : '';
      if (event.type === 'invoice.paid' && stripe) {
        const refreshed = await stripe.subscriptions.retrieve(String(invoice.subscription));
        existing.status = refreshed.status;
        const refreshedItem = refreshed.items?.data?.[0];
        existing.currentPeriodStart = toDate(getPeriodTimestamp(refreshed, refreshedItem, 'current_period_start'));
        existing.currentPeriodEnd = toDate(getPeriodTimestamp(refreshed, refreshedItem, 'current_period_end'));
      }
      await existing.save();
    }
  }

  return res.json({ received: true });
};

exports.syncSubscription = async (req, res) => {
  if (!stripe) return res.status(503).json({ message: 'Subscription payments are not configured.' });
  try {
    const sessionId = String(req.query.session_id || '').trim();
    let existing = await Subscription.findOne({ organizationId: req.user.id });
    let subscriptionId = existing?.stripeSubscriptionId;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.organizationId !== String(req.user.id) || session.mode !== 'subscription') {
        return res.status(403).json({ message: 'Checkout session does not belong to this organization.' });
      }
      subscriptionId = String(session.subscription || '');
    }

    if (!subscriptionId) return res.json({ message: 'No subscription to synchronize.' });
    const current = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await saveStripeSubscription(current, req.user.id);
    return res.json(safeSubscription(updated));
  } catch (error) {
    console.error('Subscription synchronization error:', error);
    return res.status(502).json({ message: 'Unable to synchronize subscription with Stripe.' });
  }
};
