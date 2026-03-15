// const pool = require("../db");

// exports.getDashboardStats = async (req, res) => {
//   const projects = await pool.query("SELECT COUNT(*) FROM projects");
//   const issues = await pool.query("SELECT COUNT(*) FROM issues");
//   const bugs = await pool.query(
//     "SELECT COUNT(*) FROM issues WHERE issue_type='Bug'"
//   );

//   res.json({
//     totalProjects: projects.rows[0].count,
//     totalIssues: issues.rows[0].count,
//     totalBugs: bugs.rows[0].count,
//   });
// };
const pool = require("../db");

exports.getDashboardStats = async (req, res) => {
  try {
    const projects = await pool.query("SELECT COUNT(*) FROM expanded_factprojects");
    const issues   = await pool.query("SELECT COUNT(*) FROM expanded_factissues");
    const bugs     = await pool.query(
      "SELECT COUNT(*) FROM expanded_factissues WHERE issuetype = 'Bug'"
    );

    res.json({
      totalProjects: parseInt(projects.rows[0].count || 0),
      totalIssues:   parseInt(issues.rows[0].count || 0),
      totalBugs:     parseInt(bugs.rows[0].count || 0),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

exports.getDashboardCharts = async (req, res) => {
  try {
    // 1. Project Status Distribution
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM expanded_factprojects 
      GROUP BY status 
      ORDER BY count DESC
    `;
    const statusResult = await pool.query(statusQuery);

    // 2. Resolution Time (avg hours per sprint) - assuming you already fixed the EXTRACT issue with AGE()
    const resolutionQuery = `
      SELECT 
        sprint, 
        AVG(EXTRACT(EPOCH FROM AGE(closeddate, createddate)) / 3600) AS avg_hours
      FROM expanded_factissues 
      WHERE closeddate IS NOT NULL 
      GROUP BY sprint 
      ORDER BY sprint
    `;
    const resolutionResult = await pool.query(resolutionQuery);

    // 3. Budget Trend
    const budgetQuery = `
      SELECT 
        dd.monthname || ' ' || dd.year AS month,
        AVG(p.budgetallocated) AS avg_allocated,
        AVG(p.budgetused) AS avg_used
      FROM expanded_factprojects p
      JOIN dimdate dd ON DATE_TRUNC('month', p.startdate::date) = dd.date::date
      GROUP BY dd.year, dd.monthnumber, dd.monthname
      ORDER BY dd.year, dd.monthnumber
    `;
    const budgetResult = await pool.query(budgetQuery);

    // 4. Bugs per Sprint
    const bugsPerSprintQuery = `
      SELECT sprint, COUNT(*) as count 
      FROM expanded_factissues WHERE issuetype = 'Bug' 
      GROUP BY sprint ORDER BY count DESC
    `;
    const bugsPerSprintResult = await pool.query(bugsPerSprintQuery);

    // 5. Project Duration
    const projectDurationQuery = `
      SELECT projectname, (enddate - startdate) as duration_days 
      FROM expanded_factprojects ORDER BY duration_days
    `;
    const projectDurationResult = await pool.query(projectDurationQuery);

    // 6. Issues per Project
    const issuesPerProjectQuery = `
      SELECT projectid, COUNT(*) as count FROM expanded_factissues GROUP BY projectid
    `;
    const issuesPerProjectResult = await pool.query(issuesPerProjectQuery);

    // 7. Issues per Sprint
    const sprintQuery = `
      SELECT sprint, COUNT(*) as count 
      FROM expanded_factissues 
      GROUP BY sprint 
      ORDER BY count DESC
    `;
    const sprintResult = await pool.query(sprintQuery);

    // 8. Issues by Type
    const typeQuery = `
      SELECT issuetype as issuetypename, COUNT(*) as count 
      FROM expanded_factissues 
      GROUP BY issuetype 
      ORDER BY count DESC
    `;
    const typeResult = await pool.query(typeQuery);

    // 9. Team Load
    const teamQuery = `
      SELECT assigneeteam, COUNT(*) as count 
      FROM expanded_factissues 
      GROUP BY assigneeteam 
      ORDER BY count DESC
    `;
    const teamResult = await pool.query(teamQuery);

    // SINGLE response – merge everything
    res.json({
      statusDistribution: statusResult.rows,
      resolutionTime: resolutionResult.rows,
      budgetTrend: budgetResult.rows,
      bugsPerSprint: bugsPerSprintResult.rows,
      projectDuration: projectDurationResult.rows,
      issuesPerProject: issuesPerProjectResult.rows,
      issuesPerSprint: sprintResult.rows,
      issuesByType: typeResult.rows,
      teamLoad: teamResult.rows,
    });

  } catch (err) {
    console.error("Chart data error:", err.message);
    console.error("Full error:", err);
    if (err.stack) console.error("Stack:", err.stack);
    if (err.sql) console.error("Failing query:", err.sql);
    
    // Send ONE error response
    res.status(500).json({ 
      message: "Failed to fetch chart data", 
      error: err.message 
    });
  }
};