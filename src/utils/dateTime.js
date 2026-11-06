/**
 * Kiểm tra xem thời điểm đặt sân có nằm trong quá khứ không
 * @param {string|Date} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm (e.g. "17:00")
 * @returns {boolean} true nếu hợp lệ trong tương lai, false nếu quá khứ
 */
function isFutureDateTime(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = new Date(dateStr);
  targetDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  return targetDate.getTime() > now.getTime();
}

/**
 * Tính số giờ giữa start và end
 * @param {string} startTime "17:00"
 * @param {string} endTime "19:00"
 * @returns {number} 2.0
 */
function calculateDurationHours(startTime, endTime) {
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return diffMinutes > 0 ? diffMinutes / 60 : 0;
}

/**
 * Sinh mã đơn đặt sân ngẫu nhiên duy nhất
 * e.g. "SZ-20261103-8271"
 */
function generateBookingCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SZ-${dateStr}-${randomNum}`;
}

module.exports = {
  isFutureDateTime,
  calculateDurationHours,
  generateBookingCode,
};
