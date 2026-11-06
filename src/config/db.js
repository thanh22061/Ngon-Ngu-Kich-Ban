const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

const SQLCMD_PATHS = [
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\180\\Tools\\Binn\\SQLCMD.EXE',
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE',
  'sqlcmd',
];

const SQLCMD_BIN = SQLCMD_PATHS.find((p) => p === 'sqlcmd' || fs.existsSync(p)) || 'sqlcmd';
const SQL_SERVER = process.env.SQL_SERVER_INSTANCE || '.\\SQLEXPRESS';
const SQL_DB = process.env.SQL_DATABASE_NAME || 'sportzone_db';

/**
 * Thực thi câu lệnh T-SQL trực tiếp trên Microsoft SQL Server (.\SQLEXPRESS)
 */
function runTSQL(sqlQuery) {
  const tmpFile = path.join(os.tmpdir(), `sz_query_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  try {
    // Ghi file với UTF-8 BOM để SQL Server hiểu đúng chuỗi Unicode N'...'
    fs.writeFileSync(tmpFile, '\uFEFF' + sqlQuery, { encoding: 'utf8' });
    const out = execFileSync(
      SQLCMD_BIN,
      ['-S', SQL_SERVER, '-d', SQL_DB, '-E', '-C', '-f', '65001', '-y', '0', '-i', tmpFile],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return out.trim();
  } finally {
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch (_) {}
    }
  }
}

function sqlLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  const escaped = String(val).replace(/'/g, "''");
  return `N'${escaped}'`;
}

// Bản đồ ánh xạ giữa tên trường camelCase (code JS) và tên cột snake_case (bảng SQL Server)
const COLUMN_MAPS = {
  roles: { id: 'id', name: 'name', description: 'description', createdAt: 'created_at' },
  users: {
    id: 'id',
    roleId: 'role_id',
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    password: 'password',
    avatar: 'avatar',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  sports: { id: 'id', name: 'name', slug: 'slug', description: 'description', icon: 'icon', createdAt: 'created_at' },
  facilities: { id: 'id', name: 'name', icon: 'icon', createdAt: 'created_at' },
  venues: {
    id: 'id',
    ownerId: 'owner_id',
    sportId: 'sport_id',
    name: 'name',
    slug: 'slug',
    address: 'address',
    district: 'district',
    city: 'city',
    description: 'description',
    phone: 'phone',
    openTime: 'open_time',
    closeTime: 'close_time',
    latitude: 'latitude',
    longitude: 'longitude',
    ratingAvg: 'rating_avg',
    reviewCount: 'review_count',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  venue_facilities: { id: 'id', venueId: 'venue_id', facilityId: 'facility_id' },
  courts: {
    id: 'id',
    venueId: 'venue_id',
    name: 'name',
    courtType: 'court_type',
    isCovered: 'is_covered',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  court_images: { id: 'id', courtId: 'court_id', imageUrl: 'image_url', isPrimary: 'is_primary', createdAt: 'created_at' },
  price_rules: {
    id: 'id',
    courtId: 'court_id',
    name: 'name',
    startTime: 'start_time',
    endTime: 'end_time',
    price: 'price',
    isPeak: 'is_peak',
    dayOfWeek: 'day_of_week',
    createdAt: 'created_at',
  },
  coupons: {
    id: 'id',
    code: 'code',
    discountPercent: 'discount_percent',
    maxDiscount: 'max_discount',
    minOrderAmount: 'min_order_amount',
    validFrom: 'valid_from',
    validUntil: 'valid_until',
    usageLimit: 'usage_limit',
    usedCount: 'used_count',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
  bookings: {
    id: 'id',
    bookingCode: 'booking_code',
    userId: 'user_id',
    courtId: 'court_id',
    bookingDate: 'booking_date',
    startTime: 'start_time',
    endTime: 'end_time',
    totalAmount: 'total_amount',
    depositAmount: 'deposit_amount',
    note: 'note',
    status: 'status',
    couponId: 'coupon_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  payments: {
    id: 'id',
    bookingId: 'booking_id',
    amount: 'amount',
    paymentMethod: 'payment_method',
    transactionId: 'transaction_id',
    status: 'status',
    paymentTime: 'payment_time',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  reviews: {
    id: 'id',
    bookingId: 'booking_id',
    userId: 'user_id',
    courtId: 'court_id',
    rating: 'rating',
    comment: 'comment',
    reply: 'reply',
    replyAt: 'reply_at',
    createdAt: 'created_at',
  },
  notifications: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    message: 'message',
    type: 'type',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
};

function rowToCamel(table, row) {
  const map = COLUMN_MAPS[table] || {};
  const reverseMap = {};
  for (const [camel, snake] of Object.entries(map)) {
    reverseMap[snake] = camel;
  }
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = reverseMap[k] || k;
    out[camelKey] = v;
  }
  return out;
}

class SqlServerBridge {
  constructor() {
    this.tables = {};
    this.isConnected = false;
    this.setupModels();
  }

  async $connect() {
    this.syncFromSqlServer();
    this.isConnected = true;
    return true;
  }

  async $disconnect() {
    return true;
  }

  async $transaction(arg) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      return arg(this);
    }
    return null;
  }

  /**
   * Đọc toàn bộ 14 bảng trực tiếp từ Microsoft SQL Server (.\SQLEXPRESS -> sportzone_db)
   */
  syncFromSqlServer(force = false) {
    if (!force && this.lastSyncTime && Date.now() - this.lastSyncTime < 1500) {
      return;
    }
    const tableNames = Object.keys(COLUMN_MAPS);
    const selectStatements = tableNames
      .map(
        (t) =>
          `SELECT '${t}' AS tbl, ISNULL((SELECT * FROM dbo.[${t}] FOR JSON PATH), '[]') AS data`
      )
      .join(' UNION ALL ');

    const query = `SET NOCOUNT ON; SELECT * FROM (${selectStatements}) AS t FOR JSON PATH;`;
    const rawOut = runTSQL(query).replace(/\r?\n/g, '');

    const parsed = JSON.parse(rawOut);
    for (const item of parsed) {
      const rows = JSON.parse(item.data || '[]');
      this.tables[item.tbl] = rows.map((r) => rowToCamel(item.tbl, r));
    }
    this.lastSyncTime = Date.now();

    // Đảm bảo mật khẩu tài khoản mẫu tương thích bcrypt
    const sampleUser = (this.tables.users || [])[0];
    if (sampleUser && sampleUser.password && sampleUser.password.includes('mK8o6zW2m')) {
      const realHash = bcrypt.hashSync('password123', 10);
      runTSQL(`UPDATE dbo.users SET password = '${realHash}';`);
      this.tables.users.forEach((u) => {
        u.password = realHash;
      });
    }
  }

  insertRowToSqlServer(table, data) {
    const map = COLUMN_MAPS[table];
    const cols = [];
    const vals = [];

    for (const [camelKey, val] of Object.entries(data)) {
      const snakeCol = map[camelKey];
      if (!snakeCol || snakeCol === 'id') continue;
      if (val === undefined) continue;
      cols.push(`[${snakeCol}]`);
      vals.push(sqlLiteral(val));
    }

    const sql = `
      SET NOCOUNT ON;
      INSERT INTO dbo.[${table}] (${cols.join(', ')})
      VALUES (${vals.join(', ')});
      SELECT SCOPE_IDENTITY() AS newId;
    `;
    const out = runTSQL(sql);
    this.syncFromSqlServer(true);
    return parseInt(out.trim(), 10);
  }

  updateRowInSqlServer(table, id, data) {
    const map = COLUMN_MAPS[table];
    const sets = [];

    for (const [camelKey, val] of Object.entries(data)) {
      const snakeCol = map[camelKey];
      if (!snakeCol || snakeCol === 'id') continue;
      if (val === undefined) continue;
      sets.push(`[${snakeCol}] = ${sqlLiteral(val)}`);
    }

    if (sets.length === 0) return;

    const sql = `
      SET NOCOUNT ON;
      UPDATE dbo.[${table}]
      SET ${sets.join(', ')}
      WHERE [id] = ${Number(id)};
    `;
    runTSQL(sql);
    this.syncFromSqlServer(true);
  }

  deleteRowInSqlServer(table, id) {
    const sql = `
      SET NOCOUNT ON;
      DELETE FROM dbo.[${table}] WHERE [id] = ${Number(id)};
    `;
    runTSQL(sql);
    this.syncFromSqlServer(true);
  }

  matchWhere(doc, where, colName) {
    if (!where || Object.keys(where).length === 0) return true;

    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;

      if (key === 'OR' && Array.isArray(cond)) {
        if (!cond.some((sub) => this.matchWhere(doc, sub, colName))) return false;
        continue;
      }

      if (colName === 'venues' && key === 'sport') {
        const sport = (this.tables.sports || []).find((s) => s.id === doc.sportId);
        if (!sport || !this.matchWhere(sport, cond, 'sports')) return false;
        continue;
      }

      if (colName === 'users' && key === 'role') {
        const role = (this.tables.roles || []).find((r) => r.id === doc.roleId);
        if (!role || !this.matchWhere(role, cond, 'roles')) return false;
        continue;
      }

      if ((colName === 'bookings' || colName === 'reviews') && key === 'court') {
        const court = (this.tables.courts || []).find((c) => c.id === doc.courtId);
        if (!court || !this.matchWhere(court, cond, 'courts')) return false;
        continue;
      }

      if (colName === 'courts' && key === 'venue') {
        const venue = (this.tables.venues || []).find((v) => v.id === doc.venueId);
        if (!venue || !this.matchWhere(venue, cond, 'venues')) return false;
        continue;
      }

      const val = doc[key];

      if (key === 'bookingDate' && cond instanceof Date) {
        if (String(val).slice(0, 10) !== cond.toISOString().slice(0, 10)) return false;
        continue;
      }

      if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
        if (cond.contains !== undefined) {
          if (!String(val || '').toLowerCase().includes(String(cond.contains).toLowerCase())) {
            return false;
          }
        }
        if (cond.in !== undefined) {
          if (!cond.in.includes(val)) return false;
        }
        if (cond.notIn !== undefined) {
          if (cond.notIn.includes(val)) return false;
        }
        if (cond.not !== undefined) {
          if (val === cond.not) return false;
        }
        if (cond.gte !== undefined) {
          if (new Date(val) < new Date(cond.gte)) return false;
        }
        if (cond.lte !== undefined) {
          if (new Date(val) > new Date(cond.lte)) return false;
        }
      } else {
        if (val !== cond) return false;
      }
    }

    return true;
  }

  populateDoc(doc, include, select, colName) {
    if (!doc) return null;
    const res = { ...doc };

    if (include) {
      if (colName === 'users' && include.role) {
        res.role = (this.tables.roles || []).find((r) => r.id === res.roleId) || null;
      }

      if (colName === 'sports' && include._count) {
        res._count = {
          venues: (this.tables.venues || []).filter((v) => v.sportId === res.id).length,
        };
      }

      if (colName === 'venues') {
        if (include.sport) {
          res.sport = (this.tables.sports || []).find((s) => s.id === res.sportId) || null;
        }
        if (include.owner) {
          res.owner = (this.tables.users || []).find((u) => u.id === res.ownerId) || null;
        }
        if (include.courts) {
          let courts = (this.tables.courts || []).filter((c) => c.venueId === res.id);
          if (include.courts.where) {
            courts = courts.filter((c) => this.matchWhere(c, include.courts.where, 'courts'));
          }
          res.courts = courts.map((c) =>
            this.populateDoc(c, include.courts.include, null, 'courts')
          );
        }
        if (include.venueFacilities) {
          const vfs = (this.tables.venue_facilities || []).filter((vf) => vf.venueId === res.id);
          res.venueFacilities = vfs.map((vf) => ({
            ...vf,
            facility: (this.tables.facilities || []).find((f) => f.id === vf.facilityId) || null,
          }));
        }
        if (include._count) {
          res._count = {
            courts: (this.tables.courts || []).filter((c) => c.venueId === res.id).length,
          };
        }
      }

      if (colName === 'courts') {
        if (include.priceRules) {
          res.priceRules = (this.tables.price_rules || []).filter((pr) => pr.courtId === res.id);
        }
        if (include.images) {
          res.images = (this.tables.court_images || []).filter((img) => img.courtId === res.id);
        }
        if (include.venue) {
          res.venue = (this.tables.venues || []).find((v) => v.id === res.venueId) || null;
        }
        if (include.bookings) {
          let bks = (this.tables.bookings || []).filter((b) => b.courtId === res.id);
          if (include.bookings.where) {
            bks = bks.filter((b) => this.matchWhere(b, include.bookings.where, 'bookings'));
          }
          res.bookings = bks;
        }
        if (include.reviews) {
          const rvs = (this.tables.reviews || []).filter((r) => r.courtId === res.id);
          res.reviews = rvs.map((r) =>
            this.populateDoc(r, include.reviews.include, null, 'reviews')
          );
        }
        if (include._count) {
          res._count = {
            bookings: (this.tables.bookings || []).filter((b) => b.courtId === res.id).length,
          };
        }
      }

      if (colName === 'price_rules' && include.court) {
        const court = (this.tables.courts || []).find((c) => c.id === res.courtId) || null;
        res.court = this.populateDoc(court, include.court.include, null, 'courts');
      }

      if (colName === 'bookings') {
        if (include.court) {
          const court = (this.tables.courts || []).find((c) => c.id === res.courtId) || null;
          res.court = this.populateDoc(court, include.court.include, null, 'courts');
        }
        if (include.payment) {
          res.payment = (this.tables.payments || []).find((p) => p.bookingId === res.id) || null;
        }
        if (include.review) {
          res.review = (this.tables.reviews || []).find((r) => r.bookingId === res.id) || null;
        }
        if (include.coupon) {
          res.coupon = (this.tables.coupons || []).find((cp) => cp.id === res.couponId) || null;
        }
        if (include.user) {
          res.user = (this.tables.users || []).find((u) => u.id === res.userId) || null;
        }
      }

      if (colName === 'payments' && include.booking) {
        res.booking = (this.tables.bookings || []).find((b) => b.id === res.bookingId) || null;
      }

      if (colName === 'reviews') {
        if (include.user) {
          res.user = (this.tables.users || []).find((u) => u.id === res.userId) || null;
        }
        if (include.court) {
          const court = (this.tables.courts || []).find((c) => c.id === res.courtId) || null;
          res.court = this.populateDoc(court, include.court.include, null, 'courts');
        }
      }
    }

    if (select) {
      if (colName === 'users' && select.role) {
        res.role = (this.tables.roles || []).find((r) => r.id === res.roleId) || null;
      }
    }

    return res;
  }

  createModelDelegate(colName) {
    const self = this;

    return {
      async findMany(args = {}) {
        self.syncFromSqlServer();
        let items = (self.tables[colName] || []).filter((doc) =>
          self.matchWhere(doc, args.where, colName)
        );

        if (args.orderBy) {
          const orders = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
          const [field, dir] = Object.entries(orders[0])[0];
          items.sort((a, b) => {
            if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
            if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
            return 0;
          });
        }

        if (args.skip !== undefined) items = items.slice(args.skip);
        if (args.take !== undefined) items = items.slice(0, args.take);

        return items.map((doc) => self.populateDoc(doc, args.include, args.select, colName));
      },

      async findUnique(args = {}) {
        self.syncFromSqlServer();
        const doc = (self.tables[colName] || []).find((d) =>
          self.matchWhere(d, args.where, colName)
        );
        return self.populateDoc(doc, args.include, args.select, colName);
      },

      async findFirst(args = {}) {
        self.syncFromSqlServer();
        const doc = (self.tables[colName] || []).find((d) =>
          self.matchWhere(d, args.where, colName)
        );
        return self.populateDoc(doc, args.include, args.select, colName);
      },

      async count(args = {}) {
        self.syncFromSqlServer();
        return (self.tables[colName] || []).filter((doc) =>
          self.matchWhere(doc, args.where, colName)
        ).length;
      },

      async create(args = {}) {
        const rawData = { ...args.data };
        const nestedVenueFacilities = rawData.venueFacilities;
        const nestedImages = rawData.images;
        const nestedPriceRules = rawData.priceRules;
        delete rawData.venueFacilities;
        delete rawData.images;
        delete rawData.priceRules;

        const newId = self.insertRowToSqlServer(colName, rawData);

        if (nestedVenueFacilities && nestedVenueFacilities.create) {
          const list = Array.isArray(nestedVenueFacilities.create)
            ? nestedVenueFacilities.create
            : [nestedVenueFacilities.create];
          list.forEach((item) => {
            self.insertRowToSqlServer('venue_facilities', {
              venueId: newId,
              facilityId: item.facilityId,
            });
          });
        }

        if (nestedImages && nestedImages.create) {
          const list = Array.isArray(nestedImages.create)
            ? nestedImages.create
            : [nestedImages.create];
          list.forEach((item) => {
            self.insertRowToSqlServer('court_images', {
              courtId: newId,
              ...item,
            });
          });
        }

        if (nestedPriceRules && nestedPriceRules.create) {
          const list = Array.isArray(nestedPriceRules.create)
            ? nestedPriceRules.create
            : [nestedPriceRules.create];
          list.forEach((item) => {
            self.insertRowToSqlServer('price_rules', {
              courtId: newId,
              ...item,
            });
          });
        }

        const created = (self.tables[colName] || []).find((d) => d.id === newId);
        return self.populateDoc(created, args.include, args.select, colName);
      },

      async createMany(args = {}) {
        const list = args.data || [];
        list.forEach((item) => {
          self.insertRowToSqlServer(colName, item);
        });
        return { count: list.length };
      },

      async update(args = {}) {
        self.syncFromSqlServer();
        const current = (self.tables[colName] || []).find((d) =>
          self.matchWhere(d, args.where, colName)
        );
        if (!current) throw new Error(`Record not found in ${colName}`);

        const updates = { ...args.data };
        for (const [k, v] of Object.entries(updates)) {
          if (v && typeof v === 'object' && v.increment !== undefined) {
            updates[k] = Number(current[k] || 0) + Number(v.increment);
          }
        }

        self.updateRowInSqlServer(colName, current.id, updates);
        const updated = (self.tables[colName] || []).find((d) => d.id === current.id);
        return self.populateDoc(updated, args.include, args.select, colName);
      },

      async updateMany(args = {}) {
        self.syncFromSqlServer();
        const matches = (self.tables[colName] || []).filter((d) =>
          self.matchWhere(d, args.where, colName)
        );
        matches.forEach((m) => {
          self.updateRowInSqlServer(colName, m.id, args.data);
        });
        return { count: matches.length };
      },

      async upsert(args = {}) {
        const existing = await this.findFirst({ where: args.where });
        if (existing) {
          return this.update({
            where: args.where,
            data: args.update,
            include: args.include,
          });
        }
        return this.create({
          data: args.create,
          include: args.include,
        });
      },

      async delete(args = {}) {
        self.syncFromSqlServer();
        const current = (self.tables[colName] || []).find((d) =>
          self.matchWhere(d, args.where, colName)
        );
        if (!current) throw new Error(`Record not found in ${colName}`);
        self.deleteRowInSqlServer(colName, current.id);
        return current;
      },

      async deleteMany(args = {}) {
        self.syncFromSqlServer();
        const matches = (self.tables[colName] || []).filter((d) =>
          self.matchWhere(d, args.where, colName)
        );
        matches.forEach((m) => {
          self.deleteRowInSqlServer(colName, m.id);
        });
        return { count: matches.length };
      },

      async aggregate(args = {}) {
        self.syncFromSqlServer();
        const items = (self.tables[colName] || []).filter((doc) =>
          self.matchWhere(doc, args.where, colName)
        );
        const result = {};

        if (args._sum) {
          result._sum = {};
          for (const field of Object.keys(args._sum)) {
            result._sum[field] = items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
          }
        }

        if (args._avg) {
          result._avg = {};
          for (const field of Object.keys(args._avg)) {
            result._avg[field] =
              items.length > 0
                ? items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / items.length
                : null;
          }
        }

        if (args._count) {
          result._count = { id: items.length };
        }

        return result;
      },
    };
  }

  setupModels() {
    this.role = this.createModelDelegate('roles');
    this.user = this.createModelDelegate('users');
    this.sport = this.createModelDelegate('sports');
    this.facility = this.createModelDelegate('facilities');
    this.venue = this.createModelDelegate('venues');
    this.venueFacility = this.createModelDelegate('venue_facilities');
    this.court = this.createModelDelegate('courts');
    this.courtImage = this.createModelDelegate('court_images');
    this.priceRule = this.createModelDelegate('price_rules');
    this.booking = this.createModelDelegate('bookings');
    this.payment = this.createModelDelegate('payments');
    this.review = this.createModelDelegate('reviews');
    this.coupon = this.createModelDelegate('coupons');
    this.notification = this.createModelDelegate('notifications');
  }
}

const sqlServerDb = new SqlServerBridge();

module.exports = sqlServerDb;
