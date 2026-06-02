-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU CHO PHẦN MỀM QUẢN LÝ KHÁCH SẠN
-- Dành cho Microsoft SQL Server (MSSQL)

-- Hướng dẫn: 
-- 1. Mở SQL Server Management Studio (SSMS).
-- 2. Kết nối đến SQL Server instance của bạn.
-- 3. Tạo một Database mới bằng lệnh: CREATE DATABASE HotelBookingDB;
-- 4. Chọn Database vừa tạo (USE HotelBookingDB;) và chạy toàn bộ script dưới đây.

-- Xóa bảng cũ nếu tồn tại (theo thứ tự khóa ngoại để tránh lỗi)
IF OBJECT_ID('booking_services', 'U') IS NOT NULL DROP TABLE booking_services;
IF OBJECT_ID('bookings', 'U') IS NOT NULL DROP TABLE bookings;
IF OBJECT_ID('guests', 'U') IS NOT NULL DROP TABLE guests;
IF OBJECT_ID('rooms', 'U') IS NOT NULL DROP TABLE rooms;
IF OBJECT_ID('room_types', 'U') IS NOT NULL DROP TABLE room_types;

-- 1. Bảng loại phòng
CREATE TABLE room_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50) NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    capacity INT NOT NULL,
    description NVARCHAR(MAX)
);

-- 2. Bảng phòng
CREATE TABLE rooms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    floor INT NOT NULL,
    room_type_id INT FOREIGN KEY REFERENCES room_types(id) ON DELETE NO ACTION,
    status VARCHAR(20) DEFAULT 'available' -- 'available', 'booked', 'occupied', 'cleaning', 'maintenance'
);

-- 3. Bảng khách hàng
CREATE TABLE guests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    id_card_number VARCHAR(20) UNIQUE -- CCCD/Passport
);

-- 4. Bảng đặt phòng
CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    guest_id INT FOREIGN KEY REFERENCES guests(id) ON DELETE CASCADE,
    room_id INT FOREIGN KEY REFERENCES rooms(id) ON DELETE NO ACTION,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'booked', -- 'booked', 'checked_in', 'checked_out', 'cancelled'
    created_at DATETIME DEFAULT GETDATE()
);

-- 5. Bảng dịch vụ phụ thu của đặt phòng
CREATE TABLE booking_services (
    id INT IDENTITY(1,1) PRIMARY KEY,
    booking_id INT FOREIGN KEY REFERENCES bookings(id) ON DELETE CASCADE,
    service_name NVARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    date_added DATETIME DEFAULT GETDATE()
);
