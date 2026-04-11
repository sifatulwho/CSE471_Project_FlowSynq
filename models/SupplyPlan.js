const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  product: { type: String, required: true },
  quantity: { type: Number, required: true },
  destinationBerth: { type: String, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  estimatedCost: { type: Number, default: 0 },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'fulfilled', 'partial'], default: 'pending' }
}, { _id: false });

const shipmentPrioritySchema = new mongoose.Schema({
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  shipName: { type: String },
  commodity: { type: String },
  quantity: { type: Number },
  assignedDock: { type: String },
  priorityLevel: { type: Number, min: 1, max: 10, default: 5 },
  reason: { type: String },
  priorityScore: { type: Number }
}, { _id: false });

const metricsSchema = new mongoose.Schema({
  totalAllocation: { type: Number, default: 0 },
  demandCoveragePercentage: { type: Number, default: 0 },
  inventoryUtilization: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  shortageAmount: { type: Number, default: 0 },
  highPriorityShipments: { type: Number, default: 0 },
  planEfficiencyScore: { type: Number, default: 0 }
}, { _id: false });

const modificationHistorySchema = new mongoose.Schema({
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  modifiedAt: { type: Date, default: Date.now },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  field: { type: String }
}, { _id: false });

const supplyPlanSchema = new mongoose.Schema({
  planDate: { type: String, required: true }, // Format YYYY-MM-DD
  generatedTime: { type: Date, default: Date.now },
  generatedBy: { type: String, enum: ['AI', 'user', 'system'], default: 'AI' },
  status: { 
    type: String, 
    enum: ['draft', 'pending approval', 'approved', 'rejected', 'expired', 'active', 'completed'],
    default: 'draft' 
  },
  portName: { type: String, required: true },
  allocations: [allocationSchema],
  shipmentPriorities: [shipmentPrioritySchema],
  metrics: metricsSchema,
  
  approvalInfo: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String }
  },
  
  rejectionReason: { type: String },
  modificationHistory: [modificationHistorySchema],
  
  executionStatus: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    varianceRemarks: { type: String }
  },
  
  llmExplanation: {
    planSummary: { type: String },
    allocationExplanation: { type: String },
    shipmentPriorityExplanation: { type: String },
    improvementRecommendations: { type: String },
    fallbackUsed: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Ensure one plan per port per day
supplyPlanSchema.index({ planDate: 1, portName: 1 }, { unique: true });

module.exports = mongoose.model('SupplyPlan', supplyPlanSchema);
