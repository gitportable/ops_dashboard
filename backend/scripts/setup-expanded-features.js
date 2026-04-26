const pool = require("../db");

async function setup() {
  try {
    console.log("Setting up expanded features tables...");

    // 1. Vendors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100), -- e.g., 'Solar Cells', 'Glass', 'EVA Sheet'
        contact_person VARCHAR(255),
        email VARCHAR(255),
        performance_score INT DEFAULT 100,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Purchase Orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) UNIQUE NOT NULL,
        vendor_id INT REFERENCES vendors(id),
        item_description TEXT,
        quantity INT,
        unit VARCHAR(50),
        status VARCHAR(50) DEFAULT 'ordered', -- 'ordered', 'shipped', 'received', 'delayed'
        expected_date DATE,
        received_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        current_stock INT DEFAULT 0,
        min_stock_level INT DEFAULT 10,
        unit VARCHAR(50),
        location VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Field Installations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS installations (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(50), -- Link back to projects
        customer_name VARCHAR(255),
        site_location TEXT,
        status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'issue'
        installation_date DATE,
        commissioning_date DATE,
        pv_capacity_kw DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Maintenance Tickets (AMC / Warranty)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id SERIAL PRIMARY KEY,
        installation_id INT REFERENCES installations(id),
        ticket_type VARCHAR(50), -- 'AMC', 'Warranty', 'Breakdown'
        description TEXT,
        status VARCHAR(50) DEFAULT 'open', -- 'open', 'assigned', 'resolved'
        assigned_to INT REFERENCES users(id),
        priority VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    // 6. Ensure columns in expanded_factissues for QA
    // We already saw some exist, but let's be sure
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factissues'");
    const existing = cols.rows.map(r => r.column_name);

    if (!existing.includes('machine_id')) {
        await pool.query("ALTER TABLE expanded_factissues ADD COLUMN machine_id VARCHAR(50)");
    }
    if (!existing.includes('classification')) {
        await pool.query("ALTER TABLE expanded_factissues ADD COLUMN classification VARCHAR(100)"); 
    }

    console.log("Seeding initial data...");

    // Seed Vendors
    await pool.query(`
      INSERT INTO vendors (name, category, contact_person, email)
      VALUES 
        ('Silicon Tech Ltd', 'Solar Cells', 'John Doe', 'john@silicon.com'),
        ('Glasco Manufacturing', 'Tempered Glass', 'Jane Smith', 'jane@glasco.com'),
        ('EVA Global', 'Encapsulants', 'Bob Wilson', 'bob@evaglobal.com')
      ON CONFLICT DO NOTHING
    `);

    // Seed Inventory
    await pool.query(`
      INSERT INTO inventory (item_name, category, current_stock, min_stock_level, unit)
      VALUES 
        ('M10 Cells', 'Cells', 50000, 10000, 'pcs'),
        ('Aluminum Frames', 'Frames', 200, 500, 'pcs'), -- Low stock
        ('Junction Boxes', 'Electrical', 1200, 200, 'pcs')
      ON CONFLICT DO NOTHING
    `);

    console.log("Done!");

  } catch (err) {
    console.error("Setup error:", err);
  } finally {
    pool.end();
  }
}

setup();
