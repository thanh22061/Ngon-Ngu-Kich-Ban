const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/admin/stats
 * Thống kê tổng quan toàn nền tảng (ADMIN)
 */
async function getDashboardStats(req, res, next) {
  try {
    const [
      totalUsers,
      totalVenues,
      pendingVenues,
      totalCourts,
      totalBookings,
      revenueAgg,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.venue.count(),
      prisma.venue.count({ where: { status: 'PENDING' } }),
      prisma.court.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          court: { include: { venue: { select: { id: true, name: true } } } },
          payment: true,
        },
      }),
    ]);

    return ApiResponse.success(
      res,
      {
        summary: {
          totalUsers,
          totalVenues,
          pendingVenues,
          totalCourts,
          totalBookings,
          totalRevenue: Number(revenueAgg._sum.amount || 0),
        },
        recentBookings,
      },
      'Lấy số liệu thống kê tổng quan thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/users
 * Danh sách người dùng trên hệ thống
 */
async function listUsers(req, res, next) {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(role ? { role: { name: role } } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatar: true,
          status: true,
          role: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
      'Lấy danh sách tài khoản thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/users/:id/status
 * Khóa / Mở khóa tài khoản người dùng (Từ chối nếu Admin tự khóa chính mình)
 */
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id);
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'BANNED'].includes(status)) {
      return next(ApiError.badRequest('Trạng thái tài khoản không hợp lệ (ACTIVE, INACTIVE, BANNED)'));
    }

    // Ngoại lệ trong báo cáo: Admin tự ban chính mình -> hệ thống từ chối thao tác
    if (targetUserId === req.user.id && status !== 'ACTIVE') {
      return next(ApiError.badRequest('Quản trị viên không thể tự khóa tài khoản của chính mình'));
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return next(ApiError.notFound('Không tìm thấy tài khoản người dùng'));
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        role: true,
      },
    });

    return ApiResponse.success(res, { user: updated }, 'Cập nhật trạng thái tài khoản thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/venues
 * Danh sách tất cả cụm sân (kể cả PENDING, REJECTED, SUSPENDED) để Admin kiểm duyệt
 */
async function listAllVenues(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          sport: true,
          owner: { select: { id: true, fullName: true, email: true, phone: true } },
          _count: { select: { courts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.venue.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        venues,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
      'Lấy danh sách cụm sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/venues/:id/status
 * Kiểm duyệt cụm sân (APPROVED, REJECTED, SUSPENDED)
 */
async function updateVenueStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return next(
        ApiError.badRequest('Trạng thái cụm sân không hợp lệ (PENDING, APPROVED, REJECTED, SUSPENDED)')
      );
    }

    const venue = await prisma.venue.findUnique({ where: { id: parseInt(id) } });
    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.venue.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      await tx.notification.create({
        data: {
          userId: venue.ownerId,
          title: 'Cập nhật trạng thái kiểm duyệt cụm sân',
          message: `Cụm sân "${venue.name}" của bạn đã được chuyển sang trạng thái: ${status}.`,
          type: 'SYSTEM',
        },
      });

      return v;
    });

    return ApiResponse.success(res, { venue: updated }, 'Cập nhật trạng thái cụm sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/bookings
 * Giám sát toàn bộ lịch đặt sân trên hệ thống
 */
async function listAllBookings(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          court: { include: { venue: { select: { id: true, name: true } } } },
          payment: true,
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
      'Lấy toàn bộ lịch đặt sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  listUsers,
  updateUserStatus,
  listAllVenues,
  updateVenueStatus,
  listAllBookings,
};

