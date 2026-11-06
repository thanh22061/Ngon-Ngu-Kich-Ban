const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { BASE_URL } = require('../config/environment');

/**
 * GET /api/v1/courts?venueId=:id
 * Danh sách sân con thuộc một cụm sân
 */
async function list(req, res, next) {
  try {
    const { venueId } = req.query;

    const where = venueId ? { venueId: parseInt(venueId) } : {};

    const courts = await prisma.court.findMany({
      where,
      include: {
        priceRules: { orderBy: { startTime: 'asc' } },
        images: true,
        venue: { select: { id: true, name: true, slug: true, openTime: true, closeTime: true } },
      },
      orderBy: { id: 'asc' },
    });

    return ApiResponse.success(res, { courts }, 'Lấy danh sách sân con thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/courts/:id
 * Chi tiết một sân con
 */
async function detail(req, res, next) {
  try {
    const { id } = req.params;
    const court = await prisma.court.findUnique({
      where: { id: parseInt(id) },
      include: {
        priceRules: { orderBy: { startTime: 'asc' } },
        images: true,
        venue: true,
        reviews: {
          include: { user: { select: { id: true, fullName: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    return ApiResponse.success(res, { court }, 'Lấy chi tiết sân con thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/courts
 * Tạo sân con mới (OWNER / ADMIN)
 */
async function create(req, res, next) {
  try {
    const { venueId, name, courtType, isCovered, status, images, priceRules } = req.body;

    if (!venueId || !name) {
      return next(ApiError.badRequest('Vui lòng cung cấp venueId và tên sân con'));
    }

    const venue = await prisma.venue.findUnique({ where: { id: parseInt(venueId) } });
    if (!venue) {
      return next(ApiError.notFound('Không tìm thấy cụm sân'));
    }

    if (req.user.role !== 'ADMIN' && venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không phải chủ sở hữu cụm sân này'));
    }

    const court = await prisma.court.create({
      data: {
        venueId: parseInt(venueId),
        name: name.trim(),
        courtType: courtType || 'Standard',
        isCovered: isCovered !== false,
        status: status || 'ACTIVE',
        ...(Array.isArray(images) && images.length > 0
          ? {
              images: {
                create: images.map((img, idx) => ({
                  imageUrl: typeof img === 'string' ? img : img.imageUrl,
                  isPrimary: typeof img === 'object' ? Boolean(img.isPrimary) : idx === 0,
                })),
              },
            }
          : {}),
        ...(Array.isArray(priceRules) && priceRules.length > 0
          ? {
              priceRules: {
                create: priceRules.map((rule) => ({
                  name: rule.name || 'Khung giờ thường',
                  startTime: rule.startTime,
                  endTime: rule.endTime,
                  price: Number(rule.price),
                  isPeak: Boolean(rule.isPeak),
                  dayOfWeek: rule.dayOfWeek ? parseInt(rule.dayOfWeek) : null,
                })),
              },
            }
          : {}),
      },
      include: { priceRules: true, images: true },
    });

    return ApiResponse.created(res, { court }, 'Tạo sân con thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/courts/:id
 * Cập nhật thông tin & trạng thái sân con (OWNER / ADMIN)
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const courtId = parseInt(id);
    const { name, courtType, isCovered, status } = req.body;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    if (req.user.role !== 'ADMIN' && court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền chỉnh sửa sân con này'));
    }

    const updated = await prisma.court.update({
      where: { id: courtId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(courtType !== undefined && { courtType }),
        ...(isCovered !== undefined && { isCovered: Boolean(isCovered) }),
        ...(status !== undefined && { status }),
      },
      include: { priceRules: true, images: true },
    });

    return ApiResponse.success(res, { court: updated }, 'Cập nhật sân con thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/courts/:id
 * Xoá sân con (OWNER / ADMIN) - Từ chối nếu còn lịch đặt đang hoạt động
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const courtId = parseInt(id);

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    if (req.user.role !== 'ADMIN' && court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền xoá sân con này'));
    }

    // Kiểm tra ngoại lệ: Không cho xóa nếu sân con còn lịch đặt đang hoạt động
    const activeBookings = await prisma.booking.count({
      where: {
        courtId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (activeBookings > 0) {
      return next(
        ApiError.badRequest(
          `Không thể xóa sân con "${court.name}" vì đang có ${activeBookings} lịch đặt đang hoạt động`
        )
      );
    }

    await prisma.court.delete({ where: { id: courtId } });

    return ApiResponse.success(res, null, 'Xoá sân con thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/courts/:id/price-rules
 * Thêm cấu hình khung giá cho sân con (OWNER / ADMIN)
 */
async function addPriceRule(req, res, next) {
  try {
    const { id } = req.params;
    const courtId = parseInt(id);
    const { name, startTime, endTime, price, isPeak, dayOfWeek } = req.body;

    if (!startTime || !endTime || price === undefined) {
      return next(ApiError.badRequest('Vui lòng nhập đầy đủ khung giờ và đơn giá'));
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    if (req.user.role !== 'ADMIN' && court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền cấu hình giá cho sân này'));
    }

    const rule = await prisma.priceRule.create({
      data: {
        courtId,
        name: name || 'Khung giờ thường',
        startTime,
        endTime,
        price: Number(price),
        isPeak: Boolean(isPeak),
        dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
      },
    });

    return ApiResponse.created(res, { priceRule: rule }, 'Thêm khung giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/courts/price-rules/:ruleId
 * Cập nhật một khung giá (OWNER / ADMIN)
 */
async function updatePriceRule(req, res, next) {
  try {
    const { ruleId } = req.params;
    const { name, startTime, endTime, price, isPeak, dayOfWeek } = req.body;

    const rule = await prisma.priceRule.findUnique({
      where: { id: parseInt(ruleId) },
      include: { court: { include: { venue: true } } },
    });

    if (!rule) {
      return next(ApiError.notFound('Không tìm thấy khung giá'));
    }

    if (req.user.role !== 'ADMIN' && rule.court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền chỉnh sửa khung giá này'));
    }

    const updated = await prisma.priceRule.update({
      where: { id: parseInt(ruleId) },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(price !== undefined && { price: Number(price) }),
        ...(isPeak !== undefined && { isPeak: Boolean(isPeak) }),
        ...(dayOfWeek !== undefined && { dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null }),
      },
    });

    return ApiResponse.success(res, { priceRule: updated }, 'Cập nhật khung giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/courts/price-rules/:ruleId
 * Xoá một khung giá (OWNER / ADMIN)
 */
async function deletePriceRule(req, res, next) {
  try {
    const { ruleId } = req.params;

    const rule = await prisma.priceRule.findUnique({
      where: { id: parseInt(ruleId) },
      include: { court: { include: { venue: true } } },
    });

    if (!rule) {
      return next(ApiError.notFound('Không tìm thấy khung giá'));
    }

    if (req.user.role !== 'ADMIN' && rule.court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền xoá khung giá này'));
    }

    await prisma.priceRule.delete({ where: { id: parseInt(ruleId) } });

    return ApiResponse.success(res, null, 'Xoá khung giá thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/courts/:id/images
 * Upload hoặc thêm hình ảnh cho sân con (OWNER / ADMIN)
 */
async function addCourtImage(req, res, next) {
  try {
    const { id } = req.params;
    const courtId = parseInt(id);
    const { imageUrl, isPrimary } = req.body;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return next(ApiError.notFound('Không tìm thấy sân con'));
    }

    if (req.user.role !== 'ADMIN' && court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Bạn không có quyền thêm ảnh cho sân này'));
    }

    const finalUrl = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : imageUrl;
    if (!finalUrl) {
      return next(ApiError.badRequest('Vui lòng tải lên tệp ảnh hoặc cung cấp imageUrl'));
    }

    const image = await prisma.courtImage.create({
      data: {
        courtId,
        imageUrl: finalUrl,
        isPrimary: Boolean(isPrimary),
      },
    });

    return ApiResponse.created(res, { image }, 'Thêm hình ảnh sân thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  addPriceRule,
  updatePriceRule,
  deletePriceRule,
  addCourtImage,
};
