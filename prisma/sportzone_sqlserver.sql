-- =========================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU & DỮ LIỆU MẪU MICROSOFT SQL SERVER (SSMS)
-- ĐỀ TÀI: WEBSITE ĐẶT SÂN THỂ THAO TRỰC TUYẾN (SPORTZONE)
-- Server: .\SQLEXPRESS
-- =========================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'sportzone_db')
BEGIN
    CREATE DATABASE [sportzone_db];
END
GO

USE [sportzone_db];
GO

-- 1. Bảng ROLES (Vai trò người dùng)
IF OBJECT_ID('dbo.roles', 'U') IS NULL
CREATE TABLE [dbo].[roles] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] VARCHAR(50) NOT NULL UNIQUE,
    [description] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GO

-- 2. Bảng USERS (Tài khoản người dùng)
IF OBJECT_ID('dbo.users', 'U') IS NULL
CREATE TABLE [dbo].[users] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [role_id] INT NOT NULL,
    [full_name] NVARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL UNIQUE,
    [phone] VARCHAR(20) NOT NULL UNIQUE,
    [password] VARCHAR(255) NOT NULL,
    [avatar] VARCHAR(255) NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_users_roles] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id])
);
GO

-- 3. Bảng SPORTS (Danh mục môn thể thao)
IF OBJECT_ID('dbo.sports', 'U') IS NULL
CREATE TABLE [dbo].[sports] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL UNIQUE,
    [slug] VARCHAR(100) NOT NULL UNIQUE,
    [description] NVARCHAR(1000) NULL,
    [icon] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GO

-- 4. Bảng FACILITIES (Tiện ích cụm sân)
IF OBJECT_ID('dbo.facilities', 'U') IS NULL
CREATE TABLE [dbo].[facilities] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL UNIQUE,
    [icon] VARCHAR(100) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GO

-- 5. Bảng VENUES (Cơ sở cụm sân thể thao)
IF OBJECT_ID('dbo.venues', 'U') IS NULL
CREATE TABLE [dbo].[venues] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [owner_id] INT NOT NULL,
    [sport_id] INT NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [slug] VARCHAR(150) NOT NULL UNIQUE,
    [address] NVARCHAR(255) NOT NULL,
    [district] NVARCHAR(100) NOT NULL,
    [city] NVARCHAR(100) NOT NULL DEFAULT N'Hà Nội',
    [description] NVARCHAR(2000) NULL,
    [phone] VARCHAR(20) NOT NULL,
    [open_time] VARCHAR(10) NOT NULL DEFAULT '06:00',
    [close_time] VARCHAR(10) NOT NULL DEFAULT '23:00',
    [latitude] FLOAT NULL,
    [longitude] FLOAT NULL,
    [rating_avg] FLOAT NOT NULL DEFAULT 5.0,
    [review_count] INT NOT NULL DEFAULT 0,
    [status] VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_venues_owner] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_venues_sport] FOREIGN KEY ([sport_id]) REFERENCES [dbo].[sports]([id])
);
GO

-- 6. Bảng VENUE_FACILITIES (Liên kết Cụm sân - Tiện ích)
IF OBJECT_ID('dbo.venue_facilities', 'U') IS NULL
CREATE TABLE [dbo].[venue_facilities] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [venue_id] INT NOT NULL,
    [facility_id] INT NOT NULL,
    CONSTRAINT [UQ_venue_facility] UNIQUE ([venue_id], [facility_id]),
    CONSTRAINT [FK_vf_venue] FOREIGN KEY ([venue_id]) REFERENCES [dbo].[venues]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_vf_facility] FOREIGN KEY ([facility_id]) REFERENCES [dbo].[facilities]([id]) ON DELETE CASCADE
);
GO

-- 7. Bảng COURTS (Sân con)
IF OBJECT_ID('dbo.courts', 'U') IS NULL
CREATE TABLE [dbo].[courts] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [venue_id] INT NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [court_type] NVARCHAR(100) NOT NULL DEFAULT N'Standard',
    [is_covered] BIT NOT NULL DEFAULT 1,
    [status] VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_courts_venue] FOREIGN KEY ([venue_id]) REFERENCES [dbo].[venues]([id]) ON DELETE CASCADE
);
GO

-- 8. Bảng COURT_IMAGES (Hình ảnh sân con)
IF OBJECT_ID('dbo.court_images', 'U') IS NULL
CREATE TABLE [dbo].[court_images] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [court_id] INT NULL,
    [image_url] VARCHAR(255) NOT NULL,
    [is_primary] BIT NOT NULL DEFAULT 0,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_images_court] FOREIGN KEY ([court_id]) REFERENCES [dbo].[courts]([id]) ON DELETE CASCADE
);
GO

-- 9. Bảng PRICE_RULES (Bảng giá theo khung giờ)
IF OBJECT_ID('dbo.price_rules', 'U') IS NULL
CREATE TABLE [dbo].[price_rules] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [court_id] INT NOT NULL,
    [name] NVARCHAR(100) NOT NULL DEFAULT N'Khung giờ thường',
    [start_time] VARCHAR(10) NOT NULL,
    [end_time] VARCHAR(10) NOT NULL,
    [price] DECIMAL(10, 2) NOT NULL,
    [is_peak] BIT NOT NULL DEFAULT 0,
    [day_of_week] INT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_pricerules_court] FOREIGN KEY ([court_id]) REFERENCES [dbo].[courts]([id]) ON DELETE CASCADE
);
GO

