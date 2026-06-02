const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy danh sách đặt phòng với bộ lọc
router.get('/', async (req, res) => {
  const { status, search, checkIn, checkOut } = req.query;
  let sqlQuery = `
    SELECT b.id, b.check_in_date, b.check_out_date, b.total_price, b.status, b.created_at,
           g.id as guest_id, g.full_name as guest_name, g.phone as guest_phone, g.email as guest_email,
           r.id as room_id, r.room_number, rt.name as room_type_name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE 1=1
  `;
  const params = {};

  if (status && status !== 'all') {
    sqlQuery += ` AND b.status = @status`;
    params.status = status;
  }

  if (search) {
    sqlQuery += ` AND (g.full_name LIKE @search OR g.phone LIKE @search OR r.room_number LIKE @search)`;
    params.search = `%${search}%`;
  }

  if (checkIn) {
    sqlQuery += ` AND b.check_in_date >= CONVERT(DATE, @checkIn, 120)`;
    params.checkIn = checkIn;
  }

  if (checkOut) {
    sqlQuery += ` AND b.check_out_date <= CONVERT(DATE, @checkOut, 120)`;
    params.checkOut = checkOut;
  }

  sqlQuery += ` ORDER BY b.created_at DESC`;

  try {
    const result = await db.query(sqlQuery, params);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đặt phòng', error: error.message });
  }
});

// Lấy danh sách các phòng trống trong khoảng ngày cụ thể
router.get('/available-rooms', async (req, res) => {
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) {
    return res.status(400).json({ message: 'Vui lòng cung cấp ngày check-in và check-out.' });
  }

  try {
    const queryStr = `
      SELECT r.id, r.room_number, r.floor, r.status,
             rt.id as room_type_id, rt.name as room_type_name, rt.price_per_night, rt.capacity
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.status != 'maintenance'
        AND r.id NOT IN (
          SELECT room_id 
          FROM bookings 
          WHERE status IN ('booked', 'checked_in')
            AND check_in_date < CONVERT(DATE, @checkOut, 120) 
            AND check_out_date > CONVERT(DATE, @checkIn, 120)
        )
      ORDER BY r.room_number ASC
    `;
    const result = await db.query(queryStr, { checkIn, checkOut });
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi kiểm tra phòng trống', error: error.message });
  }
});

// Lấy chi tiết một đặt phòng kèm dịch vụ phụ thu
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bookingRes = await db.query(`
      SELECT b.id, b.check_in_date, b.check_out_date, b.total_price, b.status, b.created_at,
             g.id as guest_id, g.full_name as guest_name, g.phone as guest_phone, g.email as guest_email, g.id_card_number,
             r.id as room_id, r.room_number, rt.name as room_type_name, rt.price_per_night as room_price
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = @id
    `, { id });

    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đặt phòng này.' });
    }

    const servicesRes = await db.query(`
      SELECT id, service_name, price, quantity, date_added
      FROM booking_services
      WHERE booking_id = @id
      ORDER BY date_added ASC
    `, { id });

    const booking = bookingRes.recordset[0];
    booking.services = servicesRes.recordset;

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy chi tiết đặt phòng', error: error.message });
  }
});

// Tạo mới một đặt phòng (Tự tạo khách hàng mới nếu SĐT chưa tồn tại)
router.post('/', async (req, res) => {
  const { 
    full_name, phone, email, id_card_number,
    room_id, check_in_date, check_out_date, total_price 
  } = req.body;

  if (!full_name || !phone || !room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.' });
  }

  const parsedRoomId = parseInt(room_id, 10);
  const parsedTotalPrice = parseFloat(total_price);

  if (isNaN(parsedRoomId) || isNaN(parsedTotalPrice)) {
    return res.status(400).json({ message: 'Mã phòng và giá tiền phải là số hợp lệ.' });
  }

  try {
    // 1. Kiểm tra/Tạo khách hàng
    let guestId;
    const checkGuest = await db.query('SELECT id FROM guests WHERE phone = @phone', { phone });
    if (checkGuest.recordset.length > 0) {
      guestId = checkGuest.recordset[0].id;
      // Cập nhật thông tin CCCD hoặc email nếu khách hàng đã có sẵn mà chưa cập nhật
      await db.query(`
        UPDATE guests 
        SET full_name = @full_name, email = COALESCE(email, @email), id_card_number = COALESCE(id_card_number, @id_card_number)
        WHERE id = @guestId
      `, { full_name, email, id_card_number, guestId });
    } else {
      const insertGuest = await db.query(`
        INSERT INTO guests (full_name, phone, email, id_card_number) 
        OUTPUT INSERTED.id
        VALUES (@full_name, @phone, @email, @id_card_number)
      `, { full_name, phone, email, id_card_number });
      guestId = insertGuest.recordset[0].id;
    }

    // 2. Kiểm tra xem phòng có bị trùng lịch trong thời gian này không
    const checkOverlap = await db.query(`
      SELECT id FROM bookings 
      WHERE room_id = @room_id 
        AND status IN ('booked', 'checked_in')
        AND check_in_date < CONVERT(DATE, @check_out_date, 120) 
        AND check_out_date > CONVERT(DATE, @check_in_date, 120)
    `, { room_id: parsedRoomId, check_in_date, check_out_date });

    if (checkOverlap.recordset.length > 0) {
      return res.status(400).json({ message: 'Phòng này đã có người đặt trong thời gian bạn chọn.' });
    }

    // 3. Tạo booking mới
    const bookingRes = await db.query(`
      INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, total_price, status)
      OUTPUT INSERTED.id
      VALUES (@guestId, @room_id, CONVERT(DATE, @check_in_date, 120), CONVERT(DATE, @check_out_date, 120), @total_price, 'booked')
    `, { guestId, room_id: parsedRoomId, check_in_date, check_out_date, total_price: parsedTotalPrice });

    const newBookingId = bookingRes.recordset[0].id;

    // 4. Nếu check-in là ngày hôm nay, tự động cập nhật trạng thái phòng thành 'booked' (hoặc giữ nguyên)
    const checkInToday = new Date(check_in_date).toDateString() === new Date().toDateString();
    if (checkInToday) {
      await db.query("UPDATE rooms SET status = 'booked' WHERE id = @room_id", { room_id: parsedRoomId });
    }

    res.status(201).json({ message: 'Tạo đặt phòng thành công.', bookingId: newBookingId });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo đặt phòng', error: error.message });
  }
});

// Check-in (Khách nhận phòng)
router.put('/:id/check-in', async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy thông tin phòng của booking
    const bookingRes = await db.query('SELECT room_id, status FROM bookings WHERE id = @id', { id });
    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    }
    const { room_id, status } = bookingRes.recordset[0];
    if (status !== 'booked') {
      return res.status(400).json({ message: 'Chỉ có thể check-in đối với đặt phòng ở trạng thái Đã đặt.' });
    }

    // Cập nhật trạng thái booking sang 'checked_in'
    await db.query("UPDATE bookings SET status = 'checked_in' WHERE id = @id", { id });
    // Cập nhật trạng thái phòng sang 'occupied'
    await db.query("UPDATE rooms SET status = 'occupied' WHERE id = @room_id", { room_id });

    res.json({ message: 'Nhận phòng (Check-in) thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thực hiện check-in', error: error.message });
  }
});

// Check-out (Khách trả phòng & thanh toán)
router.put('/:id/check-out', async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy thông tin phòng của booking
    const bookingRes = await db.query('SELECT room_id, status FROM bookings WHERE id = @id', { id });
    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    }
    const { room_id, status } = bookingRes.recordset[0];
    if (status !== 'checked_in') {
      return res.status(400).json({ message: 'Chỉ có thể check-out đối với phòng đang có khách ở.' });
    }

    // Cập nhật trạng thái booking sang 'checked_out'
    await db.query("UPDATE bookings SET status = 'checked_out' WHERE id = @id", { id });
    // Cập nhật trạng thái phòng sang 'cleaning' (Cần dọn dẹp)
    await db.query("UPDATE rooms SET status = 'cleaning' WHERE id = @room_id", { room_id });

    res.json({ message: 'Trả phòng (Check-out) thành công. Phòng hiện đã chuyển sang trạng thái dọn dẹp!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thực hiện check-out', error: error.message });
  }
});

// Hủy đặt phòng
router.put('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const bookingRes = await db.query('SELECT room_id, status, check_in_date FROM bookings WHERE id = @id', { id });
    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    }
    const { room_id, status, check_in_date } = bookingRes.recordset[0];
    if (status !== 'booked') {
      return res.status(400).json({ message: 'Chỉ có thể hủy phòng chưa check-in.' });
    }

    // Cập nhật trạng thái booking sang 'cancelled'
    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = @id", { id });

    // Nếu ngày check-in là hôm nay, kiểm tra xem phòng có còn lịch nào khác không, nếu không trả về 'available'
    const checkInToday = new Date(check_in_date).toDateString() === new Date().toDateString();
    if (checkInToday) {
      // Tìm xem có bất kỳ booking active nào khác cho phòng này hôm nay không
      const otherBookings = await db.query(`
        SELECT id FROM bookings 
        WHERE room_id = @room_id 
          AND status IN ('booked', 'checked_in')
          AND CAST(GETDATE() AS DATE) BETWEEN check_in_date AND check_out_date
      `, { room_id });
      if (otherBookings.recordset.length === 0) {
        await db.query("UPDATE rooms SET status = 'available' WHERE id = @room_id", { room_id });
      }
    }

    res.json({ message: 'Hủy phòng thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hủy đặt phòng', error: error.message });
  }
});

// Thêm dịch vụ phụ thu vào hóa đơn đặt phòng
router.post('/:id/services', async (req, res) => {
  const { id } = req.params;
  const { service_name, price, quantity } = req.body;

  if (!service_name || !price) {
    return res.status(400).json({ message: 'Thiếu tên dịch vụ hoặc đơn giá.' });
  }

  const parsedBookingId = parseInt(id, 10);
  const parsedPrice = parseFloat(price);
  const parsedQuantity = parseInt(quantity, 10) || 1;

  if (isNaN(parsedBookingId) || isNaN(parsedPrice) || isNaN(parsedQuantity)) {
    return res.status(400).json({ message: 'Thông tin dịch vụ không hợp lệ.' });
  }

  try {
    await db.query(`
      INSERT INTO booking_services (booking_id, service_name, price, quantity)
      VALUES (@booking_id, @service_name, @price, @quantity)
    `, {
      booking_id: parsedBookingId,
      service_name,
      price: parsedPrice,
      quantity: parsedQuantity
    });

    res.status(201).json({ message: 'Thêm dịch vụ thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm dịch vụ phụ thu', error: error.message });
  }
});

// Xóa dịch vụ phụ thu khỏi hóa đơn đặt phòng
router.delete('/services/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  try {
    await db.query('DELETE FROM booking_services WHERE id = @serviceId', { serviceId });
    res.json({ message: 'Xóa dịch vụ thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa dịch vụ phụ thu', error: error.message });
  }
});

module.exports = router;
