const prisma = require('../config/db');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/owner/stats
 * Thống kê doanh thu và số lượng lịch đặt sân của Chủ sân
 */
async function getOwnerStats(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { venueId, startDate, endDate } = req.query;

    const venueFilter = {
      ownerId,
      ...(venueId ? { id: parseInt(venueId) } : {}),
    };

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const bookingWhere = {
      court: { venue: venueFilter },
      ...(Object.keys(dateFilter).length > 0 ? { bookingDate: dateFilter } : {}),
    };

    const [
      totalVenues,
      totalCourts,
      totalBookings,
      completedBookings,
      cancelledBookings,
      revenueAgg,
      recentBookings,
    ] = await Promise.all([
      prisma.venue.count({ where: { ownerId } }),
      prisma.court.count({ where: { venue: { ownerId } } }),
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({ where: { ...bookingWhere, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { ...bookingWhere, status: 'CANCELLED' } }),
      prisma.booking.aggregate({
        where: {
          ...bookingWhere,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.findMany({
        where: bookingWhere,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
          court: { select: { id: true, name: true, venue: { select: { id: true, name: true } } } },
          payment: true,
        },
      }),
    ]);

    return ApiResponse.success(
      res,
      {
        summary: {
          totalVenues,
          totalCourts,
          totalBookings,
          completedBookings,
          cancelledBookings,
          totalRevenue: Number(revenueAgg._sum.totalAmount || 0),
        },
        recentBookings,
      },
      'Lấy thống kê doanh thu chủ sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = { getOwnerStats };

