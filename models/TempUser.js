const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    country: { type: String, trim: true },
    portName: { type: String, trim: true },
    role: { type: String, required: true },
    exportCommodities: { type: [String], default: [] },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    // TTL index: entries will be automatically deleted 10 minutes after otpExpiresAt
    // This gives the user time to complete the password setup after verification.
    createdAt: { type: Date, default: Date.now, expires: 600 }
}, {
    timestamps: true,
});

module.exports = mongoose.model('TempUser', tempUserSchema);
