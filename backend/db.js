const { Pool } = require("pg");

const pool = new Pool({
  user: 'openpg',
  host: '127.0.0.1',   // 🔥 IMPORTANT: use IP instead of localhost
  database: 'etpl_ops',
  password: 'openpgpwd',
  port: 5432,
  ssl: false
});

pool.connect()
  .then(() => console.log("Connected to DB as openpg"))
  .catch(err => console.error("DB connection error:", err));

module.exports = pool;