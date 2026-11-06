const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Helper tạo slug từ tên tiếng Việt
 */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * GET /api/v1/venues
 * Danh sách sân đã duyệt (public) hỗ trợ tìm kiếm & lọc
 */
async function list(req, res, next) {
  try {
    const { search, sport, sportId, district, city, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'APPROVED',
      ...(sport ? { sport: { slug: sport } } : {}),
      ...(sportId ? { sportId: parseInt(sportId) } : {}),
      ...(district ? { district: { contains: district } } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { address: { contains: search } },
              { district: { contains: search } },
            ],
          }
        : {}),
    };

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          sport: true,
          courts: {
            where: { status: 'ACTIVE' },
            include: {
              priceRules: { orderBy: { price: 'asc' } },
              images: true,
            },
          },
          venueFacilities: { include: { facility: true } },
        },
        orderBy: { ratingAvg: 'desc' },
      }),
      prisma.venue.count({ where }),
    ]);

    return ApiResponse.success(
      res,
      {
        venues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      'Lấy danh sách sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/venues/owner/me
 * Chủ sân lấy danh sách cụm sân thuộc sở hữu của mình
 */
async function listMyVenues(req, res, next) {
  try {
    const venues = await prisma.venue.findMany({
      where: { ownerId: req.user.id },
      include: {
        sport: true,
        courts: {
          include: {
            priceRules: true,
            images: true,
            _count: { select: { bookings: true } },
          },
        },
        venueFacilities: { include: { facility: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, { venues }, 'Lấy danh sách cụm sân của bạn thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/venues/:slug
 * Chi tiết một cụm sân theo slug hoặc id (public)
 */
async function detail(req, res, next) {
  try {
    const { slug } = req.params;
    const isNumericId = /^\d+$/.test(slug);

    const venue = await prisma.venue.findFirst({
      where: isNumericId ? { id: parseInt(slug) } : { slug },
      include: {
        sport: true,
        courts: {
          include: {
            priceRules: { orderBy: { startTime: 'asc' } },
            images: true,
            reviews: {
              include: {
                user: { select: { id: true, fullName: true, avatar: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        venueFacilities: { include: { facility: true } },
        owner: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    return ApiResponse.success(res, { venue }, 'Lấy chi tiết cụm sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/venues/:id/availability?date=YYYY-MM-DD
 * Lấy ma trận khung giờ trống/đã đặt của tất cả sân con thuộc cụm sân trong ngày
 */
async function getAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const targetDateStr = date || new Date().toISOString().slice(0, 10);
    const targetDate = new Date(targetDateStr);

    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(id) },
      include: {
        courts: {
          where: { status: 'ACTIVE' },
          include: {
            priceRules: true,
            bookings: {
              where: {
                bookingDate: targetDate,
                status: { notIn: ['CANCELLED', 'REJECTED'] },
              },
              select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    // Tạo danh sách các slot 1 tiếng từ openTime đến closeTime
    const openHour = parseInt((venue.openTime || '06:00').split(':')[0], 10);
    const closeHour = parseInt((venue.closeTime || '23:00').split(':')[0], 10);

    const courtsAvailability = venue.courts.map((court) => {
      const slots = [];
      for (let h = openHour; h < closeHour; h++) {
        const slotStart = `${String(h).padStart(2, '0')}:00`;
        const slotEnd = `${String(h + 1).padStart(2, '0')}:00`;

        // Kiểm tra xem slot này có giao với booking nào không
        const bookedItem = court.bookings.find(
          (b) => slotStart < b.endTime && slotEnd > b.startTime
        );

        // Tìm giá theo PriceRule
        const rule = court.priceRules.find(
          (r) => slotStart >= r.startTime && slotStart < r.endTime
        );

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          price: rule ? Number(rule.price) : 150000,
          isPeak: rule ? rule.isPeak : false,
          isBooked: Boolean(bookedItem),
          bookingStatus: bookedItem ? bookedItem.status : null,
        });
      }

      return {
        courtId: court.id,
        courtName: court.name,
        courtType: court.courtType,
        isCovered: court.isCovered,
        slots,
      };
    });

    return ApiResponse.success(
      res,
      {
        venueId: venue.id,
        venueName: venue.name,
        date: targetDateStr,
        openTime: venue.openTime,
        closeTime: venue.closeTime,
        courts: courtsAvailability,
      },
      'Lấy lịch trống của cụm sân thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/venues
 * Tạo cụm sân mới (OWNER / ADMIN)
 */
async function create(req, res, next) {
  try {
    const {
      sportId,
      name,
      slug,
      address,
      district,
      city,
      description,
      phone,
      openTime,
      closeTime,
      latitude,
      longitude,
      facilityIds,
    } = req.body;

    if (!sportId || !name || !address || !district || !phone) {
      return next(ApiError.badRequest('Vui lòng nhập đầy đủ thông tin bắt buộc của cụm sân'));
    }

    const finalSlug = slug ? slugify(slug) : `${slugify(name)}-${Date.now().toString().slice(-4)}`;
    const existingSlug = await prisma.venue.findUnique({ where: { slug: finalSlug } });
    if (existingSlug) {
      return next(ApiError.conflict('Slug cụm sân đã tồn tại'));
    }

    const venue = await prisma.venue.create({
      data: {
        ownerId: req.user.id,
        sportId: parseInt(sportId),
        name: name.trim(),
        slug: finalSlug,
        address: address.trim(),
        district: district.trim(),
        city: city || 'Hà Nội',
        description,
        phone: phone.trim(),
        openTime: openTime || '06:00',
        closeTime: closeTime || '23:00',
        latitude: latitude !== undefined && latitude !== '' ? parseFloat(latitude) : 21.0285,
        longitude: longitude !== undefined && longitude !== '' ? parseFloat(longitude) : 105.8048,
        status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
        ...(Array.isArray(facilityIds) && facilityIds.length > 0
          ? {
              venueFacilities: {
                create: facilityIds.map((fid) => ({ facilityId: parseInt(fid) })),
              },
            }
          : {}),
      },
      include: {
        sport: true,
        venueFacilities: { include: { facility: true } },
      },
    });

    return ApiResponse.created(res, { venue }, 'Tạo cụm sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/venues/:id
 * Cập nhật thông tin cụm sân (OWNER / ADMIN)
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const venueId = parseInt(id);
    const {
      sportId,
      name,
      address,
      district,
      city,
      description,
      phone,
      openTime,
      closeTime,
      latitude,
      longitude,
      facilityIds,
    } = req.body;

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    if (req.user.role !== 'ADMIN' && venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không phải chủ sở hữu cụm sân này'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(facilityIds)) {
        await tx.venueFacility.deleteMany({ where: { venueId } });
        if (facilityIds.length > 0) {
          await tx.venueFacility.createMany({
            data: facilityIds.map((fid) => ({
              venueId,
              facilityId: parseInt(fid),
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.venue.update({
        where: { id: venueId },
        data: {
          ...(sportId !== undefined && { sportId: parseInt(sportId) }),
          ...(name !== undefined && { name: name.trim() }),
          ...(address !== undefined && { address: address.trim() }),
          ...(district !== undefined && { district: district.trim() }),
          ...(city !== undefined && { city }),
          ...(description !== undefined && { description }),
          ...(phone !== undefined && { phone: phone.trim() }),
          ...(openTime !== undefined && { openTime }),
          ...(closeTime !== undefined && { closeTime }),
          ...(latitude !== undefined && latitude !== '' && { latitude: parseFloat(latitude) }),
          ...(longitude !== undefined && longitude !== '' && { longitude: parseFloat(longitude) }),
        },
        include: {
          sport: true,
          venueFacilities: { include: { facility: true } },
        },
      });
    });

    return ApiResponse.success(res, { venue: updated }, 'Cập nhật cụm sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/venues/:id
 * Xoá cụm sân (OWNER / ADMIN)
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const venueId = parseInt(id);

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    if (req.user.role !== 'ADMIN' && venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền xoá cụm sân này'));
    }

    // Kiểm tra xem cụm sân còn lịch đặt đang active không
    const activeBookingsCount = await prisma.booking.count({
      where: {
        court: { venueId },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (activeBookingsCount > 0) {
      return next(
        ApiError.badRequest(
          `Không thể xóa cụm sân vì đang có ${activeBookingsCount} lịch đặt chưa hoàn tất`
        )
      );
    }

    await prisma.venue.delete({ where: { id: venueId } });

    return ApiResponse.success(res, null, 'Xoá cụm sân thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  listMyVenues,
  detail,
  getAvailability,
  create,
  update,
  remove,
};
