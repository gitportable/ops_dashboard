const pool = require("../db");

async function check() {
  const [issues, projects] = await Promise.all([
    pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factissues'"),
    pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factprojects'")
  ]);
  
  require('fs').writeFileSync('schema.json', JSON.stringify({
    issues: issues.rows.map(r=>r.column_name),
    projects: projects.rows.map(r=>r.column_name)
  }));
  pool.end();
}
check();
