-- =========================================================================
-- DỮ LIỆU MẪU MỞ RỘNG: 20 CỤM SÂN, ~95 SÂN CON, TỌA ĐỘ BẢN ĐỒ (LAT/LNG),
-- BẢNG GIÁ, ẢNH SÂN, ĐƠN ĐẶT MẪU & ĐÁNH GIÁ
-- Chạy được nhiều lần (Idempotent). Server: .\SQLEXPRESS | DB: sportzone_db
-- =========================================================================
USE [sportzone_db];
GO
SET NOCOUNT ON;

-- 0. THÊM CỘT TỌA ĐỘ BẢN ĐỒ (LATITUDE, LONGITUDE) VÀO BẢNG VENUES NẾU CHƯA CÓ
IF COL_LENGTH('dbo.venues', 'latitude') IS NULL
  ALTER TABLE dbo.venues ADD latitude FLOAT NULL;
IF COL_LENGTH('dbo.venues', 'longitude') IS NULL
  ALTER TABLE dbo.venues ADD longitude FLOAT NULL;
GO

-- 0.1 BỔ SUNG MÔN THỂ THAO MỚI (TENNIS & BÓNG RỔ)
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

-- 1. DANH SÁCH 18 CỤM SÂN BỔ SUNG (CÙNG 2 CỤM SÂN GỐC = 20 CỤM SÂN TOÀN HÀ NỘI)
DECLARE @v TABLE (
  owner_id INT, sport_id INT, name NVARCHAR(150), slug VARCHAR(150),
  address NVARCHAR(255), district NVARCHAR(100), description NVARCHAR(2000),
  phone VARCHAR(20), open_time VARCHAR(10), close_time VARCHAR(10),
  lat FLOAT, lng FLOAT, rating FLOAT, reviews INT
);

INSERT INTO @v VALUES
-- Pickleball (6 cụm sân tổng cộng)
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

-- Cầu lông (5 cụm sân tổng cộng)
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

-- Bóng đá mini (5 cụm sân)
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

-- Tennis (2 cụm sân)
(@owner2, @spTennis, N'Cụm Sân Tennis Quần Ngựa Ba Đình', 'cum-san-tennis-quan-ngua-ba-dinh',
 N'30 Văn Cao, Liễu Giai', N'Ba Đình',
 N'4 sân Tennis tiêu chuẩn ATP mặt cứng US Open, có mái che và dàn đèn cao áp chống lóa.',
 '0909123123', '06:00', '22:30', 21.0382, 105.8152, 4.8, 37),

(@owner1, @spTennis, N'Sân Tennis Vinhomes Long Biên Club', 'san-tennis-vinhomes-long-bien-club',
 N'Khu đô thị Việt Hưng, Phúc Lợi', N'Long Biên',
 N'4 sân Tennis ngoài trời không gian xanh mát, có máy bắn bóng tập luyện và phòng locker cao cấp.',
 '0909456456', '06:00', '22:00', 21.0525, 105.9085, 4.9, 31),

-- Bóng rổ (2 cụm sân)
(@owner1, @spBasket, N'Hanoi Hoop Arena - Sân Bóng Rổ Chuyên Nghiệp', 'hanoi-hoop-arena-bong-ro',
 N'18 Phạm Hùng, Mỹ Đình 2', N'Nam Từ Liêm',
 N'3 sân bóng rổ trong nhà sàn gỗ Maple tiêu chuẩn FIBA, bảng điểm điện tử, điều hòa mát lạnh.',
 '0988776655', '07:00', '22:30', 21.0298, 105.7795, 4.9, 58),

(@owner2, @spBasket, N'Sân Bóng Rổ Streetball Bách Khoa', 'san-bong-ro-streetball-bach-khoa',
 N'1 Đại Cồ Việt, Bách Khoa', N'Hai Bà Trưng',
 N'4 sân bóng rổ 3x3 và 5x5 mặt sơn Acrylic ngoài trời cực chất, đèn chiếu sáng đêm phục vụ giao lưu.',
 '0977889900', '06:00', '23:00', 21.0068, 105.8435, 4.7, 34);

