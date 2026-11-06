const express = require('express');
const router = express.Router();
const { list, create, replyReview, remove } = require('../controllers/review.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.get('/', list);
router.post('/', authenticate, create);
router.patch('/:id/reply', authenticate, authorize('OWNER', 'ADMIN'), replyReview);
router.delete('/:id', authenticate, remove);

module.exports = router;

