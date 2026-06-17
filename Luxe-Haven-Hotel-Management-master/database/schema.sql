   USE HotelManagement;-- =========================================================================
-- 1. Tạo bảng Phòng (Rooms)
-- =========================================================================
CREATE TABLE rooms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type NVARCHAR(50) NOT NULL,
    price_per_night DECIMAL(18, 2) NOT NULL,
    is_available BIT DEFAULT 1 -- 1: Trống, 0: Đã được đặt hoặc đang sử dụng
);

-- =========================================================================
-- 2. Tạo bảng Người dùng hệ thống (System Users)
-- Chỉ dành cho Admin và Nhân viên lễ tân/dọn phòng để ĐĂNG NHẬP hệ thống quản trị
-- =========================================================================
CREATE TABLE system_users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL,
    is_active BIT DEFAULT 1, -- 1: Đang hoạt động, 0: Đã khóa tài khoản
    created_at DATETIME DEFAULT GETDATE(),
    
    -- Ràng buộc loại bỏ quyền 'customer', chỉ giữ lại quyền quản trị/vận hành
    CONSTRAINT CHK_SystemUserRole CHECK (role IN ('receptionist', 'admin'))
);

-- =========================================================================
-- 3. Tạo bảng Hồ sơ Khách hàng (Customers)
-- Được tạo TỰ ĐỘNG khi khách đặt phòng trên Web, KHÔNG cần tài khoản & mật khẩu
-- =========================================================================
CREATE TABLE customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_code AS ('KH-' + RIGHT('0000' + CAST(id AS VARCHAR(4)), 4)), -- Tự động sinh mã định danh (Ví dụ: KH-0001, KH-0002)
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE, -- Khóa cốt lõi để kiểm tra khách cũ/khách mới khi đặt phòng
    email VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE()
);

-- =========================================================================
-- 4. Tạo bảng Đặt phòng (Bookings) 
-- Liên kết trực tiếp với bảng thông tin khách hàng (customers)
-- =========================================================================
CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL, -- Thay đổi từ user_id sang customer_id
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- pending, confirmed, completed, cancelled
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Bookings_Rooms FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT FK_Bookings_Customers FOREIGN KEY (customer_id) REFERENCES customers(id) -- Khóa ngoại trỏ sang bảng customers mới
);

-- =========================================================================
-- 5. Tạo bảng Thanh toán (Payments) liên kết với bảng Đặt phòng (Bookings)
-- =========================================================================
CREATE TABLE payments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    payment_method NVARCHAR(50) NOT NULL, -- Tiền mặt, Chuyển khoản, Thẻ
    payment_status NVARCHAR(30) NOT NULL, -- Chưa thanh toán, Đã thanh toán
    paid_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Payments_Bookings FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- =========================================================================
-- 6. Tạo bảng Dịch vụ khách sạn (Services)
-- =========================================================================
CREATE TABLE services (
    id INT IDENTITY(1,1) PRIMARY KEY,
    service_name NVARCHAR(100) NOT NULL,
    price DECIMAL(18, 2) NOT NULL,
    is_available BIT DEFAULT 1 -- 1: Đang phục vụ, 0: Ngừng phục vụ
);

-- =========================================================================
-- 7. Tạo bảng trung gian Chi tiết dịch vụ đặt phòng (Booking Services Mapping)
-- =========================================================================
CREATE TABLE booking_services (
    id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price DECIMAL(18, 2) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_BookingServices_Bookings FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT FK_BookingServices_Services FOREIGN KEY (service_id) REFERENCES services(id)
);

-- =========================================================================
-- 8. Tạo bảng Nhật ký dọn phòng (Housekeeping Log)
-- Liên kết với staff_id thuộc hệ thống tài khoản nhân viên (system_users)
-- =========================================================================
CREATE TABLE housekeeping_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    staff_id INT NOT NULL, -- Liên kết tới bảng nhân viên nội bộ hệ thống
    status VARCHAR(20) NOT NULL,
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Housekeeping_Rooms FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT FK_Housekeeping_Staff FOREIGN KEY (staff_id) REFERENCES system_users(id), -- Đổi đích trỏ sang system_users
    -- Ràng buộc trạng thái phòng dọn dẹp
    CONSTRAINT CHK_HousekeepingStatus CHECK (status IN ('dirty', 'cleaning', 'clean'))
);

