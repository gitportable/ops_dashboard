const pool = require("../db");

async function fixDB() {
  try {
    console.log("Running DB fixes...");
    // users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        action VARCHAR(255),
        resource VARCHAR(255),
        level VARCHAR(50) DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("DB Fixed successfully!");
  } catch (err) {
    console.error("Error fixing DB:", err);
  } finally {
    pool.end();
  }
}

fixDB();