-- 10. Bảng COUPONS (Mã giảm giá)
IF OBJECT_ID('dbo.coupons', 'U') IS NULL
CREATE TABLE [dbo].[coupons] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [code] VARCHAR(50) NOT NULL UNIQUE,
    [discount_percent] INT NOT NULL,
    [max_discount] DECIMAL(10, 2) NULL,
    [min_order_amount] DECIMAL(10, 2) NULL,
    [valid_from] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [valid_until] DATETIME2 NOT NULL,
    [usage_limit] INT NOT NULL DEFAULT 100,
    [used_count] INT NOT NULL DEFAULT 0,
    [is_active] BIT NOT NULL DEFAULT 1,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GO

-- 11. Bảng BOOKINGS (Đơn đặt sân)
IF OBJECT_ID('dbo.bookings', 'U') IS NULL
CREATE TABLE [dbo].[bookings] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [booking_code] VARCHAR(50) NOT NULL UNIQUE,
    [user_id] INT NOT NULL,
    [court_id] INT NOT NULL,
    [booking_date] DATE NOT NULL,
    [start_time] VARCHAR(10) NOT NULL,
    [end_time] VARCHAR(10) NOT NULL,
    [total_amount] DECIMAL(10, 2) NOT NULL,
    [deposit_amount] DECIMAL(10, 2) NOT NULL,
    [note] NVARCHAR(1000) NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [coupon_id] INT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UQ_booking_slot] UNIQUE ([court_id], [booking_date], [start_time]),
    CONSTRAINT [FK_bookings_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]),
    CONSTRAINT [FK_bookings_court] FOREIGN KEY ([court_id]) REFERENCES [dbo].[courts]([id]),
    CONSTRAINT [FK_bookings_coupon] FOREIGN KEY ([coupon_id]) REFERENCES [dbo].[coupons]([id])
);
GO

-- 12. Bảng PAYMENTS (Giao dịch thanh toán)
IF OBJECT_ID('dbo.payments', 'U') IS NULL
CREATE TABLE [dbo].[payments] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [booking_id] INT NOT NULL UNIQUE,
    [amount] DECIMAL(10, 2) NOT NULL,
    [payment_method] VARCHAR(30) NOT NULL DEFAULT 'VNPAY',
    [transaction_id] VARCHAR(100) NULL,
    [status] VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    [payment_time] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_payments_booking] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE
);
GO

-- 13. Bảng REVIEWS (Đánh giá sân)
IF OBJECT_ID('dbo.reviews', 'U') IS NULL
CREATE TABLE [dbo].[reviews] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [booking_id] INT NOT NULL UNIQUE,
    [user_id] INT NOT NULL,
    [court_id] INT NOT NULL,
    [rating] INT NOT NULL DEFAULT 5,
    [comment] NVARCHAR(1000) NOT NULL,
    [reply] NVARCHAR(1000) NULL,
    [reply_at] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_reviews_booking] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_reviews_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]),
    CONSTRAINT [FK_reviews_court] FOREIGN KEY ([court_id]) REFERENCES [dbo].[courts]([id])
);
GO

-- 14. Bảng NOTIFICATIONS (Thông báo người dùng)
IF OBJECT_ID('dbo.notifications', 'U') IS NULL
CREATE TABLE [dbo].[notifications] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [user_id] INT NOT NULL,
    [title] NVARCHAR(150) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [type] VARCHAR(50) NOT NULL DEFAULT 'BOOKING',
    [is_read] BIT NOT NULL DEFAULT 0,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FK_notifications_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
);
GO

