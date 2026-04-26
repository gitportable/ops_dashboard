const pool = require("../db");

async function setup() {
  try {
    console.log("Setting up production database...");

    // Create work_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        wo_id VARCHAR(50) UNIQUE NOT NULL,
        batch_lot VARCHAR(50),
        stage VARCHAR(50),
        quantity INTEGER,
        status VARCHAR(50),
        start_date DATE,
        target_date DATE,
        defects INTEGER DEFAULT 0,
        machine VARCHAR(50)
      );
    `);

    console.log("Table 'work_orders' created or exists.");

    // Seed data
    const workOrders = [
      ['WO-20260401-001', 'B240301-45', 'Module', 1200, 'In Progress', '2026-04-01', '2026-04-05', 3, 'Line A-3'],
      ['WO-20260401-002', 'B240301-46', 'Testing', 850, 'Pending QA', '2026-04-02', '2026-04-06', 0, 'Tester-02'],
      ['WO-20260328-015', 'B240328-12', 'Cell', 2000, 'Completed', '2026-03-28', '2026-04-02', 12, 'Cell-Line B'],
      ['WO-20260410-001', 'B240410-01', 'Stringing', 1500, 'In Progress', '2026-04-10', '2026-04-14', 2, 'Stringer-01'],
      ['WO-20260410-002', 'B240410-02', 'Lamination', 1200, 'In Progress', '2026-04-10', '2026-04-14', 1, 'Laminator-A'],
      ['WO-20260411-005', 'B240411-05', 'Framing', 500, 'Completed', '2026-04-11', '2026-04-13', 0, 'Framer-01']
    ];

    for (const [wo_id, batch_lot, stage, quantity, status, start, target, defects, machine] of workOrders) {
      await pool.query(`
        INSERT INTO work_orders (wo_id, batch_lot, stage, quantity, status, start_date, target_date, defects, machine)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (wo_id) DO NOTHING
      `, [wo_id, batch_lot, stage, quantity, status, start, target, defects, machine]);
    }

    console.log("Seeded work orders successfully.");
  } catch (err) {
    console.error("Error setting up production:", err);
  } finally {
    pool.end();
  }
}

setup();