-- Thêm mới các cụm sân chưa có
INSERT INTO dbo.venues (owner_id, sport_id, name, slug, address, district, city, description, phone, open_time, close_time, latitude, longitude, rating_avg, review_count, status)
SELECT owner_id, sport_id, name, slug, address, district, N'Hà Nội', description, phone, open_time, close_time, lat, lng, rating, reviews, 'APPROVED'
FROM @v x WHERE NOT EXISTS (SELECT 1 FROM dbo.venues WHERE slug = x.slug);

-- Cập nhật đầy đủ tọa độ lat/lng cho tất cả các cụm sân đã tồn tại
UPDATE v SET v.latitude = x.lat, v.longitude = x.lng
FROM dbo.venues v JOIN @v x ON v.slug = x.slug;

UPDATE dbo.venues SET latitude = 21.0468, longitude = 105.7852 WHERE slug = 'epu-arena-pickleball';
UPDATE dbo.venues SET latitude = 21.0375, longitude = 105.7745 WHERE slug = 'clb-cau-long-ho-tung-mau';

-- 2. TIỆN ÍCH CHO CÁC CỤM SÂN MỚI
INSERT INTO dbo.venue_facilities (venue_id, facility_id)
SELECT v.id, f.id
FROM dbo.venues v
CROSS JOIN dbo.facilities f
WHERE f.id IN (1, 2, 3, 5)
  AND NOT EXISTS (SELECT 1 FROM dbo.venue_facilities vf WHERE vf.venue_id = v.id AND vf.facility_id = f.id);

