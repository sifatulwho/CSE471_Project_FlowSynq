const mongoose = require('mongoose');

const emergencyLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      default: 'emergency',
    },
    severity: {
      type: String,
      required: true,
      trim: true,
      default: 'critical',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    triggeredBy: {
      type: String,
      required: true,
      trim: true,
    },
    triggeredByRole: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    incidentTime: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'emergency_alerts',
  }
);

module.exports = mongoose.model('EmergencyLog', emergencyLogSchema);
