const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, unique: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  password: { type: String, required: true },
  country: { type: String, required: false, trim: true, default: '' },
  portName: { type: String, trim: true, default: '' },
  port: { type: String, trim: true, default: '' },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'operator', 'analyst', 'organization'],
    default: 'organization',
  },
  profilePicture: { type: String, default: '' },
  exportCommodities: { type: [String], default: [] },
  isDemo: { type: Boolean, default: false, index: true },
  demoRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoRequest', default: null },
  demoExpiresAt: { type: Date, default: null },
  demoDisabled: { type: Boolean, default: false },
}, {
  timestamps: true,
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
