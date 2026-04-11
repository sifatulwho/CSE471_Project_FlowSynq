const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
  bulkUpdateShipments,
  addNote,
  updateNote,
  getStatusHistory,
  generateDemoShipments365,
  calculateRoutePreview,
  assessShipmentWeatherRisk,
  getShipmentWeatherForecast,
  getShipmentDemandImpact,
  reassessShipmentRisk,
  suggestBestDock,
  assignSuggestedDock,
  suggestDockForDraftShipment,
} = require('../controllers/shipmentController');

// All shipment tracking routes require authentication
router.use(authenticate);

// Operator-only middleware (admins may use these routes too)
const operatorOnly = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'operator' && role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Operator role required.' });
  }
  next();
};

const readRiskRoles = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['operator', 'admin', 'organization', 'analyst'].includes(role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  next();
};

router.route('/')
  .get(getShipments)
  .post(operatorOnly, createShipment);

router.route('/calculate-route')
  .post(operatorOnly, calculateRoutePreview);

router.route('/bulk-update')
  .put(operatorOnly, bulkUpdateShipments);

router.route('/demo/generate')
  .post(operatorOnly, generateDemoShipments365);

router.route('/:id/suggest-dock')
  .post(operatorOnly, suggestBestDock);

router.route('/suggest-dock')
  .post(operatorOnly, suggestDockForDraftShipment);

router.route('/:id/assign-dock')
  .put(operatorOnly, assignSuggestedDock);

router.route('/:id')
  .get(getShipmentById)
  .put(operatorOnly, updateShipment)
  .delete(operatorOnly, deleteShipment);

router.route('/:id/status')
  .patch(operatorOnly, updateShipment);

router.route('/:id/notes')
  .post(operatorOnly, addNote);

router.route('/:id/notes/:noteId')
  .put(operatorOnly, updateNote);

router.route('/:id/history')
  .get(getStatusHistory);

router.route('/:id/assess-weather-risk')
  .post(operatorOnly, assessShipmentWeatherRisk);

router.route('/:id/weather-forecast')
  .get(readRiskRoles, getShipmentWeatherForecast);

router.route('/:id/demand-impact')
  .get(readRiskRoles, getShipmentDemandImpact);

router.route('/:id/reassess-risk')
  .post(operatorOnly, reassessShipmentRisk);

module.exports = router;
