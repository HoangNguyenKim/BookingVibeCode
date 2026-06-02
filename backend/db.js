const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true, // Cần thiết khi chạy local để tránh lỗi SSL
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('--- Đã kết nối thành công tới SQL Server ---');
    return pool;
  })
  .catch(err => {
    console.error('--- LỖI KẾT NỐI CƠ SỞ DỮ LIỆU SQL SERVER: ---');
    console.error(err.message);
    console.log('Vui lòng kiểm tra lại cấu hình trong file .env và trạng thái SQL Server.');
  });

/**
 * Helper để thực hiện truy vấn SQL với tham số an toàn (Tránh SQL Injection)
 * @param {string} queryText Câu lệnh SQL, ví dụ: SELECT * FROM rooms WHERE floor = @floor
 * @param {object} params Đối tượng chứa tham số, ví dụ: { floor: 1 }
 */
async function query(queryText, params = {}) {
  try {
    const pool = await poolPromise;
    if (!pool) {
      throw new Error('Chưa thiết lập kết nối CSDL SQL Server.');
    }
    const request = pool.request();
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    const result = await request.query(queryText);
    return result;
  } catch (error) {
    console.error('Lỗi truy vấn SQL:', error.message);
    console.error('SQL:', queryText);
    throw error;
  }
}

module.exports = {
  sql,
  poolPromise,
  query
};