-- =========================================================================
-- NẠP DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- =========================================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[roles])
BEGIN
    INSERT INTO [dbo].[roles] ([name], [description]) VALUES
    ('CUSTOMER', N'Khách hàng đặt sân'),
    ('OWNER', N'Chủ cơ sở cụm sân'),
    ('ADMIN', N'Quản trị viên hệ thống');

    -- Mật khẩu mặc định đã băm bcrypt của 'password123'
    DECLARE @pwd VARCHAR(255) = '$2a$10$mK8o6zW2m.xP5yJ.7n1Uce1tG5h6J8k9L0m1N2o3P4q5R6s7T8u9V';

    INSERT INTO [dbo].[users] ([role_id], [full_name], [email], [phone], [password], [status]) VALUES
    (3, N'Quản Trị Viên SportZone', 'admin@sportzone.vn', '0901000001', @pwd, 'ACTIVE'),
    (2, N'Chủ Sân EPU Arena', 'epu.arena@gmail.com', '0987654321', @pwd, 'ACTIVE'),
    (2, N'Chủ CLB Hồ Tùng Mậu', 'hotungmau.badminton@gmail.com', '0912345678', @pwd, 'ACTIVE'),
    (1, N'Nguyễn Công Sơn', 'son.nguyen@gmail.com', '0981031010', @pwd, 'ACTIVE'),
    (1, N'Nguyễn Văn Quang', 'quang.nguyen@gmail.com', '0981031020', @pwd, 'ACTIVE');

    INSERT INTO [dbo].[sports] ([name], [slug], [description], [icon]) VALUES
    (N'Pickleball', 'pickleball', N'Môn thể thao vợt phát triển nhanh nhất thế giới, kết hợp giữa quần vợt, bóng bàn và cầu lông.', N'🏓'),
    (N'Cầu lông', 'cau-long', N'Cầu lông phong trào và thi đấu chuyên nghiệp với thảm PVC Taraflex đạt chuẩn.', N'🏸'),
    (N'Bóng đá mini', 'bong-da-mini', N'Sân bóng cỏ nhân tạo 5 người và 7 người, hệ thống thoát nước hiện đại.', N'⚽');

    INSERT INTO [dbo].[facilities] ([name], [icon]) VALUES
    (N'Đèn chiếu sáng tiêu chuẩn 800 Lux', 'Lightbulb'),
    (N'Wifi tốc độ cao miễn phí', 'Wifi'),
    (N'Bãi đỗ ô tô rộng rãi', 'Car'),
    (N'Căn tin máy lạnh & nước uống', 'Coffee'),
    (N'Phòng thay đồ & tắm nóng lạnh', 'Bath');

    INSERT INTO [dbo].[venues] ([owner_id], [sport_id], [name], [slug], [address], [district], [city], [description], [phone], [open_time], [close_time], [rating_avg], [review_count], [status]) VALUES
    (2, 1, N'Cụm Sân Pickleball Điện Lực (EPU Arena)', 'epu-arena-pickleball', N'235 Hoàng Quốc Việt, Cổ Nhuế 1', N'Bắc Từ Liêm', N'Hà Nội', N'Cụm 6 sân Pickleball tiêu chuẩn quốc tế USAPA, thảm thi đấu giảm chấn cao cấp, có mái che vòm thép.', '0987654321', '06:00', '23:00', 4.9, 48, 'APPROVED'),
    (3, 2, N'CLB Cầu Lông Hồ Tùng Mậu', 'clb-cau-long-ho-tung-mau', N'126 Hồ Tùng Mậu, Mai Dịch', N'Cầu Giấy', N'Hà Nội', N'8 sân thảm Taraflex dày 4.5mm, trần cao 11m thoáng mát, không chói đèn, đỗ ô tô thoải mái.', '0912345678', '05:30', '23:00', 4.8, 35, 'APPROVED');

    INSERT INTO [dbo].[venue_facilities] ([venue_id], [facility_id]) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
    (2, 1), (2, 2), (2, 3);

    INSERT INTO [dbo].[courts] ([venue_id], [name], [court_type], [is_covered], [status]) VALUES
    (1, N'Sân 1 (VIP - Có mái che)', N'Thảm Cushion chuyên dụng', 1, 'ACTIVE'),
    (1, N'Sân 2 (Tiêu chuẩn ngoài trời)', N'Mặt sơn Acrylic', 0, 'ACTIVE'),
    (2, N'Sân A1 (Thảm Taraflex Đỏ)', N'Taraflex 4.5mm', 1, 'ACTIVE');

    INSERT INTO [dbo].[price_rules] ([court_id], [name], [start_time], [end_time], [price], [is_peak]) VALUES
    (1, N'Giờ thường ban ngày', '06:00', '17:00', 150000, 0),
    (1, N'Giờ vàng cao điểm', '17:00', '22:00', 220000, 1),
    (1, N'Giờ đêm', '22:00', '23:00', 140000, 0),
    (2, N'Giờ thường ban ngày', '06:00', '17:00', 130000, 0),
    (2, N'Giờ vàng cao điểm', '17:00', '22:00', 190000, 1),
    (3, N'Giờ hành chính', '06:00', '17:00', 110000, 0),
    (3, N'Giờ vàng tối', '17:00', '22:00', 160000, 1);

    INSERT INTO [dbo].[coupons] ([code], [discount_percent], [max_discount], [min_order_amount], [valid_until], [usage_limit], [is_active]) VALUES
    ('CHAOBANMOI', 10, 50000, 100000, '2027-12-31', 500, 1);
END
GO

-- =========================================================================
-- PHẦN MỞ RỘNG: ĐẦY ĐỦ 5 MÔN THỂ THAO, 20 CỤM SÂN, 96 SÂN CON,
-- TỌA ĐỘ BẢN ĐỒ (LAT/LNG), 193 BẢNG GIÁ, ẢNH SÂN & ĐƠN ĐẶT MẪU
-- =========================================================================
SET NOCOUNT ON;

IF COL_LENGTH('dbo.venues', 'latitude') IS NULL
  ALTER TABLE dbo.venues ADD latitude FLOAT NULL;
IF COL_LENGTH('dbo.venues', 'longitude') IS NULL
  ALTER TABLE dbo.venues ADD longitude FLOAT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.sports WHERE slug = 'tennis')
  INSERT INTO dbo.sports (name, slug, description, icon)
  VALUES (N'Tennis', 'tennis', N'Sân quần vợt tiêu chuẩn mặt cứng Acrylic trong nhà và ngoài trời', N'🎾');

