const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/notifications
 * Lấy danh sách thông báo của người dùng hiện tại
 */
async function list(req, res, next) {
  try {
    const { limit = 20 } = req.query;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    return ApiResponse.success(
      res,
      { notifications, unreadCount },
      'Lấy danh sách thông báo thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Đánh dấu 1 thông báo là đã đọc
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification || notification.userId !== req.user.id) {
      return next(ApiError.notFound('Không tìm thấy thông báo'));
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    return ApiResponse.success(res, { notification: updated }, 'Đã đánh dấu đã đọc');
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
async function markAllAsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    return ApiResponse.success(res, null, 'Đã đánh dấu tất cả thông báo là đã đọc');
  } catch (error) {
    next(error);
  }
}

module.exports = { list, markAsRead, markAllAsRead };

