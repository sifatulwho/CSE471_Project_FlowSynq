const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, default: 'System' },
}, { _id: true });

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  author: { type: String, default: 'Operator' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const coordinateSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const portSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  code: { type: String, trim: true, default: '' },
  coordinates: { type: coordinateSchema, default: null },
}, { _id: false });

const routeWaypointSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sequence: { type: Number, required: true },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  shipName: { type: String, required: true },
  arrivalTime: { type: Date, required: true },
  cargoQuantity: { type: Number, required: true },
  containerCount: { type: Number, default: 0 },
  commodityType: {
    type: String,
    enum: ['Container',
  'General Cargo',
  'Food Grain',
  'Fertilizer',
  'Clinker',
  'Sugar',
  'Salt',
  'Rapeseed',
  'Mustard Seed',
  'Oil Tanker'],
    default: 'other',
    index: true,
  },
  gasType: {
    type: String,
    trim: true,
    default: '',
  },
  startingPort: { type: portSchema, default: null },
  destinationPort: { type: portSchema, default: null },
  estimatedArrivalTime: { type: Date, default: null, index: true },
  routeData: {
    totalDistanceNM: { type: Number, default: 0 },
    waypoints: { type: [routeWaypointSchema], default: [] },
    fetchedAt: { type: Date, default: null },
    routeApiSource: { type: String, trim: true, default: '' },
  },
  weatherRiskAssessment: {
    overallRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    weatherAlerts: {
      type: [{
        location: { type: String, trim: true, default: '' },
        alertType: { type: String, trim: true, default: '' },
        severity: { type: String, trim: true, default: '' },
        expectedTime: { type: Date, default: null },
        description: { type: String, trim: true, default: '' },
      }],
      default: [],
    },
    forecasts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    assessedAt: { type: Date, default: null },
    nextAssessmentDue: { type: Date, default: null },
  },
  delayInfo: {
    isDelayed: { type: Boolean, default: false },
    delayType: { type: String, enum: ['manual', 'weather_predicted', 'both'], default: null },
    manualDelayReason: { type: String, trim: true, default: '' },
    weatherDelayReason: { type: String, trim: true, default: '' },
    predictedDelayHours: { type: Number, default: 0 },
    actualDelayHours: { type: Number, default: 0 },
    delayRecordedAt: { type: Date, default: null },
    delayRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  demandSupplyImpact: {
    calculatedAt: { type: Date, default: null },
    commodityDemand: {
      forecastedMonthlyDemand: { type: Number, default: 0 },
      currentMonthDelivered: { type: Number, default: 0 },
      pendingDeliveries: { type: Number, default: 0 },
      demandSupplyGap: { type: Number, default: 0 },
      gapPercentage: { type: Number, default: 0 },
    },
    priceImpactPrediction: {
      trend: { type: String, enum: ['increase', 'decrease', 'stable'], default: 'stable' },
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      reasoning: { type: String, trim: true, default: '' },
      estimatedPriceChange: { type: Number, default: 0 },
      timeframe: { type: String, trim: true, default: 'next 7-14 days' },
    },
  },
  portName: { type: String, trim: true, index: true, default: '' },
  assignedDock: { type: String, trim: true, default: '' },
  assignedDockSource: {
    type: String,
    enum: ['manual', 'optimized'],
    default: 'manual',
  },
  optimizationRecommendation: {
    dockId: { type: String, trim: true, default: '' },
    recommendedDock: { type: String, trim: true, default: '' },
    score: { type: Number, default: 0 },
    estimatedCostSaving: { type: Number, default: 0 },
    estimatedTimeSavingHours: { type: Number, default: 0 },
    reason: { type: String, trim: true, default: '' },
    warnings: { type: [String], default: [] },
    generatedAt: { type: Date, default: null },
  },
  status: {
    type: String,
    enum: ['En Route', 'Docked', 'Unloading', 'Unloaded', 'Delayed'],
    default: 'En Route',
  },
  statusHistory: { type: [statusHistorySchema], default: [] },
  notes: { type: [noteSchema], default: [] },
}, {
  timestamps: true,
});

// Auto-push to statusHistory when status changes
shipmentSchema.pre('save', function () {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: 'System',
    });
  }
});

shipmentSchema.index({ status: 1, arrivalTime: -1 });
shipmentSchema.index({ assignedDock: 1, arrivalTime: -1 });
shipmentSchema.index({ portName: 1, status: 1, arrivalTime: -1 });
shipmentSchema.index({ commodityType: 1, status: 1, estimatedArrivalTime: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