IF NOT EXISTS (SELECT 1 FROM dbo.sports WHERE slug = 'bong-ro')
  INSERT INTO dbo.sports (name, slug, description, icon)
  VALUES (N'Bóng rổ', 'bong-ro', N'Sân bóng rổ 3x3 và 5x5 mặt sàn gỗ và Acrylic tiêu chuẩn FIBA', N'🏀');
GO

DECLARE @owner1 INT = (SELECT id FROM dbo.users WHERE email = 'epu.arena@gmail.com');
DECLARE @owner2 INT = (SELECT id FROM dbo.users WHERE email = 'hotungmau.badminton@gmail.com');
DECLARE @cust1  INT = (SELECT id FROM dbo.users WHERE email = 'son.nguyen@gmail.com');
DECLARE @cust2  INT = (SELECT id FROM dbo.users WHERE email = 'quang.nguyen@gmail.com');

DECLARE @spPick   INT = (SELECT id FROM dbo.sports WHERE slug = 'pickleball');
DECLARE @spBad    INT = (SELECT id FROM dbo.sports WHERE slug = 'cau-long');
DECLARE @spFoot   INT = (SELECT id FROM dbo.sports WHERE slug = 'bong-da-mini');
DECLARE @spTennis INT = (SELECT id FROM dbo.sports WHERE slug = 'tennis');
DECLARE @spBasket INT = (SELECT id FROM dbo.sports WHERE slug = 'bong-ro');

DECLARE @v TABLE (
  owner_id INT, sport_id INT, name NVARCHAR(150), slug VARCHAR(150),
  address NVARCHAR(255), district NVARCHAR(100), description NVARCHAR(2000),
  phone VARCHAR(20), open_time VARCHAR(10), close_time VARCHAR(10),
  lat FLOAT, lng FLOAT, rating FLOAT, reviews INT
);

INSERT INTO @v VALUES
(@owner2, @spPick, N'Pickleball Sunrise Cầu Giấy', 'pickleball-sunrise-cau-giay',
 N'88 Trần Thái Tông, Dịch Vọng Hậu', N'Cầu Giấy',
 N'4 sân Pickleball trong nhà, sàn chống trượt, điều hòa mát quanh năm, có huấn luyện viên hướng dẫn người mới.',
 '0912345678', '06:00', '22:00', 21.0328, 105.7896, 4.7, 29),
(@owner1, @spPick, N'Pickleball Mỹ Đình Arena', 'pickleball-my-dinh-arena',
 N'15 Lê Đức Thọ, Mỹ Đình 2', N'Nam Từ Liêm',
 N'6 sân Pickleball ngoài trời và trong nhà, khu vực khán đài nhỏ, bãi đỗ xe máy và ô tô rộng.',
 '0987654321', '05:30', '23:00', 21.0285, 105.7682, 4.6, 21),
(@owner1, @spPick, N'Tây Hồ Pickleball & Social Club', 'tay-ho-pickleball-social-club',
 N'68 Đặng Thai Mai, Quảng An', N'Tây Hồ',
 N'5 sân Pickleball view Hồ Tây thoáng mát, mặt sân Cushion 8 lớp chuẩn PPA Tour, có quầy cafe specialty.',
 '0988112233', '05:30', '23:00', 21.0645, 105.8240, 4.9, 64),
(@owner2, @spPick, N'Pickleball Bách Khoa Arena', 'pickleball-bach-khoa-arena',
 N'40 Tạ Quang Bửu, Bách Khoa', N'Hai Bà Trưng',
 N'6 sân Pickleball có mái che di động cao 9m, đèn LED chống chói, điểm hẹn quen thuộc của sinh viên và dân văn phòng.',
 '0977665544', '06:00', '23:00', 21.0042, 105.8476, 4.8, 42),
(@owner1, @spPick, N'Pickleball Royal Hà Đông', 'pickleball-royal-ha-dong',
 N'210 Quang Trung, Hà Cầu', N'Hà Đông',
 N'5 sân Pickleball tiêu chuẩn thi đấu trong nhà, khu vực phòng chờ điều hòa, chỗ đỗ ô tô miễn phí.',
 '0966554433', '06:00', '22:30', 20.9685, 105.7720, 4.6, 19),
(@owner1, @spBad, N'CLB Cầu Lông Thanh Xuân Smash', 'clb-cau-long-thanh-xuan-smash',
 N'72 Nguyễn Trãi, Thượng Đình', N'Thanh Xuân',
 N'6 sân cầu lông thảm PVC, đèn LED chống chói, có cho thuê vợt và bán cầu tại chỗ.',
 '0987654321', '06:00', '23:00', 20.9988, 105.8145, 4.5, 40),
(@owner2, @spBad, N'Nhà Thi Đấu Cầu Lông Hoàng Cầu', 'nha-thi-dau-cau-long-hoang-cau',
 N'25 Hoàng Cầu, Ô Chợ Dừa', N'Đống Đa',
 N'5 sân tiêu chuẩn thi đấu, trần cao 10m, thông gió tốt, phù hợp giải phong trào.',
 '0912345678', '06:00', '22:30', 21.0168, 105.8224, 4.8, 33),
