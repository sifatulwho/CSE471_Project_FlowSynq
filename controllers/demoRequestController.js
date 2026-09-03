const crypto = require('crypto');
const Stripe = require('stripe');
const DemoRequest = require('../models/DemoRequest');
const User = require('../models/User');
const { sendDemoCredentialsEmail } = require('../utils/emailService');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const DEMO_DAYS = Number(process.env.DEMO_DURATION_DAYS || 7);
const DEMO_PORT = process.env.DEMO_PORT_NAME || 'FlowSynq Demo Port';

const safeRequest = (request) => ({
  id: request._id,
  fullName: request.fullName,
  email: request.email,
  company: request.company,
  portName: DEMO_PORT,
  tier: request.tier,
  amountCents: request.amountCents,
  currency: request.currency,
  status: request.status,
  createdAt: request.createdAt,
  expiresAt: request.expiresAt,
});

exports.createDemoRequest = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      message: 'Secure demo checkout is unavailable. Configure STRIPE_SECRET_KEY on the backend and restart the server.',
    });
  }
  const fullName = String(req.body.fullName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const company = String(req.body.company || '').trim();
  const portName = String(req.body.portName || '').trim();
  if (!fullName || !email || !company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ message: 'Name, valid email, and company are required.' });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'This email already has an account. Please sign in instead.' });
  }
  const existing = await DemoRequest.findOne({ email, status: { $in: ['pending_payment', 'paid', 'approved'] } });
  if (existing) return res.status(409).json({ message: 'A demo request already exists for this email.' });
  const request = await DemoRequest.create({ fullName, email, company, portName });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{ price_data: {
        currency: 'usd',
        product_data: { name: 'FlowSynq system demo access' },
        unit_amount: 10000,
      }, quantity: 1 }],
      metadata: { demoRequestId: String(request._id) },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/demo-request?paid=1`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/demo-request?cancelled=1`,
    });
    request.stripeSessionId = session.id;
    await request.save();
    return res.status(201).json({ checkoutUrl: session.url });
  } catch (error) {
    await DemoRequest.deleteOne({ _id: request._id });
    console.error('Demo checkout creation error:', error);
    return res.status(502).json({ message: 'Unable to start secure payment.' });
  }
};

exports.handleWebhook = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook not configured.');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Stripe webhook signature error:', error.message);
    return res.status(400).send('Invalid webhook signature.');
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    await markSessionPaid(session);
  }
  return res.json({ received: true });
};

const markSessionPaid = async (session) => {
  const request = await DemoRequest.findOne({
    $or: [
      { stripeSessionId: session.id },
      { _id: session.metadata?.demoRequestId },
    ],
  });
  if (!request || request.status !== 'pending_payment') return false;
  if (session.payment_status !== 'paid' || session.amount_total !== request.amountCents || session.currency !== request.currency) {
    console.error('Rejected Stripe demo payment verification:', session.id);
    return false;
  }
  request.status = 'paid';
  request.stripePaymentIntentId = String(session.payment_intent || '');
  await request.save();
  return true;
};

exports.syncDemoPayment = async (req, res) => {
  if (!stripe) return res.status(503).json({ message: 'Stripe payments are not configured.' });
  const request = await DemoRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demo request not found.' });
  if (request.status !== 'pending_payment') return res.json({ message: 'Payment status is already synchronized.', request: safeRequest(request) });
  if (!request.stripeSessionId) return res.status(400).json({ message: 'No Stripe Checkout session is linked to this request.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(request.stripeSessionId);
    await markSessionPaid(session);
    const refreshed = await DemoRequest.findById(request._id);
    return res.json({ message: refreshed.status === 'paid' ? 'Payment verified.' : 'Payment has not been completed.', request: safeRequest(refreshed) });
  } catch (error) {
    console.error('Stripe payment synchronization error:', error);
    return res.status(502).json({ message: 'Unable to verify payment with Stripe.' });
  }
};

exports.listDemoRequests = async (req, res) => {
  const requests = await DemoRequest.find().sort({ createdAt: -1 }).limit(100).lean();
  return res.json(requests.map(safeRequest));
};

exports.approveDemoRequest = async (req, res) => {
  const request = await DemoRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demo request not found.' });
  if (request.status !== 'paid') return res.status(400).json({ message: 'Only paid requests can be approved.' });
  const expiresAt = new Date(Date.now() + DEMO_DAYS * 24 * 60 * 60 * 1000);
  const username = `demo_${crypto.randomBytes(6).toString('hex')}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const user = await User.create({
    fullName: request.fullName,
    username,
    email: request.email,
    password,
    country: '',
    portName: request.portName,
    role: 'organization',
    isDemo: true,
    demoRequestId: request._id,
    demoExpiresAt: expiresAt,
  });
  request.status = 'approved';
  request.demoUserId = user._id;
  request.approvedAt = new Date();
  request.approvedBy = req.user.id;
  request.expiresAt = expiresAt;
  await request.save();
  await sendDemoCredentialsEmail(user.email, username, password, expiresAt);
  return res.json({ message: 'Demo approved and credentials emailed.', request: safeRequest(request) });
};

exports.rejectDemoRequest = async (req, res) => {
  const request = await DemoRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Demo request not found.' });
  if (!['paid', 'pending_payment'].includes(request.status)) return res.status(400).json({ message: 'Request cannot be rejected.' });
  request.status = 'rejected';
  request.approvedBy = req.user.id;
  await request.save();
  return res.json({ message: 'Demo request rejected.' });
};
