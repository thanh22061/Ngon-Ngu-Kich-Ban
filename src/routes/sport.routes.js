const express = require('express');
const router = express.Router();
const {
  listSports,
  createSport,
  updateSport,
  deleteSport,
  listFacilities,
  createFacility,
} = require('../controllers/sport.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.get('/', listSports);
router.get('/facilities', listFacilities);

router.post('/', authenticate, authorize('ADMIN'), createSport);
router.put('/:id', authenticate, authorize('ADMIN'), updateSport);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSport);
router.post('/facilities', authenticate, authorize('ADMIN'), createFacility);

module.exports = router;

