const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  listUsers,
  updateUserStatus,
  listAllVenues,
  updateVenueStatus,
  listAllBookings,
} = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/venues', listAllVenues);
router.patch('/venues/:id/status', updateVenueStatus);
router.get('/bookings', listAllBookings);

module.exports = router;

