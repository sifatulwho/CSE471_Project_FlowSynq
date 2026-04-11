/**
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'analyst')
 */
exports.requireRoles = (...roles) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action.' });
  }
  next();
};
