const ApiError = require('../utils/apiError');
const { NODE_ENV } = require('../config/environment');

function errorHandler(err, req, res, next) {
  let error = err;

  // Nếu không phải là instance ApiError, wrap lại
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Lỗi hệ thống nội bộ';
    error = new ApiError(statusCode, message);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(error.statusCode).json(response);
}

module.exports = errorHandler;
