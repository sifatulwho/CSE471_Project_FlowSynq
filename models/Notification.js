const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientRole: { type: String, trim: true, default: '' },
  portName: { type: String, trim: true, default: '', index: true },
  type: { type: String, required: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  relatedEntityType: { type: String, trim: true, default: '' },
  relatedEntityId: { type: String, trim: true, default: '' },
  navigationPath: { type: String, trim: true, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
