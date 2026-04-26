const pool = require("../db");

async function seed() {
  try {
    console.log("Seeding project members...");

    // First ensure we have enough users
    const bcrypt = require("bcryptjs");
    const hash = bcrypt.hashSync("password123", 10);

    const users = [
      ['Anil Kumar', 'anil.kumar@emmvee.com', 'developer'],
      ['Sneha Reddy', 'sneha.reddy@emmvee.com', 'developer'],
      ['Vikram Singh', 'vikram.singh@emmvee.com', 'tester'],
      ['Meera Nair', 'meera.nair@emmvee.com', 'developer'],
      ['Rajesh Gupta', 'rajesh.gupta@emmvee.com', 'tester'],
      ['Divya Joshi', 'divya.joshi@emmvee.com', 'developer'],
      ['Karthik Iyer', 'karthik.iyer@emmvee.com', 'developer'],
      ['Lakshmi Menon', 'lakshmi.menon@emmvee.com', 'tester'],
    ];

    const userIds = [];
    for (const [name, email, role] of users) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        userIds.push(existing.rows[0].id);
      } else {
        const result = await pool.query(
          'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [name, email, hash, role, 'approved']
        );
        userIds.push(result.rows[0].id);
      }
    }

    console.log(`Ensured ${userIds.length} users exist.`);

    // Get all project IDs
    const projects = await pool.query('SELECT projectid FROM expanded_factprojects ORDER BY projectid');
    const projectIds = projects.rows.map(r => r.projectid);

    console.log(`Found ${projectIds.length} projects.`);

    // Assign 2-5 members to each project
    const roles = ['lead', 'developer', 'developer', 'tester', 'developer'];
    let assignCount = 0;

    for (const pid of projectIds) {
      // Determine how many members (2-5)
      const memberCount = 2 + Math.floor(Math.random() * 4);
      // Pick random users
      const shuffled = [...userIds].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, memberCount);

      for (let i = 0; i < selected.length; i++) {
        try {
          await pool.query(
            `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
             VALUES ($1, $2, $3, 1)
             ON CONFLICT (project_id, user_id) DO NOTHING`,
            [pid, selected[i], roles[i % roles.length]]
          );
          assignCount++;
        } catch (e) {
          // skip conflicts
        }
      }
    }

    console.log(`Created ${assignCount} project assignments.`);
    console.log("Done seeding project members!");
  } catch (err) {
    console.error("Error seeding members:", err);
  } finally {
    pool.end();
  }
}

seed();
