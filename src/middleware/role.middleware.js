const ApiError = require('../utils/apiError');

/**
 * Middleware kiểm tra phân quyền người dùng
 * @param  {...string} allowedRoles Các vai trò được phép truy cập ('ADMIN', 'OWNER', 'CUSTOMER')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(ApiError.unauthorized('Bạn chưa xác thực danh tính'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

module.exports = authorize;
