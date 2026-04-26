const pool = require("../db");

async function fixDB() {
  try {
    console.log("Running DB fixes...");
    // expanded_factissues table
    await pool.query(`
      ALTER TABLE expanded_factissues 
      ADD COLUMN IF NOT EXISTS workflow_history JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS assignee VARCHAR(255);
    `);

    // Assign realistic data to unassigned issues
    console.log("Seeding data for unassigned issues...");
    const users = ['Alice M.', 'Bob S.', 'Charlie K.', 'Dana L.', 'Eve R.'];
    const teams = ['Frontend', 'Backend', 'QA', 'Manufacturing', 'DevOps'];
    
    await pool.query(`
      UPDATE expanded_factissues 
      SET 
        assignee = CASE 
          WHEN assignee IS NULL THEN $1[(floor(random() * 5) + 1)]
          ELSE assignee 
        END,
        assigneeteam = CASE 
          WHEN assigneeteam IS NULL OR assigneeteam = '' THEN $2[(floor(random() * 5) + 1)]
          ELSE assigneeteam
        END,
        priority = CASE
          WHEN priority IS NULL THEN 'Medium'
          ELSE priority
        END,
        sprint = CASE
          WHEN sprint IS NULL THEN 'Sprint 24'
          ELSE sprint
        END
      WHERE assignee IS NULL OR assigneeteam IS NULL OR assigneeteam = '' OR priority IS NULL OR sprint IS NULL
    `, [users, teams]);
    
    console.log("DB Fixed successfully!");
  } catch (err) {
    console.error("Error fixing DB:", err);
  } finally {
    pool.end();
  }
}

fixDB();