(@owner2, @spBad, N'CLB Cầu Lông Ciputra Tây Hồ', 'clb-cau-long-ciputra-tay-ho',
 N'Khu đô thị Nam Thăng Long, Phú Thượng', N'Tây Hồ',
 N'6 sân thảm Yonex tiêu chuẩn quốc tế, hệ thống điều hòa trung tâm và phòng tắm nóng lạnh.',
 '0933445566', '06:00', '22:30', 21.0795, 105.8035, 4.9, 51),
(@owner1, @spBad, N'Sân Cầu Lông Đền Lừ Arena', 'san-cau-long-den-lu-arena',
 N'Công viên Hồ Đền Lừ, Hoàng Văn Thụ', N'Hoàng Mai',
 N'5 sân cầu lông trong nhà thoáng rộng, mặt thảm Taraflex êm chân, giá ưu đãi cho học sinh sinh viên.',
 '0944556677', '05:30', '22:30', 20.9840, 105.8585, 4.6, 28),
(@owner1, @spFoot, N'Sân Bóng Mini Thành Phát', 'san-bong-mini-thanh-phat',
 N'2 Hoàng Minh Giám, Trung Hòa', N'Cầu Giấy',
 N'4 sân cỏ nhân tạo 5 và 7 người, đèn LED chống lóa, có phòng thay đồ và bán nước.',
 '0987654321', '06:00', '23:00', 21.0065, 105.7982, 4.7, 52),
(@owner2, @spFoot, N'Sân Bóng Mini Mỹ Đình Stadium', 'san-bong-mini-my-dinh-stadium',
 N'Đường Lê Quang Đạo, Mỹ Đình 1', N'Nam Từ Liêm',
 N'5 sân cỏ nhân tạo chuẩn FIFA, mặt cỏ êm, thoát nước tốt, có khán đài mini.',
 '0912345678', '06:00', '23:00', 21.0188, 105.7642, 4.6, 38),
(@owner1, @spFoot, N'Sân Bóng Mini Khâm Thiên', 'san-bong-mini-kham-thien',
 N'120 Khâm Thiên, Trung Phụng', N'Đống Đa',
 N'3 sân cỏ nhân tạo 5 người giữa trung tâm, giá mềm, phù hợp đá giao lưu sau giờ làm.',
 '0987654321', '16:00', '23:30', 21.0182, 105.8365, 4.3, 17),
(@owner2, @spFoot, N'Sân Bóng Cỏ Nhân Tạo Nguyễn Trãi', 'san-bong-co-nhan-tao-nguyen-trai',
 N'300 Nguyễn Trãi, Thanh Xuân Trung', N'Thanh Xuân',
 N'4 sân cỏ nhân tạo 7 người, hệ thống đèn 6 cột, có bãi giữ xe miễn phí.',
 '0912345678', '06:00', '23:00', 20.9922, 105.8045, 4.4, 26),
(@owner1, @spFoot, N'Tổ Hợp Sân Bóng Đầm Hồng', 'to-hop-san-bong-dam-hong',
 N'93 Hoàng Văn Thái, Khương Trung', N'Thanh Xuân',
 N'5 sân bóng 7 người mặt cỏ kim cương mới thay 100%, hệ thống thoát nước siêu tốc.',
 '0911223344', '06:00', '23:30', 20.9965, 105.8255, 4.7, 45),
(@owner2, @spTennis, N'Cụm Sân Tennis Quần Ngựa Ba Đình', 'cum-san-tennis-quan-ngua-ba-dinh',
 N'30 Văn Cao, Liễu Giai', N'Ba Đình',
 N'4 sân Tennis tiêu chuẩn ATP mặt cứng US Open, có mái che và dàn đèn cao áp chống lóa.',
 '0909123123', '06:00', '22:30', 21.0382, 105.8152, 4.8, 37),
(@owner1, @spTennis, N'Sân Tennis Vinhomes Long Biên Club', 'san-tennis-vinhomes-long-bien-club',
 N'Khu đô thị Việt Hưng, Phúc Lợi', N'Long Biên',
 N'4 sân Tennis ngoài trời không gian xanh mát, có máy bắn bóng tập luyện và phòng locker cao cấp.',
 '0909456456', '06:00', '22:00', 21.0525, 105.9085, 4.9, 31),
(@owner1, @spBasket, N'Hanoi Hoop Arena - Sân Bóng Rổ Chuyên Nghiệp', 'hanoi-hoop-arena-bong-ro',
 N'18 Phạm Hùng, Mỹ Đình 2', N'Nam Từ Liêm',
 N'3 sân bóng rổ trong nhà sàn gỗ Maple tiêu chuẩn FIBA, bảng điểm điện tử, điều hòa mát lạnh.',
 '0988776655', '07:00', '22:30', 21.0298, 105.7795, 4.9, 58),
(@owner2, @spBasket, N'Sân Bóng Rổ Streetball Bách Khoa', 'san-bong-ro-streetball-bach-khoa',
 N'1 Đại Cồ Việt, Bách Khoa', N'Hai Bà Trưng',
 N'4 sân bóng rổ 3x3 và 5x5 mặt sơn Acrylic ngoài trời cực chất, đèn chiếu sáng đêm phục vụ giao lưu.',
 '0977889900', '06:00', '23:00', 21.0068, 105.8435, 4.7, 34);

