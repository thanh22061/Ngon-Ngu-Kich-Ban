class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Dữ liệu yêu cầu không hợp lệ') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Vui lòng đăng nhập để tiếp tục') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Không tìm thấy tài nguyên yêu cầu') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Xung đột dữ liệu hoặc khung giờ đã bị đặt trước') {
    return new ApiError(409, message);
  }

  static internal(message = 'Lỗi máy chủ nội bộ') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
