const express = require('express');
const router = express.Router();
const { getOwnerStats } = require('../controllers/owner.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.get('/stats', authenticate, authorize('OWNER', 'ADMIN'), getOwnerStats);

module.exports = router;

