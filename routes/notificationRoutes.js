const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  listNotifications,
  markNotificationRead,
  patchMarkNotificationRead,
  markAllNotificationsRead,
  unreadNotificationCount,
} = require('../controllers/notificationController');

router.use(authenticate);

router.get('/unread-count', unreadNotificationCount);
router.post('/mark-all-read', markAllNotificationsRead);
router.patch('/mark-read', patchMarkNotificationRead);
router.get('/', listNotifications);
router.post('/:id/read', markNotificationRead);

module.exports = router;
