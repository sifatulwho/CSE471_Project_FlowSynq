const mongoose = require('mongoose');

const dockSchema = new mongoose.Schema({
  dockName: { type: String, required: true, trim: true },
  portName: { type: String, required: true, trim: true, index: true },
  dockCapacity: { type: Number, required: true, min: 0 },
  currentOccupiedCapacity: { type: Number, default: 0, min: 0 },
  supportedGasTypes: { type: [String], default: [] },
  averageHandlingTime: { type: Number, default: 0, min: 0 },
  distanceToTank: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

dockSchema.virtual('dockVacancy').get(function dockVacancy() {
  return Math.max(0, (Number(this.dockCapacity) || 0) - (Number(this.currentOccupiedCapacity) || 0));
});

dockSchema.set('toJSON', { virtuals: true });
dockSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dock', dockSchema);
