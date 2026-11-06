# 🏟️ SportZone — Nền Tảng Đặt Sân Thể Thao Trực Tuyến

> **Học phần**: Ngôn ngữ kịch bản — Khoa Công nghệ Thông tin, Trường Đại học Điện Lực (EPU)

## ✨ Tính năng nổi bật
- **Đa dạng môn thể thao & Cụm sân**: Quản lý 20+ cụm sân và ~96 sân con tại Hà Nội cho 5 bộ môn: **Pickleball 🏓, Cầu lông 🏸, Bóng đá mini ⚽, Tennis 🎾, Bóng rổ 🏀**.
- **Bản đồ định vị & Chỉ đường trực quan (Leaflet / OpenStreetMap + Google Maps)**:
  - Ghim vị trí và giá thuê của từng cụm sân trên bản đồ Hà Nội.
  - Định vị GPS người dùng (`Tìm sân gần vị trí của tôi`), tính khoảng cách (`km`) và sắp xếp cụm sân từ gần đến xa.
  - Tích hợp chỉ đường một chạm qua Google Maps.
- **Ma trận đặt sân thời gian thực**:
  - Tra cứu khung giờ trống theo ngày, tự động tính giá giờ thường / giờ vàng cao điểm.
  - Chống trùng lịch đặt sân 100%, áp dụng mã giảm giá (`CHAOBANMOI`, `CUOITUANVUI`).
  - Hỗ trợ thanh toán qua **Cổng VNPay Sandbox** hoặc tiền mặt tại sân; hoàn tiền tự động khi hủy trước giờ chơi tối thiểu 2 tiếng.
- **Phân quyền 3 vai trò (`CUSTOMER`, `OWNER`, `ADMIN`)**:
  - **Khách hàng (`CUSTOMER`)**: Tìm kiếm sân, lọc trên bản đồ, đặt lịch, thanh toán VNPay, quản lý lịch đặt & đánh giá sân.
  - **Chủ sân (`OWNER`)**: Quản lý cụm sân, sân con, cấu hình bảng giá theo khung giờ, duyệt đơn đặt sân, phản hồi đánh giá, thống kê doanh thu.
  - **Quản trị viên (`ADMIN`)**: Phê duyệt cụm sân mới, quản lý tài khoản người dùng, quản lý danh mục môn thể thao & mã giảm giá toàn hệ thống.

---

## 🛠️ Công nghệ sử dụng
- **Backend**: Node.js, Express.js, JWT Authentication, Bcryptjs, Multer.
- **Cơ sở dữ liệu**: **Microsoft SQL Server (`.\SQLEXPRESS` — Database: `sportzone_db`)** quản lý trực tiếp qua SQL Server Management Studio (SSMS).
- **Frontend**: HTML5, TailwindCSS, Vanilla JavaScript SPA, Leaflet.js (OpenStreetMap).

---

## 🚀 Hướng dẫn Cài đặt & Chạy dự án

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Khởi tạo Cơ sở dữ liệu trên Microsoft SQL Server
Mở **SQL Server Management Studio (SSMS)** kết nối tới `.\SQLEXPRESS` và chạy file script duy nhất:
- `prisma/sportzone_sqlserver.sql` — Tự động tạo database `sportzone_db`, 14 bảng dữ liệu, 20 cụm sân, 96 sân con, tọa độ GPS bản đồ, 193 bảng giá và đơn đặt mẫu.

Hoặc chạy bằng lệnh tự động:
```bash
npm run prisma:seed
```

### 3. Khởi chạy Server
```bash
npm run dev
```
Truy cập ứng dụng tại: **http://localhost:5000**

---

## 🔑 Tài khoản Demo
| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| **Khách hàng (Customer)** | `son.nguyen@gmail.com` | `password123` |
| **Chủ sân (Owner)** | `epu.arena@gmail.com` | `password123` |
| **Quản trị viên (Admin)** | `admin@sportzone.vn` | `password123` |
