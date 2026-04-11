const mongoose = require('mongoose');

const supplyPlanConfigSchema = new mongoose.Schema({
  portName: { type: String, required: true, unique: true },
  autoGenerationTime: { type: String, default: '06:00' }, // HH:mm format
  lookAheadDays: { type: Number, default: 3 },
  safetyStockPercentage: { type: Number, default: 15 },
  allocationStrategy: { 
    type: String, 
    enum: ['demand_priority', 'cost_optimization', 'balanced'],
    default: 'balanced' 
  },
  approvalRequired: { type: Boolean, default: true },
  notificationRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  constraints: {
    minimumAllocationQuantity: { type: Number, default: 100 },
    maximumDailyTransfers: { type: Number, default: 10 },
    maximumDockLoad: { type: Number, default: 90 }, // percentage
    safetyStockLimit: { type: Number, default: 10 } // percentage
  }
}, { timestamps: true });

module.exports = mongoose.model('SupplyPlanConfig', supplyPlanConfigSchema);
