const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * GET /api/notifications?email=&limit=
 * Get recent notifications for a user, plus unread count.
 */
const getNotifications = async (req, res, next) => {
  try {
    const { email, limit = 20 } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email query param is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, data: [], unreadCount: 0 });
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(parseInt(limit)),
      Notification.countDocuments({ userId: user._id, isRead: false }),
    ]);

    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all of a user's notifications as read.
 */
const markAllRead = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await Notification.updateMany({ userId: user._id, isRead: false }, { isRead: true });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllRead };
