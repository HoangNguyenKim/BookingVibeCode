const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy thông tin thống kê chung cho trang chủ Dashboard
router.get('/stats', async (req, res) => {
  try {
    // 1. Tổng số phòng đang sử dụng (occupied)
    const occupiedRoomsRes = await db.query(
      "SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'"
    );
    const occupiedCount = occupiedRoomsRes.recordset[0].count;

    // 2. Tổng số phòng trống (available)
    const availableRoomsRes = await db.query(
      "SELECT COUNT(*) as count FROM rooms WHERE status = 'available'"
    );
    const availableCount = availableRoomsRes.recordset[0].count;

    // 3. Tổng số phòng dọn dẹp & bảo trì
    const cleaningRoomsRes = await db.query(
      "SELECT COUNT(*) as count FROM rooms WHERE status IN ('cleaning', 'maintenance')"
    );
    const otherCount = cleaningRoomsRes.recordset[0].count;

    const totalRooms = occupiedCount + availableCount + otherCount;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

    // 4. Lượt Check-in hôm nay
    const todayCheckinRes = await db.query(
      "SELECT COUNT(*) as count FROM bookings WHERE check_in_date = CAST(GETDATE() AS DATE) AND status = 'booked'"
    );
    const todayCheckins = todayCheckinRes.recordset[0].count;

    // 5. Lượt Check-out hôm nay
    const todayCheckoutRes = await db.query(
      "SELECT COUNT(*) as count FROM bookings WHERE check_out_date = CAST(GETDATE() AS DATE) AND status = 'checked_in'"
    );
    const todayCheckouts = todayCheckoutRes.recordset[0].count;

    // 6. Doanh thu tháng này (Tiền phòng đã check_out hoặc đang checked_in + dịch vụ phụ thu tương ứng)
    const revenueRes = await db.query(`
      SELECT 
        (SELECT ISNULL(SUM(total_price), 0) FROM bookings 
         WHERE status IN ('checked_in', 'checked_out') 
         AND MONTH(check_in_date) = MONTH(GETDATE()) 
         AND YEAR(check_in_date) = YEAR(GETDATE())) 
        + 
        (SELECT ISNULL(SUM(bs.price * bs.quantity), 0) 
         FROM booking_services bs
         JOIN bookings b ON bs.booking_id = b.id
         WHERE b.status IN ('checked_in', 'checked_out')
         AND MONTH(b.check_in_date) = MONTH(GETDATE()) 
         AND YEAR(b.check_in_date) = YEAR(GETDATE())) as total_revenue
    `);
    const totalRevenue = revenueRes.recordset[0].total_revenue;

    res.json({
      occupiedCount,
      availableCount,
      otherCount,
      totalRooms,
      occupancyRate,
      todayCheckins,
      todayCheckouts,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy dữ liệu thống kê dashboard', error: error.message });
  }
});

// Lấy danh sách Check-in / Check-out / Cần dọn dẹp hôm nay
router.get('/today-actions', async (req, res) => {
  try {
    // Danh sách check-in dự kiến hôm nay
    const arrivalsRes = await db.query(`
      SELECT b.id, b.check_in_date, b.check_out_date, b.total_price, b.status,
             g.full_name as guest_name, g.phone as guest_phone,
             r.room_number, rt.name as room_type_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.check_in_date = CAST(GETDATE() AS DATE) AND b.status = 'booked'
    `);

    // Danh sách check-out dự kiến hôm nay
    const departuresRes = await db.query(`
      SELECT b.id, b.check_in_date, b.check_out_date, b.total_price, b.status,
             g.full_name as guest_name, g.phone as guest_phone,
             r.room_number, rt.name as room_type_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.check_out_date = CAST(GETDATE() AS DATE) AND b.status = 'checked_in'
    `);

    // Danh sách phòng cần dọn dẹp
    const cleaningRoomsRes = await db.query(`
      SELECT r.id, r.room_number, r.floor, r.status, rt.name as room_type_name
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.status = 'cleaning'
    `);

    res.json({
      arrivals: arrivalsRes.recordset,
      departures: departuresRes.recordset,
      cleaningRooms: cleaningRoomsRes.recordset
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách công việc hôm nay', error: error.message });
  }
});

module.exports = router;
