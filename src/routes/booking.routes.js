const express = require('express');
const router = express.Router();
const {
  create,
  mine,
  listOwnerBookings,
  detail,
  cancel,
  updateStatus,
} = require('../controllers/booking.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.post('/', authenticate, create);
router.get('/me', authenticate, mine);
router.get('/owner', authenticate, authorize('OWNER', 'ADMIN'), listOwnerBookings);
router.get('/:id', authenticate, detail);
router.post('/:id/cancel', authenticate, cancel);
router.patch('/:id/status', authenticate, authorize('OWNER', 'ADMIN'), updateStatus);

module.exports = router;
