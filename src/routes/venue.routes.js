const express = require('express');
const router = express.Router();
const {
  list,
  listMyVenues,
  detail,
  getAvailability,
  create,
  update,
  remove,
} = require('../controllers/venue.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

// Owner route (phải đặt trước /:slug)
router.get('/owner/me', authenticate, authorize('OWNER', 'ADMIN'), listMyVenues);

// Public routes
router.get('/', list);
router.get('/:id/availability', getAvailability);
router.get('/:slug', detail);

// Owner / Admin CRUD
router.post('/', authenticate, authorize('OWNER', 'ADMIN'), create);
router.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), update);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), remove);

module.exports = router;