INSERT INTO dbo.venues (owner_id, sport_id, name, slug, address, district, city, description, phone, open_time, close_time, latitude, longitude, rating_avg, review_count, status)
SELECT owner_id, sport_id, name, slug, address, district, N'Hà Nội', description, phone, open_time, close_time, lat, lng, rating, reviews, 'APPROVED'
FROM @v x WHERE NOT EXISTS (SELECT 1 FROM dbo.venues WHERE slug = x.slug);

UPDATE v SET v.latitude = x.lat, v.longitude = x.lng
FROM dbo.venues v JOIN @v x ON v.slug = x.slug;

UPDATE dbo.venues SET latitude = 21.0468, longitude = 105.7852 WHERE slug = 'epu-arena-pickleball';
UPDATE dbo.venues SET latitude = 21.0375, longitude = 105.7745 WHERE slug = 'clb-cau-long-ho-tung-mau';

INSERT INTO dbo.venue_facilities (venue_id, facility_id)
SELECT v.id, f.id
FROM dbo.venues v
CROSS JOIN dbo.facilities f
WHERE f.id IN (1, 2, 3, 5)
  AND NOT EXISTS (SELECT 1 FROM dbo.venue_facilities vf WHERE vf.venue_id = v.id AND vf.facility_id = f.id);

