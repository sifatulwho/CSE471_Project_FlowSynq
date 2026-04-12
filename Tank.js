const mongoose = require('mongoose');

const tankSchema = new mongoose.Schema({
  tankId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  commodity: { type: String, required: true },
  capacity: { type: Number, required: true },
  currentLevel: { type: Number, required: true, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Tank', tankSchema);
