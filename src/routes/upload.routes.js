const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { BASE_URL } = require('../config/environment');

router.post('/', authenticate, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return next(ApiError.badRequest('Vui lòng chọn tệp hình ảnh để tải lên'));
  }

  const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;
  return ApiResponse.created(
    res,
    {
      filename: req.file.filename,
      imageUrl,
    },
    'Tải ảnh lên thành công'
  );
});

module.exports = router;

