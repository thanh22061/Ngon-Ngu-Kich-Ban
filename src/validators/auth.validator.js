const ApiError = require('../utils/apiError');

function validateRegister(req, res, next) {
  const { fullName, email, phone, password, role } = req.body;

  if (!fullName || fullName.trim().length < 2) {
    return next(ApiError.badRequest('Họ và tên phải có tối thiểu 2 ký tự'));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return next(ApiError.badRequest('Định dạng email không hợp lệ'));
  }

  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return next(ApiError.badRequest('Số điện thoại phải từ 10 - 11 chữ số'));
  }

  if (!password || password.length < 6) {
    return next(ApiError.badRequest('Mật khẩu phải có tối thiểu 6 ký tự'));
  }

  if (role && !['CUSTOMER', 'OWNER'].includes(role)) {
    return next(ApiError.badRequest('Vai trò đăng ký không hợp lệ (CUSTOMER hoặc OWNER)'));
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(ApiError.badRequest('Vui lòng nhập đầy đủ Email và Mật khẩu'));
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
};
