/**
 * SportZone Frontend API Client
 * Kết nối trực tiếp tới Backend Express (/api/v1)
 * Tích hợp cơ chế Fallback thông minh nếu MySQL chưa khởi chạy để đảm bảo Demo luôn hoạt động 100%
 */

const API_BASE = window.location.port === '5173'
  ? 'http://localhost:5000/api/v1'
  : '/api/v1';

// Dữ liệu chuẩn đồng bộ với src/prisma/seed.js (dùng khi MySQL chưa bật)
const INITIAL_FALLBACK_STATE = {
  users: [
    { id: 1, fullName: 'Quản Trị Viên SportZone', email: 'admin@sportzone.vn', phone: '0901000001', password: 'password123', role: 'ADMIN', status: 'ACTIVE' },
    { id: 2, fullName: 'Chủ Sân EPU Arena', email: 'epu.arena@gmail.com', phone: '0987654321', password: 'password123', role: 'OWNER', status: 'ACTIVE' },
    { id: 3, fullName: 'Chủ CLB Hồ Tùng Mậu', email: 'hotungmau.badminton@gmail.com', phone: '0912345678', password: 'password123', role: 'OWNER', status: 'ACTIVE' },
    { id: 4, fullName: 'Nguyễn Công Sơn', email: 'son.nguyen@gmail.com', phone: '0981031010', password: 'password123', role: 'CUSTOMER', status: 'ACTIVE' },
    { id: 5, fullName: 'Nguyễn Văn Quang', email: 'quang.nguyen@gmail.com', phone: '0981031020', password: 'password123', role: 'CUSTOMER', status: 'ACTIVE' },
  ],
  sports: [
    { id: 1, name: 'Pickleball', slug: 'pickleball', description: 'Môn thể thao vợt phát triển nhanh nhất thế giới, kết hợp giữa quần vợt, bóng bàn và cầu lông.', icon: '🏓', _count: { venues: 2 } },
    { id: 2, name: 'Cầu lông', slug: 'cau-long', description: 'Cầu lông phong trào và thi đấu chuyên nghiệp với thảm PVC Taraflex đạt chuẩn.', icon: '🏸', _count: { venues: 1 } },
    { id: 3, name: 'Bóng đá mini', slug: 'bong-da-mini', description: 'Sân bóng cỏ nhân tạo 5 người và 7 người, hệ thống thoát nước hiện đại.', icon: '⚽', _count: { venues: 1 } },
  ],
  facilities: [
    { id: 1, name: 'Đèn chiếu sáng tiêu chuẩn 800 Lux', icon: 'Lightbulb' },
    { id: 2, name: 'Wifi tốc độ cao miễn phí', icon: 'Wifi' },
    { id: 3, name: 'Bãi đỗ ô tô rộng rãi', icon: 'Car' },
    { id: 4, name: 'Căn tin máy lạnh & nước uống', icon: 'Coffee' },
    { id: 5, name: 'Phòng thay đồ & tắm nóng lạnh', icon: 'Bath' },
  ],
  venues: [
    {
      id: 1,
      ownerId: 2,
      sportId: 1,
      name: 'Cụm Sân Pickleball Điện Lực (EPU Arena)',
      slug: 'epu-arena-pickleball',
      address: '235 Hoàng Quốc Việt, Cổ Nhuế 1',
      district: 'Bắc Từ Liêm',
      city: 'Hà Nội',
      description: 'Cụm 6 sân Pickleball tiêu chuẩn quốc tế USAPA, thảm thi đấu giảm chấn cao cấp, có mái che vòm thép.',
      phone: '0987654321',
      openTime: '06:00',
      closeTime: '23:00',
      ratingAvg: 4.9,
      reviewCount: 2,
      status: 'APPROVED',
      facilityIds: [1, 2, 3, 4, 5],
    },
    {
      id: 2,
      ownerId: 3,
      sportId: 2,
      name: 'CLB Cầu Lông Hồ Tùng Mậu',
      slug: 'clb-cau-long-ho-tung-mau',
      address: '126 Hồ Tùng Mậu, Mai Dịch',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
      description: '8 sân thảm Taraflex dày 4.5mm, trần cao 11m thoáng mát, không chói đèn, đỗ ô tô thoải mái.',
      phone: '0912345678',
      openTime: '06:00',
      closeTime: '23:00',
      ratingAvg: 4.8,
      reviewCount: 1,
      status: 'APPROVED',
      facilityIds: [1, 2, 3],
    },
    {
      id: 3,
      ownerId: 2,
      sportId: 3,
      name: 'Tổ Hợp Bóng Đá Mini Thành Phát',
      slug: 'bong-da-mini-thanh-phat',
      address: '2 Hoàng Minh Giám, Trung Hòa',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
      description: 'Cụm 4 sân cỏ nhân tạo chuẩn FIFA, hệ thống đèn LED chống lóa mới nâng cấp năm 2026.',
      phone: '0987654321',
      openTime: '06:00',
      closeTime: '23:00',
      ratingAvg: 4.7,
      reviewCount: 18,
      status: 'APPROVED',
      facilityIds: [1, 2, 3, 4],
    },
  ],
  courts: [
    {
      id: 1,
      venueId: 1,
      name: 'Sân 1 (VIP - Có mái che)',
      courtType: 'Thảm Cushion chuyên dụng',
      isCovered: true,
      status: 'ACTIVE',
      images: [{ id: 1, imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80', isPrimary: true }],
      priceRules: [
        { id: 1, courtId: 1, name: 'Giờ thường ban ngày', startTime: '06:00', endTime: '17:00', price: 150000, isPeak: false },
        { id: 2, courtId: 1, name: 'Giờ vàng cao điểm', startTime: '17:00', endTime: '22:00', price: 220000, isPeak: true },
        { id: 3, courtId: 1, name: 'Giờ đêm', startTime: '22:00', endTime: '23:00', price: 140000, isPeak: false },
      ],
    },
    {
      id: 2,
      venueId: 1,
      name: 'Sân 2 (Tiêu chuẩn ngoài trời)',
      courtType: 'Mặt sơn Acrylic USAPA',
      isCovered: false,
      status: 'ACTIVE',
      images: [{ id: 2, imageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80', isPrimary: true }],
      priceRules: [
        { id: 4, courtId: 2, name: 'Giờ thường ban ngày', startTime: '06:00', endTime: '17:00', price: 130000, isPeak: false },
        { id: 5, courtId: 2, name: 'Giờ vàng cao điểm', startTime: '17:00', endTime: '23:00', price: 190000, isPeak: true },
      ],
    },
    {
      id: 3,
      venueId: 2,
      name: 'Sân A1 (Thảm Taraflex Đỏ)',
      courtType: 'Taraflex 4.5mm',
      isCovered: true,
      status: 'ACTIVE',
      images: [{ id: 3, imageUrl: 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80', isPrimary: true }],
      priceRules: [
        { id: 6, courtId: 3, name: 'Giờ hành chính', startTime: '06:00', endTime: '17:00', price: 110000, isPeak: false },
        { id: 7, courtId: 3, name: 'Giờ vàng tối', startTime: '17:00', endTime: '23:00', price: 160000, isPeak: true },
      ],
    },
    {
      id: 4,
      venueId: 3,
      name: 'Sân Bóng 7 Người Số 1',
      courtType: 'Cỏ nhân tạo 50mm',
      isCovered: false,
      status: 'ACTIVE',
      images: [{ id: 4, imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=900&q=80', isPrimary: true }],
      priceRules: [
        { id: 8, courtId: 4, name: 'Khung giờ ngày', startTime: '06:00', endTime: '17:00', price: 350000, isPeak: false },
        { id: 9, courtId: 4, name: 'Khung giờ vàng tối', startTime: '17:00', endTime: '23:00', price: 600000, isPeak: true },
      ],
    },
  ],
  coupons: [
    {
      id: 1,
      code: 'CHAOBANMOI',
      discountPercent: 10,
      maxDiscount: 50000,
      minOrderAmount: 100000,
      validFrom: '2026-01-01',
      validUntil: '2027-12-31',
      usageLimit: 500,
      usedCount: 12,
      isActive: true,
    },
  ],
  bookings: [
    {
      id: 101,
      bookingCode: 'SZ-20261105-8821',
      userId: 4,
      courtId: 1,
      bookingDate: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      endTime: '20:00',
      totalAmount: 440000,
      depositAmount: 132000,
      note: 'Chuẩn bị giúp mình 4 vợt thuê tại sân',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      payment: { id: 1, bookingId: 101, amount: 440000, paymentMethod: 'VNPAY', transactionId: 'VNP-1482910', status: 'PAID', paymentTime: new Date().toISOString() },
    },
    {
      id: 102,
      bookingCode: 'SZ-20261106-3910',
      userId: 4,
      courtId: 1,
      bookingDate: new Date().toISOString().slice(0, 10),
      startTime: '20:00',
      endTime: '21:00',
      totalAmount: 220000,
      depositAmount: 66000,
      note: 'Đặt lịch giao lưu câu lạc bộ',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      payment: { id: 2, bookingId: 102, amount: 220000, paymentMethod: 'VNPAY', transactionId: null, status: 'UNPAID' },
    },
  ],
  reviews: [
    {
      id: 1,
      bookingId: 101,
      userId: 4,
      courtId: 1,
      rating: 5,
      comment: 'Mặt sân Pickleball EPU rất mới, độ nảy chuẩn, mái che cao thoáng không sợ mưa nắng!',
      reply: 'Cảm ơn bạn Sơn đã ủng hộ EPU Arena! Hẹn gặp lại đội bạn vào tuần tới nhé.',
      replyAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ],
  notifications: [
    {
      id: 1,
      userId: 4,
      title: 'Chào mừng đến với SportZone!',
      message: 'Nhập mã CHAOBANMOI để được giảm ngay 10% (tối đa 50.000đ) khi đặt sân trực tuyến.',
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

function getFallbackDB() {
  const raw = localStorage.getItem('sportzone_fallback_db_v1');
  if (!raw) {
    localStorage.setItem('sportzone_fallback_db_v1', JSON.stringify(INITIAL_FALLBACK_STATE));
    return JSON.parse(JSON.stringify(INITIAL_FALLBACK_STATE));
  }
  return JSON.parse(raw);
}

function saveFallbackDB(db) {
  localStorage.setItem('sportzone_fallback_db_v1', JSON.stringify(db));
}

function hydrateVenue(db, v) {
  const sport = db.sports.find((s) => s.id === v.sportId) || db.sports[0];
  const owner = db.users.find((u) => u.id === v.ownerId) || db.users[1];
  const courts = db.courts
    .filter((c) => c.venueId === v.id)
    .map((c) => ({
      ...c,
      reviews: db.reviews
        .filter((r) => r.courtId === c.id)
        .map((r) => ({ ...r, user: db.users.find((u) => u.id === r.userId) })),
    }));
  const venueFacilities = (v.facilityIds || [1, 2, 3]).map((fid) => ({
    facilityId: fid,
    facility: db.facilities.find((f) => f.id === fid) || db.facilities[0],
  }));
  return {
    ...v,
    sport,
    owner,
    courts,
    venueFacilities,
    _count: { courts: courts.length },
  };
}

function hydrateBooking(db, b) {
  const court = db.courts.find((c) => c.id === b.courtId) || db.courts[0];
  const venue = db.venues.find((v) => v.id === court.venueId) || db.venues[0];
  const user = db.users.find((u) => u.id === b.userId) || db.users[3];
  const review = db.reviews.find((r) => r.bookingId === b.id) || null;
  return {
    ...b,
    user,
    review,
    court: {
      ...court,
      venue,
    },
  };
}

const api = {
  isFallbackMode: false,

  getToken() {
    return localStorage.getItem('sportzone_token');
  },

  setAuth(token, user) {
    if (token) localStorage.setItem('sportzone_token', token);
    if (user) localStorage.setItem('sportzone_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('sportzone_token');
    localStorage.removeItem('sportzone_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('sportzone_user');
    return raw ? JSON.parse(raw) : null;
  },

  updateStatusBadge(mode) {
    const badge = document.getElementById('api-status-badge');
    if (!badge) return;
    if (mode === 'live') {
      badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>SQL Server Connected</span>';
    } else {
      badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Offline Demo Mode</span>';
    }
  },

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      const json = await response.json();

      // Token sai / hết hạn (vd: token demo cũ còn lưu trong trình duyệt) -> tự đăng xuất
      if (response.status === 401 && token && !path.startsWith('/auth/login')) {
        this.clearAuth();
        if (window.app) window.app.handleSessionExpired();
        throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      }

      // Nếu lỗi 500 do MySQL chưa bật (Can't reach database server), chuyển sang Fallback Handler
      if (
        response.status === 500 &&
        json.message &&
        (json.message.includes('prismaclient') ||
          json.message.includes('database') ||
          json.message.includes('Can\'t reach') ||
          json.message.includes('Invalid `prisma'))
      ) {
        this.isFallbackMode = true;
        this.updateStatusBadge('demo');
        return this.handleFallback(path, options);
      }

      if (!response.ok) {
        throw new Error(json.message || 'Có lỗi xảy ra');
      }

      this.isFallbackMode = false;
      this.updateStatusBadge('live');
      return json.data;
    } catch (err) {
      // Nếu lỗi mạng hoặc lỗi kết nối DB
      if (err.message.includes('Failed to fetch') || this.isFallbackMode) {
        this.isFallbackMode = true;
        this.updateStatusBadge('demo');
        return this.handleFallback(path, options);
      }
      throw err;
    }
  },

  /**
   * Xử lý đầy đủ nghiệp vụ khi MySQL chưa bật để việc trải nghiệm/bảo vệ đồ án luôn hoạt động 100%
   */
  handleFallback(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const db = getFallbackDB();
    const currentUser = this.getCurrentUser();

    const [cleanPath, queryString] = path.split('?');
    const params = new URLSearchParams(queryString || '');

    // 1. AUTH
    if (cleanPath === '/auth/login' && method === 'POST') {
      const user = db.users.find(
        (u) => u.email.toLowerCase() === (body.email || '').trim().toLowerCase() && u.password === body.password
      );
      if (!user) throw new Error('Email hoặc mật khẩu không chính xác');
      if (user.status !== 'ACTIVE') throw new Error('Tài khoản đã bị khóa hoặc chưa kích hoạt');
      const token = `demo-jwt-token-${user.id}`;
      return { user, token };
    }

    if (cleanPath === '/auth/register' && method === 'POST') {
      const exists = db.users.find((u) => u.email === body.email || u.phone === body.phone);
      if (exists) throw new Error('Email hoặc số điện thoại đã được sử dụng');
      const newUser = {
        id: Date.now(),
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        password: body.password,
        role: body.role || 'CUSTOMER',
        status: 'ACTIVE',
      };
      db.users.push(newUser);
      saveFallbackDB(db);
      return { user: newUser, token: `demo-jwt-token-${newUser.id}` };
    }

    if (cleanPath === '/auth/profile' && method === 'PUT') {
      const idx = db.users.findIndex((u) => u.id === currentUser.id);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...body };
        saveFallbackDB(db);
        return { user: db.users[idx] };
      }
    }

    // 2. SPORTS & FACILITIES
    if (cleanPath === '/sports' && method === 'GET') {
      return {
        sports: db.sports.map((s) => ({
          ...s,
          _count: { venues: db.venues.filter((v) => v.sportId === s.id).length },
        })),
      };
    }

    if (cleanPath === '/sports' && method === 'POST') {
      const sport = { id: Date.now(), ...body, _count: { venues: 0 } };
      db.sports.push(sport);
      saveFallbackDB(db);
      return { sport };
    }

    if (cleanPath.startsWith('/sports/') && method === 'DELETE') {
      const sportId = parseInt(cleanPath.split('/')[2]);
      const inUse = db.venues.filter((v) => v.sportId === sportId).length;
      if (inUse > 0) {
        throw new Error(`Không thể xóa môn thể thao này vì đang có ${inUse} cụm sân sử dụng`);
      }
      db.sports = db.sports.filter((s) => s.id !== sportId);
      saveFallbackDB(db);
      return null;
    }

    if (cleanPath === '/sports/facilities' && method === 'GET') {
      return { facilities: db.facilities };
    }

    // 3. VENUES
    if (cleanPath === '/venues' && method === 'GET') {
      const search = (params.get('search') || '').toLowerCase();
      const sport = params.get('sport') || '';
      const district = (params.get('district') || '').toLowerCase();

      const filtered = db.venues
        .filter((v) => v.status === 'APPROVED')
        .map((v) => hydrateVenue(db, v))
        .filter((v) => {
          if (sport && v.sport.slug !== sport) return false;
          if (district && !v.district.toLowerCase().includes(district)) return false;
          if (
            search &&
            !v.name.toLowerCase().includes(search) &&
            !v.address.toLowerCase().includes(search) &&
            !v.district.toLowerCase().includes(search)
          ) {
            return false;
          }
          return true;
        });

      return { venues: filtered, pagination: { page: 1, limit: 10, total: filtered.length } };
    }

    if (cleanPath === '/venues/owner/me' && method === 'GET') {
      const venues = db.venues
        .filter((v) => currentUser.role === 'ADMIN' || v.ownerId === currentUser.id)
        .map((v) => hydrateVenue(db, v));
      return { venues };
    }

    if (cleanPath.match(/^\/venues\/\d+\/availability$/) && method === 'GET') {
      const venueId = parseInt(cleanPath.split('/')[2]);
      const dateStr = params.get('date') || new Date().toISOString().slice(0, 10);
      const venue = db.venues.find((v) => v.id === venueId);
      if (!venue) throw new Error('Không tìm thấy cụm sân');

      const openHour = parseInt((venue.openTime || '06:00').split(':')[0], 10);
      const closeHour = parseInt((venue.closeTime || '23:00').split(':')[0], 10);
      const courts = db.courts.filter((c) => c.venueId === venueId && c.status === 'ACTIVE');

      const courtsAvailability = courts.map((court) => {
        const courtBookings = db.bookings.filter(
          (b) =>
            b.courtId === court.id &&
            b.bookingDate.slice(0, 10) === dateStr &&
            !['CANCELLED', 'REJECTED'].includes(b.status)
        );
        const slots = [];
        for (let h = openHour; h < closeHour; h++) {
          const slotStart = `${String(h).padStart(2, '0')}:00`;
          const slotEnd = `${String(h + 1).padStart(2, '0')}:00`;
          const bookedItem = courtBookings.find(
            (b) => slotStart < b.endTime && slotEnd > b.startTime
          );
          const rule = (court.priceRules || []).find(
            (r) => slotStart >= r.startTime && slotStart < r.endTime
          );
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            price: rule ? Number(rule.price) : 150000,
            isPeak: rule ? Boolean(rule.isPeak) : false,
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

      return {
        venueId: venue.id,
        venueName: venue.name,
        date: dateStr,
        openTime: venue.openTime,
        closeTime: venue.closeTime,
        courts: courtsAvailability,
      };
    }

    if (cleanPath.startsWith('/venues/') && method === 'GET') {
      const slugOrId = cleanPath.split('/')[2];
      const v = db.venues.find((item) => item.slug === slugOrId || String(item.id) === slugOrId);
      if (!v) throw new Error('Không tìm thấy cụm sân');
      return { venue: hydrateVenue(db, v) };
    }

    if (cleanPath === '/venues' && method === 'POST') {
      const slug = body.slug || `cum-san-${Date.now().toString().slice(-4)}`;
      const newVenue = {
        id: Date.now(),
        ownerId: currentUser.id,
        sportId: parseInt(body.sportId),
        name: body.name,
        slug,
        address: body.address,
        district: body.district,
        city: body.city || 'Hà Nội',
        description: body.description,
        phone: body.phone,
        openTime: body.openTime || '06:00',
        closeTime: body.closeTime || '23:00',
        ratingAvg: 5.0,
        reviewCount: 0,
        status: currentUser.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
        facilityIds: body.facilityIds || [1, 2],
      };
      db.venues.push(newVenue);
      saveFallbackDB(db);
      return { venue: hydrateVenue(db, newVenue) };
    }

    // 4. COURTS
    if (cleanPath === '/courts' && method === 'POST') {
      const newCourt = {
        id: Date.now(),
        venueId: parseInt(body.venueId),
        name: body.name,
        courtType: body.courtType || 'Standard',
        isCovered: body.isCovered !== false,
        status: 'ACTIVE',
        images: body.images || [],
        priceRules: body.priceRules || [
          { id: Date.now() + 1, name: 'Giờ thường', startTime: '06:00', endTime: '17:00', price: 140000, isPeak: false },
          { id: Date.now() + 2, name: 'Giờ cao điểm', startTime: '17:00', endTime: '23:00', price: 200000, isPeak: true },
        ],
      };
      db.courts.push(newCourt);
      saveFallbackDB(db);
      return { court: newCourt };
    }

    if (cleanPath.startsWith('/courts/') && method === 'PUT') {
      const courtId = parseInt(cleanPath.split('/')[2]);
      const idx = db.courts.findIndex((c) => c.id === courtId);
      if (idx === -1) throw new Error('Không tìm thấy sân con');
      db.courts[idx] = { ...db.courts[idx], ...body };
      saveFallbackDB(db);
      return { court: db.courts[idx] };
    }

    if (cleanPath.startsWith('/courts/') && method === 'DELETE') {
      const courtId = parseInt(cleanPath.split('/')[2]);
      const activeCount = db.bookings.filter(
        (b) => b.courtId === courtId && ['PENDING', 'CONFIRMED'].includes(b.status)
      ).length;
      if (activeCount > 0) {
        throw new Error(`Không thể xóa sân con vì đang có ${activeCount} lịch đặt đang hoạt động`);
      }
      db.courts = db.courts.filter((c) => c.id !== courtId);
      saveFallbackDB(db);
      return null;
    }

    // 5. COUPONS
    if (cleanPath === '/coupons' && method === 'GET') {
      return { coupons: db.coupons.filter((c) => c.isActive) };
    }

    if (cleanPath === '/coupons/apply' && method === 'POST') {
      const coupon = db.coupons.find(
        (c) => c.code === (body.code || '').trim().toUpperCase() && c.isActive
      );
      if (!coupon) throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn');
      const amount = Number(body.orderAmount || 0);
      if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
        throw new Error(`Đơn hàng tối thiểu ${coupon.minOrderAmount.toLocaleString()}đ để áp dụng mã này`);
      }
      let discountAmount = (amount * coupon.discountPercent) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
      return { coupon, discountAmount, finalAmount: Math.max(0, amount - discountAmount) };
    }

    // 6. BOOKINGS
    if (cleanPath === '/bookings' && method === 'POST') {
      const courtId = parseInt(body.courtId);
      const court = db.courts.find((c) => c.id === courtId);
      if (!court) throw new Error('Không tìm thấy sân con');

      // Kiểm tra chống trùng lịch (Anti-overbooking)
      const conflict = db.bookings.find(
        (b) =>
          b.courtId === courtId &&
          b.bookingDate.slice(0, 10) === body.bookingDate.slice(0, 10) &&
          !['CANCELLED', 'REJECTED'].includes(b.status) &&
          body.startTime < b.endTime &&
          body.endTime > b.startTime
      );
      if (conflict) {
        throw new Error('Khung giờ bạn chọn vừa có người đặt trước! Vui lòng chọn khung giờ khác.');
      }

      const [h1] = body.startTime.split(':').map(Number);
      const [h2] = body.endTime.split(':').map(Number);
      const duration = Math.max(1, h2 - h1);
      const rule = (court.priceRules || []).find(
        (r) => body.startTime >= r.startTime && body.startTime < r.endTime
      );
      const unitPrice = rule ? Number(rule.price) : 150000;
      let totalAmount = unitPrice * duration;

      if (body.couponCode) {
        const coupon = db.coupons.find(
          (c) => c.code === body.couponCode.trim().toUpperCase() && c.isActive
        );
        if (coupon) {
          let disc = (totalAmount * coupon.discountPercent) / 100;
          if (coupon.maxDiscount && disc > coupon.maxDiscount) disc = coupon.maxDiscount;
          totalAmount -= disc;
        }
      }

      const newBooking = {
        id: Date.now(),
        bookingCode: `SZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: currentUser.id,
        courtId,
        bookingDate: body.bookingDate,
        startTime: body.startTime,
        endTime: body.endTime,
        totalAmount,
        depositAmount: Math.round(totalAmount * 0.3),
        note: body.note || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        payment: {
          id: Date.now() + 1,
          amount: totalAmount,
          paymentMethod: body.paymentMethod || 'VNPAY',
          status: 'UNPAID',
        },
      };

      db.bookings.unshift(newBooking);
      db.notifications.unshift({
        id: Date.now() + 2,
        userId: currentUser.id,
        title: 'Đặt sân thành công',
        message: `Đơn ${newBooking.bookingCode} (${court.name}) khung giờ ${body.startTime}-${body.endTime} ngày ${body.bookingDate} đã được ghi nhận.`,
        type: 'BOOKING',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      saveFallbackDB(db);
      return { booking: hydrateBooking(db, newBooking) };
    }

    if (cleanPath === '/bookings/me' && method === 'GET') {
      const bookings = db.bookings
        .filter((b) => b.userId === currentUser.id)
        .map((b) => hydrateBooking(db, b));
      return { bookings };
    }

    if (cleanPath === '/bookings/owner' && method === 'GET') {
      const bookings = db.bookings
        .map((b) => hydrateBooking(db, b))
        .filter((b) => currentUser.role === 'ADMIN' || b.court.venue.ownerId === currentUser.id);
      return { bookings };
    }

    if (cleanPath.match(/^\/bookings\/\d+\/cancel$/) && method === 'POST') {
      const bookingId = parseInt(cleanPath.split('/')[2]);
      const idx = db.bookings.findIndex((b) => b.id === bookingId);
      if (idx === -1) throw new Error('Không tìm thấy đơn đặt sân');
      db.bookings[idx].status = 'CANCELLED';
      if (db.bookings[idx].payment && db.bookings[idx].payment.status === 'PAID') {
        db.bookings[idx].payment.status = 'REFUNDED';
      }
      saveFallbackDB(db);
      return { isEligibleForRefund: true };
    }

    if (cleanPath.match(/^\/bookings\/\d+\/status$/) && method === 'PATCH') {
      const bookingId = parseInt(cleanPath.split('/')[2]);
      const idx = db.bookings.findIndex((b) => b.id === bookingId);
      if (idx === -1) throw new Error('Không tìm thấy đơn đặt sân');
      db.bookings[idx].status = body.status;
      if (body.status === 'COMPLETED' && db.bookings[idx].payment) {
        db.bookings[idx].payment.status = 'PAID';
      }
      saveFallbackDB(db);
      return { booking: hydrateBooking(db, db.bookings[idx]) };
    }

    // 7. PAYMENTS
    if (cleanPath.match(/^\/payments\/\d+\/pay$/) && method === 'POST') {
      const bookingId = parseInt(cleanPath.split('/')[2]);
      const idx = db.bookings.findIndex((b) => b.id === bookingId);
      if (idx === -1) throw new Error('Không tìm thấy đơn đặt sân');
      db.bookings[idx].status = 'CONFIRMED';
      db.bookings[idx].payment = {
        ...(db.bookings[idx].payment || {}),
        status: 'PAID',
        paymentMethod: body.paymentMethod || 'VNPAY',
        transactionId: `VNP-${Date.now()}`,
        paymentTime: new Date().toISOString(),
      };
      db.notifications.unshift({
        id: Date.now(),
        userId: db.bookings[idx].userId,
        title: 'Thanh toán VNPay thành công',
        message: `Đơn ${db.bookings[idx].bookingCode} đã thanh toán thành công và được xác nhận lịch sân.`,
        type: 'PAYMENT',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      saveFallbackDB(db);
      return { booking: db.bookings[idx], payment: db.bookings[idx].payment };
    }

    // 8. REVIEWS
    if (cleanPath === '/reviews' && method === 'POST') {
      const booking = db.bookings.find((b) => b.id === parseInt(body.bookingId));
      if (!booking) throw new Error('Không tìm thấy đơn đặt sân');
      if (booking.status !== 'COMPLETED') {
        throw new Error('Chỉ có thể đánh giá sau khi trận đấu đã hoàn thành (COMPLETED)');
      }
      const newReview = {
        id: Date.now(),
        bookingId: booking.id,
        userId: currentUser.id,
        courtId: booking.courtId,
        rating: parseInt(body.rating),
        comment: body.comment,
        createdAt: new Date().toISOString(),
      };
      db.reviews.unshift(newReview);
      saveFallbackDB(db);
      return { review: newReview };
    }

    if (cleanPath.match(/^\/reviews\/\d+\/reply$/) && method === 'PATCH') {
      const reviewId = parseInt(cleanPath.split('/')[2]);
      const idx = db.reviews.findIndex((r) => r.id === reviewId);
      if (idx !== -1) {
        db.reviews[idx].reply = body.reply;
        db.reviews[idx].replyAt = new Date().toISOString();
        saveFallbackDB(db);
        return { review: db.reviews[idx] };
      }
    }

    // 9. NOTIFICATIONS
    if (cleanPath === '/notifications' && method === 'GET') {
      const list = db.notifications.filter((n) => !currentUser || n.userId === currentUser.id);
      return {
        notifications: list,
        unreadCount: list.filter((n) => !n.isRead).length,
      };
    }

    if (cleanPath === '/notifications/read-all' && method === 'PATCH') {
      db.notifications.forEach((n) => {
        if (currentUser && n.userId === currentUser.id) n.isRead = true;
      });
      saveFallbackDB(db);
      return null;
    }

    // 10. OWNER & ADMIN STATS
    if (cleanPath === '/owner/stats' && method === 'GET') {
      const myVenues = db.venues.filter((v) => currentUser.role === 'ADMIN' || v.ownerId === currentUser.id);
      const myVenueIds = myVenues.map((v) => v.id);
      const myCourts = db.courts.filter((c) => myVenueIds.includes(c.venueId));
      const myBookings = db.bookings
        .map((b) => hydrateBooking(db, b))
        .filter((b) => myVenueIds.includes(b.court.venueId));
      const totalRevenue = myBookings
        .filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalAmount), 0);

      return {
        summary: {
          totalVenues: myVenues.length,
          totalCourts: myCourts.length,
          totalBookings: myBookings.length,
          completedBookings: myBookings.filter((b) => b.status === 'COMPLETED').length,
          cancelledBookings: myBookings.filter((b) => b.status === 'CANCELLED').length,
          totalRevenue,
        },
        recentBookings: myBookings,
      };
    }

    if (cleanPath === '/admin/stats' && method === 'GET') {
      const totalRevenue = db.bookings
        .filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalAmount), 0);
      return {
        summary: {
          totalUsers: db.users.length,
          totalVenues: db.venues.length,
          pendingVenues: db.venues.filter((v) => v.status === 'PENDING').length,
          totalCourts: db.courts.length,
          totalBookings: db.bookings.length,
          totalRevenue,
        },
        recentBookings: db.bookings.map((b) => hydrateBooking(db, b)),
      };
    }

    if (cleanPath === '/admin/users' && method === 'GET') {
      return {
        users: db.users.map((u) => ({ ...u, role: { name: u.role } })),
      };
    }

    if (cleanPath.match(/^\/admin\/users\/\d+\/status$/) && method === 'PATCH') {
      const targetId = parseInt(cleanPath.split('/')[3]);
      if (currentUser && targetId === currentUser.id && body.status !== 'ACTIVE') {
        throw new Error('Quản trị viên không thể tự khóa tài khoản của chính mình');
      }
      const idx = db.users.findIndex((u) => u.id === targetId);
      if (idx !== -1) {
        db.users[idx].status = body.status;
        saveFallbackDB(db);
        return { user: db.users[idx] };
      }
    }

    if (cleanPath === '/admin/venues' && method === 'GET') {
      return { venues: db.venues.map((v) => hydrateVenue(db, v)) };
    }

    if (cleanPath.match(/^\/admin\/venues\/\d+\/status$/) && method === 'PATCH') {
      const venueId = parseInt(cleanPath.split('/')[3]);
      const idx = db.venues.findIndex((v) => v.id === venueId);
      if (idx !== -1) {
        db.venues[idx].status = body.status;
        saveFallbackDB(db);
        return { venue: db.venues[idx] };
      }
    }

    return {};
  },
};

window.api = api;