use HotelManagement;
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(100) NOT NULL,       -- Tiêu đề (Ví dụ: N'Thanh toán thành công')
    message NVARCHAR(255) NOT NULL,     -- Nội dung (Ví dụ: N'Phòng 202 đã thanh toán hóa đơn 5.650.000đ')
    is_read BIT DEFAULT 0,              -- 0: Chưa đọc (Hiện dấu chấm đỏ trên chuông), 1: Đã đọc
    created_at DATETIME DEFAULT GETDATE()
);

ALTER TABLE housekeeping_log
ADD 
    task_status VARCHAR(20) DEFAULT 'unassigned', -- 'unassigned' (Chờ phân công), 'assigned' (Đã nhận), 'cancel_requested' (Chờ duyệt hủy), 'completed' (Đã xong)
    cancellation_reason NVARCHAR(255) NULL,       -- Lưu lý do nếu nhân viên xin hủy
    start_time DATETIME NULL,                     -- Thời gian bắt đầu dọn
    end_time DATETIME NULL;                       -- Thời gian dọn xong

USE HotelManagement;
GO

-- 1. Xóa ràng buộc cũ chỉ cho phép 'receptionist' và 'admin'
ALTER TABLE system_users 
DROP CONSTRAINT CHK_SystemUserRole;

-- 2. Thêm ràng buộc mới bao gồm cả chức vụ 'cleaner' và 'accountant'
ALTER TABLE system_users
ADD CONSTRAINT CHK_SystemUserRole CHECK (role IN ('receptionist', 'admin', 'cleaner', 'accountant', 'technical'));




CREATE TABLE time_attendance (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES system_users(id),
    work_date DATE DEFAULT CAST(GETDATE() AS DATE),
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME NULL,
    total_hours DECIMAL(4,2) NULL -- Tự động tính số giờ làm (ví dụ: 8.25 giờ)
);

CREATE TABLE expense_vouchers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

GO

-- Thêm cột target_role để biết thông báo này gửi đích danh cho ai
ALTER TABLE notifications
ADD target_role NVARCHAR(50) DEFAULT 'all'; 
-- Các giá trị hợp lệ sẽ là: 'admin', 'receptionist', 'cleaner', 'accountant', 'all'

GO

-- =========================================================================
-- 1. CHÈN DỮ LIỆU MẪU: DANH SÁCH PHÒNG (ROOMS)
-- =========================================================================
INSERT INTO rooms (room_number, room_type, price_per_night, is_available) VALUES
('101', N'Bayview King', 1500000.00, 0),  -- Đang có khách ở (Alex Johnson)
('102', N'Deluxe Room', 1200000.00, 0),  -- Đang có khách ở (Nguyễn Văn Hùng)
('103', N'Deluxe Room', 1200000.00, 1),  -- Phòng trống sạch
('201', N'Oceanview Twin', 1800000.00, 1),-- Phòng trống sạch
('202', N'Oceanview Twin', 1800000.00, 0),-- Đang có khách ở (Lê Hoàng Nam)
('203', N'Luxury Suite', 3500000.00, 0), -- Đang có khách ở (Nguyễn Thu Thảo)
('301', N'Luxury Suite', 3500000.00, 1), -- Phòng trống sạch
('302', N'Luxury Family Suite', 5200000.00, 1); -- Phòng trống sạch

-- =========================================================================
-- 2. CHÈN DỮ LIỆU MẪU: TÀI KHOẢN HỆ THỐNG (SYSTEM USERS)
-- Mật khẩu giả định đã băm (hash)
-- =========================================================================
INSERT INTO system_users (username, email, password_hash, full_name, phone, role, is_active) VALUES
('admin_trong', 'trong.lemai@luxehaven.com', 'hash_pass_123', N'Lê Mai Minh Trọng', '0912345678', 'admin', 1),
('jane_reception', 'jane.doe@luxehaven.com', 'hash_pass_456', N'Jane Doe', '0987654321', 'receptionist', 1),
('john_cleaner', 'john.smith@luxehaven.com', 'hash_pass_789', N'John Smith', '0934567890', 'receptionist', 1);

-- =========================================================================
-- 3. CHÈN DỮ LIỆU MẪU: HỒ SƠ KHÁCH HÀNG (CUSTOMERS)
-- Tự động sinh mã KH-0001, KH-0002... dựa trên cột IDENTITY
-- =========================================================================
INSERT INTO customers (full_name, phone, email) VALUES
(N'Alex Johnson', '0912345678', 'alexj@guest.com'),
(N'Nguyễn Văn Hùng', '0987654321', 'hungnv@gmail.com'),
(N'Trần Thị Mai', '0934567890', 'maitt@yahoo.com'),
(N'Lê Hoàng Nam', '0901234567', 'namlh@hotmail.com'),
(N'Phạm Minh Tuấn', '0977888999', 'tuanpm@guest.com'),
(N'Nguyễn Thu Thảo', '0983334445', 'thaont@gmail.com');

