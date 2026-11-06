const express = require('express');
const router = express.Router();
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
} = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
