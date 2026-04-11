const Notification = require('../models/Notification');

exports.listNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const [items, total, unread] = await Promise.all([
      Notification.find({ recipientUserId: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments({ recipientUserId: req.user.id }),
      Notification.countDocuments({ recipientUserId: req.user.id, isRead: false }),
    ]);
    return res.json({ items, total, unread, page, limit });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch notifications.' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const item = await Notification.findOne({ _id: req.params.id, recipientUserId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Notification not found.' });
    item.isRead = true;
    item.readAt = new Date();
    await item.save();
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark notification as read.' });
  }
};

exports.patchMarkNotificationRead = async (req, res) => {
  try {
    const id = req.body?.id || req.body?.notificationId;
    if (!id) return res.status(400).json({ message: 'Notification id is required.' });
    const item = await Notification.findOne({ _id: id, recipientUserId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Notification not found.' });
    item.isRead = true;
    item.readAt = new Date();
    await item.save();
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark notification as read.' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientUserId: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return res.json({ modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark all notifications as read.' });
  }
};

exports.unreadNotificationCount = async (req, res) => {
  try {
    const unread = await Notification.countDocuments({ recipientUserId: req.user.id, isRead: false });
    return res.json({ unread });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch unread count.' });
  }
};
