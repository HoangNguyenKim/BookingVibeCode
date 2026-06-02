const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy danh sách tất cả các phòng và thông tin loại phòng
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.id, r.room_number, r.floor, r.status, 
             rt.id as room_type_id, rt.name as room_type_name, 
             rt.price_per_night, rt.capacity, rt.description as room_type_description
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY r.floor ASC, r.room_number ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách phòng', error: error.message });
  }
});

// Lấy danh sách tất cả các loại phòng
router.get('/types', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM room_types ORDER BY price_per_night ASC');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách loại phòng', error: error.message });
  }
});

// Thêm mới một phòng
router.post('/', async (req, res) => {
  const { room_number, floor, room_type_id, status } = req.body;
  if (!room_number || !floor || !room_type_id) {
    return res.status(400).json({ message: 'Thiếu thông tin phòng bắt buộc.' });
  }

  try {
    // Kiểm tra xem số phòng đã tồn tại chưa
    const checkRoom = await db.query('SELECT id FROM rooms WHERE room_number = @room_number', { room_number });
    if (checkRoom.recordset.length > 0) {
      return res.status(400).json({ message: `Số phòng ${room_number} đã tồn tại.` });
    }

    await db.query(
      `INSERT INTO rooms (room_number, floor, room_type_id, status) 
       VALUES (@room_number, @floor, @room_type_id, @status)`,
      { 
        room_number, 
        floor, 
        room_type_id, 
        status: status || 'available' 
      }
    );
    res.status(201).json({ message: 'Thêm phòng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm phòng mới', error: error.message });
  }
});

// Cập nhật trạng thái phòng (Trống, Đang dọn dẹp, Bảo trì...)
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ message: 'Trạng thái không được để trống.' });
  }

  try {
    await db.query('UPDATE rooms SET status = @status WHERE id = @id', { status, id });
    res.json({ message: 'Cập nhật trạng thái phòng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái phòng', error: error.message });
  }
});

// Thêm mới loại phòng
router.post('/types', async (req, res) => {
  const { name, price_per_night, capacity, description } = req.body;
  if (!name || price_per_night === undefined || !capacity) {
    return res.status(400).json({ message: 'Thiếu thông tin loại phòng bắt buộc.' });
  }

  try {
    await db.query(
      `INSERT INTO room_types (name, price_per_night, capacity, description) 
       VALUES (@name, @price_per_night, @capacity, @description)`,
      { name, price_per_night, capacity, description: description || '' }
    );
    res.status(201).json({ message: 'Thêm loại phòng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm loại phòng mới', error: error.message });
  }
});

// Cập nhật loại phòng
router.put('/types/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price_per_night, capacity, description } = req.body;

  try {
    await db.query(
      `UPDATE room_types 
       SET name = @name, price_per_night = @price_per_night, capacity = @capacity, description = @description
       WHERE id = @id`,
      { id, name, price_per_night, capacity, description }
    );
    res.json({ message: 'Cập nhật loại phòng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật loại phòng', error: error.message });
  }
});

// Xóa một phòng
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Kiểm tra xem phòng có booking nào đang active không
    const checkBooking = await db.query(
      "SELECT id FROM bookings WHERE room_id = @id AND status IN ('booked', 'checked_in')",
      { id }
    );
    if (checkBooking.recordset.length > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa phòng này vì đang có đặt phòng chưa hoàn thành.' 
      });
    }

    await db.query('DELETE FROM rooms WHERE id = @id', { id });
    res.json({ message: 'Xóa phòng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa phòng', error: error.message });
  }
});

module.exports = router;
