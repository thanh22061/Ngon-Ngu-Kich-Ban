/**
 * SportZone Main Frontend Application
 * Đáp ứng đầy đủ các Use Case cho Customer, Owner và Admin
 */

const app = {
  currentPage: 'home',
  sports: [],
  venues: [],
  filters: {
    search: '',
    sport: '',
    district: '',
  },
  selectedVenue: null,
  availabilityData: null,
  bookingDraft: {
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // Mặc định ngày mai để luôn hợp lệ trong tương lai
    courtId: null,
    courtName: '',
    selectedSlots: [], // [{ startTime, endTime, price }]
    couponCode: '',
    discountAmount: 0,
    paymentMethod: 'VNPAY',
    note: '',
  },

  handleSessionExpired() {
    this.syncAuthUI();
    this.navigate('home');
    this.openAuthModal('login');
  },

  async init() {
    // Xóa token demo cũ (tạo ở chế độ offline) vì server SQL Server không chấp nhận
    const savedToken = api.getToken();
    if (savedToken && savedToken.startsWith('demo-jwt-token')) {
      api.clearAuth();
    }
    this.syncAuthUI();
    await this.loadInitialData();
    this.navigate('home');

    // Đóng dropdown thông báo khi click ra ngoài
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('notif-wrapper');
      const dropdown = document.getElementById('notif-dropdown');
      if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  },

  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600 text-white border-emerald-700',
      error: 'bg-red-600 text-white border-red-700',
      info: 'bg-slate-800 text-white border-slate-900',
    };

    const el = document.createElement('div');
    el.className = `toast-enter pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 ${colors[type] || colors.info}`;
    el.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white font-bold">&times;</button>
    `;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) el.remove();
    }, 4000);
  },

  formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
  },

  syncAuthUI() {
    const user = api.getCurrentUser();
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    const notifWrapper = document.getElementById('notif-wrapper');
    const navMyBookings = document.getElementById('nav-my-bookings');
    const navOwner = document.getElementById('nav-owner');
    const navAdmin = document.getElementById('nav-admin');

    if (user) {
      guestActions.classList.add('hidden');
      userActions.classList.remove('hidden');
      userActions.classList.add('flex');
      notifWrapper.classList.remove('hidden');

      document.getElementById('user-name').textContent = user.fullName;
      document.getElementById('user-role-badge').textContent = user.role;
      document.getElementById('user-avatar').textContent = (user.fullName || 'U').charAt(0).toUpperCase();

      navMyBookings.classList.remove('hidden');
      if (user.role === 'OWNER' || user.role === 'ADMIN') {
        navOwner.classList.remove('hidden');
      } else {
        navOwner.classList.add('hidden');
      }

      if (user.role === 'ADMIN') {
        navAdmin.classList.remove('hidden');
      } else {
        navAdmin.classList.add('hidden');
      }

      this.loadNotifications();
    } else {
      guestActions.classList.remove('hidden');
      userActions.classList.add('hidden');
      userActions.classList.remove('flex');
      notifWrapper.classList.add('hidden');
      navMyBookings.classList.add('hidden');
      navOwner.classList.add('hidden');
      navAdmin.classList.add('hidden');
    }
  },

  async loadNotifications() {
    try {
      const data = await api.request('/notifications');
      const badge = document.getElementById('notif-badge');
      const list = document.getElementById('notif-list');
      if (!badge || !list) return;

      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }

      if (!data.notifications || data.notifications.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Chưa có thông báo nào</div>`;
        return;
      }

      list.innerHTML = data.notifications
        .map(
          (n) => `
          <div class="p-3.5 text-xs ${n.isRead ? 'bg-white' : 'bg-emerald-50/60'} hover:bg-slate-50 transition">
            <div class="font-bold text-slate-800 mb-0.5">${n.title}</div>
            <div class="text-slate-600 leading-relaxed">${n.message}</div>
            <div class="text-[10px] text-slate-400 mt-1">${new Date(n.createdAt).toLocaleString('vi-VN')}</div>
          </div>
        `
        )
        .join('');
    } catch (e) {
      // ignore
    }
  },

  toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.classList.toggle('hidden');
  },

  async markAllNotificationsRead() {
    try {
      await api.request('/notifications/read-all', { method: 'PATCH' });
      await this.loadNotifications();
      this.toast('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async loadInitialData() {
    try {
      const [sportsRes, venuesRes] = await Promise.all([
        api.request('/sports'),
        api.request('/venues'),
      ]);
      this.sports = sportsRes.sports || [];
      this.venues = venuesRes.venues || [];
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  highlightNav(page) {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      if (btn.dataset.nav === page) {
        btn.className = 'nav-btn px-3.5 py-2 rounded-lg text-sm font-semibold text-brand-700 bg-brand-50';
      } else if (!btn.classList.contains('hidden')) {
        btn.className = 'nav-btn px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100';
      }
    });
  },

  async navigate(page, param = null) {
    this.currentPage = page;
    this.highlightNav(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') {
      await this.renderHome();
    } else if (page === 'venue-detail') {
      await this.renderVenueDetail(param);
    } else if (page === 'my-bookings') {
      await this.renderMyBookings();
    } else if (page === 'owner') {
      await this.renderOwnerDashboard();
    } else if (page === 'admin') {
      await this.renderAdminDashboard();
    } else if (page === 'db-manager') {
      await this.renderMongoDBManager(param || 'venues');
    }
  },

  // =========================================================================
  // 0. TRÌNH QUẢN LÝ DATABASE MONGODB TRÊN WEB (MONGODB COMPASS / ATLAS WEB UI)
  // =========================================================================
  currentCollection: 'venues',
  dbViewMode: 'json', // 'json' hoặc 'table'

  async renderMongoDBManager(collectionName = 'venues') {
    this.currentCollection = collectionName;
    const container = document.getElementById('app-content');
    container.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-10 text-center text-sm text-slate-500">Đang kết nối MongoDB Collections...</div>`;

    try {
      const [colListRes, docsRes] = await Promise.all([
        api.request('/db-manager/collections'),
        api.request(`/db-manager/collections/${collectionName}`),
      ]);

      const collections = colListRes.collections || [];
      const documents = docsRes.documents || [];

      container.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Header -->
          <div class="bg-slate-900 text-white rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ● MongoDB Document Store Active
                </span>
                <span class="text-xs font-mono text-slate-400">mongodb://127.0.0.1:27017/sportzone_db</span>
              </div>
              <h1 class="text-xl sm:text-2xl font-extrabold">🗄️ Trình Quản Lý Cơ Sở Dữ Liệu MongoDB Trên Web</h1>
              <p class="text-xs text-slate-300 mt-1">
                Xem, tìm kiếm, thêm mới (Insert), chỉnh sửa trực tiếp JSON (Update) và xóa (Delete) các Documents trong 14 Collections
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="app.openInsertDocModal('${this.currentCollection}')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-sm transition">
                + Insert Document
              </button>
              <button onclick="app.resetMongoDBSeed()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition">
                🔄 Khôi phục dữ liệu mẫu (Seed)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Left Sidebar: Collections List -->
            <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs h-fit">
              <div class="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-2 mb-3">
                Collections (${collections.length})
              </div>
              <div class="space-y-1">
                ${collections
                  .map(
                    (c) => `
                  <button
                    onclick="app.renderMongoDBManager('${c.name}')"
                    class="w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      c.name === this.currentCollection
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }"
                  >
                    <span class="font-mono">${c.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] ${
                      c.name === this.currentCollection
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-slate-100 text-slate-600'
                    }">${c.count}</span>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Right Area: Documents Explorer -->
            <div class="lg:col-span-3 space-y-4">
              <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-extrabold text-slate-900 font-mono">db.${this.currentCollection}.find({})</span>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">${documents.length} documents</span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick="app.dbViewMode = 'json'; app.renderMongoDBManager('${this.currentCollection}')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold ${
                      this.dbViewMode === 'json' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }"
                  >
                    { } JSON View
                  </button>
                  <button
                    onclick="app.dbViewMode = 'table'; app.renderMongoDBManager('${this.currentCollection}')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold ${
                      this.dbViewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }"
                  >
                    ⊞ Table View
                  </button>
                </div>
              </div>

              ${
                documents.length === 0
                  ? `<div class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">Collection này hiện chưa có Document nào.</div>`
                  : this.dbViewMode === 'json'
                  ? `
                <div class="space-y-3">
                  ${documents
                    .map(
                      (doc) => `
                    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span class="font-mono text-slate-600">
                          _id: <strong class="text-emerald-700">ObjectId("${doc._id || doc.id}")</strong> • id: <strong>${doc.id}</strong>
                        </span>
                        <div class="flex items-center gap-2">
                          <button
                            onclick='app.openEditDocModal("${this.currentCollection}", ${JSON.stringify(doc).replace(/'/g, "&#39;")})'
                            class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold"
                          >
                            ✏️ Sửa JSON
                          </button>
                          <button
                            onclick="app.deleteMongoDoc('${this.currentCollection}', '${doc.id}')"
                            class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </div>
                      <pre class="p-4 text-xs font-mono text-slate-800 bg-slate-950 text-emerald-300 overflow-x-auto leading-relaxed">${JSON.stringify(doc, null, 2)}</pre>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : `
                <div class="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                        ${Object.keys(documents[0])
                          .slice(0, 7)
                          .map((k) => `<th class="py-3 px-3">${k}</th>`)
                          .join('')}
                        <th class="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${documents
                        .map(
                          (doc) => `
                        <tr class="hover:bg-slate-50">
                          ${Object.keys(documents[0])
                            .slice(0, 7)
                            .map(
                              (k) =>
                                `<td class="py-2.5 px-3 font-mono max-w-[180px] truncate">${
                                  typeof doc[k] === 'object' ? JSON.stringify(doc[k]) : String(doc[k] ?? '')
                                }</td>`
                            )
                            .join('')}
                          <td class="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                            <button onclick='app.openEditDocModal("${this.currentCollection}", ${JSON.stringify(doc).replace(/'/g, "&#39;")})' class="px-2 py-1 rounded bg-blue-50 text-blue-600 font-bold">Sửa</button>
                            <button onclick="app.deleteMongoDoc('${this.currentCollection}', '${doc.id}')" class="px-2 py-1 rounded bg-red-50 text-red-600 font-bold">Xóa</button>
                          </td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
              }
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openInsertDocModal(colName) {
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900 font-mono">+ Insert Document vào "${colName}"</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>
        <div class="space-y-3 text-xs">
          <label class="block font-bold text-slate-700">Nhập nội dung JSON Document:</label>
          <textarea id="mongo-insert-json" rows="8" class="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs bg-slate-950 text-emerald-300">{\n  "name": "Dữ liệu mới"\n}</textarea>
          <button onclick="app.submitInsertDoc('${colName}')" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold">
            Lưu Document vào MongoDB
          </button>
        </div>
      </div>
    `);
  },

  async submitInsertDoc(colName) {
    const raw = document.getElementById('mongo-insert-json')?.value || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.toast('Định dạng JSON không hợp lệ! Vui lòng kiểm tra lại dấu ngoặc kép.', 'error');
      return;
    }

    try {
      await api.request(`/db-manager/collections/${colName}`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      this.closeModal();
      this.toast(`Đã thêm Document mới vào collection ${colName}!`);
      await this.loadInitialData();
      this.renderMongoDBManager(colName);
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openEditDocModal(colName, doc) {
    const copy = { ...doc };
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900 font-mono">✏️ Chỉnh sửa Document (${colName} #${doc.id})</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>
        <div class="space-y-3 text-xs">
          <textarea id="mongo-edit-json" rows="10" class="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs bg-slate-950 text-emerald-300">${JSON.stringify(copy, null, 2)}</textarea>
          <button onclick="app.submitEditDoc('${colName}', '${doc.id}')" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Cập nhật Document
          </button>
        </div>
      </div>
    `);
  },

  async submitEditDoc(colName, docId) {
    const raw = document.getElementById('mongo-edit-json')?.value || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.toast('Định dạng JSON không hợp lệ!', 'error');
      return;
    }

    try {
      await api.request(`/db-manager/collections/${colName}/${docId}`, {
        method: 'PUT',
        body: JSON.stringify(parsed),
      });
      this.closeModal();
      this.toast('Đã cập nhật Document thành công!');
      await this.loadInitialData();
      this.renderMongoDBManager(colName);
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async deleteMongoDoc(colName, docId) {
    if (!confirm(`Bạn có chắc muốn xóa Document #${docId} khỏi collection "${colName}"?`)) return;
    try {
      await api.request(`/db-manager/collections/${colName}/${docId}`, {
        method: 'DELETE',
      });
      this.toast('Đã xóa Document khỏi MongoDB');
      await this.loadInitialData();
      this.renderMongoDBManager(colName);
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async resetMongoDBSeed() {
    if (!confirm('Khôi phục toàn bộ 14 Collections về trạng thái dữ liệu mẫu ban đầu?')) return;
    try {
      await api.request('/db-manager/reset', { method: 'POST' });
      this.toast('Đã khôi phục dữ liệu mẫu MongoDB thành công!');
      await this.loadInitialData();
      this.renderMongoDBManager(this.currentCollection);
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // =========================================================================
  // 1. TRANG CHỦ, BẢN ĐỒ ĐỊNH VỊ CỤM SÂN & TÌM KIẾM
  // =========================================================================
  homeViewMode: 'both', // 'both' | 'map' | 'grid'
  leafletMap: null,
  mapMarkers: {},
  userLocation: null, // { lat, lng }
  detailMap: null,

  // Tính khoảng cách đường chim bay (km) giữa 2 tọa độ GPS (Haversine)
  calcDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  getVenueCoordinates(v) {
    // Tọa độ mặc định theo quận nếu sân mới tạo chưa nhập tọa độ
    const districtDefaults = {
      'Bắc Từ Liêm': [21.0468, 105.7852],
      'Cầu Giấy': [21.0328, 105.7896],
      'Nam Từ Liêm': [21.0225, 105.7682],
      'Tây Hồ': [21.0685, 105.8185],
      'Ba Đình': [21.0352, 105.8152],
      'Đống Đa': [21.0168, 105.8265],
      'Hai Bà Trưng': [21.0055, 105.8455],
      'Thanh Xuân': [20.9965, 105.8125],
      'Hoàng Mai': [20.9825, 105.8565],
      'Hà Đông': [20.9685, 105.7720],
      'Long Biên': [21.0525, 105.9085],
    };
    const lat = Number(v.latitude) || (districtDefaults[v.district] && districtDefaults[v.district][0]) || 21.0285;
    const lng = Number(v.longitude) || (districtDefaults[v.district] && districtDefaults[v.district][1]) || 105.8048;
    return { lat, lng };
  },

  async openMapExplorer() {
    if (this.currentPage !== 'home') {
      this.homeViewMode = 'both';
      await this.navigate('home');
    }
    this.highlightNav('map');
    const mapSection = document.getElementById('map-explorer-section');
    if (mapSection) {
      mapSection.classList.remove('hidden');
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        if (this.leafletMap) this.leafletMap.invalidateSize();
      }, 250);
    }
  },

  setHomeViewMode(mode) {
    this.homeViewMode = mode;
    const mapSection = document.getElementById('map-explorer-section');
    const gridSection = document.getElementById('venue-grid-wrapper');
    const mapCanvas = document.getElementById('venues-leaflet-map');

    document.querySelectorAll('.view-mode-btn').forEach((btn) => {
      if (btn.dataset.mode === mode) {
        btn.className = 'view-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white shadow-xs transition';
      } else {
        btn.className = 'view-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition';
      }
    });

    if (mode === 'grid') {
      if (mapSection) mapSection.classList.add('hidden');
      if (gridSection) gridSection.classList.remove('hidden');
    } else if (mode === 'map') {
      if (mapSection) mapSection.classList.remove('hidden');
      if (gridSection) gridSection.classList.add('hidden');
      if (mapCanvas) mapCanvas.style.height = '620px';
    } else {
      if (mapSection) mapSection.classList.remove('hidden');
      if (gridSection) gridSection.classList.remove('hidden');
      if (mapCanvas) mapCanvas.style.height = '450px';
    }

    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
        this.resetMapBounds();
      }
    }, 200);
  },

  initOrUpdateHomeMap() {
    const mapEl = document.getElementById('venues-leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!this.leafletMap) {
      this.leafletMap = L.map(mapEl, {
        center: [21.0285, 105.8048],
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | SportZone Map',
      }).addTo(this.leafletMap);
    }

    // Xóa các marker cũ
    Object.values(this.mapMarkers).forEach((m) => {
      if (this.leafletMap && m) this.leafletMap.removeLayer(m);
    });
    this.mapMarkers = {};

    const bounds = [];

    // Vẽ vị trí người dùng nếu đã định vị
    if (this.userLocation) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="background:#2563eb;color:#fff;padding:4px 10px;border-radius:999px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.5);white-space:nowrap;transform:translate(-50%,-50%);">📍 Vị trí của bạn</div>`,
        iconSize: [0, 0],
      });
      const um = L.marker([this.userLocation.lat, this.userLocation.lng], { icon: userIcon }).addTo(this.leafletMap);
      um.bindPopup(`<div class="p-3 text-xs font-bold text-slate-800">📍 Vị trí hiện tại của bạn</div>`);
      this.mapMarkers['_user'] = um;
      bounds.push([this.userLocation.lat, this.userLocation.lng]);
    }

    // Vẽ từng cụm sân lên bản đồ
    this.venues.forEach((v) => {
      const { lat, lng } = this.getVenueCoordinates(v);
      const firstCourt = (v.courts && v.courts[0]) || {};
      const coverImg =
        (firstCourt.images && firstCourt.images[0] && firstCourt.images[0].imageUrl) ||
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';
      const minPrice =
        firstCourt.priceRules && firstCourt.priceRules.length > 0
          ? Math.min(...firstCourt.priceRules.map((r) => Number(r.price)))
          : 130000;

      const markerIcon = L.divIcon({
        className: '',
        html: `
          <div class="sz-map-marker" id="map-pin-${v.id}">
            <span>${v.sport?.icon || '🏟️'}</span>
            <span>${Math.round(minPrice / 1000)}k</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const distBadge =
        v._distanceKm != null
          ? `<span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">📏 Cách ${v._distanceKm.toFixed(1)} km</span>`
          : '';

      const popupHtml = `
        <div class="font-sans">
          <div class="relative h-32 bg-slate-200">
            <img src="${coverImg}" alt="${v.name}" class="w-full h-full object-cover" />
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/85 text-white">
              ${v.sport?.icon || '🏅'} ${v.sport?.name || ''}
            </span>
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
              ★ ${Number(v.ratingAvg || 5).toFixed(1)}
            </span>
          </div>
          <div class="p-3.5">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] font-bold text-emerald-700 uppercase">📍 Quận ${v.district}</span>
              ${distBadge}
            </div>
            <h4 class="text-xs font-extrabold text-slate-900 leading-snug cursor-pointer hover:text-emerald-600" onclick="app.navigate('venue-detail', '${v.slug}')">
              ${v.name}
            </h4>
            <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">${v.address}</p>
            <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
              <div>
                <span class="text-[10px] text-slate-400 block">Giá từ</span>
                <span class="text-xs font-extrabold text-emerald-600">${this.formatVND(minPrice)}/h</span>
              </div>
              <span class="text-[10px] font-semibold text-slate-500">🕒 ${v.openTime}-${v.closeTime}</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5 mt-3">
              <button onclick="app.navigate('venue-detail', '${v.slug}')" class="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold text-center">
                📅 Đặt sân
              </button>
              <a href="${gmapsUrl}" target="_blank" rel="noopener" class="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold text-center no-underline flex items-center justify-center gap-1">
                🧭 Chỉ đường
              </a>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(this.leafletMap);
      marker.bindPopup(popupHtml);
      this.mapMarkers[v.id] = marker;
      bounds.push([lat, lng]);
    });

    const mapCountEl = document.getElementById('map-venue-count');
    if (mapCountEl) {
      mapCountEl.textContent = `Đang hiển thị ${this.venues.length} cụm sân trên bản đồ Hà Nội`;
    }

    if (bounds.length > 0) {
      this.leafletMap.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  },

  resetMapBounds() {
    if (!this.leafletMap) return;
    const bounds = this.venues.map((v) => {
      const { lat, lng } = this.getVenueCoordinates(v);
      return [lat, lng];
    });
    if (this.userLocation) {
      bounds.push([this.userLocation.lat, this.userLocation.lng]);
    }
    if (bounds.length > 0) {
      this.leafletMap.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  },

  focusVenueOnMap(venueId) {
    const venue = this.venues.find((v) => v.id === Number(venueId));
    if (!venue) return;

    const mapSection = document.getElementById('map-explorer-section');
    if (mapSection && mapSection.classList.contains('hidden')) {
      this.setHomeViewMode('both');
    }

    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const { lat, lng } = this.getVenueCoordinates(venue);
    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
        this.leafletMap.flyTo([lat, lng], 16, { duration: 0.8 });
        const marker = this.mapMarkers[venue.id];
        if (marker) {
          marker.openPopup();
        }
      }
    }, 250);
  },

  locateUserOnMap() {
    const applyCoords = (lat, lng, label) => {
      this.userLocation = { lat, lng };
      this.venues.forEach((v) => {
        const c = this.getVenueCoordinates(v);
        v._distanceKm = this.calcDistanceKm(lat, lng, c.lat, c.lng);
      });
      this.venues.sort((a, b) => (a._distanceKm || 999) - (b._distanceKm || 999));
      this.renderVenueGrid();
      this.initOrUpdateHomeMap();
      this.toast(`${label} — Đã sắp xếp cụm sân từ gần đến xa!`);
    };

    if (!navigator.geolocation) {
      applyCoords(21.0468, 105.7852, 'Định vị mặc định (ĐH Điện Lực - Hoàng Quốc Việt)');
      return;
    }

    this.toast('Đang xác định vị trí GPS của bạn...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, 'Đã xác định vị trí của bạn');
      },
      () => {
        // Fallback nếu trình duyệt chặn quyền GPS
        applyCoords(21.0468, 105.7852, 'Sử dụng vị trí trung tâm (Hoàng Quốc Việt, Hà Nội)');
      },
      { timeout: 6000 }
    );
  },

  async applySearchFilters() {
    const searchInput = document.getElementById('filter-search');
    const sportSelect = document.getElementById('filter-sport');
    const districtSelect = document.getElementById('filter-district');

    this.filters.search = searchInput ? searchInput.value.trim() : '';
    this.filters.sport = sportSelect ? sportSelect.value : '';
    this.filters.district = districtSelect ? districtSelect.value : '';

    const q = new URLSearchParams();
    if (this.filters.search) q.set('search', this.filters.search);
    if (this.filters.sport) q.set('sport', this.filters.sport);
    if (this.filters.district) q.set('district', this.filters.district);

    try {
      const res = await api.request(`/venues?${q.toString()}`);
      this.venues = res.venues || [];
      if (this.userLocation) {
        this.venues.forEach((v) => {
          const c = this.getVenueCoordinates(v);
          v._distanceKm = this.calcDistanceKm(this.userLocation.lat, this.userLocation.lng, c.lat, c.lng);
        });
        this.venues.sort((a, b) => (a._distanceKm || 999) - (b._distanceKm || 999));
      }
      this.renderVenueGrid();
      this.initOrUpdateHomeMap();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  selectSportQuick(slug) {
    this.filters.sport = this.filters.sport === slug ? '' : slug;
    const sportSelect = document.getElementById('filter-sport');
    if (sportSelect) sportSelect.value = this.filters.sport;
    this.applySearchFilters();
    this.renderSportPills();
  },

  renderSportPills() {
    const container = document.getElementById('sport-pills');
    if (!container) return;

    container.innerHTML = `
      <button onclick="app.selectSportQuick('')" class="px-4 py-2 rounded-full text-xs font-bold transition ${
        !this.filters.sport
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
      }">
        Tất cả môn (${this.sports.reduce((acc, s) => acc + (s._count?.venues || 0), 0)})
      </button>
      ${this.sports
        .map(
          (s) => `
        <button onclick="app.selectSportQuick('${s.slug}')" class="px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            this.filters.sport === s.slug
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }">
          <span>${s.icon || '🏅'}</span>
          <span>${s.name}</span>
        </button>
      `
        )
        .join('')}
    `;
  },

  renderVenueGrid() {
    const grid = document.getElementById('venue-grid');
    const countEl = document.getElementById('venue-count');
    if (!grid) return;

    if (countEl) countEl.textContent = `${this.venues.length} cụm sân khả dụng`;

    if (this.venues.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div class="text-4xl mb-3">🏟️</div>
          <h3 class="text-base font-bold text-slate-800">Không tìm thấy cụm sân phù hợp</h3>
          <p class="text-xs text-slate-500 mt-1">Vui lòng thử từ khóa hoặc bộ lọc khu vực khác.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.venues
      .map((v) => {
        const firstCourt = (v.courts && v.courts[0]) || {};
        const coverImg =
          (firstCourt.images && firstCourt.images[0] && firstCourt.images[0].imageUrl) ||
          'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';
        const minPrice =
          firstCourt.priceRules && firstCourt.priceRules.length > 0
            ? Math.min(...firstCourt.priceRules.map((r) => Number(r.price)))
            : 130000;
        const { lat, lng } = this.getVenueCoordinates(v);
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        const courtCount = (v.courts || []).length;

        return `
        <div class="venue-card bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
          <div class="relative h-48 bg-slate-200 overflow-hidden">
            <img src="${coverImg}" alt="${v.name}" class="w-full h-full object-cover" />
            <div class="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
              ${v.sport?.icon || '🏅'} ${v.sport?.name || 'Thể thao'}
            </div>
            <div class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
              ★ ${Number(v.ratingAvg || 5).toFixed(1)} (${v.reviewCount || 0})
            </div>
            <div class="absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white">
              🕒 ${v.openTime} - ${v.closeTime}
            </div>
            <div class="absolute bottom-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/85 text-emerald-300">
              🏟️ ${courtCount} sân con
            </div>
          </div>

          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-1">
                <div class="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                  📍 Quận ${v.district}, ${v.city}
                </div>
                ${
                  v._distanceKm != null
                    ? `<span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">📏 ${v._distanceKm.toFixed(1)} km</span>`
                    : ''
                }
              </div>
              <h3 class="text-base font-bold text-slate-900 line-clamp-1 hover:text-brand-600 cursor-pointer" onclick="app.navigate('venue-detail', '${v.slug}')">
                ${v.name}
              </h3>
              <p class="text-xs text-slate-500 mt-1 line-clamp-1">${v.address}</p>

              <!-- Map Action Buttons -->
              <div class="flex items-center gap-2 mt-2.5">
                <button onclick="app.focusVenueOnMap(${v.id})" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition flex items-center gap-1">
                  🗺️ Chỉ sân trên Map
                </button>
                <a href="${gmapsUrl}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1">
                  🧭 Chỉ đường Google Maps
                </a>
              </div>

              <!-- Facilities tags -->
              <div class="flex flex-wrap gap-1.5 mt-3">
                ${(v.venueFacilities || [])
                  .slice(0, 3)
                  .map(
                    (vf) => `
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                    ✓ ${vf.facility?.name || 'Tiện ích'}
                  </span>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-[11px] text-slate-400 block">Giá thuê từ</span>
                <span class="text-base font-extrabold text-brand-600">${this.formatVND(minPrice)}<span class="text-xs font-normal text-slate-500">/giờ</span></span>
              </div>
              <button onclick="app.navigate('venue-detail', '${v.slug}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition">
                Xem lịch & Đặt sân →
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  async renderHome() {
    this.leafletMap = null;
    const container = document.getElementById('app-content');
    container.innerHTML = `
      <!-- HERO SECTION -->
      <section class="hero-pattern text-white py-12 sm:py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="max-w-3xl">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-4">
              ⚡ Đặt lịch thời gian thực • Định vị Bản đồ Sân • Chống trùng giờ 100%
            </span>
            <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Đặt Sân Thể Thao Trực Tuyến Nhanh Chóng Cùng <span class="text-emerald-400">SportZone</span>
            </h1>
            <p class="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed">
              Tra cứu bản đồ vị trí và ma trận giờ trống theo thời gian thực cho 20+ cụm sân Pickleball, Cầu lông, Bóng đá mini, Tennis và Bóng rổ khắp Hà Nội. Áp mã <strong class="text-amber-300">CHAOBANMOI</strong> giảm ngay 10%!
            </p>
          </div>

          <!-- SEARCH BAR -->
          <div class="mt-8 bg-white p-3 sm:p-4 rounded-2xl shadow-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-800">
            <div>
              <label class="block text-[11px] font-bold text-slate-400 uppercase px-1 mb-1">Từ khóa cụm sân</label>
              <input id="filter-search" type="text" value="${this.filters.search}" placeholder="Tên sân, đường phố..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-600" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-400 uppercase px-1 mb-1">Môn thể thao</label>
              <select id="filter-sport" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-600">
                <option value="">Tất cả môn thể thao</option>
                ${this.sports
                  .map(
                    (s) =>
                      `<option value="${s.slug}" ${this.filters.sport === s.slug ? 'selected' : ''}>${s.icon || ''} ${s.name}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-400 uppercase px-1 mb-1">Quận / Khu vực</label>
              <select id="filter-district" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-600">
                <option value="">Tất cả Quận Hà Nội</option>
                <option value="Bắc Từ Liêm">Quận Bắc Từ Liêm</option>
                <option value="Cầu Giấy">Quận Cầu Giấy</option>
                <option value="Nam Từ Liêm">Quận Nam Từ Liêm</option>
                <option value="Tây Hồ">Quận Tây Hồ</option>
                <option value="Ba Đình">Quận Ba Đình</option>
                <option value="Đống Đa">Quận Đống Đa</option>
                <option value="Hai Bà Trưng">Quận Hai Bà Trưng</option>
                <option value="Thanh Xuân">Quận Thanh Xuân</option>
                <option value="Hoàng Mai">Quận Hoàng Mai</option>
                <option value="Hà Đông">Quận Hà Đông</option>
                <option value="Long Biên">Quận Long Biên</option>
              </select>
            </div>
            <div class="flex items-end">
              <button onclick="app.applySearchFilters()" class="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition">
                🔍 Tìm kiếm sân trống
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- MAIN VENUE & MAP SECTION -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Sport Filter Pills & View Switcher -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900">Hệ Thống Cụm Sân & Bản Đồ Định Vị</h2>
            <p id="venue-count" class="text-xs text-slate-500 mt-0.5"></p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div id="sport-pills" class="flex flex-wrap gap-2"></div>
            <div class="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button onclick="app.setHomeViewMode('both')" data-mode="both" class="view-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white shadow-xs transition">
                ⚡ Bản đồ & Danh sách
              </button>
              <button onclick="app.setHomeViewMode('map')" data-mode="map" class="view-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                🗺️ Bản đồ lớn
              </button>
              <button onclick="app.setHomeViewMode('grid')" data-mode="grid" class="view-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                📋 Danh sách
              </button>
            </div>
          </div>
        </div>

        <!-- INTERACTIVE MAP EXPLORER -->
        <div id="map-explorer-section" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">🗺️</span>
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">Bản Đồ Vị Trí Các Cụm Sân Thể Thao</h3>
                <p id="map-venue-count" class="text-[11px] text-slate-500">Nhấp vào từng ghim giá trên bản đồ để xem chi tiết sân hoặc chỉ đường</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="app.locateUserOnMap()" class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5">
                📍 Tìm sân gần vị trí của tôi
              </button>
              <button onclick="app.resetMapBounds()" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition">
                🔄 Toàn cảnh Hà Nội
              </button>
            </div>
          </div>
          <div id="venues-leaflet-map" style="height: 450px; width: 100%; z-index: 10;"></div>
        </div>

        <!-- VENUE GRID -->
        <div id="venue-grid-wrapper">
          <div id="venue-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
      </section>
    `;

    this.renderSportPills();
    this.renderVenueGrid();
    setTimeout(() => {
      this.initOrUpdateHomeMap();
    }, 100);
  },

  // =========================================================================
  // 2. CHI TIẾT CỤM SÂN & MA TRẬN ĐẶT SÂN TRỰC QUAN
  // =========================================================================
  async renderVenueDetail(slugOrId) {
    const container = document.getElementById('app-content');
    container.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-slate-500">Đang tải thông tin cụm sân và ma trận khung giờ...</div>`;

    try {
      const { venue } = await api.request(`/venues/${slugOrId}`);
      this.selectedVenue = venue;
      this.bookingDraft.selectedSlots = [];
      this.bookingDraft.courtId = venue.courts && venue.courts[0] ? venue.courts[0].id : null;
      this.bookingDraft.courtName = venue.courts && venue.courts[0] ? venue.courts[0].name : '';
      this.bookingDraft.discountAmount = 0;
      this.bookingDraft.couponCode = '';

      const avail = await api.request(
        `/venues/${venue.id}/availability?date=${this.bookingDraft.date}`
      );
      this.availabilityData = avail;

      this.drawVenueDetailView();
    } catch (e) {
      this.toast(e.message, 'error');
      this.navigate('home');
    }
  },

  async changeBookingDate(newDate) {
    this.bookingDraft.date = newDate;
    this.bookingDraft.selectedSlots = [];
    try {
      const avail = await api.request(
        `/venues/${this.selectedVenue.id}/availability?date=${newDate}`
      );
      this.availabilityData = avail;
      this.drawSlotMatrix();
      this.updateBookingSummaryBox();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  toggleSlotSelection(courtId, courtName, startTime, endTime, price) {
    // Nếu chọn sang sân con khác, reset các slot của sân cũ
    if (this.bookingDraft.courtId !== courtId) {
      this.bookingDraft.courtId = courtId;
      this.bookingDraft.courtName = courtName;
      this.bookingDraft.selectedSlots = [];
    }

    const existsIdx = this.bookingDraft.selectedSlots.findIndex(
      (s) => s.startTime === startTime
    );

    if (existsIdx !== -1) {
      this.bookingDraft.selectedSlots.splice(existsIdx, 1);
    } else {
      this.bookingDraft.selectedSlots.push({ startTime, endTime, price: Number(price) });
      this.bookingDraft.selectedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Kiểm tra tính liên tục của các khung giờ
      for (let i = 1; i < this.bookingDraft.selectedSlots.length; i++) {
        if (
          this.bookingDraft.selectedSlots[i].startTime !==
          this.bookingDraft.selectedSlots[i - 1].endTime
        ) {
          this.toast('Vui lòng chọn các khung giờ liên tiếp nhau trên cùng 1 sân!', 'info');
          this.bookingDraft.selectedSlots = [{ startTime, endTime, price: Number(price) }];
          break;
        }
      }
    }

    this.drawSlotMatrix();
    this.updateBookingSummaryBox();
  },

  drawSlotMatrix() {
    const matrixEl = document.getElementById('slot-matrix-container');
    if (!matrixEl || !this.availabilityData) return;

    const courts = this.availabilityData.courts || [];
    if (courts.length === 0) {
      matrixEl.innerHTML = `<div class="p-6 text-center text-sm text-slate-500">Cụm sân hiện chưa có sân con hoạt động.</div>`;
      return;
    }

    matrixEl.innerHTML = courts
      .map((court) => {
        return `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="font-bold text-sm text-slate-900">${court.courtName}</span>
              <span class="ml-2 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-600">
                ${court.courtType} • ${court.isCovered ? 'Có mái che' : 'Ngoài trời'}
              </span>
            </div>
            <span class="text-xs text-slate-500">Click vào các ô giờ liên tiếp để chọn</span>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
            ${court.slots
              .map((slot) => {
                const isSelected =
                  this.bookingDraft.courtId === court.courtId &&
                  this.bookingDraft.selectedSlots.some((s) => s.startTime === slot.startTime);

                if (slot.isBooked) {
                  return `
                    <button disabled class="slot-btn booked p-2 rounded-lg border text-center">
                      <div class="text-xs font-bold">${slot.startTime}</div>
                      <div class="text-[10px]">Đã đặt</div>
                    </button>
                  `;
                }

                return `
                  <button
                    onclick="app.toggleSlotSelection(${court.courtId}, '${court.courtName.replace(/'/g, "\\'")}', '${slot.startTime}', '${slot.endTime}', ${slot.price})"
                    class="slot-btn available ${isSelected ? 'selected' : 'bg-white border-slate-200 text-slate-800'} p-2 rounded-lg border text-center relative"
                  >
                    ${slot.isPeak ? '<span class="absolute top-0.5 right-1 text-[9px] text-amber-500 font-bold">★</span>' : ''}
                    <div class="text-xs font-bold">${slot.startTime}-${slot.endTime}</div>
                    <div class="text-[10px] ${isSelected ? 'text-emerald-100' : 'text-brand-600'} font-semibold">${Number(slot.price / 1000)}k</div>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
      })
      .join('');
  },

  async applyCouponCode() {
    const input = document.getElementById('coupon-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) {
      this.toast('Vui lòng nhập mã giảm giá (VD: CHAOBANMOI)', 'info');
      return;
    }

    const rawTotal = this.bookingDraft.selectedSlots.reduce((sum, s) => sum + s.price, 0);
    if (rawTotal <= 0) {
      this.toast('Vui lòng chọn khung giờ sân trước khi áp dụng mã giảm giá', 'info');
      return;
    }

    try {
      const res = await api.request('/coupons/apply', {
        method: 'POST',
        body: JSON.stringify({ code, orderAmount: rawTotal }),
      });
      this.bookingDraft.couponCode = code;
      this.bookingDraft.discountAmount = Number(res.discountAmount || 0);
      this.updateBookingSummaryBox();
      this.toast(`Áp dụng mã ${code} giảm ${this.formatVND(this.bookingDraft.discountAmount)} thành công!`);
    } catch (e) {
      this.bookingDraft.couponCode = '';
      this.bookingDraft.discountAmount = 0;
      this.updateBookingSummaryBox();
      this.toast(e.message, 'error');
    }
  },

  updateBookingSummaryBox() {
    const box = document.getElementById('booking-summary-content');
    if (!box) return;

    const slots = this.bookingDraft.selectedSlots;
    if (slots.length === 0) {
      box.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
          👈 Vui lòng chọn ít nhất 1 khung giờ còn trống trên ma trận sân bên trái để tính phí.
        </div>
      `;
      return;
    }

    const startTime = slots[0].startTime;
    const endTime = slots[slots.length - 1].endTime;
    const rawTotal = slots.reduce((sum, s) => sum + s.price, 0);
    const finalTotal = Math.max(0, rawTotal - this.bookingDraft.discountAmount);
    const depositAmount = Math.round(finalTotal * 0.3);

    box.innerHTML = `
      <div class="space-y-2.5 text-xs">
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Sân con đã chọn:</span>
          <span class="font-bold text-slate-900">${this.bookingDraft.courtName}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Ngày thi đấu:</span>
          <span class="font-bold text-slate-900">${this.bookingDraft.date}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Khung giờ (${slots.length} tiếng):</span>
          <span class="font-bold text-brand-600">${startTime} - ${endTime}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Tạm tính:</span>
          <span class="font-semibold text-slate-800">${this.formatVND(rawTotal)}</span>
        </div>
        ${
          this.bookingDraft.discountAmount > 0
            ? `
          <div class="flex justify-between py-1.5 border-b border-slate-100 text-emerald-600">
            <span>Mã giảm giá (${this.bookingDraft.couponCode}):</span>
            <span class="font-bold">-${this.formatVND(this.bookingDraft.discountAmount)}</span>
          </div>
        `
            : ''
        }
        <div class="flex justify-between py-2 text-sm">
          <span class="font-bold text-slate-800">Tổng thanh toán:</span>
          <span class="font-extrabold text-brand-600 text-base">${this.formatVND(finalTotal)}</span>
        </div>
        <div class="flex justify-between py-1.5 px-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
          <span>Tiền cọc giữ sân (30%):</span>
          <span class="font-bold">${this.formatVND(depositAmount)}</span>
        </div>
      </div>

      <!-- Coupon Input -->
      <div class="mt-4">
        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mã giảm giá (Thử: CHAOBANMOI)</label>
        <div class="flex gap-2">
          <input id="coupon-input" type="text" value="${this.bookingDraft.couponCode}" placeholder="Nhập CHAOBANMOI" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs uppercase font-semibold" />
          <button onclick="app.applyCouponCode()" class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">
            Áp dụng
          </button>
        </div>
      </div>

      <!-- Payment Method & Note -->
      <div class="mt-3">
        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phương thức thanh toán</label>
        <select id="booking-payment-method" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium">
          <option value="VNPAY">💳 Ví điện tử / Cổng VNPay Sandbox</option>
          <option value="CASH">💵 Thanh toán trực tiếp tại sân</option>
        </select>
      </div>

      <div class="mt-3">
        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ghi chú cho chủ sân</label>
        <input id="booking-note" type="text" placeholder="Thuê thêm vợt, bóng thi đấu..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs" />
      </div>

      <button onclick="app.submitBooking()" class="mt-4 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition">
        ✅ Xác nhận Đặt Sân Ngay
      </button>
    `;
  },

  async submitBooking() {
    const user = api.getCurrentUser();
    if (!user) {
      this.toast('Vui lòng đăng nhập tài khoản trước khi đặt sân!', 'info');
      this.openAuthModal('login');
      return;
    }

    const slots = this.bookingDraft.selectedSlots;
    if (slots.length === 0) {
      this.toast('Vui lòng chọn khung giờ đặt sân!', 'error');
      return;
    }

    const startTime = slots[0].startTime;
    const endTime = slots[slots.length - 1].endTime;
    const paymentMethod = document.getElementById('booking-payment-method')?.value || 'VNPAY';
    const note = document.getElementById('booking-note')?.value || '';

    try {
      const res = await api.request('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          courtId: this.bookingDraft.courtId,
          bookingDate: this.bookingDraft.date,
          startTime,
          endTime,
          couponCode: this.bookingDraft.couponCode || undefined,
          paymentMethod,
          note,
        }),
      });

      this.toast(`Đặt sân thành công! Mã đơn: ${res.booking.bookingCode}`);
      await this.loadNotifications();

      if (paymentMethod === 'VNPAY') {
        this.openVNPaySandboxModal(res.booking);
      } else {
        this.navigate('my-bookings');
      }
    } catch (e) {
      this.toast(e.message, 'error');
      // Refresh lại ma trận phòng trường hợp vừa có người khác đặt
      await this.changeBookingDate(this.bookingDraft.date);
    }
  },

  drawVenueDetailView() {
    const v = this.selectedVenue;
    const container = document.getElementById('app-content');
    const { lat, lng } = this.getVenueCoordinates(v);
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Gom tất cả đánh giá từ các sân con của cụm sân
    const allReviews = [];
    (v.courts || []).forEach((c) => {
      (c.reviews || []).forEach((r) => {
        allReviews.push({ ...r, courtName: c.name });
      });
    });

    container.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Back Button -->
        <button onclick="app.navigate('home')" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 mb-4">
          ← Quay lại danh sách cụm sân
        </button>

        <!-- Venue Header Card -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
                  ${v.sport?.icon || '🏅'} ${v.sport?.name || ''}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  ★ ${Number(v.ratingAvg || 5).toFixed(1)} (${v.reviewCount || allReviews.length} đánh giá)
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  🕒 Mở cửa: ${v.openTime} - ${v.closeTime}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                  🏟️ ${(v.courts || []).length} sân con
                </span>
              </div>
              <h1 class="text-2xl font-extrabold text-slate-900">${v.name}</h1>
              <p class="text-xs sm:text-sm text-slate-600 mt-1">📍 Địa chỉ: ${v.address}, Quận ${v.district}, ${v.city} • 📞 Hotline: <strong>${v.phone}</strong></p>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">${v.description || ''}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 shrink-0">
              <a href="${gmapsUrl}" target="_blank" rel="noopener" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5">
                🧭 Mở Google Maps chỉ đường
              </a>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            ${(v.venueFacilities || [])
              .map(
                (vf) => `
              <span class="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                ✓ ${vf.facility?.name || ''}
              </span>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- MAIN BOOKING GRID: LEFT = SLOT MATRIX & MAP, RIGHT = SUMMARY -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <!-- Interactive Slot Matrix -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
                <div>
                  <h2 class="text-base font-extrabold text-slate-900">📅 Ma Trận Khung Giờ Đặt Sân</h2>
                  <p class="text-xs text-slate-500">Chọn ngày và nhấp vào các khung giờ còn trống để đặt lịch</p>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold text-slate-600">Ngày chơi:</label>
                  <input
                    type="date"
                    value="${this.bookingDraft.date}"
                    min="${new Date().toISOString().slice(0, 10)}"
                    onchange="app.changeBookingDate(this.value)"
                    class="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <!-- Legend -->
              <div class="flex flex-wrap items-center gap-4 text-xs mb-4">
                <div class="flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded border border-slate-300 bg-white inline-block"></span>
                  <span>Còn trống</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded bg-brand-600 inline-block"></span>
                  <span>Đang chọn</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded bg-slate-200 inline-block"></span>
                  <span>Đã có người đặt</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-amber-500 font-bold">★</span>
                  <span>Khung giờ vàng cao điểm</span>
                </div>
              </div>

              <div id="slot-matrix-container" class="space-y-4"></div>
            </div>

            <!-- VENUE LOCATION MAP & DIRECTIONS -->
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-extrabold text-slate-900">🗺️ Vị Trí Cụm Sân Trên Bản Đồ</h3>
                  <p class="text-xs text-slate-500 mt-0.5">${v.address}, Quận ${v.district}, ${v.city} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})</p>
                </div>
                <a href="${gmapsUrl}" target="_blank" rel="noopener" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5">
                  🧭 Chỉ đường tới sân
                </a>
              </div>
              <div id="venue-detail-map" style="height: 320px; width: 100%; z-index: 10;"></div>
            </div>

            <!-- Reviews Section -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 class="text-base font-extrabold text-slate-900 mb-4">⭐ Đánh Giá Từ Người Chơi (${allReviews.length})</h3>
              ${
                allReviews.length === 0
                  ? `<p class="text-xs text-slate-400 py-4">Chưa có đánh giá nào cho cụm sân này.</p>`
                  : `<div class="space-y-4">
                      ${allReviews
                        .map(
                          (r) => `
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                          <div class="flex items-center justify-between mb-1.5">
                            <span class="font-bold text-slate-900">${r.user?.fullName || 'Khách hàng'} <span class="font-normal text-slate-400">• ${r.courtName}</span></span>
                            <span class="text-amber-500 font-bold">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                          </div>
                          <p class="text-slate-700 leading-relaxed">${r.comment}</p>
                          ${
                            r.reply
                              ? `
                            <div class="mt-2.5 pl-3 border-l-2 border-brand-600 bg-emerald-50/50 p-2 rounded-r-lg">
                              <span class="font-bold text-brand-700 block">Phản hồi từ Chủ sân:</span>
                              <span class="text-slate-600">${r.reply}</span>
                            </div>
                          `
                              : ''
                          }
                        </div>
                      `
                        )
                        .join('')}
                    </div>`
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: BOOKING SUMMARY -->
          <div>
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-20">
              <h3 class="text-base font-extrabold text-slate-900 pb-3 mb-4 border-b border-slate-200">
                🧾 Thông Tin Đặt Lịch
              </h3>
              <div id="booking-summary-content"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.drawSlotMatrix();
    this.updateBookingSummaryBox();

    // Khởi tạo bản đồ chi tiết cụm sân
    setTimeout(() => {
      const detailMapEl = document.getElementById('venue-detail-map');
      if (detailMapEl && typeof L !== 'undefined') {
        const dMap = L.map(detailMapEl, {
          center: [lat, lng],
          zoom: 15,
          scrollWheelZoom: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(dMap);

        const pinIcon = L.divIcon({
          className: '',
          html: `<div class="sz-map-marker active"><span>${v.sport?.icon || '🏟️'}</span><span>${v.name}</span></div>`,
          iconSize: [0, 0],
        });

        const m = L.marker([lat, lng], { icon: pinIcon }).addTo(dMap);
        m.bindPopup(`
          <div class="p-3 text-xs">
            <div class="font-extrabold text-slate-900">${v.name}</div>
            <div class="text-slate-500 mt-0.5">📍 ${v.address}, Quận ${v.district}</div>
            <a href="${gmapsUrl}" target="_blank" rel="noopener" class="mt-2 inline-block px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold no-underline">
              🧭 Mở Google Maps chỉ đường
            </a>
          </div>
        `).openPopup();
      }
    }, 150);
  },

  // =========================================================================
  // 3. QUẢN LÝ LỊCH ĐẶT CỦA TÔI & THANH TOÁN VNPAY SANDBOX & ĐÁNH GIÁ
  // =========================================================================
  async renderMyBookings() {
    const container = document.getElementById('app-content');
    container.innerHTML = `<div class="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-slate-500">Đang tải danh sách lịch đặt sân...</div>`;

    try {
      const res = await api.request('/bookings/me');
      const bookings = res.bookings || [];

      const statusBadge = (st) => {
        const map = {
          PENDING: 'bg-amber-100 text-amber-800',
          CONFIRMED: 'bg-blue-100 text-blue-800',
          COMPLETED: 'bg-emerald-100 text-emerald-800',
          CANCELLED: 'bg-red-100 text-red-700',
          REJECTED: 'bg-slate-200 text-slate-700',
        };
        return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${map[st] || 'bg-slate-100'}">${st}</span>`;
      };

      container.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-2xl font-extrabold text-slate-900">Lịch Đặt Sân Của Tôi</h1>
              <p class="text-xs text-slate-500 mt-1">Theo dõi trạng thái sân, thanh toán cọc VNPay và gửi đánh giá sau trận đấu</p>
            </div>
            <button onclick="app.navigate('home')" class="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700">
              + Đặt thêm lịch mới
            </button>
          </div>

          ${
            bookings.length === 0
              ? `
            <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p class="text-sm font-bold text-slate-700">Bạn chưa có đơn đặt sân nào</p>
              <button onclick="app.navigate('home')" class="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold">Khám phá cụm sân ngay</button>
            </div>
          `
              : `
            <div class="space-y-4">
              ${bookings
                .map((b) => {
                  const payStatus = b.payment?.status || 'UNPAID';
                  const canPay = payStatus === 'UNPAID' && ['PENDING', 'CONFIRMED'].includes(b.status);
                  const canCancel = ['PENDING', 'CONFIRMED'].includes(b.status);
                  const canReview = b.status === 'COMPLETED' && !b.review;

                  return `
                  <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">${b.bookingCode}</span>
                        ${statusBadge(b.status)}
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          payStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : payStatus === 'REFUNDED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }">
                          Thanh toán: ${payStatus} (${b.payment?.paymentMethod || 'VNPAY'})
                        </span>
                      </div>
                      <h3 class="text-base font-bold text-slate-900 pt-1">
                        ${b.court?.name || 'Sân thể thao'} — <span class="text-slate-600">${b.court?.venue?.name || ''}</span>
                      </h3>
                      <p class="text-xs text-slate-600">
                        📅 Ngày chơi: <strong>${String(b.bookingDate).slice(0, 10)}</strong> • 🕒 Khung giờ: <strong class="text-brand-600">${b.startTime} - ${b.endTime}</strong>
                      </p>
                      ${b.note ? `<p class="text-xs text-slate-500 italic">Ghi chú: "${b.note}"</p>` : ''}
                    </div>

                    <div class="flex sm:flex-col items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div class="text-right">
                        <span class="text-[11px] text-slate-400 block">Tổng phí</span>
                        <span class="text-base font-extrabold text-slate-900">${this.formatVND(b.totalAmount)}</span>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        ${
                          canPay
                            ? `<button onclick='app.openVNPaySandboxModal(${JSON.stringify({
                                id: b.id,
                                bookingCode: b.bookingCode,
                                totalAmount: b.totalAmount,
                              })})' class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs">
                                💳 Thanh toán VNPay
                              </button>`
                            : ''
                        }
                        ${
                          canReview
                            ? `<button onclick="app.openReviewModal(${b.id}, '${b.bookingCode}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold">
                                ⭐ Viết đánh giá
                              </button>`
                            : ''
                        }
                        ${
                          canCancel
                            ? `<button onclick="app.cancelMyBooking(${b.id})" class="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold">
                                Hủy lịch
                              </button>`
                            : ''
                        }
                      </div>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>
      `;
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async cancelMyBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn hủy lịch đặt sân này? (Hủy trước giờ chơi tối thiểu 2 tiếng sẽ được hoàn cọc)')) {
      return;
    }
    try {
      await api.request(`/bookings/${bookingId}/cancel`, { method: 'POST' });
      this.toast('Đã hủy lịch đặt sân thành công');
      this.renderMyBookings();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openVNPaySandboxModal(booking) {
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded bg-blue-600 text-white font-extrabold text-xs">VNPAY</span>
            <h3 class="text-base font-extrabold text-slate-900">Cổng Thanh Toán VNPay Sandbox</h3>
          </div>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs space-y-2 mb-4">
          <div class="flex justify-between">
            <span class="text-slate-600">Mã đơn đặt sân:</span>
            <span class="font-mono font-bold text-slate-900">${booking.bookingCode}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">Số tiền thanh toán:</span>
            <span class="font-extrabold text-blue-700 text-sm">${this.formatVND(booking.totalAmount)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">Ngân hàng Thử nghiệm:</span>
            <span class="font-semibold text-slate-800">NCB (Ngân hàng Quốc Dân - Sandbox)</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">Số thẻ Test:</span>
            <span class="font-mono text-slate-800">9704198526191432198 (NGUYEN VAN A)</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="app.confirmVNPayPayment(${booking.id})" class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md">
            ✅ Xác nhận Thanh toán Thành công
          </button>
          <button onclick="app.closeModal(); app.navigate('my-bookings');" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Để sau
          </button>
        </div>
      </div>
    `);
  },

  async confirmVNPayPayment(bookingId) {
    try {
      await api.request(`/payments/${bookingId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'VNPAY' }),
      });
      this.closeModal();
      this.toast('Thanh toán VNPay thành công! Lịch đặt đã chuyển sang CONFIRMED.');
      await this.loadNotifications();
      this.navigate('my-bookings');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openReviewModal(bookingId, bookingCode) {
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900">⭐ Đánh Giá Trải Nghiệm Sân (${bookingCode})</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Mức độ hài lòng (Số sao)</label>
            <select id="review-rating" class="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-amber-600">
              <option value="5">★★★★★ — 5 sao (Tuyệt vời)</option>
              <option value="4">★★★★☆ — 4 sao (Tốt)</option>
              <option value="3">★★★☆☆ — 3 sao (Bình thường)</option>
              <option value="2">★★☆☆☆ — 2 sao (Kém)</option>
              <option value="1">★☆☆☆☆ — 1 sao (Rất tệ)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Nhận xét chi tiết về mặt sân, ánh sáng, dịch vụ</label>
            <textarea id="review-comment" rows="3" placeholder="Mặt sân mới, đèn sáng không chói, chủ sân nhiệt tình..." class="w-full px-3 py-2 rounded-xl border border-slate-200"></textarea>
          </div>
          <button onclick="app.submitReview(${bookingId})" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
            Gửi Đánh Giá
          </button>
        </div>
      </div>
    `);
  },

  async submitReview(bookingId) {
    const rating = document.getElementById('review-rating')?.value || 5;
    const comment = document.getElementById('review-comment')?.value || '';
    if (!comment.trim()) {
      this.toast('Vui lòng nhập nội dung nhận xét!', 'error');
      return;
    }
    try {
      await api.request('/reviews', {
        method: 'POST',
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      this.closeModal();
      this.toast('Cảm ơn bạn đã gửi đánh giá! Điểm trung bình cụm sân đã được cập nhật.');
      this.renderMyBookings();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // =========================================================================
  // 4. KHU VỰC CHỦ SÂN (OWNER DASHBOARD)
  // =========================================================================
  async renderOwnerDashboard() {
    const container = document.getElementById('app-content');
    container.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-10 text-center text-sm text-slate-500">Đang tải dữ liệu Quản lý Cụm sân...</div>`;

    try {
      const [statsRes, myVenuesRes, ownerBookingsRes] = await Promise.all([
        api.request('/owner/stats'),
        api.request('/venues/owner/me'),
        api.request('/bookings/owner'),
      ]);

      const summary = statsRes.summary || {};
      const venues = myVenuesRes.venues || [];
      const bookings = ownerBookingsRes.bookings || [];

      container.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold text-slate-900">🏟️ Quản Lý Cụm Sân & Doanh Thu (Chủ Sân)</h1>
              <p class="text-xs text-slate-500 mt-1">Quản lý cơ sở, sân con, khung giá giờ vàng, duyệt lịch đặt và phản hồi đánh giá</p>
            </div>
            <div class="flex gap-2">
              <button onclick="app.openCreateVenueModal()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs">
                + Thêm Cụm Sân Mới
              </button>
              <button onclick="app.openCreateCourtModal(${venues[0]?.id || ''})" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">
                + Thêm Sân Con
              </button>
            </div>
          </div>

          <!-- KPI CARDS -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-xs text-slate-500 font-medium">Tổng Doanh Thu</span>
              <div class="text-2xl font-extrabold text-brand-600 mt-1">${this.formatVND(summary.totalRevenue)}</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-xs text-slate-500 font-medium">Cụm Sân & Sân Con</span>
              <div class="text-2xl font-extrabold text-slate-900 mt-1">${summary.totalVenues || 0} cơ sở / ${summary.totalCourts || 0} sân</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-xs text-slate-500 font-medium">Tổng Lượt Đặt Sân</span>
              <div class="text-2xl font-extrabold text-blue-600 mt-1">${summary.totalBookings || 0} đơn</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-xs text-slate-500 font-medium">Hoàn Thành / Đã Hủy</span>
              <div class="text-2xl font-extrabold text-emerald-600 mt-1">${summary.completedBookings || 0} / <span class="text-red-500">${summary.cancelledBookings || 0}</span></div>
            </div>
          </div>

          <!-- MY VENUES & COURTS LIST -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 class="text-base font-extrabold text-slate-900 mb-4">Danh Sách Cụm Sân & Sân Con Của Bạn</h2>
            <div class="space-y-4">
              ${venues
                .map(
                  (v) => `
                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <span class="font-bold text-sm text-slate-900">${v.name}</span>
                      <span class="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }">${v.status}</span>
                      <p class="text-xs text-slate-500 mt-0.5">📍 ${v.address}, ${v.district} • 🕒 ${v.openTime} - ${v.closeTime}</p>
                    </div>
                    <button onclick="app.openCreateCourtModal(${v.id})" class="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold">
                      + Thêm sân con vào cơ sở này
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${(v.courts || [])
                      .map(
                        (c) => `
                      <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div class="font-bold text-slate-800">${c.name} <span class="font-normal text-slate-500">(${c.courtType})</span></div>
                          <div class="text-[11px] text-slate-500 mt-0.5">
                            Trạng thái: <strong class="${c.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'}">${c.status}</strong>
                            • ${(c.priceRules || []).map((r) => `${r.startTime}-${r.endTime}: ${Number(r.price / 1000)}k`).join(' | ')}
                          </div>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <button onclick="app.toggleCourtMaintenance(${c.id}, '${c.status}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                            ${c.status === 'ACTIVE' ? 'Bảo trì' : 'Mở lại'}
                          </button>
                          <button onclick="app.deleteOwnerCourt(${c.id})" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-semibold">
                            Xóa
                          </button>
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- BOOKINGS MANAGEMENT TABLE -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 class="text-base font-extrabold text-slate-900 mb-4">📋 Xử Lý Lịch Đặt Sân Của Khách Hàng</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500 uppercase">
                    <th class="py-3 px-2">Mã đơn</th>
                    <th class="py-3 px-2">Khách hàng</th>
                    <th class="py-3 px-2">Sân con</th>
                    <th class="py-3 px-2">Ngày & Giờ</th>
                    <th class="py-3 px-2">Tổng tiền</th>
                    <th class="py-3 px-2">Trạng thái</th>
                    <th class="py-3 px-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${bookings
                    .map(
                      (b) => `
                    <tr class="hover:bg-slate-50">
                      <td class="py-3 px-2 font-mono font-bold text-brand-700">${b.bookingCode}</td>
                      <td class="py-3 px-2">
                        <div class="font-bold text-slate-800">${b.user?.fullName || 'Khách hàng'}</div>
                        <div class="text-slate-400">${b.user?.phone || ''}</div>
                      </td>
                      <td class="py-3 px-2 font-medium text-slate-800">${b.court?.name || ''}</td>
                      <td class="py-3 px-2">${String(b.bookingDate).slice(0, 10)} <strong class="text-brand-600">${b.startTime}-${b.endTime}</strong></td>
                      <td class="py-3 px-2 font-bold">${this.formatVND(b.totalAmount)}</td>
                      <td class="py-3 px-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">${b.status}</span>
                      </td>
                      <td class="py-3 px-2 text-right space-x-1">
                        ${
                          b.status === 'PENDING'
                            ? `<button onclick="app.updateBookingStatus(${b.id}, 'CONFIRMED')" class="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">Xác nhận</button>`
                            : ''
                        }
                        ${
                          ['PENDING', 'CONFIRMED'].includes(b.status)
                            ? `<button onclick="app.updateBookingStatus(${b.id}, 'COMPLETED')" class="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold">Hoàn thành</button>
                               <button onclick="app.updateBookingStatus(${b.id}, 'REJECTED')" class="px-2.5 py-1 rounded bg-red-50 text-red-600 font-bold">Từ chối</button>`
                            : ''
                        }
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async updateBookingStatus(bookingId, status) {
    try {
      await api.request(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      this.toast(`Đã chuyển trạng thái đơn sang ${status}`);
      this.renderOwnerDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async toggleCourtMaintenance(courtId, currentStatus) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      await api.request(`/courts/${courtId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      this.toast(`Đã chuyển trạng thái sân con sang ${nextStatus}`);
      this.renderOwnerDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async deleteOwnerCourt(courtId) {
    if (!confirm('Bạn có chắc muốn xóa sân con này? (Hệ thống sẽ từ chối nếu sân đang có lịch đặt hoạt động)')) {
      return;
    }
    try {
      await api.request(`/courts/${courtId}`, { method: 'DELETE' });
      this.toast('Đã xóa sân con thành công');
      this.renderOwnerDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openCreateVenueModal() {
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900">🏟️ Đăng Ký Cụm Sân Mới</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tên cụm sân</label>
            <input id="new-venue-name" type="text" placeholder="VD: Cụm Sân Pickleball Mỹ Đình" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Môn thể thao</label>
              <select id="new-venue-sport" class="w-full px-3 py-2 rounded-xl border border-slate-200">
                ${this.sports.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Quận / Huyện</label>
              <input id="new-venue-district" type="text" value="Cầu Giấy" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Địa chỉ chi tiết</label>
            <input id="new-venue-address" type="text" placeholder="Số nhà, tên đường, phường..." class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Số điện thoại</label>
              <input id="new-venue-phone" type="text" value="0987654321" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Giờ mở cửa</label>
              <input id="new-venue-open" type="text" value="06:00" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Giờ đóng cửa</label>
              <input id="new-venue-close" type="text" value="23:00" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Mô tả cơ sở</label>
            <textarea id="new-venue-desc" rows="2" placeholder="Mặt sân đạt chuẩn quốc tế, có bãi đỗ ô tô..." class="w-full px-3 py-2 rounded-xl border border-slate-200"></textarea>
          </div>
          <button onclick="app.submitCreateVenue()" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
            Gửi Yêu Cầu Tạo Cụm Sân
          </button>
        </div>
      </div>
    `);
  },

  async submitCreateVenue() {
    const name = document.getElementById('new-venue-name')?.value;
    const sportId = document.getElementById('new-venue-sport')?.value;
    const district = document.getElementById('new-venue-district')?.value;
    const address = document.getElementById('new-venue-address')?.value;
    const phone = document.getElementById('new-venue-phone')?.value;
    const openTime = document.getElementById('new-venue-open')?.value;
    const closeTime = document.getElementById('new-venue-close')?.value;
    const description = document.getElementById('new-venue-desc')?.value;

    try {
      await api.request('/venues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          sportId,
          district,
          address,
          phone,
          openTime,
          closeTime,
          description,
          facilityIds: [1, 2, 3],
        }),
      });
      this.closeModal();
      this.toast('Đã tạo cụm sân mới thành công!');
      await this.loadInitialData();
      this.renderOwnerDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openCreateCourtModal(defaultVenueId) {
    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900">➕ Thêm Sân Con & Bảng Giá Khung Giờ</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">ID Cụm sân</label>
            <input id="new-court-venue-id" type="number" value="${defaultVenueId || 1}" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tên sân con</label>
            <input id="new-court-name" type="text" placeholder="VD: Sân 3 (VIP Trong Nhà)" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Loại mặt sân</label>
            <input id="new-court-type" type="text" value="Thảm Cushion tiêu chuẩn USAPA" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Giá giờ thường (06:00-17:00)</label>
              <input id="new-court-price-normal" type="number" value="140000" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Giá giờ vàng (17:00-23:00)</label>
              <input id="new-court-price-peak" type="number" value="210000" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
          </div>
          <button onclick="app.submitCreateCourt()" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
            Tạo Sân Con & Lưu Bảng Giá
          </button>
        </div>
      </div>
    `);
  },

  async submitCreateCourt() {
    const venueId = document.getElementById('new-court-venue-id')?.value;
    const name = document.getElementById('new-court-name')?.value;
    const courtType = document.getElementById('new-court-type')?.value;
    const normalPrice = Number(document.getElementById('new-court-price-normal')?.value || 140000);
    const peakPrice = Number(document.getElementById('new-court-price-peak')?.value || 210000);

    try {
      await api.request('/courts', {
        method: 'POST',
        body: JSON.stringify({
          venueId,
          name,
          courtType,
          isCovered: true,
          priceRules: [
            { name: 'Giờ thường ban ngày', startTime: '06:00', endTime: '17:00', price: normalPrice, isPeak: false },
            { name: 'Giờ vàng cao điểm', startTime: '17:00', endTime: '23:00', price: peakPrice, isPeak: true },
          ],
        }),
      });
      this.closeModal();
      this.toast('Đã thêm sân con và cấu hình giá thành công!');
      this.renderOwnerDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // =========================================================================
  // 5. KHU VỰC QUẢN TRỊ VIÊN (ADMIN DASHBOARD)
  // =========================================================================
  async renderAdminDashboard() {
    const container = document.getElementById('app-content');
    container.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-10 text-center text-sm text-slate-500">Đang tải bảng điều khiển Quản trị hệ thống...</div>`;

    try {
      const [statsRes, usersRes, venuesRes, sportsRes] = await Promise.all([
        api.request('/admin/stats'),
        api.request('/admin/users'),
        api.request('/admin/venues'),
        api.request('/sports'),
      ]);

      const summary = statsRes.summary || {};
      const users = usersRes.users || [];
      const allVenues = venuesRes.venues || [];
      const sports = sportsRes.sports || [];

      container.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">🛡️ Quản Trị Hệ Thống Toàn Nền Tảng (Admin)</h1>
            <p class="text-xs text-slate-500 mt-1">Kiểm duyệt cụm sân mới, quản lý khóa/mở khóa tài khoản, danh mục môn thể thao và giám sát doanh thu</p>
          </div>

          <!-- KPI CARDS -->
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="bg-white p-4 rounded-2xl border border-slate-200">
              <span class="text-xs text-slate-500">Tài khoản</span>
              <div class="text-xl font-extrabold text-slate-900 mt-1">${summary.totalUsers || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200">
              <span class="text-xs text-slate-500">Tổng Cụm sân</span>
              <div class="text-xl font-extrabold text-slate-900 mt-1">${summary.totalVenues || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200">
              <span class="text-xs text-slate-500">Chờ kiểm duyệt</span>
              <div class="text-xl font-extrabold text-amber-600 mt-1">${summary.pendingVenues || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200">
              <span class="text-xs text-slate-500">Tổng Lượt đặt</span>
              <div class="text-xl font-extrabold text-blue-600 mt-1">${summary.totalBookings || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200">
              <span class="text-xs text-slate-500">Tổng Giao dịch</span>
              <div class="text-xl font-extrabold text-brand-600 mt-1">${this.formatVND(summary.totalRevenue)}</div>
            </div>
          </div>

          <!-- VENUE APPROVAL TABLE -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 class="text-base font-extrabold text-slate-900 mb-4">🏟️ Kiểm Duyệt Cụm Sân</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500 uppercase">
                    <th class="py-2.5 px-2">ID</th>
                    <th class="py-2.5 px-2">Tên cụm sân</th>
                    <th class="py-2.5 px-2">Môn</th>
                    <th class="py-2.5 px-2">Chủ sân</th>
                    <th class="py-2.5 px-2">Trạng thái</th>
                    <th class="py-2.5 px-2 text-right">Thao tác kiểm duyệt</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${allVenues
                    .map(
                      (v) => `
                    <tr>
                      <td class="py-2.5 px-2 font-mono">#${v.id}</td>
                      <td class="py-2.5 px-2 font-bold text-slate-900">${v.name} <span class="font-normal text-slate-400">(${v.district})</span></td>
                      <td class="py-2.5 px-2">${v.sport?.name || ''}</td>
                      <td class="py-2.5 px-2">${v.owner?.fullName || ''}</td>
                      <td class="py-2.5 px-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                        }">${v.status}</span>
                      </td>
                      <td class="py-2.5 px-2 text-right space-x-1">
                        <button onclick="app.adminUpdateVenueStatus(${v.id}, 'APPROVED')" class="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold">Duyệt (APPROVED)</button>
                        <button onclick="app.adminUpdateVenueStatus(${v.id}, 'SUSPENDED')" class="px-2.5 py-1 rounded bg-amber-500 text-white font-bold">Đình chỉ</button>
                        <button onclick="app.adminUpdateVenueStatus(${v.id}, 'REJECTED')" class="px-2.5 py-1 rounded bg-red-600 text-white font-bold">Từ chối</button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- USERS & SPORTS GRID -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Users Management -->
            <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 class="text-base font-extrabold text-slate-900 mb-4">👥 Quản Lý Tài Khoản Người Dùng</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-500 uppercase">
                      <th class="py-2 px-2">Họ tên</th>
                      <th class="py-2 px-2">Email / SĐT</th>
                      <th class="py-2 px-2">Vai trò</th>
                      <th class="py-2 px-2">Trạng thái</th>
                      <th class="py-2 px-2 text-right">Khóa / Mở khóa</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${users
                      .map(
                        (u) => `
                      <tr>
                        <td class="py-2.5 px-2 font-bold text-slate-800">${u.fullName}</td>
                        <td class="py-2.5 px-2 text-slate-500">${u.email}<br/>${u.phone}</td>
                        <td class="py-2.5 px-2"><span class="px-2 py-0.5 rounded bg-slate-100 font-bold">${u.role?.name || u.role}</span></td>
                        <td class="py-2.5 px-2">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }">${u.status}</span>
                        </td>
                        <td class="py-2.5 px-2 text-right">
                          ${
                            u.status === 'ACTIVE'
                              ? `<button onclick="app.adminUpdateUserStatus(${u.id}, 'BANNED')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold">Khóa (Ban)</button>`
                              : `<button onclick="app.adminUpdateUserStatus(${u.id}, 'ACTIVE')" class="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold">Mở khóa</button>`
                          }
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Sports Category Management -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 class="text-base font-extrabold text-slate-900 mb-4">🏅 Danh Mục Môn Thể Thao</h2>
              <div class="space-y-2.5 mb-4">
                ${sports
                  .map(
                    (s) => `
                  <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span class="font-bold text-slate-800">${s.icon || '🏅'} ${s.name}</span>
                      <span class="text-slate-400 block text-[11px]">${s._count?.venues || 0} cụm sân đang dùng</span>
                    </div>
                    <button onclick="app.adminDeleteSport(${s.id})" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold">
                      Xóa
                    </button>
                  </div>
                `
                  )
                  .join('')}
              </div>

              <div class="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <input id="admin-sport-name" type="text" placeholder="Tên môn mới (VD: Tennis)" class="w-full px-3 py-2 rounded-lg border border-slate-200" />
                <input id="admin-sport-slug" type="text" placeholder="Slug (VD: tennis)" class="w-full px-3 py-2 rounded-lg border border-slate-200" />
                <button onclick="app.adminCreateSport()" class="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold">
                  + Thêm Môn Thể Thao
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async adminUpdateVenueStatus(venueId, status) {
    try {
      await api.request(`/admin/venues/${venueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      this.toast(`Đã cập nhật trạng thái cụm sân sang ${status}`);
      await this.loadInitialData();
      this.renderAdminDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async adminUpdateUserStatus(userId, status) {
    try {
      await api.request(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      this.toast(`Đã cập nhật trạng thái tài khoản sang ${status}`);
      this.renderAdminDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async adminCreateSport() {
    const name = document.getElementById('admin-sport-name')?.value;
    const slug = document.getElementById('admin-sport-slug')?.value;
    if (!name || !slug) {
      this.toast('Vui lòng nhập tên và slug môn thể thao', 'error');
      return;
    }
    try {
      await api.request('/sports', {
        method: 'POST',
        body: JSON.stringify({ name, slug, icon: '🎾' }),
      });
      this.toast('Đã thêm môn thể thao mới!');
      await this.loadInitialData();
      this.renderAdminDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async adminDeleteSport(sportId) {
    try {
      await api.request(`/sports/${sportId}`, { method: 'DELETE' });
      this.toast('Đã xóa môn thể thao');
      await this.loadInitialData();
      this.renderAdminDashboard();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // =========================================================================
  // 6. AUTHENTICATION & PROFILE MODALS
  // =========================================================================
  showModal(html) {
    const backdrop = document.getElementById('modal-backdrop');
    const body = document.getElementById('modal-body');
    body.innerHTML = html;
    backdrop.classList.remove('hidden');
  },

  closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
  },

  openAuthModal(mode = 'login') {
    if (mode === 'login') {
      this.showModal(`
        <div class="p-6">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h3 class="text-lg font-extrabold text-slate-900">Đăng Nhập SportZone</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
          </div>

          <!-- Quick 1-Click Demo Login -->
          <div class="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div class="font-bold text-slate-700 mb-2">⚡ Đăng nhập nhanh tài khoản Demo (1-Click):</div>
            <div class="grid grid-cols-3 gap-2">
              <button onclick="app.quickDemoLogin('son.nguyen@gmail.com', 'password123')" class="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                👤 Khách hàng
              </button>
              <button onclick="app.quickDemoLogin('epu.arena@gmail.com', 'password123')" class="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200">
                🏟️ Chủ sân
              </button>
              <button onclick="app.quickDemoLogin('admin@sportzone.vn', 'password123')" class="py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-200">
                🛡️ Admin
              </button>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Email</label>
              <input id="login-email" type="email" value="son.nguyen@gmail.com" class="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Mật khẩu</label>
              <input id="login-password" type="password" value="password123" class="w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <button onclick="app.submitLogin()" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm">
              Đăng nhập
            </button>
            <p class="text-center text-slate-500 pt-2">
              Chưa có tài khoản?
              <a href="#" onclick="app.openAuthModal('register'); return false;" class="text-brand-600 font-bold hover:underline">Đăng ký ngay</a>
            </p>
          </div>
        </div>
      `);
    } else {
      this.showModal(`
        <div class="p-6">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h3 class="text-lg font-extrabold text-slate-900">Đăng Ký Tài Khoản Mới</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
          </div>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Họ và tên</label>
              <input id="reg-fullname" type="text" placeholder="Nguyễn Văn A" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Email</label>
                <input id="reg-email" type="email" placeholder="email@gmail.com" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input id="reg-phone" type="text" placeholder="0981234567" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Mật khẩu (>= 6 ký tự)</label>
                <input id="reg-password" type="password" placeholder="******" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Vai trò đăng ký</label>
                <select id="reg-role" class="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold">
                  <option value="CUSTOMER">Khách hàng đặt sân</option>
                  <option value="OWNER">Chủ cơ sở cụm sân</option>
                </select>
              </div>
            </div>
            <button onclick="app.submitRegister()" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm">
              Tạo Tài Khoản
            </button>
            <p class="text-center text-slate-500 pt-2">
              Đã có tài khoản?
              <a href="#" onclick="app.openAuthModal('login'); return false;" class="text-brand-600 font-bold hover:underline">Đăng nhập</a>
            </p>
          </div>
        </div>
      `);
    }
  },

  async quickDemoLogin(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    await this.submitLogin();
  },

  async submitLogin() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    try {
      const res = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      api.setAuth(res.token, res.user);
      this.closeModal();
      this.syncAuthUI();
      this.toast(`Xin chào ${res.user.fullName} (${res.user.role})!`);

      if (res.user.role === 'ADMIN') {
        this.navigate('admin');
      } else if (res.user.role === 'OWNER') {
        this.navigate('owner');
      }
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  async submitRegister() {
    const fullName = document.getElementById('reg-fullname')?.value;
    const email = document.getElementById('reg-email')?.value;
    const phone = document.getElementById('reg-phone')?.value;
    const password = document.getElementById('reg-password')?.value;
    const role = document.getElementById('reg-role')?.value;

    try {
      const res = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone, password, role }),
      });
      api.setAuth(res.token, res.user);
      this.closeModal();
      this.syncAuthUI();
      this.toast('Đăng ký tài khoản thành công!');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  openProfileModal() {
    const user = api.getCurrentUser();
    if (!user) return;

    this.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 class="text-base font-extrabold text-slate-900">👤 Hồ Sơ Cá Nhân</h3>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Email đăng nhập</label>
            <input type="text" disabled value="${user.email}" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Họ và tên</label>
            <input id="prof-fullname" type="text" value="${user.fullName}" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Số điện thoại</label>
            <input id="prof-phone" type="text" value="${user.phone}" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <button onclick="app.submitUpdateProfile()" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    `);
  },

  async submitUpdateProfile() {
    const fullName = document.getElementById('prof-fullname')?.value;
    const phone = document.getElementById('prof-phone')?.value;
    try {
      const res = await api.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone }),
      });
      api.setAuth(api.getToken(), res.user);
      this.syncAuthUI();
      this.closeModal();
      this.toast('Cập nhật hồ sơ cá nhân thành công!');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  logout() {
    api.clearAuth();
    this.syncAuthUI();
    this.toast('Đã đăng xuất tài khoản');
    this.navigate('home');
  },
};

window.app = app;
window.addEventListener('DOMContentLoaded', () => app.init());