-- 3. DANH SÁCH SÂN CON CHO TẤT CẢ CÁC CỤM SÂN
DECLARE @c TABLE (slug VARCHAR(150), name NVARCHAR(100), ctype NVARCHAR(100), covered BIT, normal_price DECIMAL(10,2), peak_price DECIMAL(10,2));
INSERT INTO @c VALUES
-- EPU Arena
('epu-arena-pickleball', N'Sân 3 (VIP - Có mái che)',  N'Thảm Cushion chuyên dụng', 1, 150000, 220000),
('epu-arena-pickleball', N'Sân 4 (Có mái che)',        N'Thảm Cushion chuyên dụng', 1, 140000, 210000),
('epu-arena-pickleball', N'Sân 5 (Ngoài trời)',        N'Mặt sơn Acrylic', 0, 130000, 190000),
('epu-arena-pickleball', N'Sân 6 (Ngoài trời)',        N'Mặt sơn Acrylic', 0, 130000, 190000),
-- Hồ Tùng Mậu
('clb-cau-long-ho-tung-mau', N'Sân A2 (Thảm Taraflex Đỏ)',  N'Taraflex 4.5mm', 1, 110000, 160000),
('clb-cau-long-ho-tung-mau', N'Sân A3 (Thảm Taraflex Xanh)', N'Taraflex 4.5mm', 1, 110000, 160000),
('clb-cau-long-ho-tung-mau', N'Sân B1 (Tiêu chuẩn thi đấu)', N'Taraflex 6mm', 1, 130000, 180000),
('clb-cau-long-ho-tung-mau', N'Sân B2 (Tiêu chuẩn thi đấu)', N'Taraflex 6mm', 1, 130000, 180000),
('clb-cau-long-ho-tung-mau', N'Sân B3 (Phổ thông)',          N'Thảm PVC', 1, 90000, 140000),
-- Pickleball Sunrise
('pickleball-sunrise-cau-giay', N'Sân 1 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 2 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 3 (Trong nhà)', N'Sàn chống trượt', 1, 160000, 230000),
('pickleball-sunrise-cau-giay', N'Sân 4 (VIP)',       N'Thảm Cushion', 1, 180000, 250000),
-- Pickleball Mỹ Đình Arena
('pickleball-my-dinh-arena', N'Sân 1 (Trong nhà)',  N'Thảm Cushion', 1, 150000, 210000),
('pickleball-my-dinh-arena', N'Sân 2 (Trong nhà)',  N'Thảm Cushion', 1, 150000, 210000),
('pickleball-my-dinh-arena', N'Sân 3 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 4 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 5 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
('pickleball-my-dinh-arena', N'Sân 6 (Ngoài trời)', N'Mặt sơn Acrylic', 0, 120000, 170000),
-- Tây Hồ Pickleball
('tay-ho-pickleball-social-club', N'Court 1 (Lake View VIP)', N'Cushion PPA 8 lớp', 1, 190000, 280000),
('tay-ho-pickleball-social-club', N'Court 2 (Lake View VIP)', N'Cushion PPA 8 lớp', 1, 190000, 280000),
('tay-ho-pickleball-social-club', N'Court 3 (Mái che)',       N'Cushion PPA 8 lớp', 1, 170000, 240000),
('tay-ho-pickleball-social-club', N'Court 4 (Mái che)',       N'Cushion PPA 8 lớp', 1, 170000, 240000),
('tay-ho-pickleball-social-club', N'Court 5 (Ngoài trời)',    N'Mặt sơn Acrylic', 0, 140000, 200000),
-- Pickleball Bách Khoa
('pickleball-bach-khoa-arena', N'Sân BK1 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK2 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK3 (Có mái che)', N'Thảm Cushion', 1, 140000, 200000),
('pickleball-bach-khoa-arena', N'Sân BK4 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
('pickleball-bach-khoa-arena', N'Sân BK5 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
('pickleball-bach-khoa-arena', N'Sân BK6 (Ngoài trời)', N'Acrylic 7 lớp', 0, 110000, 160000),
-- Pickleball Royal Hà Đông
('pickleball-royal-ha-dong', N'Sân R1 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R2 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R3 (Trong nhà)', N'Thảm Cushion', 1, 130000, 190000),
('pickleball-royal-ha-dong', N'Sân R4 (VIP)',       N'Thảm Cushion Pro', 1, 160000, 220000),
('pickleball-royal-ha-dong', N'Sân R5 (VIP)',       N'Thảm Cushion Pro', 1, 160000, 220000),
-- Cầu lông Thanh Xuân Smash
('clb-cau-long-thanh-xuan-smash', N'Sân 1', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 2', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 3', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 4', N'Thảm PVC', 1, 90000, 130000),
('clb-cau-long-thanh-xuan-smash', N'Sân 5 (VIP)', N'Taraflex 4.5mm', 1, 120000, 170000),
('clb-cau-long-thanh-xuan-smash', N'Sân 6 (VIP)', N'Taraflex 4.5mm', 1, 120000, 170000),
-- Nhà thi đấu Hoàng Cầu
('nha-thi-dau-cau-long-hoang-cau', N'Sân T1 (Thi đấu)', N'Taraflex 6mm', 1, 130000, 190000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T2 (Thi đấu)', N'Taraflex 6mm', 1, 130000, 190000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T3', N'Taraflex 4.5mm', 1, 110000, 160000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T4', N'Taraflex 4.5mm', 1, 110000, 160000),
('nha-thi-dau-cau-long-hoang-cau', N'Sân T5', N'Thảm PVC', 1, 90000, 140000),
-- Cầu lông Ciputra Tây Hồ
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 1 (VIP)', N'Thảm Yonex BWF', 1, 150000, 220000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 2 (VIP)', N'Thảm Yonex BWF', 1, 150000, 220000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 3',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 4',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 5',       N'Taraflex 6mm', 1, 130000, 190000),
('clb-cau-long-ciputra-tay-ho', N'Sân Yonex 6',       N'Taraflex 6mm', 1, 130000, 190000),
-- Cầu lông Đền Lừ
('san-cau-long-den-lu-arena', N'Sân ĐL 1', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 2', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 3', N'Taraflex 4.5mm', 1, 95000, 145000),
('san-cau-long-den-lu-arena', N'Sân ĐL 4', N'Thảm PVC', 1, 85000, 130000),
('san-cau-long-den-lu-arena', N'Sân ĐL 5', N'Thảm PVC', 1, 85000, 130000),
-- Bóng mini Thành Phát
('san-bong-mini-thanh-phat', N'Sân 5 người số 1', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
('san-bong-mini-thanh-phat', N'Sân 5 người số 2', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
('san-bong-mini-thanh-phat', N'Sân 7 người số 1', N'Cỏ nhân tạo 50mm', 0, 350000, 600000),
('san-bong-mini-thanh-phat', N'Sân 7 người số 2', N'Cỏ nhân tạo 50mm', 0, 350000, 600000),
-- Bóng mini Mỹ Đình Stadium
('san-bong-mini-my-dinh-stadium', N'Sân A (5 người)', N'Cỏ nhân tạo FIFA', 0, 280000, 450000),
('san-bong-mini-my-dinh-stadium', N'Sân B (5 người)', N'Cỏ nhân tạo FIFA', 0, 280000, 450000),
('san-bong-mini-my-dinh-stadium', N'Sân C (7 người)', N'Cỏ nhân tạo FIFA', 0, 380000, 650000),
('san-bong-mini-my-dinh-stadium', N'Sân D (7 người)', N'Cỏ nhân tạo FIFA', 0, 380000, 650000),
('san-bong-mini-my-dinh-stadium', N'Sân E (11 người)', N'Cỏ nhân tạo FIFA', 0, 700000, 1100000),
-- Bóng mini Khâm Thiên
('san-bong-mini-kham-thien', N'Sân 1 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
('san-bong-mini-kham-thien', N'Sân 2 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
('san-bong-mini-kham-thien', N'Sân 3 (5 người)', N'Cỏ nhân tạo 30mm', 0, 220000, 350000),
-- Bóng cỏ nhân tạo Nguyễn Trãi
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 1 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 2 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 3 (7 người)', N'Cỏ nhân tạo 50mm', 0, 330000, 550000),
('san-bong-co-nhan-tao-nguyen-trai', N'Sân 4 (5 người)', N'Cỏ nhân tạo 40mm', 0, 250000, 400000),
-- Tổ hợp Sân bóng Đầm Hồng
('to-hop-san-bong-dam-hong', N'Sân ĐH 1 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 2 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 3 (7 người)', N'Cỏ kim cương 50mm', 0, 350000, 600000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 4 (5 người)', N'Cỏ kim cương 40mm', 0, 260000, 420000),
('to-hop-san-bong-dam-hong', N'Sân ĐH 5 (5 người)', N'Cỏ kim cương 40mm', 0, 260000, 420000),
-- Tennis Quần Ngựa Ba Đình
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân Trung Tâm A1 (Có mái che)', N'Hard Court US Open', 1, 250000, 380000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân A2 (Có mái che)',           N'Hard Court US Open', 1, 240000, 360000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân B1 (Ngoài trời)',           N'Plexipave Acrylic', 0, 190000, 300000),
('cum-san-tennis-quan-ngua-ba-dinh', N'Sân B2 (Ngoài trời)',           N'Plexipave Acrylic', 0, 190000, 300000),
-- Tennis Vinhomes Long Biên
('san-tennis-vinhomes-long-bien-club', N'Court T1 (River View)', N'Plexipave US Open', 0, 220000, 340000),
('san-tennis-vinhomes-long-bien-club', N'Court T2 (River View)', N'Plexipave US Open', 0, 220000, 340000),
('san-tennis-vinhomes-long-bien-club', N'Court T3 (Trong nhà)',  N'Hard Court Cushion', 1, 280000, 420000),
('san-tennis-vinhomes-long-bien-club', N'Court T4 (Trong nhà)',  N'Hard Court Cushion', 1, 280000, 420000),
-- Bóng rổ Hanoi Hoop Arena
('hanoi-hoop-arena-bong-ro', N'Sân FIBA 1 (Full Court 5x5)', N'Sàn gỗ Maple FIBA', 1, 350000, 550000),
('hanoi-hoop-arena-bong-ro', N'Sân FIBA 2 (Full Court 5x5)', N'Sàn gỗ Maple FIBA', 1, 350000, 550000),
('hanoi-hoop-arena-bong-ro', N'Sân Half-Court 3x3',          N'Sàn gỗ Maple FIBA', 1, 200000, 320000),
-- Bóng rổ Streetball Bách Khoa
('san-bong-ro-streetball-bach-khoa', N'Sân Streetball 1 (5x5)', N'Mặt sơn Acrylic', 0, 220000, 350000),
('san-bong-ro-streetball-bach-khoa', N'Sân Streetball 2 (5x5)', N'Mặt sơn Acrylic', 0, 220000, 350000),
('san-bong-ro-streetball-bach-khoa', N'Sân 3x3 Số 1',           N'Mặt sơn Acrylic', 0, 140000, 220000),
('san-bong-ro-streetball-bach-khoa', N'Sân 3x3 Số 2',           N'Mặt sơn Acrylic', 0, 140000, 220000);

INSERT INTO dbo.courts (venue_id, name, court_type, is_covered, status)
SELECT v.id, x.name, x.ctype, x.covered, 'ACTIVE'
FROM @c x JOIN dbo.venues v ON v.slug = x.slug
WHERE NOT EXISTS (SELECT 1 FROM dbo.courts c WHERE c.venue_id = v.id AND c.name = x.name);

-- 4. BẢNG GIÁ CHO MỌI SÂN CHƯA CÓ BẢNG GIÁ
INSERT INTO dbo.price_rules (court_id, name, start_time, end_time, price, is_peak)
SELECT c.id, N'Giờ thường', '05:30', '17:00', x.normal_price, 0
FROM @c x JOIN dbo.venues v ON v.slug = x.slug JOIN dbo.courts c ON c.venue_id = v.id AND c.name = x.name
WHERE NOT EXISTS (SELECT 1 FROM dbo.price_rules p WHERE p.court_id = c.id);

INSERT INTO dbo.price_rules (court_id, name, start_time, end_time, price, is_peak)
SELECT c.id, N'Giờ vàng cao điểm', '17:00', '23:30', x.peak_price, 1
FROM @c x JOIN dbo.venues v ON v.slug = x.slug JOIN dbo.courts c ON c.venue_id = v.id AND c.name = x.name
WHERE NOT EXISTS (SELECT 1 FROM dbo.price_rules p WHERE p.court_id = c.id AND p.is_peak = 1)
  AND (SELECT COUNT(*) FROM dbo.price_rules p WHERE p.court_id = c.id) = 1;

-- 5. ẢNH ĐẠI DIỆN THEO MÔN THỂ THAO CHO MỌI SÂN CHƯA CÓ ẢNH
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

-- 6. ĐƠN ĐẶT SÂN MẪU & ĐÁNH GIÁ CHO KHÁCH HÀNG DEMO (son.nguyen@gmail.com)
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

SELECT
  (SELECT COUNT(*) FROM dbo.sports) AS total_sports,
  (SELECT COUNT(*) FROM dbo.venues) AS total_venues,
  (SELECT COUNT(*) FROM dbo.courts) AS total_courts,
  (SELECT COUNT(*) FROM dbo.price_rules) AS total_price_rules,
  (SELECT COUNT(*) FROM dbo.bookings) AS total_bookings;
GO
