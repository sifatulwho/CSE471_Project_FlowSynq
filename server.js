require('dotenv').config();
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Stripe payments are disabled: STRIPE_SECRET_KEY is not configured.');
}
if (process.env.NODE_ENV === 'production') {
  ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'GOOGLE_CLIENT_ID'].forEach((key) => {
    if (!process.env[key]) console.warn(`Production configuration is missing ${key}.`);
  });
}
const express = require('express');
const http = require('http');             //new line for alert (3,6,11,12,13))
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const tankRoutes = require('./routes/tankRoutes');
const authRoutes = require('./routes/authRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const demandRoutes = require('./routes/demandRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const dailyPortOpsRoutes = require('./routes/dailyPortOpsRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const dockRoutes = require('./routes/dockRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const costAnalyticsRoutes = require('./routes/costAnalyticsRoutes');
const sanctionedListRoutes = require('./routes/sanctionedListRoutes');
const shipmentRequestRoutes = require('./routes/shipmentRequestRoutes');
const importRequestRoutes = require('./routes/importRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supplyPlanRoutes = require('./routes/supplyPlanRoutes');
const demoRequestRoutes = require('./routes/demoRequestRoutes');
const { handleWebhook } = require('./controllers/demoRequestController');
const billingRoutes = require('./routes/billingRoutes');
const portGeocodingRoutes = require('./routes/portGeocodingRoutes');
const marineRouteRoutes = require('./routes/marineRouteRoutes');
const EmergencyLog = require('./models/EmergencyLog');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { resolveUserPort } = require('./utils/resolveUserPort');
const { startShipmentRiskJob } = require('./jobs/shipmentRiskJob');
const { sendEmergencyBroadcastEmail, verifyEmailConnection, getEmailProvider } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);                   //new line for alert (15-21))
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://flowsynq-frontend.onrender.com',
  'https://flowsynq-backend.onrender.com'
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /localhost|127\.0\.0\.1|\.onrender\.com$/i.test(origin);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
startShipmentRiskJob(io);

// Middleware
app.use(cors({ 
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.post('/api/demo-requests/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./controllers/billingController').handleWebhook);
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/daily-ops', dailyPortOpsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/docks', dockRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cost-analytics', costAnalyticsRoutes);
app.use('/api/sanctioned-list', sanctionedListRoutes);
app.use('/api/shipment-requests', shipmentRequestRoutes);
app.use('/api/import-requests', importRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/supply-plans', supplyPlanRoutes);
app.use('/api/port-geocoding', portGeocodingRoutes);
app.use('/api/marine-route', marineRouteRoutes);
app.use('/api/demo-requests', demoRequestRoutes);
app.use('/api/billing', billingRoutes);

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    emailConfigured: Boolean(
      process.env.RESEND_API_KEY
      || (
        process.env.EMAIL_HOST
        && process.env.EMAIL_PORT
        && process.env.EMAIL_USER
        && process.env.EMAIL_PASS
        && (process.env.EMAIL_FROM || process.env.EMAIL_USER)
      )
    ),
  });
});

app.get('/health/email', async (req, res) => {
  try {
    const verified = await verifyEmailConnection();
    return res.json({ status: 'ok', emailConfigured: true, provider: verified.provider || getEmailProvider(), port: verified.port, message: process.env.RESEND_API_KEY ? 'HTTPS email provider verified.' : 'SMTP connection verified.' });
  } catch (error) {
    console.error('SMTP health check failed:', error.message);
    return res.status(503).json({
      status: 'error',
      emailConfigured: true,
      provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.EMAIL_PROVIDER || 'smtp'),
      message: 'Email provider connection failed.',
      errorCode: error.code || undefined,
      command: error.command || undefined,
      responseCode: error.responseCode || undefined,
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.alertUser = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('fullName username email role port').lean();
    if (!user) {
      socket.alertUser = null;
      return next();
    }
    const port = resolveUserPort(user, decoded);
    socket.alertUser = { ...user, port };
    socket.join(`user:${String(user._id)}`);
    socket.join(`port:${port}`);
    next();
  } catch (error) {
    socket.alertUser = null;
    next();
  }
});

io.on('connection', (socket) => {
  socket.on('trigger_emergency', async (payload = {}) => {
    try {
      const user = socket.alertUser;
      if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
        socket.emit('emergency_alert_error', { message: 'Unauthorized to trigger emergency alerts.' });
        return;
      }

      const port = user.port;
      const senderName = user.fullName || user.username || 'Operator';
      const title = (payload.title && String(payload.title).trim()) || 'Port Emergency Alert';
      const location = (payload.location && String(payload.location).trim()) || 'Not specified';
      const details = (payload.message && String(payload.message).trim()) || '';
      const messageBody =
        details ||
        'Emergency buzzer activated. Follow port emergency procedures immediately.';
      let incidentTime = payload.incidentTime ? new Date(payload.incidentTime) : new Date();
      if (Number.isNaN(incidentTime.getTime())) {
        incidentTime = new Date();
      }

      const emergencyData = {
        type: payload.type || 'emergency',
        severity: payload.severity || 'critical',
        title,
        message: messageBody,
        sender: senderName,
        triggeredBy: senderName,
        triggeredByRole: user.role,
        port,
        location,
        incidentTime,
      };

      const savedAlert = await EmergencyLog.create(emergencyData);

      const broadcastPayload = {
        ...emergencyData,
        id: savedAlert._id,
        timestamp: savedAlert.createdAt,
        incidentTime: savedAlert.incidentTime,
      };

      // All other connected clients (any port / role). Operator socket is excluded.
      socket.broadcast.emit('emergency_alert', broadcastPayload);

      // Fetch all valid users and send emergency broadcast emails asynchronously
      User.find({ email: { $exists: true, $ne: '' } }, 'email fullName')
        .then(users => {
          if (users && users.length > 0) {
            sendEmergencyBroadcastEmail(users, broadcastPayload);
          }
        })
        .catch(err => console.error('Failed to fetch users for emergency broadcast:', err));

    } catch (error) {
      console.error('Emergency alert logging error:', error);
      const detail = error?.message || String(error);
      socket.emit('emergency_alert_error', {
        message: 'Failed to trigger emergency alert.',
        detail: process.env.NODE_ENV === 'development' ? detail : undefined,
      });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
