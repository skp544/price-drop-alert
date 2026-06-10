const express = require('express');
const { getNotifications, markAsRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAsRead);

module.exports = router;
