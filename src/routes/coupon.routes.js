const express = require('express');
const router = express.Router();
const { list, applyCoupon, create, remove } = require('../controllers/coupon.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.get('/', list);
router.post('/apply', authenticate, applyCoupon);
router.post('/', authenticate, authorize('ADMIN'), create);
router.delete('/:id', authenticate, authorize('ADMIN'), remove);

module.exports = router;

