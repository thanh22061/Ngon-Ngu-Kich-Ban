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
