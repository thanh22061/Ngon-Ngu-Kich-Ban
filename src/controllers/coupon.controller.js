const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/coupons
 * Danh sách mã giảm giá đang hoạt động
 */
async function list(req, res, next) {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, { coupons }, 'Lấy danh sách mã giảm giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/coupons/apply
 * Kiểm tra và tính số tiền giảm của mã giảm giá cho một đơn hàng
 */
async function applyCoupon(req, res, next) {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return next(ApiError.badRequest('Vui lòng nhập mã giảm giá'));
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return next(ApiError.notFound('Mã giảm giá không tồn tại hoặc đã ngừng kích hoạt'));
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return next(ApiError.badRequest('Mã giảm giá đã hết hạn sử dụng'));
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return next(ApiError.badRequest('Mã giảm giá đã hết lượt sử dụng'));
    }

    const amount = Number(orderAmount || 0);
    if (coupon.minOrderAmount && amount < Number(coupon.minOrderAmount)) {
      return next(
        ApiError.badRequest(
          `Đơn đặt sân cần tối thiểu ${Number(coupon.minOrderAmount).toLocaleString()}đ để áp dụng mã này`
        )
      );
    }

    let discountAmount = (amount * coupon.discountPercent) / 100;
    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }

    return ApiResponse.success(
      res,
      {
        coupon,
        discountAmount,
        finalAmount: Math.max(0, amount - discountAmount),
      },
      'Áp dụng mã giảm giá thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/coupons
 * Tạo mã giảm giá mới (ADMIN)
 */
async function create(req, res, next) {
  try {
    const {
      code,
      discountPercent,
      maxDiscount,
      minOrderAmount,
      validFrom,
      validUntil,
      usageLimit,
    } = req.body;

    if (!code || !discountPercent || !validUntil) {
      return next(ApiError.badRequest('Vui lòng nhập mã code, % giảm giá và ngày hết hạn'));
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return next(ApiError.conflict('Mã giảm giá này đã tồn tại'));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        discountPercent: parseInt(discountPercent),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: new Date(validUntil),
        usageLimit: usageLimit ? parseInt(usageLimit) : 100,
        isActive: true,
      },
    });

    return ApiResponse.created(res, { coupon }, 'Tạo mã giảm giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/coupons/:id
 * Xóa hoặc vô hiệu hóa mã giảm giá (ADMIN)
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.coupon.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return ApiResponse.success(res, null, 'Đã vô hiệu hóa mã giảm giá');
  } catch (error) {
    next(error);
  }
}

module.exports = { list, applyCoupon, create, remove };

