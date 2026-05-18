const mysql = require('mysql2/promise');

const useSsl = String(process.env.DB_SSL).toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...(useSsl && { ssl: { rejectUnauthorized: true } }),
});

module.exports = { pool };
