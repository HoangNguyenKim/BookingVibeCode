-- SCRIPT CHÈN DỮ LIỆU MẪU ĐỂ CHẠY THỬ NGHIỆM
-- Chạy script này sau khi đã tạo xong các bảng từ file schema.sql

-- 1. Chèn loại phòng
INSERT INTO room_types (name, price_per_night, capacity, description) VALUES
(N'Standard Single', 350000.00, 1, N'Phòng tiêu chuẩn 1 giường đơn, đầy đủ tiện nghi cơ bản, cửa sổ thông thoáng.'),
(N'Standard Double', 500000.00, 2, N'Phòng tiêu chuẩn 1 giường đôi lớn hoặc 2 giường đơn, thích hợp cho cặp đôi.'),
(N'Deluxe Room', 800000.00, 2, N'Phòng sang trọng hướng thành phố, trang bị bồn tắm, tivi thông minh, máy pha cà phê.'),
(N'Executive Suite', 1500000.00, 3, N'Phòng Suite cao cấp diện tích lớn, có phòng khách riêng, ban công rộng, view đẹp nhất khách sạn.');

-- 2. Chèn danh sách phòng
-- Lấy ID của loại phòng vừa chèn (giả sử ID tăng tự động từ 1 đến 4)
-- Tầng 1: Phòng Standard Single
INSERT INTO rooms (room_number, floor, room_type_id, status) VALUES
('101', 1, 1, 'available'),
('102', 1, 1, 'available'),
('103', 1, 1, 'cleaning');

-- Tầng 2: Phòng Standard Double
INSERT INTO rooms (room_number, floor, room_type_id, status) VALUES
('201', 2, 2, 'available'),
('202', 2, 2, 'occupied'), -- Phòng đang có khách ở
('203', 2, 2, 'available');

-- Tầng 3: Phòng Deluxe
INSERT INTO rooms (room_number, floor, room_type_id, status) VALUES
('301', 3, 3, 'booked'), -- Phòng đã được đặt trước
('302', 3, 3, 'available'),
('303', 3, 3, 'maintenance'); -- Phòng đang bảo trì

-- Tầng 4: Executive Suite
INSERT INTO rooms (room_number, floor, room_type_id, status) VALUES
('401', 4, 4, 'available'),
('402', 4, 4, 'occupied'); -- Phòng đang có khách ở

-- 3. Chèn danh bạ khách hàng
INSERT INTO guests (full_name, phone, email, id_card_number) VALUES
(N'Nguyễn Anh Tuấn', '0912345678', 'anhtuan@gmail.com', '123456789012'),
(N'Phạm Minh Thư', '0987654321', 'minhthu@hotmail.com', '234567890123'),
(N'Lê Hoàng Nam', '0905123456', 'hoangnam@yahoo.com', '345678901234'),
(N'Vũ Thị Hương', '0933987654', 'thuongvu@gmail.com', '456789012345');

-- 4. Chèn danh sách đặt phòng mẫu
-- Booking 1: Khách đã check-in đang ở phòng 202 (Nguyễn Anh Tuấn)
-- Check-in hôm trước, Check-out ngày mai
INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, total_price, status, created_at)
VALUES (
    1, 
    (SELECT id FROM rooms WHERE room_number = '202'), 
    CAST(DATEADD(day, -1, GETDATE()) AS DATE), 
    CAST(DATEADD(day, 1, GETDATE()) AS DATE), 
    1000000.00, -- 2 đêm x 500.000
    'checked_in',
    DATEADD(day, -5, GETDATE())
);

-- Booking 2: Khách đã đặt trước phòng 301 (Phạm Minh Thư)
-- Check-in ngày mai, Check-out sau đó 3 ngày
INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, total_price, status, created_at)
VALUES (
    2, 
    (SELECT id FROM rooms WHERE room_number = '301'), 
    CAST(DATEADD(day, 1, GETDATE()) AS DATE), 
    CAST(DATEADD(day, 4, GETDATE()) AS DATE), 
    2400000.00, -- 3 đêm x 800.000
    'booked',
    DATEADD(day, -3, GETDATE())
);

-- Booking 3: Khách đã check-out phòng 103 và đang dọn dẹp (Lê Hoàng Nam)
-- Check-in cách đây 3 ngày, Check-out hôm nay
INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, total_price, status, created_at)
VALUES (
    3, 
    (SELECT id FROM rooms WHERE room_number = '103'), 
    CAST(DATEADD(day, -3, GETDATE()) AS DATE), 
    CAST(GETDATE() AS DATE), 
    1050000.00, -- 3 đêm x 350.000
    'checked_out',
    DATEADD(day, -10, GETDATE())
);

-- Booking 4: Khách đang ở phòng 402 (Vũ Thị Hương)
-- Check-in hôm nay, check-out sau 2 ngày
INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, total_price, status, created_at)
VALUES (
    4, 
    (SELECT id FROM rooms WHERE room_number = '402'), 
    CAST(GETDATE() AS DATE), 
    CAST(DATEADD(day, 2, GETDATE()) AS DATE), 
    3000000.00, -- 2 đêm x 1.500.000
    'checked_in',
    DATEADD(day, -1, GETDATE())
);

-- 5. Chèn phụ thu dịch vụ cho các đặt phòng
-- Thêm dịch vụ cho khách đang ở phòng 202 (booking_id = 1)
INSERT INTO booking_services (booking_id, service_name, price, quantity) VALUES
(1, N'Nước ngọt Cocacola (Mini bar)', 20000.00, 2),
(1, N'Giặt là áo sơ mi', 50000.00, 1);

-- Thêm dịch vụ cho khách đã check-out phòng 103 (booking_id = 3)
INSERT INTO booking_services (booking_id, service_name, price, quantity) VALUES
(3, N'Bia Heineken (Mini bar)', 30000.00, 4),
(3, N'Mì ly ăn liền', 25000.00, 2);

-- Thêm dịch vụ cho khách đang ở phòng 402 (booking_id = 4)
INSERT INTO booking_services (booking_id, service_name, price, quantity) VALUES
(4, N'Buffet sáng cao cấp', 150000.00, 2),
(4, N'Dịch vụ đưa đón sân bay', 30000.00, 1);
