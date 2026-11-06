const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/sports
 * Lấy danh sách tất cả môn thể thao
 */
async function listSports(req, res, next) {
  try {
    const sports = await prisma.sport.findMany({
      include: {
        _count: { select: { venues: true } },
      },
      orderBy: { id: 'asc' },
    });

    return ApiResponse.success(res, { sports }, 'Lấy danh sách môn thể thao thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/sports
 * Tạo môn thể thao mới (ADMIN)
 */
async function createSport(req, res, next) {
  try {
    const { name, slug, description, icon } = req.body;

    if (!name || !slug) {
      return next(ApiError.badRequest('Vui lòng nhập tên và slug môn thể thao'));
    }

    const existing = await prisma.sport.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return next(ApiError.conflict('Tên hoặc slug môn thể thao đã tồn tại'));
    }

    const sport = await prisma.sport.create({
      data: { name, slug, description, icon },
    });

    return ApiResponse.created(res, { sport }, 'Thêm môn thể thao thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/sports/:id
 * Cập nhật môn thể thao (ADMIN)
 */
async function updateSport(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, description, icon } = req.body;

    const sport = await prisma.sport.findUnique({ where: { id: parseInt(id) } });
    if (!sport) {
      return next(ApiError.notFound('Không tìm thấy môn thể thao'));
    }

    const updated = await prisma.sport.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      },
    });

    return ApiResponse.success(res, { sport: updated }, 'Cập nhật môn thể thao thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/sports/:id
 * Xóa môn thể thao (ADMIN) - Từ chối nếu còn cụm sân đang sử dụng
 */
async function deleteSport(req, res, next) {
  try {
    const { id } = req.params;
    const sportId = parseInt(id);

    const sport = await prisma.sport.findUnique({
      where: { id: sportId },
      include: { _count: { select: { venues: true } } },
    });

    if (!sport) {
      return next(ApiError.notFound('Không tìm thấy môn thể thao'));
    }

    if (sport._count.venues > 0) {
      return next(
        ApiError.badRequest(
          `Không thể xóa môn thể thao "${sport.name}" vì đang có ${sport._count.venues} cụm sân sử dụng`
        )
      );
    }

    await prisma.sport.delete({ where: { id: sportId } });

    return ApiResponse.success(res, null, 'Xóa môn thể thao thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/sports/facilities
 * Lấy danh sách tất cả tiện ích sân
 */
async function listFacilities(req, res, next) {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { id: 'asc' },
    });

    return ApiResponse.success(res, { facilities }, 'Lấy danh sách tiện ích thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/sports/facilities
 * Tạo tiện ích mới (ADMIN)
 */
async function createFacility(req, res, next) {
  try {
    const { name, icon } = req.body;
    if (!name) {
      return next(ApiError.badRequest('Vui lòng nhập tên tiện ích'));
    }

    const existing = await prisma.facility.findUnique({ where: { name } });
    if (existing) {
      return next(ApiError.conflict('Tiện ích này đã tồn tại'));
    }

    const facility = await prisma.facility.create({
      data: { name, icon },
    });

    return ApiResponse.created(res, { facility }, 'Thêm tiện ích thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSports,
  createSport,
  updateSport,
  deleteSport,
  listFacilities,
  createFacility,
};

