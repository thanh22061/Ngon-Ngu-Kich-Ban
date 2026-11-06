const express = require('express');
const router = express.Router();
const {
  list,
  detail,
  create,
  update,
  remove,
  addPriceRule,
  updatePriceRule,
  deletePriceRule,
  addCourtImage,
} = require('../controllers/court.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', list);
router.get('/:id', detail);

router.post('/', authenticate, authorize('OWNER', 'ADMIN'), create);
router.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), update);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), remove);

// Price rules management
router.post('/:id/price-rules', authenticate, authorize('OWNER', 'ADMIN'), addPriceRule);
router.put('/price-rules/:ruleId', authenticate, authorize('OWNER', 'ADMIN'), updatePriceRule);
router.delete('/price-rules/:ruleId', authenticate, authorize('OWNER', 'ADMIN'), deletePriceRule);

// Court images
router.post(
  '/:id/images',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  upload.single('image'),
  addCourtImage
);

module.exports = router;
