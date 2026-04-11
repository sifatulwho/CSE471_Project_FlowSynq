const Notification = require('../models/Notification');

const emitNotification = async ({
  io,
  recipientUserId,
  recipientRole,
  portName,
  type,
  title,
  message,
  relatedEntityType = '',
  relatedEntityId = '',
  navigationPath = '',
  metadata = {},
}) => {
  const notification = await Notification.create({
    recipientUserId,
    recipientRole,
    portName,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    navigationPath,
    metadata,
  });

  if (io) {
    io.to(`user:${String(recipientUserId)}`).emit('app_notification', notification);
  }
  return notification;
};

module.exports = { emitNotification };
