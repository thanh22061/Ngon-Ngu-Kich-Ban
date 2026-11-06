const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const {
  isFutureDateTime,
  calculateDurationHours,
  generateBookingCode,
} = require('../utils/dateTime');

/**
 * POST /api/v1/bookings
 * Đặt sân mới (CUSTOMER / OWNER / ADMIN)
 */
async function create(req, res, next) {
  try {
    const {
      courtId,
      bookingDate,
      startTime,
      endTime,
      note,
      couponId,
      couponCode,
      paymentMethod = 'VNPAY',
    } = req.body;
    const userId = req.user.id;

    if (!courtId || !bookingDate || !startTime || !endTime) {
      return next(ApiError.badRequest('Vui lòng cung cấp đầy đủ thông tin sân, ngày và khung giờ đặt'));
    }

    if (!isFutureDateTime(bookingDate, startTime)) {
      return next(ApiError.badRequest('Khung giờ đặt phải nằm trong tương lai'));
    }

    const duration = calculateDurationHours(startTime, endTime);
    if (duration <= 0) {
      return next(ApiError.badRequest('Thời gian kết thúc phải lớn hơn thời gian bắt đầu'));
    }

    const court = await prisma.court.findUnique({
      where: { id: parseInt(courtId) },
      include: { priceRules: true, venue: true },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    if (court.status !== 'ACTIVE' || court.venue.status !== 'APPROVED') {
      return next(ApiError.badRequest('Sân hiện đang bảo trì hoặc ngừng nhận lịch'));
    }

    // Kiểm tra giờ hoạt động của cụm sân
    if (startTime < court.venue.openTime || endTime > court.venue.closeTime) {
      return next(
        ApiError.badRequest(
          `Khung giờ đặt phải nằm trong giờ mở cửa của cụm sân (${court.venue.openTime} - ${court.venue.closeTime})`
        )
      );
    }

    // Tính giá theo từng giờ trong khoảng [startTime, endTime]
    const priceRule = court.priceRules.find(
      (r) => startTime >= r.startTime && startTime < r.endTime
    );
    const unitPrice = priceRule
      ? Number(priceRule.price)
      : court.priceRules.length > 0
      ? Number(court.priceRules[0].price)
      : 150000;
    const rawTotal = unitPrice * duration;

    // Kiểm tra và áp dụng mã giảm giá nếu có
    let appliedCoupon = null;
    if (couponId || couponCode) {
      appliedCoupon = await prisma.coupon.findFirst({
        where: couponId ? { id: parseInt(couponId) } : { code: couponCode.trim().toUpperCase() },
      });

      if (!appliedCoupon || !appliedCoupon.isActive) {
        return next(ApiError.badRequest('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng'));
      }

      const now = new Date();
      if (now < appliedCoupon.validFrom || now > appliedCoupon.validUntil) {
        return next(ApiError.badRequest('Mã giảm giá đã hết hạn'));
      }

      if (appliedCoupon.usedCount >= appliedCoupon.usageLimit) {
        return next(ApiError.badRequest('Mã giảm giá đã hết lượt sử dụng'));
      }

      if (appliedCoupon.minOrderAmount && rawTotal < Number(appliedCoupon.minOrderAmount)) {
        return next(
          ApiError.badRequest(
            `Đơn đặt sân cần tối thiểu ${Number(appliedCoupon.minOrderAmount).toLocaleString()}đ để áp dụng mã này`
          )
        );
      }
    }

    let discountAmount = 0;
    if (appliedCoupon) {
      discountAmount = (rawTotal * appliedCoupon.discountPercent) / 100;
      if (appliedCoupon.maxDiscount && discountAmount > Number(appliedCoupon.maxDiscount)) {
        discountAmount = Number(appliedCoupon.maxDiscount);
      }
    }

    const finalAmount = Math.max(0, rawTotal - discountAmount);
    const depositAmount = Math.round(finalAmount * 0.3); // Cọc 30%

    // Sử dụng Database Transaction để chống đặt trùng khung giờ (Anti-overbooking)
    const booking = await prisma.$transaction(async (tx) => {
      const existingBookings = await tx.booking.findMany({
        where: {
          courtId: parseInt(courtId),
          bookingDate: new Date(bookingDate),
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      });

      // Kiểm tra giao nhau (overlap) giữa [startTime, endTime] và các lịch đã đặt
      const hasOverlap = existingBookings.some(
        (b) => startTime < b.endTime && endTime > b.startTime
      );

      if (hasOverlap) {
        throw ApiError.conflict(
          'Khung giờ bạn chọn vừa có người đặt trước. Vui lòng chọn khung giờ hoặc sân khác!'
        );
      }

      const newBooking = await tx.booking.create({
        data: {
          bookingCode: generateBookingCode(),
          userId,
          courtId: parseInt(courtId),
          bookingDate: new Date(bookingDate),
          startTime,
          endTime,
          totalAmount: finalAmount,
          depositAmount,
          note,
          couponId: appliedCoupon ? appliedCoupon.id : null,
          status: 'PENDING',
        },
        include: {
          court: { include: { venue: true } },
        },
      });

      await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          amount: finalAmount,
          paymentMethod: ['VNPAY', 'CASH', 'BANK_TRANSFER'].includes(paymentMethod)
            ? paymentMethod
            : 'VNPAY',
          status: 'UNPAID',
        },
      });

      if (appliedCoupon) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Thông báo cho khách hàng
      await tx.notification.create({
        data: {
          userId,
          title: 'Đặt sân thành công',
          message: `Đơn đặt sân ${newBooking.bookingCode} (${court.name} - ${court.venue.name}) khung giờ ${startTime}-${endTime} ngày ${bookingDate} đã được tạo.`,
          type: 'BOOKING',
        },
      });

      // Thông báo cho chủ sân
      await tx.notification.create({
        data: {
          userId: court.venue.ownerId,
          title: 'Có lịch đặt sân mới',
          message: `Khách hàng ${req.user.fullName} vừa đặt ${court.name} khung giờ ${startTime}-${endTime} ngày ${bookingDate} (Mã: ${newBooking.bookingCode}).`,
          type: 'BOOKING',
        },
      });

      return newBooking;
    });

    return ApiResponse.created(res, { booking }, 'Tạo đơn đặt sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/bookings/me
 * Danh sách đơn đặt sân của khách hàng hiện tại
 */
async function mine(req, res, next) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status ? { status } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          court: { include: { venue: true } },
          payment: true,
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
      'Lấy danh sách đơn đặt sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/bookings/owner
 * Chủ sân xem danh sách các lịch đặt tại các cụm sân thuộc sở hữu của mình
 */
async function listOwnerBookings(req, res, next) {
  try {
    const { venueId, status, date, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      court: {
        venue: {
          ...(req.user.role !== 'ADMIN' ? { ownerId: req.user.id } : {}),
          ...(venueId ? { id: parseInt(venueId) } : {}),
        },
      },
      ...(status ? { status } : {}),
      ...(date ? { bookingDate: new Date(date) } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          court: { include: { venue: { select: { id: true, name: true, slug: true } } } },
          payment: true,
          review: true,
        },
        orderBy: [{ bookingDate: 'desc' }, { startTime: 'asc' }],
      }),
      prisma.booking.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        bookings,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
      'Lấy danh sách lịch đặt của cơ sở thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/bookings/:id
 * Chi tiết đơn đặt sân
 */
async function detail(req, res, next) {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        court: { include: { venue: true } },
        payment: true,
        review: true,
        coupon: true,
        user: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy đơn đặt sân'));
    }

    if (
      req.user.role !== 'ADMIN' &&
      booking.userId !== req.user.id &&
      booking.court.venue.ownerId !== req.user.id
    ) {
      return next(ApiError.forbidden('Bạn không có quyền xem đơn đặt sân này'));
    }

    return ApiResponse.success(res, { booking }, 'Lấy chi tiết đơn đặt sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/bookings/:id/cancel
 * Hủy đơn đặt sân (Khách hàng)
 * Ngoại lệ nghiệp vụ: Hủy trong vòng 2 giờ trước giờ bắt đầu sẽ không được hoàn tiền cọc
 */
async function cancel(req, res, next) {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, court: { include: { venue: true } } },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy đơn đặt sân'));
    }

    if (req.user.role !== 'ADMIN' && booking.userId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không phải chủ đơn đặt sân này'));
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return next(ApiError.badRequest(`Không thể hủy đơn đang ở trạng thái ${booking.status}`));
    }

    // Kiểm tra khoảng cách thời gian tới giờ chơi (2 giờ)
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    const matchStart = new Date(booking.bookingDate);
    matchStart.setHours(hours, minutes, 0, 0);
    const diffHours = (matchStart.getTime() - Date.now()) / (1000 * 60 * 60);
    const isEligibleForRefund = diffHours >= 2;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      if (booking.payment && booking.payment.status === 'PAID' && isEligibleForRefund) {
        await tx.payment.update({
          where: { bookingId },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.notification.create({
        data: {
          userId: booking.court.venue.ownerId,
          title: 'Khách hàng hủy lịch đặt sân',
          message: `Đơn ${booking.bookingCode} (${booking.court.name}) đã bị hủy bởi khách hàng.`,
          type: 'BOOKING',
        },
      });
    });

    const msg = isEligibleForRefund
      ? 'Hủy đơn đặt sân thành công (Đủ điều kiện hoàn tiền cọc nếu đã thanh toán)'
      : 'Hủy đơn đặt sân thành công (Do hủy trong vòng 2 giờ trước trận đấu nên không hoàn tiền cọc)';

    return ApiResponse.success(res, { isEligibleForRefund }, msg);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/bookings/:id/status
 * Chủ sân / Admin cập nhật trạng thái lịch đặt (CONFIRMED, COMPLETED, REJECTED, CANCELLED)
 */
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

    if (!status || !validStatuses.includes(status)) {
      return next(ApiError.badRequest(`Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(', ')}`));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { court: { include: { venue: true } }, payment: true },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy đơn đặt sân'));
    }

    if (req.user.role !== 'ADMIN' && booking.court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không phải chủ sở hữu của sân trong đơn đặt này'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      if (status === 'COMPLETED' && booking.payment && booking.payment.status === 'UNPAID') {
        await tx.payment.update({
          where: { bookingId: booking.id },
          data: { status: 'PAID', paymentTime: new Date() },
        });
      }

      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: 'Cập nhật trạng thái đặt sân',
          message: `Đơn đặt sân ${booking.bookingCode} (${booking.court.name}) đã chuyển sang trạng thái: ${status}.`,
          type: 'BOOKING',
        },
      });

      return b;
    });

    return ApiResponse.success(res, { booking: updated }, 'Cập nhật trạng thái lịch đặt thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  mine,
  listOwnerBookings,
  detail,
  cancel,
  updateStatus,
};
