const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Hàm tính lại điểm trung bình (ratingAvg) và tổng số đánh giá (reviewCount) của Venue
 */
async function recalculateVenueRating(tx, venueId) {
  const aggregate = await tx.review.aggregate({
    where: { court: { venueId } },
    _avg: { rating: true },
    _count: { id: true },
  });

  const ratingAvg = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 5.0;
  const reviewCount = aggregate._count.id || 0;

  await tx.venue.update({
    where: { id: venueId },
    data: { ratingAvg, reviewCount },
  });
}

/**
 * GET /api/v1/reviews?venueId=...&courtId=...
 * Lấy danh sách đánh giá của cụm sân hoặc sân con
 */
async function list(req, res, next) {
  try {
    const { venueId, courtId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(courtId ? { courtId: parseInt(courtId) } : {}),
      ...(venueId ? { court: { venueId: parseInt(venueId) } } : {}),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, fullName: true, avatar: true } },
          court: { select: { id: true, name: true, venueId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        reviews,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
      'Lấy danh sách đánh giá thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/reviews
 * Khách hàng viết đánh giá sau khi hoàn thành lịch đặt sân
 */
async function create(req, res, next) {
  try {
    const { bookingId, rating = 5, comment } = req.body;
    const userId = req.user.id;

    if (!bookingId || !comment || !comment.trim()) {
      return next(ApiError.badRequest('Vui lòng cung cấp mã đặt sân (bookingId) và nội dung đánh giá'));
    }

    const parsedRating = parseInt(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return next(ApiError.badRequest('Số sao đánh giá phải từ 1 đến 5'));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { review: true, court: { include: { venue: true } } },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy lịch đặt sân'));
    }

    if (booking.userId !== userId) {
      return next(ApiError.forbidden('Bạn chỉ có thể đánh giá lịch đặt sân của chính mình'));
    }

    if (booking.status !== 'COMPLETED') {
      return next(ApiError.badRequest('Chỉ được phép đánh giá khi lịch đặt sân đã hoàn thành (COMPLETED)'));
    }

    if (booking.review) {
      return next(ApiError.conflict('Lịch đặt sân này đã được bạn đánh giá trước đó'));
    }

    // Kiểm tra thời hạn 30 ngày kể từ ngày đặt sân
    const daysSinceBooking =
      (Date.now() - new Date(booking.bookingDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBooking > 30) {
      return next(ApiError.badRequest('Đã quá thời hạn 30 ngày để gửi đánh giá cho buổi chơi này'));
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          userId,
          courtId: booking.courtId,
          rating: parsedRating,
          comment: comment.trim(),
        },
        include: {
          user: { select: { id: true, fullName: true, avatar: true } },
          court: { select: { id: true, name: true } },
        },
      });

      await recalculateVenueRating(tx, booking.court.venueId);

      // Thông báo cho chủ sân
      await tx.notification.create({
        data: {
          userId: booking.court.venue.ownerId,
          title: 'Có đánh giá mới từ khách hàng',
          message: `Khách hàng ${req.user.fullName} đã đánh giá ${parsedRating} sao cho ${booking.court.name}.`,
          type: 'SYSTEM',
        },
      });

      return created;
    });

    return ApiResponse.created(res, { review }, 'Gửi đánh giá sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/reviews/:id/reply
 * Chủ sân phản hồi đánh giá của khách hàng
 */
async function replyReview(req, res, next) {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return next(ApiError.badRequest('Vui lòng nhập nội dung phản hồi'));
    }

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) },
      include: { court: { include: { venue: true } } },
    });

    if (!review) {
      return next(ApiError.notFound('Không tìm thấy đánh giá'));
    }

    if (req.user.role !== 'ADMIN' && review.court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không phải chủ sở hữu của cụm sân này'));
    }

    const updated = await prisma.review.update({
      where: { id: parseInt(id) },
      data: {
        reply: reply.trim(),
        replyAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    return ApiResponse.success(res, { review: updated }, 'Phản hồi đánh giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/reviews/:id
 * Quản trị viên hoặc người viết xóa đánh giá vi phạm
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { court: true },
    });

    if (!review) {
      return next(ApiError.notFound('Không tìm thấy đánh giá'));
    }

    if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền xóa đánh giá này'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });
      await recalculateVenueRating(tx, review.court.venueId);
    });

    return ApiResponse.success(res, null, 'Xóa đánh giá thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  create,
  replyReview,
  remove,
};