DECLARE @c TABLE (slug VARCHAR(150), name NVARCHAR(100), ctype NVARCHAR(100), covered BIT, normal_price DECIMAL(10,2), peak_price DECIMAL(10,2));
INSERT INTO @c VALUES
('epu-arena-pickleball', N'Sân 3 (VIP - Có mái che)',  N'Thảm Cushion chuyên dụng', 1, 150000, 220000),
('epu-arena-pickleball', N'Sân 4 (Có mái che)',        N'Thảm Cushion chuyên dụng', 1, 140000, 210000),
('epu-arena-pickleball', N'Sân 5 (Ngoài trời)',        N'Mặt sơn Acrylic', 0, 130000, 190000),
('epu-arena-pickleball', N'Sân 6 (Ngoài trời)',        N'Mặt sơn Acrylic', 0, 130000, 190000),
('clb-cau-long-ho-tung-mau', N'Sân A2 (Thảm Taraflex Đỏ)',  N'Taraflex 4.5mm', 1, 110000, 160000),
('clb-cau-long-ho-tung-mau', N'Sân A3 (Thảm Taraflex Xanh)', N'Taraflex 4.5mm', 1, 110000, 160000),
('clb-cau-long-ho-tung-mau', N'Sân B1 (Tiêu chuẩn thi đấu)', N'Taraflex 6mm', 1, 130000, 180000),
('clb-cau-long-ho-tung-mau', N'Sân B2 (Tiêu chuẩn thi đấu)', N'Taraflex 6mm', 1, 130000, 180000),
('clb-cau-long-ho-tung-mau', N'Sân B3 (Phổ thông)',          N'Thảm PVC', 1, 90000, 140000),
('pickleball-sunrise-cau-giay', N'Sân 1 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 2 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 3 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 4 (VIP)',       N'Thảm Cushion', 1, 180000, 250000),
('pickleball-my-dinh-arena', N'Sân 1 (Trong nhà)',  N'Thảm Cushion', 1, 150000, 210000),
('pickleball-my-dinh-arena', N'Sân 2 (Trong nhà)',  N'Thảm Cushion', 1, 150000, 210000),
('pickleball-my-dinh-arena', N'Sân 3 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 4 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 5 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 6 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('tay-ho-pickleball-social-club', N'Court 1 (Lake View VIP)', N'Cushion PPA 8 lớp', 1, 190000, 280000),
('tay-ho-pickleball-social-club', N'Court 2 (Lake View VIP)', N'Cushion PPA 8 lớp', 1, 190000, 280000),
('tay-ho-pickleball-social-club', N'Court 3 (Mái che)',       N'Cushion PPA 8 lớp', 1, 170000, 240000),
('tay-ho-pickleball-social-club', N'Court 4 (Mái che)',       N'Cushion PPA 8 lớp', 1, 170000, 240000),
('tay-ho-pickleball-social-club', N'Court 5 (Ngoài trời)',    N'Mặt sơn Acrylic', 0, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK1 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK2 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK3 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK4 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
('pickleball-bach-khoa-arena', N'Sân BK5 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
('pickleball-bach-khoa-arena', N'Sân BK6 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
('pickleball-royal-ha-dong', N'Sân R1 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R2 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R3 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R4 (VIP)',       N'Thảm Cushion Pro', 1, 160000, 220000),
('pickleball-royal-ha-dong', N'Sân R5 (VIP)',       N'Thảm Cushion Pro', 1, 160000, 220000),
('clb-cau-long-thanh-xuan-smash', N'Sân 1', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 2', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 3', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 4', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 5 (VIP)', N'Taraflex 4.5mm', 1, 120000, 170000),
('clb-cau-long-thanh-xuan-smash', N'Sân 6 (VIP)', N'Taraflex 4.5mm', 1, 120000, 170000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T1 (Thi đấu)', N'Taraflex 6mm', 1, 130000, 190000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T2 (Thi đấu)', N'Taraflex 6mm', 1, 130000, 190000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T3', N'Taraflex 4.5mm', 1, 110000, 160000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T4', N'Taraflex 4.5mm', 1, 110000, 160000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T5', N'Thảm PVC', 1, 90000, 140000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 1 (VIP)', N'Thảm Yonex BWF', 1, 150000, 220000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 2 (VIP)', N'Thảm Yonex BWF', 1, 150000, 220000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 3',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 4',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 5',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 6',       N'Taraflex 6mm', 1, 130000, 190000),
('san-cau-long-den-lu-arena', N'Sân ĐL 1', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 2', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 3', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 4', N'Thảm PVC', 1, 85000, 130000),
('san-cau-long-den-lu-arena', N'Sân ĐL 5', N'Thảm PVC', 1, 85000, 130000),
('san-bong-mini-thanh-phat', N'Sân 5 người số 1', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
('san-bong-mini-thanh-phat', N'Sân 5 người số 2', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
('san-bong-mini-thanh-phat', N'Sân 7 người số 1', N'Cỏ nhân tạo 50mm', 0, 350000, 600000),
('san-bong-mini-thanh-phat', N'Sân 7 người số 2', N'Cỏ nhân tạo 50mm', 0, 350000, 600000),
('san-bong-mini-my-dinh-stadium', N'Sân A (5 người)', N'Cỏ nhân tạo FIFA', 0, 280000, 450000),
('san-bong-mini-my-dinh-stadium', N'Sân B (5 người)', N'Cỏ nhân tạo FIFA', 0, 280000, 450000),
('san-bong-mini-my-dinh-stadium', N'Sân C (7 người)', N'Cỏ nhân tạo FIFA', 0, 380000, 650000),
('san-bong-mini-my-dinh-stadium', N'Sân D (7 người)', N'Cỏ nhân tạo FIFA', 0, 380000, 650000),
('san-bong-mini-my-dinh-stadium', N'Sân E (11 người)', N'Cỏ nhân tạo FIFA', 0, 700000, 1100000),
('san-bong-mini-kham-thien', N'Sân 1 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
('san-bong-mini-kham-thien', N'Sân 2 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
('san-bong-mini-kham-thien', N'Sân 3 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 1 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 2 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 3 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 4 (5 người)', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 1 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 2 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 3 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 4 (5 người)', N'Cỏ kim cương 40mm', 0, 260000, 420000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 5 (5 người)', N'Cỏ kim cương 40mm', 0, 260000, 420000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân Trung Tâm A1 (Có mái che)', N'Hard Court US Open', 1, 250000, 380000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân A2 (Có mái che)',           N'Hard Court US Open', 1, 240000, 360000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân B1 (Ngoài trời)',           N'Plexipave Acrylic', 0, 190000, 300000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân B2 (Ngoài trời)',           N'Plexipave Acrylic', 0, 190000, 300000),
('san-tennis-vinhomes-long-bien-club', N'Court T1 (River View)', N'Plexipave US Open', 0, 220000, 340000),
('san-tennis-vinhomes-long-bien-club', N'Court T2 (River View)', N'Plexipave US Open', 0, 220000, 340000),
('san-tennis-vinhomes-long-bien-club', N'Court T3 (Trong nhà)',  N'Hard Court Cushion', 1, 280000, 420000),
('san-tennis-vinhomes-long-bien-club', N'Court T4 (Trong nhà)',  N'Hard Court Cushion', 1, 280000, 420000),
('hanoi-hoop-arena-bong-ro', N'Sân FIBA 1 (Full Court 5x5)', N'Sàn gỗ Maple FIBA', 1, 350000, 550000),
('hanoi-hoop-arena-bong-ro', N'Sân FIBA 2 (Full Court 5x5)', N'Sàn gỗ Maple FIBA', 1, 350000, 550000),
('hanoi-hoop-arena-bong-ro', N'Sân Half-Court 3x3',          N'Sàn gỗ Maple FIBA', 1, 200000, 320000),
('san-bong-ro-streetball-bach-khoa', N'Sân Streetball 1 (5x5)', N'Mặt sơn Acrylic', 0, 220000, 350000),
('san-bong-ro-streetball-bach-khoa', N'Sân Streetball 2 (5x5)', N'Mặt sơn Acrylic', 0, 220000, 350000),
('san-bong-ro-streetball-bach-khoa', N'Sân 3x3 Số 1',           N'Mặt sơn Acrylic', 0, 140000, 220000),
('san-bong-ro-streetball-bach-khoa', N'Sân 3x3 Số 2',           N'Mặt sơn Acrylic', 0, 140000, 220000);

INSERT INTO dbo.courts (venue_id, name, court_type, is_covered, status)
SELECT v.id, x.name, x.ctype, x.covered, 'ACTIVE'
FROM @c x JOIN dbo.venues v ON v.slug = x.slug
WHERE NOT EXISTS (SELECT 1 FROM dbo.courts c WHERE c.venue_id = v.id AND c.name = x.name);

INSERT INTO dbo.price_rules (court_id, name, start_time, end_time, price, is_peak)
SELECT c.id, N'Giờ thường', '05:30', '17:00', x.normal_price, 0
FROM @c x JOIN dbo.venues v ON v.slug = x.slug JOIN dbo.courts c ON c.venue_id = v.id AND c.name = x.name
WHERE NOT EXISTS (SELECT 1 FROM dbo.price_rules p WHERE p.court_id = c.id);

INSERT INTO dbo.price_rules (court_id, name, start_time, end_time, price, is_peak)
SELECT c.id, N'Giờ vàng cao điểm', '17:00', '23:30', x.peak_price, 1
FROM @c x JOIN dbo.venues v ON v.slug = x.slug JOIN dbo.courts c ON c.venue_id = v.id AND c.name = x.name
WHERE NOT EXISTS (SELECT 1 FROM dbo.price_rules p WHERE p.court_id = c.id AND p.is_peak = 1)
  AND (SELECT COUNT(*) FROM dbo.price_rules p WHERE p.court_id = c.id) = 1;

INSERT INTO dbo.court_images (court_id, image_url, is_primary)
SELECT c.id,
  CASE s.slug
    WHEN 'pickleball'   THEN CASE WHEN c.id % 2 = 0 THEN 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80'
                                  ELSE 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=900&q=80' END
    WHEN 'cau-long'     THEN CASE WHEN c.id % 2 = 0 THEN 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80'
                                  ELSE 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80' END
    WHEN 'tennis'       THEN CASE WHEN c.id % 2 = 0 THEN 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80'
                                  ELSE 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=80' END
    WHEN 'bong-ro'      THEN CASE WHEN c.id % 2 = 0 THEN 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80'
                                  ELSE 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?auto=format&fit=crop&w=900&q=80' END
    ELSE                     CASE WHEN c.id % 2 = 0 THEN 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=900&q=80'
                                  ELSE 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80' END
  END, 1
FROM dbo.courts c JOIN dbo.venues v ON v.id = c.venue_id JOIN dbo.sports s ON s.id = v.sport_id
WHERE NOT EXISTS (SELECT 1 FROM dbo.court_images i WHERE i.court_id = c.id);

IF NOT EXISTS (SELECT 1 FROM dbo.bookings WHERE booking_code = 'SZ-DEMO-001')
BEGIN
  DECLARE @cEpu1 INT = (SELECT TOP 1 c.id FROM dbo.courts c JOIN dbo.venues v ON v.id = c.venue_id WHERE v.slug = 'epu-arena-pickleball' ORDER BY c.id);
  DECLARE @cBad1 INT = (SELECT TOP 1 c.id FROM dbo.courts c JOIN dbo.venues v ON v.id = c.venue_id WHERE v.slug = 'clb-cau-long-ho-tung-mau' ORDER BY c.id);
  DECLARE @cFoot1 INT = (SELECT TOP 1 c.id FROM dbo.courts c JOIN dbo.venues v ON v.id = c.venue_id WHERE v.slug = 'san-bong-mini-thanh-phat' ORDER BY c.id);

  INSERT INTO dbo.bookings (booking_code, user_id, court_id, booking_date, start_time, end_time, total_amount, deposit_amount, status, note)
  VALUES
  ('SZ-DEMO-001', @cust1, @cEpu1, CAST(DATEADD(DAY, -2, GETDATE()) AS DATE), '18:00', '20:00', 396000, 118800, 'COMPLETED', N'Thuê thêm 4 vợt Pickleball Carbon'),
  ('SZ-DEMO-002', @cust1, @cBad1, CAST(DATEADD(DAY, 1, GETDATE()) AS DATE),  '19:00', '21:00', 320000, 96000,  'CONFIRMED', N'Đặt sân giao lưu CLB sinh viên EPU'),
  ('SZ-DEMO-003', @cust2, @cFoot1, CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), '17:00', '19:00', 750000, 225000, 'CONFIRMED', N'Đá giải nội bộ công ty');

  DECLARE @b1 INT = (SELECT id FROM dbo.bookings WHERE booking_code = 'SZ-DEMO-001');
  DECLARE @b2 INT = (SELECT id FROM dbo.bookings WHERE booking_code = 'SZ-DEMO-002');
  DECLARE @b3 INT = (SELECT id FROM dbo.bookings WHERE booking_code = 'SZ-DEMO-003');

  INSERT INTO dbo.payments (booking_id, transaction_id, payment_method, amount, status, payment_time)
  VALUES
  (@b1, 'VNP-DEMO-001', 'VNPAY', 396000, 'SUCCESS', DATEADD(DAY, -2, GETDATE())),
  (@b2, 'VNP-DEMO-002', 'VNPAY', 320000, 'SUCCESS', GETDATE()),
  (@b3, 'VNP-DEMO-003', 'VNPAY', 750000, 'SUCCESS', GETDATE());

  INSERT INTO dbo.reviews (booking_id, user_id, court_id, rating, comment, reply, reply_at)
  VALUES
  (@b1, @cust1, @cEpu1, 5, N'Mặt sân Cushion mới tinh, độ nảy chuẩn thi đấu, đèn LED sáng không bị chói mắt. Sẽ quay lại hàng tuần!', N'Cảm ơn bạn Sơn đã ủng hộ EPU Arena! Hẹn gặp lại đội bạn tuần tới nhé.', GETDATE());
END;
GO

