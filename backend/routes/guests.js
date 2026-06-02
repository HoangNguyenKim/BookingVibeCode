const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy danh sách khách hàng, có tìm kiếm
router.get('/', async (req, res) => {
  const { search } = req.query;
  let queryStr = `
    SELECT id, full_name, phone, email, id_card_number,
           (SELECT COUNT(*) FROM bookings WHERE guest_id = guests.id) as booking_count
    FROM guests
    WHERE 1=1
  `;
  const params = {};

  if (search) {
    queryStr += ` AND (full_name LIKE @search OR phone LIKE @search OR id_card_number LIKE @search)`;
    params.search = `%${search}%`;
  }

  queryStr += ` ORDER BY full_name ASC`;

  try {
    const result = await db.query(queryStr, params);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách khách hàng', error: error.message });
  }
});

// Lấy chi tiết khách hàng và lịch sử đặt phòng của họ
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const guestRes = await db.query('SELECT * FROM guests WHERE id = @id', { id });
    if (guestRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng này.' });
    }

    const historyRes = await db.query(`
      SELECT b.id, b.check_in_date, b.check_out_date, b.total_price, b.status,
             r.room_number, rt.name as room_type_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.guest_id = @id
      ORDER BY b.check_in_date DESC
    `, { id });

    const guest = guestRes.recordset[0];
    guest.history = historyRes.recordset;

    res.json(guest);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin lịch sử khách hàng', error: error.message });
  }
});

// Thêm mới khách hàng
router.post('/', async (req, res) => {
  const { full_name, phone, email, id_card_number } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ message: 'Họ tên và Số điện thoại là bắt buộc.' });
  }

  try {
    const checkPhone = await db.query('SELECT id FROM guests WHERE phone = @phone', { phone });
    if (checkPhone.recordset.length > 0) {
      return res.status(400).json({ message: 'Số điện thoại này đã tồn tại trong hệ thống.' });
    }

    await db.query(`
      INSERT INTO guests (full_name, phone, email, id_card_number)
      VALUES (@full_name, @phone, @email, @id_card_number)
    `, { full_name, phone, email: email || null, id_card_number: id_card_number || null });

    res.status(201).json({ message: 'Thêm khách hàng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thêm khách hàng mới', error: error.message });
  }
});

// Cập nhật thông tin khách hàng
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, email, id_card_number } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ message: 'Họ tên và Số điện thoại là bắt buộc.' });
  }

  try {
    // Kiểm tra trùng SĐT với người khác
    const checkPhone = await db.query('SELECT id FROM guests WHERE phone = @phone AND id != @id', { phone, id });
    if (checkPhone.recordset.length > 0) {
      return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng bởi khách hàng khác.' });
    }

    await db.query(`
      UPDATE guests 
      SET full_name = @full_name, phone = @phone, email = @email, id_card_number = @id_card_number
      WHERE id = @id
    `, { id, full_name, phone, email, id_card_number });

    res.json({ message: 'Cập nhật thông tin khách hàng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật khách hàng', error: error.message });
  }
});

module.exports = router;
