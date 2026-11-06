const express = require('express');
const router = express.Router();

// Mount all API route modules
router.use('/auth', require('./auth.routes'));
router.use('/sports', require('./sport.routes'));
router.use('/venues', require('./venue.routes'));
router.use('/courts', require('./court.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/coupons', require('./coupon.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/owner', require('./owner.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
