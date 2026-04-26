const pool = require("../db");
const bcrypt = require("bcryptjs");

async function createTestUser() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);

    const hashed = await bcrypt.hash("123456", 10);

    await pool.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      ["admin@example.com", hashed, "SuperAdmin"]
    );

    console.log("Test user created!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

createTestUser();