const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy link QR VietQR và thông tin thanh toán cho đặt phòng
router.get('/qr/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    // 1. Lấy thông tin booking và tính tổng tiền bao gồm cả dịch vụ
    const bookingRes = await db.query(`
      SELECT b.id, b.total_price as room_price, b.status,
             COALESCE((SELECT SUM(price * quantity) FROM booking_services WHERE booking_id = b.id), 0) as services_price
      FROM bookings b
      WHERE b.id = @bookingId
    `, { bookingId });

    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng này.' });
    }

    const booking = bookingRes.recordset[0];
    const totalAmount = parseFloat(booking.room_price) + parseFloat(booking.services_price);

    // 2. Lấy thông tin tài khoản ngân hàng cấu hình trong .env
    const bankId = process.env.SEPAY_BANK_ID || 'MBBank';
    const accountNo = process.env.SEPAY_ACCOUNT_NO || '0987654321';
    const accountName = process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN VAN A';
    const template = process.env.SEPAY_TEMPLATE || 'qr_only';
    
    // Nội dung chuyển khoản định danh duy nhất: BV + ID đặt phòng (ví dụ: BV102)
    const description = `BV${bookingId}`;

    // Tạo URL VietQR ảnh động
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.jpg?amount=${totalAmount}&addInfo=${description}&accountName=${encodeURIComponent(accountName)}`;

    res.json({
      bookingId: parseInt(bookingId, 10),
      totalAmount,
      qrUrl,
      bankId,
      accountNo,
      accountName,
      description
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo thông tin thanh toán QR', error: error.message });
  }
});

// Hàm xử lý nghiệp vụ thanh toán (dùng chung cho cả webhook thật và giả lập simulate)
const processPayment = async (bookingId, amountIn) => {
  // Lấy chi tiết đặt phòng hiện tại
  const bookingRes = await db.query(`
    SELECT b.id, b.room_id, b.total_price as room_price, b.status,
           COALESCE((SELECT SUM(price * quantity) FROM booking_services WHERE booking_id = b.id), 0) as services_price
    FROM bookings b
    WHERE b.id = @bookingId
  `, { bookingId });

  if (bookingRes.recordset.length === 0) {
    throw new Error('Không tìm thấy thông tin đặt phòng ứng với mã nội dung.');
  }

  const booking = bookingRes.recordset[0];
  const totalPrice = parseFloat(booking.room_price) + parseFloat(booking.services_price);

  // So sánh số tiền thanh toán
  if (parseFloat(amountIn) < totalPrice) {
    throw new Error(`Số tiền thanh toán (${amountIn} VND) ít hơn tổng hóa đơn cần trả (${totalPrice} VND).`);
  }

  const roomId = booking.room_id;

  // Thực hiện đổi trạng thái dựa theo trạng thái hiện tại
  if (booking.status === 'checked_in') {
    // Khách trả phòng -> Check-out tự động
    await db.query("UPDATE bookings SET status = 'checked_out' WHERE id = @bookingId", { bookingId });
    await db.query("UPDATE rooms SET status = 'cleaning' WHERE id = @roomId", { roomId });
    return {
      success: true,
      action: 'checkout',
      message: 'Khách thanh toán chuyển khoản thành công. Đã tự động Trả phòng & chuyển phòng sang trạng thái Dọn dẹp!'
    };
  } else if (booking.status === 'booked') {
    // Khách đến nhận phòng -> Check-in tự động
    await db.query("UPDATE bookings SET status = 'checked_in' WHERE id = @bookingId", { bookingId });
    await db.query("UPDATE rooms SET status = 'occupied' WHERE id = @roomId", { roomId });
    return {
      success: true,
      action: 'checkin',
      message: 'Khách thanh toán cọc/nhận phòng thành công. Đã tự động Nhận phòng!'
    };
  } else if (booking.status === 'checked_out') {
    return {
      success: true,
      action: 'none',
      message: 'Đặt phòng này đã được check-out thanh toán trước đó.'
    };
  } else {
    return {
      success: true,
      action: 'none',
      message: `Đặt phòng đang ở trạng thái '${booking.status}', không cần thay đổi.`
    };
  }
};

// Webhook chính thức từ SePay (POST /webhook)
router.post('/webhook', async (req, res) => {
  // SePay thực tế gửi trường "content" và "transferAmount"
  // Hỗ trợ fallback trường "transactionContent" và "amountIn" từ giao diện giả lập
  const content = req.body.content || req.body.transactionContent;
  const amount = req.body.transferAmount !== undefined ? req.body.transferAmount : req.body.amountIn;

  if (!content || amount === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin nội dung chuyển khoản (content) hoặc số tiền (transferAmount) trong request body.' });
  }

  // Phân tích cú pháp nội dung chuyển khoản để lấy Booking ID
  const match = content.match(/BV\s*(\d+)/i);
  if (!match) {
    return res.status(200).json({ message: 'Nội dung chuyển khoản không khớp mẫu cú pháp (BV+ID).' });
  }

  const bookingId = parseInt(match[1], 10);

  try {
    const result = await processPayment(bookingId, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// API giả lập giao dịch SePay (POST /simulate) dành cho môi trường Local Dev
router.post('/simulate', async (req, res) => {
  const { bookingId, amountIn } = req.body;
  
  if (!bookingId || !amountIn) {
    return res.status(400).json({ message: 'Vui lòng cung cấp bookingId và amountIn giả lập.' });
  }

  try {
    const result = await processPayment(bookingId, amountIn);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
