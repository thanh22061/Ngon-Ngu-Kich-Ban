const express = require('express');
const router = express.Router();
const {
  createPaymentUrl,
  vnpayReturn,
  confirmPayment,
  refundPayment,
} = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.post('/create-url', authenticate, createPaymentUrl);
router.get('/vnpay-return', vnpayReturn);
router.post('/:bookingId/pay', authenticate, confirmPayment);
router.post('/:bookingId/refund', authenticate, authorize('OWNER', 'ADMIN'), refundPayment);

module.exports = router;