-- =========================================================================
-- 4. CHÈN DỮ LIỆU MẪU: ĐƠN ĐẶT PHÒNG (BOOKINGS)
-- =========================================================================
INSERT INTO bookings (customer_id, room_id, check_in, check_out, status) VALUES
(1, 1, '2026-06-12', '2026-06-14', 'confirmed'), -- Alex Johnson ở phòng 101 (Chờ nhận phòng)
(2, 2, '2026-06-10', '2026-06-14', 'active'),    -- Nguyễn Văn Hùng ở phòng 102 (Đang lưu trú)
(3, 8, '2026-06-08', '2026-06-11', 'completed'), -- Trần Thị Mai ở phòng 302 (Đã hoàn tất / Đã trả)
(4, 5, '2026-06-12', '2026-06-13', 'confirmed'), -- Lê Hoàng Nam ở phòng 202 (Chờ nhận phòng)
(5, 6, '2026-06-05', '2026-06-07', 'cancelled'), -- Phạm Minh Tuấn ở phòng 203 (Đã hủy)
(6, 6, '2026-06-10', '2026-06-12', 'active');    -- Nguyễn Thu Thảo ở phòng 203 (Đang lưu trú)

-- =========================================================================
-- 5. CHÈN DỮ LIỆU MẪU: LỊCH SỬ THANH TOÁN ĐÃ HOÀN TẤT (PAYMENTS)
-- Ăn khớp với đơn đặt phòng số 3 (Đã hoàn tất) của khách Trần Thị Mai
-- =========================================================================
INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES
(3, 12600000.00, N'Chuyển khoản ngân hàng QR', N'Đã thanh toán');

-- =========================================================================
-- 6. CHÈN DỮ LIỆU MẪU: DANH MỤC DỊCH VỤ (SERVICES)
-- =========================================================================
INSERT INTO services (service_name, price, is_available) VALUES
(N'Ẩm Thực Tại Phòng 24/7', 250000.00, 1),
(N'Trà Chiều Hoàng Hôn', 350000.00, 1),
(N'Spa & Trị Liệu Đặc Quyền', 950000.00, 1),
(N'Tour Du Thuyền Khám Phá Vịnh', 1500000.00, 1),
(N'Đưa Đón Sân Bay Hạng Sang', 600000.00, 1);

-- =========================================================================
-- 7. CHÈN DỮ LIỆU MẪU: DỊCH VỤ GỌI THÊM TẠI PHÒNG (BOOKING SERVICES MAPPING)
-- Thêm dịch vụ cho khách đang lưu trú để test tính tiền hóa đơn tổng quát
-- =========================================================================
INSERT INTO booking_services (booking_id, service_id, quantity, total_price) VALUES
(2, 1, 2, 500000.00), -- Phòng 102 gọi 2 suất Ẩm thực tại phòng (500k)
(2, 2, 1, 350000.00), -- Phòng 102 gọi 1 Set Trà chiều hoàng hôn (350k)
(6, 3, 1, 950000.00); -- Phòng 203 gọi 1 suất Spa trị liệu (950k)

-- =========================================================================
-- 8. CHÈN DỮ LIỆU MẪU: NHẬT KÝ DỌN PHÒNG (HOUSEKEEPING LOG)
-- =========================================================================
INSERT INTO housekeeping_log (room_id, staff_id, status, task_status, cancellation_reason, start_time, end_time) VALUES
(1, 3, 'dirty', 'assigned', NULL, '2026-06-12 08:00:00', NULL),               -- Phòng 101: Đang dọn dẹp (Giao cho John)
(2, 2, 'dirty', 'cancel_requested', N'Thiếu dụng cụ dọn Suite', '2026-06-12 08:15:00', NULL), -- Phòng 102: Jane xin hủy
(3, 3, 'clean', 'completed', NULL, '2026-06-12 07:00:00', '2026-06-12 07:45:00'), -- Phòng 103: Đã xong
(5, 2, 'dirty', 'unassigned', NULL, NULL, NULL);                              -- Phòng 202: Chờ phân công

-- =========================================================================
-- 9. Tạo bảng Báo cáo Sự cố Phòng (Room Issues)
-- =========================================================================
CREATE TABLE room_issues (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT FOREIGN KEY REFERENCES rooms(id) ON DELETE CASCADE,
    reporter_id INT FOREIGN KEY REFERENCES system_users(id),
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    created_at DATETIME DEFAULT GETDATE()
);