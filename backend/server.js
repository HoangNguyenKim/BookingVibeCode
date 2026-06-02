const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log các yêu cầu đến API (Development helper)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import các Routes
const dashboardRouter = require('./routes/dashboard');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const guestsRouter = require('./routes/guests');
const paymentRouter = require('./routes/payment');

// Đăng ký Routes API
app.use('/api/dashboard', dashboardRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/payment', paymentRouter);

// Thử nghiệm kết nối API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hệ thống Backend API hoạt động bình thường.' });
});

// Đăng ký cổng chạy server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Server đang hoạt động tại cổng: ${PORT}`);
  console.log(` Endpoint kiểm tra: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
