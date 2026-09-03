const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing.' });
    }

    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid authorization token.' });
    }

    if (user.isDemo) {
      if (user.demoDisabled || !user.demoExpiresAt || user.demoExpiresAt <= new Date()) {
        return res.status(403).json({ message: 'Demo access has expired or been disabled.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        return res.status(403).json({ message: 'Demo access is read-only.' });
      }
    }
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      portName: user.portName || '',
      isDemo: Boolean(user.isDemo),
      demoExpiresAt: user.demoExpiresAt || null,
    };
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ message: 'Unauthorized access.' });
  }
};
