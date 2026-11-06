const crypto = require('crypto');
const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { CLIENT_URL, BASE_URL } = require('../config/environment');

const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || 'SPORTZONEVNPAYSANDBOXSECRET2026';
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || 'SPORTZ01';
const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

/**
 * POST /api/v1/payments/create-url
 * Tạo URL thanh toán VNPay Sandbox hoặc đổi phương thức thanh toán cho đơn đặt sân
 */
async function createPaymentUrl(req, res, next) {
  try {
    const { bookingId, paymentMethod = 'VNPAY' } = req.body;

    if (!bookingId) {
      return next(ApiError.badRequest('Vui lòng cung cấp bookingId'));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { payment: true, court: { include: { venue: true } } },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy đơn đặt sân'));
    }

    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(ApiError.forbidden('Bạn không có quyền thanh toán đơn này'));
    }

    if (booking.payment && booking.payment.status === 'PAID') {
      return next(ApiError.badRequest('Đơn đặt sân này đã được thanh toán'));
    }

    const txnRef = `${booking.bookingCode}-${Date.now().toString().slice(-4)}`;
    const amount = Number(booking.totalAmount);

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        paymentMethod,
        transactionId: txnRef,
      },
      create: {
        bookingId: booking.id,
        amount,
        paymentMethod,
        transactionId: txnRef,
        status: 'UNPAID',
      },
    });

    // Nếu chọn thanh toán tiền mặt tại sân
    if (paymentMethod === 'CASH') {
      return ApiResponse.success(
        res,
        {
          bookingId: booking.id,
          paymentMethod: 'CASH',
          paymentUrl: null,
        },
        'Đã ghi nhận phương thức thanh toán tại sân'
      );
    }

    // Sinh chữ ký HMAC SHA512 cho VNPay Sandbox
    const createDate = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);
    const returnUrl = `${BASE_URL}/api/v1/payments/vnpay-return`;

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNP_TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don dat san ${booking.bookingCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${VNP_URL}?${signData}&vnp_SecureHash=${signed}`;

    return ApiResponse.success(
      res,
      {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount,
        transactionId: txnRef,
        paymentUrl,
        sandboxSimulateUrl: `${BASE_URL}/api/v1/payments/${booking.id}/pay`,
      },
      'Tạo đường dẫn thanh toán VNPay thành công'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/payments/vnpay-return
 * Xử lý kết quả trả về từ cổng VNPay
 */
async function vnpayReturn(req, res, next) {
  try {
    const vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash && secureHash !== signed) {
      return next(ApiError.badRequest('Chữ ký VNPay không hợp lệ! Từ chối xác nhận giao dịch.'));
    }

    const txnRef = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;

    const payment = await prisma.payment.findFirst({
      where: { transactionId: txnRef },
      include: { booking: true },
    });

    if (!payment) {
      return next(ApiError.notFound('Không tìm thấy giao dịch thanh toán tương ứng'));
    }

    if (responseCode === '00') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paymentTime: new Date() },
        }),
        prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        }),
        prisma.notification.create({
          data: {
            userId: payment.booking.userId,
            title: 'Thanh toán thành công',
            message: `Đơn đặt sân ${payment.booking.bookingCode} đã được thanh toán thành công qua VNPay.`,
            type: 'PAYMENT',
          },
        }),
      ]);

      return ApiResponse.success(
        res,
        { bookingCode: payment.booking.bookingCode, status: 'PAID' },
        'Giao dịch thanh toán VNPay thành công'
      );
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      return next(ApiError.badRequest('Giao dịch thanh toán thất bại hoặc bị hủy bởi người dùng'));
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/payments/:bookingId/pay
 * Xác nhận thanh toán đơn đặt sân (Hỗ trợ khách hàng giả lập thanh toán Sandbox hoặc Chủ sân thu tiền)
 */
async function confirmPayment(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { paymentMethod = 'VNPAY', transactionId } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { payment: true, court: { include: { venue: true } } },
    });

    if (!booking) {
      return next(ApiError.notFound('Không tìm thấy đơn đặt sân'));
    }

    if (
      req.user.role !== 'ADMIN' &&
      booking.userId !== req.user.id &&
      booking.court.venue.ownerId !== req.user.id
    ) {
      return next(ApiError.forbidden('Bạn không có quyền xác nhận thanh toán cho đơn này'));
    }

    if (booking.payment && booking.payment.status === 'PAID') {
      return next(ApiError.badRequest('Đơn đặt sân này đã được thanh toán trước đó'));
    }

    const txnId = transactionId || `VNP-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          status: 'PAID',
          paymentMethod,
          transactionId: txnId,
          paymentTime: new Date(),
        },
        create: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          paymentMethod,
          transactionId: txnId,
          status: 'PAID',
          paymentTime: new Date(),
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: 'Xác nhận thanh toán thành công',
          message: `Đơn đặt sân ${booking.bookingCode} đã được thanh toán (${Number(booking.totalAmount).toLocaleString()}đ). Lịch đặt đã được xác nhận!`,
          type: 'PAYMENT',
        },
      });

      return { payment, booking: updatedBooking };
    });

    return ApiResponse.success(res, result, 'Thanh toán và xác nhận lịch đặt sân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/payments/:bookingId/refund
 * Xử lý hoàn tiền cọc (OWNER / ADMIN)
 */
async function refundPayment(req, res, next) {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { payment: true, court: { include: { venue: true } } },
    });

    if (!booking || !booking.payment) {
      return next(ApiError.notFound('Không tìm thấy thông tin thanh toán của đơn này'));
    }

    if (req.user.role !== 'ADMIN' && booking.court.venue.ownerId !== req.user.id) {
      return next(ApiError.forbidden('Chỉ Quản trị viên hoặc Chủ sân mới có quyền duyệt hoàn tiền'));
    }

    if (booking.payment.status !== 'PAID') {
      return next(ApiError.badRequest('Chỉ có thể hoàn tiền cho giao dịch đã thanh toán (PAID)'));
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { bookingId: booking.id },
        data: { status: 'REFUNDED' },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: 'Hoàn tiền thành công',
          message: `Giao dịch của đơn đặt sân ${booking.bookingCode} đã được hoàn tiền.`,
          type: 'PAYMENT',
        },
      });

      return p;
    });

    return ApiResponse.success(res, { payment: updatedPayment }, 'Hoàn tiền cho đơn đặt sân thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPaymentUrl,
  vnpayReturn,
  confirmPayment,
  refundPayment,
};

