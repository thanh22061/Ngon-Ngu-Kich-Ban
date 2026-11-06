const express = require('express');
const router = express.Router();
const { list, markAsRead, markAllAsRead } = require('../controllers/notification.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, list);
router.patch('/read-all', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);

module.exports = router;

