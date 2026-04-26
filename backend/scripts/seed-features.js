const pool = require("../db");
const bcrypt = require("bcryptjs");

async function seed() {
  try {
    console.log("Seeding new feature tables...");

    // 1. Seed more vendors
    await pool.query(`
      INSERT INTO vendors (name, category, contact_person, email, performance_score, status) VALUES
      ('Silicon Tech Ltd', 'Solar Cells', 'John Doe', 'john@silicon.com', 92, 'active'),
      ('Glasco Manufacturing', 'Tempered Glass', 'Jane Smith', 'jane@glasco.com', 88, 'active'),
      ('EVA Global', 'Encapsulants', 'Bob Wilson', 'bob@evaglobal.com', 76, 'active'),
      ('SunFrame Co', 'Aluminum Frames', 'Priya Raj', 'priya@sunframe.com', 60, 'active'),  
      ('JBox Solutions', 'Junction Boxes', 'Kumar Singh', 'kumar@jbox.com', 95, 'active'),
      ('Backsheet Pro', 'Backsheets', 'Mike Chen', 'mike@backsheetpro.com', 55, 'delayed')
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ Vendors seeded");

    // 2. Seed purchase orders
    const vendors = await pool.query("SELECT id FROM vendors LIMIT 6");
    const vids = vendors.rows.map(r => r.id);
    
    const poData = [
      [vids[0]||1, 'PO-2024-001', 'M10 Silicon Cells (500W)', 50000, 'pcs', 'received', '2024-01-15', '2024-01-20'],
      [vids[1]||2, 'PO-2024-002', '72-cell Tempered Glass Panels', 2000, 'pcs', 'received', '2024-02-01', '2024-02-10'],
      [vids[2]||3, 'PO-2024-003', 'EVA Film Roll 500m', 100, 'rolls', 'shipped', '2024-03-10', null],
      [vids[3]||4, 'PO-2024-004', 'Anodized Aluminum Frame 72-cell', 5000, 'pcs', 'delayed', '2024-03-01', null],
      [vids[4]||5, 'PO-2024-005', 'Waterproof Junction Box IP67', 3000, 'pcs', 'ordered', '2024-04-15', null],
      [vids[5]||6, 'PO-2024-006', 'TPT Backsheet 400m', 80, 'rolls', 'received', '2024-01-20', '2024-01-28'],
    ];

    for (const [vid, po, desc, qty, unit, status, exp, rec] of poData) {
      await pool.query(`
        INSERT INTO purchase_orders (vendor_id, po_number, item_description, quantity, unit, status, expected_date, received_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (po_number) DO NOTHING
      `, [vid, po, desc, qty, unit, status, exp, rec]);
    }
    console.log("✅ Purchase orders seeded");

    // 3. Seed inventory
    await pool.query(`
      INSERT INTO inventory (item_name, category, current_stock, min_stock_level, unit, location) VALUES
      ('M10 Silicon Cells', 'Solar Cells', 48500, 10000, 'pcs', 'Warehouse A'),
      ('Anodized Aluminum Frame', 'Frames', 420, 500, 'pcs', 'Warehouse B'),
      ('EVA Film', 'Encapsulants', 85, 200, 'rolls', 'Warehouse A'),
      ('Tempered Glass 72-cell', 'Glass', 1850, 500, 'pcs', 'Warehouse C'),
      ('Junction Box IP67', 'Electrical', 3100, 200, 'pcs', 'Warehouse B'),
      ('TPT Backsheet', 'Backsheets', 60, 150, 'rolls', 'Warehouse A'),
      ('Busbars 5BB', 'Electrical', 120000, 20000, 'pcs', 'Warehouse A'),
      ('Bypass Diodes', 'Electrical', 8000, 2000, 'pcs', 'Warehouse B')
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ Inventory seeded");

    // 4. Seed installations
    const installData = [
      ['P1', 'Mysore Solar Farm', 'Mysore, Karnataka', 'completed', '2024-01-10', '2024-01-25', 500.0],
      ['P2', 'Bangalore Rooftop - IT Park', 'Bangalore, Karnataka', 'completed', '2024-02-05', '2024-02-18', 120.5],
      ['P3', 'Hubli Industrial Plant', 'Hubli, Karnataka', 'in_progress', '2024-03-15', null, 750.0],
      ['P5', 'Mangalore Coastal Site', 'Mangalore, Karnataka', 'in_progress', '2024-03-28', null, 200.0],
      ['P6', 'Hassan Agri Solar', 'Hassan, Karnataka', 'planned', '2024-05-01', null, 350.0],
      ['P4', 'Tumkur Grid-Scale', 'Tumkur, Karnataka', 'issue', '2024-04-01', null, 1000.0],
    ];

    for (const [pid, cust, site, status, inst_date, comm_date, cap] of installData) {
      await pool.query(`
        INSERT INTO installations (project_id, customer_name, site_location, status, installation_date, commissioning_date, pv_capacity_kw)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
      `, [pid, cust, site, status, inst_date, comm_date, cap]);
    }
    console.log("✅ Installations seeded");

    // 5. Seed maintenance tickets
    const installs = await pool.query("SELECT id FROM installations LIMIT 6");
    const instIds = installs.rows.map(r => r.id);
    const users = await pool.query("SELECT id FROM users LIMIT 3");
    const uids = users.rows.map(r => r.id);

    const ticketData = [
      [instIds[0]||1, 'AMC', 'Annual maintenance check - string inverter inspection', 'resolved', uids[0]||1, 'medium', '2024-02-10'],
      [instIds[1]||2, 'Warranty', 'Panel microcrack reported on string 4', 'open', uids[1]||2, 'high', null],
      [instIds[2]||3, 'Breakdown', 'Inverter failure - complete shutdown of section B', 'assigned', uids[0]||1, 'critical', null],
      [instIds[3]||4, 'AMC', 'DC cable inspection and tightening', 'open', uids[2]||3, 'low', null],
      [instIds[0]||1, 'Warranty', 'PID effect on 2 strings, output drop 15%', 'resolved', uids[1]||2, 'high', '2024-03-05'],
      [instIds[5]||1, 'Breakdown', 'Tracker motor failure affecting 40 panels', 'open', uids[0]||1, 'critical', null],
    ];

    for (const [iid, ttype, desc, status, uid, priority, resolved] of ticketData) {
      await pool.query(`
        INSERT INTO maintenance_tickets (installation_id, ticket_type, description, status, assigned_to, priority, resolved_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
      `, [iid, ttype, desc, status, uid, priority, resolved]);
    }
    console.log("✅ Maintenance tickets seeded");

    // 6. Update some expanded_factissues with QA fields (defect_type, machine_id, etc.)
    await pool.query(`
      UPDATE expanded_factissues
      SET 
        defect_type = CASE 
          WHEN issuetype = 'Bug' THEN (ARRAY['Microcrack','PID Effect','Hotspot','Delamination','Discoloration','Bypass Diode Failure'])[floor(random()*6)::int + 1]
          ELSE NULL
        END,
        machine_id = (ARRAY['STRINGER-01','STRINGER-02','LAMINATOR-01','TESTER-EL1','TESTER-EL2','FLASHER-01'])[floor(random()*6)::int + 1],
        classification = CASE
          WHEN severity = 'critical' THEN 'Safety Risk'
          WHEN severity = 'high' THEN 'Performance Impact'
          WHEN severity = 'medium' THEN 'Cosmetic'
          ELSE 'Minor'
        END
      WHERE defect_type IS NULL
    `);
    console.log("✅ Issue QA fields seeded");

    console.log("\\n🎉 All new feature data seeded successfully!");
  } catch (err) {
    console.error("Seeding error:", err.message);
  } finally {
    pool.end();
  }
}

seed();
