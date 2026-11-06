const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/environment');
const ApiError = require('../utils/apiError');
const prisma = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Vui lòng cung cấp Authorization Token hợp lệ');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw ApiError.unauthorized('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || user.status === 'BANNED' || user.status === 'INACTIVE') {
      throw ApiError.unauthorized('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // Attach user payload to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role.name, // 'CUSTOMER', 'OWNER', 'ADMIN'
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
