const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, BASE_URL } = require('../config/environment');
const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /api/v1/auth/register
 * Đăng ký tài khoản mới (CUSTOMER hoặc OWNER)
 */
async function register(req, res, next) {
  try {
    const { fullName, email, phone, password, role } = req.body;

    const roleName = role || 'CUSTOMER';
    const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
    if (!roleRecord) {
      return next(ApiError.badRequest('Vai trò không hợp lệ'));
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return next(ApiError.conflict('Email hoặc số điện thoại đã được sử dụng'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: passwordHash,
        roleId: roleRecord.id,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    const token = signToken(user.id);

    return ApiResponse.created(res, {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        avatar: user.avatar,
      },
      token,
    }, 'Đăng ký tài khoản thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 * Đăng nhập
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      return next(ApiError.unauthorized('Email hoặc mật khẩu không chính xác'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(ApiError.unauthorized('Email hoặc mật khẩu không chính xác'));
    }

    if (user.status === 'BANNED' || user.status === 'INACTIVE') {
      return next(ApiError.unauthorized('Tài khoản đã bị khóa hoặc chưa kích hoạt'));
    }

    const token = signToken(user.id);

    return ApiResponse.success(res, {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        avatar: user.avatar,
      },
      token,
    }, 'Đăng nhập thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Lấy thông tin tài khoản đang đăng nhập (cần auth)
 */
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user) {
      return next(ApiError.notFound('Không tìm thấy người dùng'));
    }

    return ApiResponse.success(res, {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      },
    }, 'Lấy thông tin người dùng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/auth/profile
 * Cập nhật thông tin cá nhân
 */
async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, avatar } = req.body;
    const updateData = {};

    if (fullName) {
      if (fullName.trim().length < 2) {
        return next(ApiError.badRequest('Họ và tên phải có tối thiểu 2 ký tự'));
      }
      updateData.fullName = fullName.trim();
    }

    if (phone) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone)) {
        return next(ApiError.badRequest('Số điện thoại phải từ 10 - 11 chữ số'));
      }
      const existingPhone = await prisma.user.findFirst({
        where: { phone, id: { not: req.user.id } },
      });
      if (existingPhone) {
        return next(ApiError.conflict('Số điện thoại đã được sử dụng bởi tài khoản khác'));
      }
      updateData.phone = phone;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (req.file) {
      updateData.avatar = `${BASE_URL}/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: { role: true },
    });

    return ApiResponse.success(res, {
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role.name,
        avatar: updatedUser.avatar,
      },
    }, 'Cập nhật hồ sơ cá nhân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/auth/change-password
 * Đổi mật khẩu
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(ApiError.badRequest('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'));
    }

    if (newPassword.length < 6) {
      return next(ApiError.badRequest('Mật khẩu mới phải có tối thiểu 6 ký tự'));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(ApiError.badRequest('Mật khẩu hiện tại không chính xác'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: passwordHash },
    });

    return ApiResponse.success(res, null, 'Đổi mật khẩu thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, me, updateProfile, changePassword };
