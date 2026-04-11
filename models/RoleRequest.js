const mongoose = require('mongoose');

const roleRequestSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    country: { type: String, trim: true },
    portName: { type: String, trim: true },
    role: { type: String, required: true },
    exportCommodities: { type: [String], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    token: { type: String, required: true, unique: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('RoleRequest', roleRequestSchema);
