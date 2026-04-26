// controllers/dashboardController.js
const pool = require("../db");

// Safe query helper
async function sq(sql, params = [], label = "") {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (err) {
    console.error(`[dashboard:${label}] ERROR: ${err.message}`);
    return [];
  }
}

// By Status (Open vs Closed)
exports.getByStatus = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT 
      CASE WHEN closeddate IS NULL THEN 'Open' ELSE 'Closed' END as label,
      COUNT(*) as count 
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY label 
    ORDER BY count DESC`, projectId ? [projectId] : []);
  res.json(rows);
};

// Get basic stats
exports.getDashboardStats = async (req, res) => {
  try {
    const projectId = req.query.projectId;

    const [totalIssues, openIssues, resolvedIssues, criticalDefects] = await Promise.all([
      sq(`SELECT COUNT(*) as count FROM expanded_factissues ${projectId ? 'WHERE projectid = $1' : ''}`, projectId ? [projectId] : []),
      sq(`SELECT COUNT(*) as count FROM expanded_factissues WHERE closeddate IS NULL ${projectId ? 'AND projectid = $1' : ''}`, projectId ? [projectId] : []),
      sq(`SELECT COUNT(*) as count FROM expanded_factissues WHERE closeddate IS NOT NULL ${projectId ? 'AND projectid = $1' : ''}`, projectId ? [projectId] : []),
      sq(`SELECT COUNT(*) as count FROM expanded_factissues WHERE severity = 'Critical' ${projectId ? 'AND projectid = $1' : ''}`, projectId ? [projectId] : []),
    ]);

    res.json({
      totalIssues: parseInt(totalIssues[0]?.count) || 0,
      openIssues: parseInt(openIssues[0]?.count) || 0,
      resolvedIssues: parseInt(resolvedIssues[0]?.count) || 0,
      criticalDefects: parseInt(criticalDefects[0]?.count) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// By Type (issuetype)
exports.getByType = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT issuetype as label, COUNT(*) as count 
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY issuetype 
    ORDER BY count DESC`, projectId ? [projectId] : []);
  res.json(rows);
};

// By Sprint
exports.getBySprint = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT sprint as label, COUNT(*) as count 
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY sprint 
    ORDER BY count DESC`, projectId ? [projectId] : []);
  res.json(rows);
};

// By Severity
exports.getBySeverity = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT COALESCE(severity, 'Unknown') as label, COUNT(*) as count 
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY severity
    ORDER BY count DESC`, projectId ? [projectId] : []);
  res.json(rows);
};
exports.getSolarStats = async (req, res) => {
  const projectId = req.query.projectId;
  const pFilter = projectId ? 'AND projectid = $1' : '';
  const pParam = projectId ? [projectId] : [];

  try {
    const [defects, critical, modules, stages, trend, resolution, cycle, vendor] = await Promise.all([
      // Defects = Issues where defect_type is not null or issuetype is 'Bug'
      sq(`SELECT COUNT(*) as count FROM expanded_factissues WHERE (defect_type IS NOT NULL OR issuetype = 'Bug') ${pFilter}`, pParam),
      sq(`SELECT COUNT(*) as count FROM expanded_factissues WHERE severity = 'Critical' ${pFilter}`, pParam),
      // Modules tracked = total quantity from work_orders
      sq(`SELECT SUM(quantity) as count FROM work_orders`),
      // Real Data for "Production by Stage" from work_orders
      sq(`SELECT stage, SUM(quantity) as count FROM work_orders GROUP BY stage`),
      // Real Data for "Defect Rate Trend"
      sq(`SELECT 
            TO_CHAR(createddate, 'YYYY-MM-DD') as day,
            ROUND(((COUNT(CASE WHEN (defect_type IS NOT NULL OR issuetype = 'Bug') THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100)::numeric, 2) as rate
          FROM expanded_factissues
          ${projectId ? 'WHERE projectid = $1' : ''}
          GROUP BY day ORDER BY day DESC LIMIT 7`, pParam),
      // Avg Resolution Time (days)
      sq(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closeddate - createddate))/86400)::numeric, 1) as avg FROM expanded_factissues WHERE closeddate IS NOT NULL ${pFilter}`, pParam),
      // Site Commissioning Cycle Time
      sq(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (commissioning_date - installation_date))/86400)::numeric, 1) as avg FROM installations WHERE commissioning_date IS NOT NULL`),
      // Avg Vendor Score
      sq(`SELECT ROUND(AVG(performance_score)) as score FROM vendors`)
    ]);

    res.json({
      totalDefects: parseInt(defects[0]?.count) || 0,
      criticalDefects: parseInt(critical[0]?.count) || 0,
      modulesProduced: parseInt(modules[0]?.count) || 0,
      productionByStage: (stages || []).map(s => ({ stage: s.stage, count: parseInt(s.count) || 0 })),
      defectTrend: (trend || []).map(t => ({ day: t.day, rate: parseFloat(t.rate) || 0 })).reverse(),
      avgResolutionTime: parseFloat(resolution[0]?.avg) || 0,
      avgSiteCycleTime: parseFloat(cycle[0]?.avg) || 0,
      avgVendorScore: parseInt(vendor[0]?.score) || 0
    });
  } catch (err) {
    console.error("[getSolarStats] Error:", err);
    res.status(500).json({ message: err.message });
  }
};
// By Team
exports.getByTeam = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT assigneeteam as label, COUNT(*) as count 
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY assigneeteam 
    ORDER BY count DESC`, projectId ? [projectId] : []);
  res.json(rows);
};

// Trend (using createddate)
exports.getTrend = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT TO_CHAR(createddate, 'Mon YY') as date, 
           COUNT(*) as open,
           SUM(CASE WHEN closeddate IS NOT NULL THEN 1 ELSE 0 END) as closed
    FROM expanded_factissues 
    WHERE createddate IS NOT NULL ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY TO_CHAR(createddate, 'Mon YY')
    ORDER BY MIN(createddate)`, projectId ? [projectId] : []);
  res.json(rows);
};

// Redundant getAgeDistribution removed

// Burndown (simplified using sprint)
exports.getBurndown = async (req, res) => {
  const projectId = req.query.projectId;
  const rows = await sq(`
    SELECT sprint, 
           COUNT(*) as total,
           SUM(CASE WHEN closeddate IS NOT NULL THEN 1 ELSE 0 END) as done,
           COUNT(*) - SUM(CASE WHEN closeddate IS NOT NULL THEN 1 ELSE 0 END) as remaining
    FROM expanded_factissues 
    WHERE 1=1 ${projectId ? 'AND projectid = $1' : ''} 
    GROUP BY sprint 
    ORDER BY sprint`, projectId ? [projectId] : []);
  res.json(rows);
};
// controllers/dashboardController.js
exports.getAgeDistribution = async (req, res) => {
  const projectId = req.query.projectId;
  const pParam = projectId ? [projectId] : [];
  
  // Pivot query to get wide format: { range, critical, high, medium, low }
  const sql = `
    SELECT 
      CASE 
        WHEN (CURRENT_DATE - createddate::date) <= 3 THEN '0-3 days'
        WHEN (CURRENT_DATE - createddate::date) <= 7 THEN '4-7 days'
        WHEN (CURRENT_DATE - createddate::date) <= 14 THEN '8-14 days'
        ELSE '15+ days'
      END as range,
      COUNT(CASE WHEN LOWER(severity) = 'critical' THEN 1 END) as critical,
      COUNT(CASE WHEN LOWER(severity) = 'high' THEN 1 END) as high,
      COUNT(CASE WHEN LOWER(severity) = 'medium' THEN 1 END) as medium,
      COUNT(CASE WHEN LOWER(severity) = 'low' THEN 1 END) as low
    FROM expanded_factissues
    WHERE closeddate IS NULL
    ${projectId ? 'AND projectid = $1' : ''}
    GROUP BY range
    ORDER BY range ASC
  `;
  
  try {
    const rows = await sq(sql, pParam, "ageDist");
    // Ensure numbers are integers
    const formatted = rows.map(r => ({
      range: r.range,
      critical: parseInt(r.critical) || 0,
      high: parseInt(r.high) || 0,
      medium: parseInt(r.medium) || 0,
      low: parseInt(r.low) || 0
    }));
    res.json(formatted);
  } catch (err) {
    console.error("[getAgeDistribution] Error:", err);
    res.status(500).json({ message: "Failed to fetch age distribution" });
  }
};
// Redundant getSolarStats removed

// Project List
exports.getProjectList = async (req, res) => {
  try {
    const rows = await sq(`
      SELECT projectid, projectname as name
      FROM expanded_factprojects
      ORDER BY projectname
    `);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project list" });
  }
};

// Roadmap Data (Sprints + Project Timelines) - Now with Role-based filtering
exports.getRoadmapData = async (req, res) => {
  const projectId = req.query.projectId;
  const userId = req.user.id;
  const role = (req.user.role || "").toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(role);

  // Issues Query
  let issueSql = `
    SELECT i.issueid, i.projectid, i.sprint, i.issuetype, i.status, i.description, i.createddate 
    FROM expanded_factissues i
  `;
  let issueParams = [];
  let issueWhere = [];

  // Projects Query
  let projectSql = `
    SELECT p.projectid, p.projectname, p.startdate, p.enddate, p.budgetallocated, p.budgetused 
    FROM expanded_factprojects p
  `;
  let projectParams = [];
  let projectWhere = [];

  if (!isAdmin) {
    issueSql += ` JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)`;
    projectSql += ` JOIN project_assignments pa ON TRIM(p.projectid) = TRIM(pa.project_id)`;
    issueWhere.push(`pa.user_id = $${issueParams.length + 1}`);
    projectWhere.push(`pa.user_id = $${projectParams.length + 1}`);
    issueParams.push(userId);
    projectParams.push(userId);
  }

  if (projectId) {
    issueWhere.push(`TRIM(i.projectid) = TRIM($${issueParams.length + 1})`);
    projectWhere.push(`TRIM(p.projectid) = TRIM($${projectParams.length + 1})`);
    issueParams.push(projectId);
    projectParams.push(projectId);
  }

  const finalIssueSql = `${issueSql} ${issueWhere.length ? 'WHERE ' + issueWhere.join(' AND ') : ''} ORDER BY i.sprint ASC, i.createddate DESC`;
  const finalProjectSql = `${projectSql} ${projectWhere.length ? 'WHERE ' + projectWhere.join(' AND ') : ''} ORDER BY p.startdate ASC`;

  try {
    const [issues, projects] = await Promise.all([
      sq(finalIssueSql, issueParams, "roadmap-issues"),
      sq(finalProjectSql, projectParams, "roadmap-projects"),
    ]);

    // Group issues by sprint
    const sprintMap = {};
    (issues || []).forEach(issue => {
      const s = issue.sprint || "No Sprint";
      if (!sprintMap[s]) {
        sprintMap[s] = { sprint: s, count: 0, issues: [] };
      }
      sprintMap[s].count++;
      sprintMap[s].issues.push(issue);
    });

    res.json({
      sprints: Object.values(sprintMap),
      projects: projects || []
    });
  } catch (err) {
    console.error("[getRoadmapData] Error:", err);
    res.status(500).json({ message: "Failed to fetch roadmap data" });
  }
};

module.exports = {
  getByStatus: exports.getByStatus,
  getDashboardStats: exports.getDashboardStats,
  getByType: exports.getByType,
  getBySprint: exports.getBySprint,
  getByTeam: exports.getByTeam,
  getBySeverity: exports.getBySeverity,
  getTrend: exports.getTrend,
  getAgeDistribution: exports.getAgeDistribution,
  getBurndown: exports.getBurndown,
  getSolarStats: exports.getSolarStats,
  getProjectList: exports.getProjectList,
  getRoadmapData: exports.getRoadmapData,
};


// const pool = require("../db");

// // ── Safe query helper ─────────────────────────────────────────────────────────
// async function sq(sql, params = [], label = "") {
//   try {
//     const r = await pool.query(sql, params);
//     return r.rows;
//   } catch (err) {
//     console.error(`[dashboard:${label}] ERROR: ${err.message}`);
//     console.error(`  SQL: ${sql.replace(/\s+/g, " ").trim().slice(0, 300)}`);
//     return [];
//   }
// }

// // ── Schema detection — auto-detects actual column names from DB ──────────────
// // Cached after first call so it only queries once per server restart
// let _schema = null;

// async function getSchema() {
//   if (_schema) return _schema;

//   // Fetch all columns from both tables
//   const [issueCols, projectCols] = await Promise.all([
//     sq(`SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factissues' ORDER BY ordinal_position`, [], "schema-issues"),
//     sq(`SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factprojects' ORDER BY ordinal_position`, [], "schema-projects"),
//   ]);

//   const ic = issueCols.map(r => r.column_name.toLowerCase());
//   const pc = projectCols.map(r => r.column_name.toLowerCase());

//   // Find status column — try common names in order of likelihood
//   const statusCol =
//     ic.find(c => c === "status")         ||
//     ic.find(c => c === "issue_status")   ||
//     ic.find(c => c === "issuestatus")    ||
//     ic.find(c => c === "current_status") ||
//     ic.find(c => c === "currentstatus")  ||
//     ic.find(c => c === "state")          ||
//     ic.find(c => c === "issuestate")     ||
//     ic.find(c => c.includes("status"))   ||
//     ic.find(c => c.includes("state"))    ||
//     null;

//   // Find date column
//   const dateCol =
//     ic.find(c => c === "createddate")   ||
//     ic.find(c => c === "created_date")  ||
//     ic.find(c => c === "createdon")     ||
//     ic.find(c => c === "created_at")    ||
//     ic.find(c => c === "date_created")  ||
//     ic.find(c => c.includes("created")) ||
//     null;

//   // Find closed-date column
//   const closedCol =
//     ic.find(c => c === "closeddate")    ||
//     ic.find(c => c === "closed_date")   ||
//     ic.find(c => c === "closedon")      ||
//     ic.find(c => c === "resolved_date") ||
//     ic.find(c => c === "resolveddate")  ||
//     ic.find(c => c.includes("close"))   ||
//     ic.find(c => c.includes("resolv"))  ||
//     null;

//   // Find project status column in expanded_factprojects
//   const projStatusCol =
//     pc.find(c => c === "status")        ||
//     pc.find(c => c === "project_status")||
//     pc.find(c => c === "projectstatus") ||
//     pc.find(c => c.includes("status"))  ||
//     null;

//   let finalStatusCol = statusCol;
//   if (!finalStatusCol && closedCol) {
//     finalStatusCol = `(CASE WHEN ${closedCol} IS NOT NULL THEN 'Resolved' ELSE 'Open' END)`;
//   }

//   _schema = {
//     issueColumns:   ic,
//     projectColumns: pc,
//     statusCol:      finalStatusCol,
//     dateCol,
//     closedCol,
//     projStatusCol,
//   };

//   console.log("[schema] issue columns:", ic.join(", "));
//   console.log("[schema] statusCol:", statusCol, "| dateCol:", dateCol, "| closedCol:", closedCol);
//   console.log("[schema] project columns:", pc.join(", "), "| projStatusCol:", projStatusCol);

//   return _schema;
// }

// // ── Project filter helper ─────────────────────────────────────────────────────
// function pf(projectId, col = "projectid", idx = 1) {
//   if (!projectId) return { clause: "", params: [] };
//   return { clause: ` AND ${col}::text = $${idx}`, params: [String(projectId)] };
// }

// // ── Status condition builders ─────────────────────────────────────────────────
// // These generate SQL using the actual detected column name
// function formatCol(col) {
//   if (!col) return "''";
//   // If prefix string is appended to our CASE expression blindly e.g "i.(CASE WHEN closeddate..."
//   // move the prefix inside the CASE
//   if (col.startsWith("i.(") || col.startsWith("p.(") || col.startsWith("pa.(")) {
//     const pfx = col.split(".")[0];
//     return col.replace(new RegExp(`^${pfx}\\.\\(CASE WHEN ([a-z_]+)\\s`, 'g'), `(CASE WHEN ${pfx}.$1 `);
//   }
//   return col;
// }

// function isOpen(col)     { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) NOT IN ('done','verified','closed','complete','completed','resolved')`; }
// function isClosed(col)   { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) IN ('done','verified','closed','complete','completed','resolved')`; }
// function isBlocked(col)  { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) = 'blocked'`; }
// function isInReview(col) { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) IN ('in review','review','in_review','testing')`; }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/schema  — debug endpoint to see detected column names
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getSchema = async (req, res) => {
//   _schema = null; // force refresh
//   const schema = await getSchema();
//   res.json({
//     message: "Schema detected successfully",
//     ...schema,
//     hint: !schema.statusCol
//       ? "WARNING: No status column found! Charts filtering by status will show no data."
//       : `Status column found: "${schema.statusCol}" — charts should work`,
//   });
// };


// // Solar-specific stats
// exports.getSolarStats = async (req, res) => {
//   try {
//     const [totalDefects, criticalDefects, modules] = await Promise.all([
//       sq(`SELECT COUNT(*) as c FROM expanded_factissues WHERE defect_type IS NOT NULL`, [], "defects"),
//       sq(`SELECT COUNT(*) as c FROM expanded_factissues WHERE severity = 'Critical'`, [], "critical"),
//       sq(`SELECT COUNT(*) as c FROM expanded_factissues WHERE production_stage = 'Module'`, [], "modules")
//     ]);

//     res.json({
//       totalDefects: parseInt(totalDefects[0]?.c) || 0,
//       criticalDefects: parseInt(criticalDefects[0]?.c) || 0,
//       modulesProduced: parseInt(modules[0]?.c) || 0,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch solar stats" });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/stats
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getDashboardStats = async (req, res) => {
//   try {
//     const role    = (req.user.role || "").toLowerCase();
//     const userId  = req.user.id;
//     const isAdmin = ["admin", "superadmin"].includes(role);
//     const { statusCol } = await getSchema();

//     if (isAdmin) {
//       const [open, resolved, proj, users] = await Promise.all([
//         statusCol
//           ? sq(`SELECT COUNT(*) AS c FROM expanded_factissues WHERE ${isOpen(statusCol)}`, [], "open")
//           : sq(`SELECT COUNT(*) AS c FROM expanded_factissues`, [], "open-all"),
//         statusCol
//           ? sq(`SELECT COUNT(*) AS c FROM expanded_factissues WHERE ${isClosed(statusCol)}`, [], "resolved")
//           : sq(`SELECT 0 AS c`, [], "resolved-skip"),
//         sq(`SELECT COUNT(*) AS c FROM expanded_factprojects`, [], "proj"),
//         sq(`SELECT COUNT(*) AS c FROM users`, [], "users"),
//       ]);
//       return res.json({
//         openIssues:     parseInt(open[0]?.c)     || 0,
//         resolvedIssues: parseInt(resolved[0]?.c) || 0,
//         totalProjects:  parseInt(proj[0]?.c)     || 0,
//         totalUsers:     parseInt(users[0]?.c)    || 0,
//         overdueCount:   0,
//       });
//     }

//     const [open, resolved, myP] = await Promise.all([
//       sq(`SELECT COUNT(*) AS c FROM expanded_factissues i JOIN project_assignments pa ON i.projectid::text=pa.project_id::text WHERE pa.user_id=$1${statusCol ? ` AND ${isOpen("i."+statusCol)}` : ""}`, [userId], "open-u"),
//       sq(`SELECT COUNT(*) AS c FROM expanded_factissues i JOIN project_assignments pa ON i.projectid::text=pa.project_id::text WHERE pa.user_id=$1${statusCol ? ` AND ${isClosed("i."+statusCol)}` : " AND 1=0"}`, [userId], "res-u"),
//       sq(`SELECT COUNT(*) AS c FROM project_assignments WHERE user_id=$1`, [userId], "myp"),
//     ]);

//     res.json({
//       openIssues:     parseInt(open[0]?.c)     || 0,
//       resolvedIssues: parseInt(resolved[0]?.c) || 0,
//       myProjects:     parseInt(myP[0]?.c)      || 0,
//     });
//   } catch (err) {
//     console.error("[getDashboardStats]", err.message);
//     res.status(500).json({ message: "Failed to fetch stats", error: err.message });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/by-status
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getByStatus = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol } = await getSchema();

//   if (!statusCol) {
//     // No status column — return issue type breakdown as fallback
//     const rows = await sq(
//       `SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`,
//       params, "byStatus-fallback"
//     );
//     return res.json(rows);
//   }

//   const rows = await sq(
//     `SELECT ${statusCol} AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY ${statusCol} ORDER BY count DESC`,
//     params, "byStatus"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/by-type
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getByType = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const rows = await sq(
//     `SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`,
//     params, "byType"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/by-sprint
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getBySprint = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const rows = await sq(
//     `SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY sprint ORDER BY count DESC LIMIT 15`,
//     params, "bySprint"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/by-team
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getByTeam = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const rows = await sq(
//     `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY assigneeteam ORDER BY count DESC`,
//     params, "byTeam"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/trend
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getTrend = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol } = await getSchema();

//   const openExpr   = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)}   THEN 1 ELSE 0 END)` : `COUNT(*)`;
//   const closedExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END)` : `0`;

//   // Try monthly date grouping
//   if (dateCol) {
//     const rows = await sq(
//       `SELECT
//          TO_CHAR(DATE_TRUNC('month', ${dateCol}::date), 'Mon YY') AS date,
//          ${openExpr}   AS open,
//          ${closedExpr} AS closed
//        FROM expanded_factissues
//        WHERE ${dateCol} IS NOT NULL${clause}
//        GROUP BY DATE_TRUNC('month', ${dateCol}::date)
//        ORDER BY DATE_TRUNC('month', ${dateCol}::date)`,
//       params, "trend-date"
//     );
//     if (rows.length) return res.json(rows);
//   }

//   // Fallback: group by sprint
//   const rows = await sq(
//     `SELECT
//        COALESCE(sprint,'No Sprint') AS date,
//        ${openExpr}   AS open,
//        ${closedExpr} AS closed
//      FROM expanded_factissues WHERE 1=1${clause}
//      GROUP BY sprint ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST`,
//     params, "trend-sprint"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/age-distribution
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getAgeDistribution = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol } = await getSchema();

//   const openFilter = statusCol ? `AND ${isOpen(statusCol)}` : "";

//   if (dateCol) {
//     const rows = await sq(
//       `SELECT
//          CASE
//            WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '7 days'  THEN '0-7 days'
//            WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '14 days' THEN '8-14 days'
//            WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '30 days' THEN '15-30 days'
//            WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days'
//            ELSE '60+ days'
//          END AS range,
//          COUNT(*) AS count
//        FROM expanded_factissues
//        WHERE ${dateCol} IS NOT NULL ${openFilter}${clause}
//        GROUP BY range`,
//       params, "age"
//     );
//     if (rows.length) return res.json(rows);
//   }

//   // Fallback: group by sprint (shows distribution across sprints)
//   const rows = await sq(
//     `SELECT COALESCE(sprint,'No Sprint') AS range, COUNT(*) AS count
//      FROM expanded_factissues WHERE 1=1 ${openFilter}${clause}
//      GROUP BY sprint ORDER BY count DESC`,
//     params, "age-fb"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/burndown
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getBurndown = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol } = await getSchema();

//   const doneExpr      = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)}   THEN 1 ELSE 0 END)` : `0`;
//   const remainingExpr = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)} THEN 1 ELSE 0 END)` : `COUNT(*)`;
//   const orderBy       = dateCol ? `MIN(${dateCol}) NULLS LAST` : `sprint`;

//   const rows = await sq(
//     `SELECT
//        COALESCE(sprint,'No Sprint') AS sprint,
//        COUNT(*) AS total,
//        ${doneExpr}      AS done,
//        ${remainingExpr} AS remaining
//      FROM expanded_factissues WHERE 1=1${clause}
//      GROUP BY sprint ORDER BY ${orderBy} LIMIT 10`,
//     params, "burndown"
//   );

//   const maxR = rows.length ? Math.max(...rows.map(r => parseInt(r.remaining) || 0)) : 0;
//   res.json(rows.map((r, i) => ({
//     sprint:    r.sprint,
//     total:     parseInt(r.total)     || 0,
//     done:      parseInt(r.done)      || 0,
//     remaining: parseInt(r.remaining) || 0,
//     ideal:     Math.max(0, Math.round(maxR * (1 - i / Math.max(rows.length - 1, 1)))),
//   })));
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/velocity
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getVelocityData = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol } = await getSchema();

//   const closedFilter = statusCol ? ` AND ${isClosed(statusCol)}` : "";
//   const orderBy      = dateCol ? `MIN(${dateCol}) NULLS LAST` : `sprint`;

//   let rows = await sq(
//     `SELECT
//        COALESCE(sprint,'No Sprint') AS sprint,
//        SUM(CASE WHEN assigneeteam='Frontend' THEN 1 ELSE 0 END) AS "Frontend",
//        SUM(CASE WHEN assigneeteam='Backend'  THEN 1 ELSE 0 END) AS "Backend",
//        SUM(CASE WHEN assigneeteam='QA'       THEN 1 ELSE 0 END) AS "QA",
//        SUM(CASE WHEN assigneeteam='DevOps'   THEN 1 ELSE 0 END) AS "DevOps"
//      FROM expanded_factissues WHERE 1=1${closedFilter}${clause}
//      GROUP BY sprint ORDER BY ${orderBy}`,
//     params, "velocity"
//   );

//   if (!rows.length) {
//     rows = await sq(
//       `SELECT
//          COALESCE(sprint,'No Sprint') AS sprint,
//          SUM(CASE WHEN assigneeteam='Frontend' THEN 1 ELSE 0 END) AS "Frontend",
//          SUM(CASE WHEN assigneeteam='Backend'  THEN 1 ELSE 0 END) AS "Backend",
//          SUM(CASE WHEN assigneeteam='QA'       THEN 1 ELSE 0 END) AS "QA",
//          SUM(CASE WHEN assigneeteam='DevOps'   THEN 1 ELSE 0 END) AS "DevOps"
//        FROM expanded_factissues WHERE 1=1${clause}
//        GROUP BY sprint ORDER BY ${orderBy}`,
//       params, "velocity-fb"
//     );
//   }
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/budget
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getBudgetUtilization = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId, "projectid");
//   const rows = await sq(
//     `SELECT
//        COALESCE(projectname,'Project '||projectid::text) AS name,
//        COALESCE(budgetallocated,0)::float AS budget_total,
//        COALESCE(budgetused,0)::float      AS budget_used
//      FROM expanded_factprojects
//      WHERE COALESCE(budgetallocated,0) > 0${clause}
//      ORDER BY COALESCE(budgetused,0) DESC LIMIT 10`,
//     params, "budget"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/resolution-time
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getResolutionTime = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol, closedCol } = await getSchema();

//   const closedFilter = statusCol ? ` AND ${isClosed(statusCol)}` : "";

//   if (dateCol && closedCol) {
//     const rows = await sq(
//       `SELECT
//          COALESCE(assigneeteam,'Unassigned') AS team,
//          ROUND(AVG(${closedCol}::date - ${dateCol}::date)::numeric, 1) AS avg_days
//        FROM expanded_factissues
//        WHERE ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL${closedFilter}${clause}
//        GROUP BY assigneeteam ORDER BY avg_days ASC NULLS LAST`,
//       params, "resTime"
//     );
//     if (rows.length) return res.json(rows);
//   }

//   // Fallback: count closed issues per team
//   const rows = await sq(
//     `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS avg_days
//      FROM expanded_factissues
//      WHERE 1=1${closedFilter}${clause}
//      GROUP BY assigneeteam ORDER BY avg_days DESC`,
//     params, "resTime-fb"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/project-health
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getProjectHealth = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId, "p.projectid");
//   const { statusCol } = await getSchema();

//   const doneExpr = statusCol
//     ? `SUM(CASE WHEN ${isClosed("i." + statusCol)} THEN 1 ELSE 0 END)`
//     : `COUNT(i.issueid) * 0`;

//   const rows = await sq(
//     `SELECT
//        COALESCE(p.projectname,'Project '||p.projectid::text) AS name,
//        CASE WHEN COUNT(i.issueid)=0 THEN 100
//             ELSE ROUND(100.0 * ${doneExpr} / NULLIF(COUNT(i.issueid),0))
//        END AS score
//      FROM expanded_factprojects p
//      LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
//      WHERE 1=1${clause}
//      GROUP BY p.projectid, p.projectname
//      ORDER BY score DESC NULLS LAST LIMIT 10`,
//     params, "health"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/overdue
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getOverdueIssues = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId, "i.projectid");
//   const { statusCol } = await getSchema();

//   const openFilter = statusCol ? ` AND ${isOpen("i." + statusCol)}` : "";

//   const rows = await sq(
//     `SELECT
//        COALESCE(p.projectname,'Project '||p.projectid::text) AS project,
//        COUNT(i.issueid) AS count
//      FROM expanded_factissues i
//      JOIN expanded_factprojects p ON i.projectid::text = p.projectid::text
//      WHERE 1=1${openFilter}${clause}
//      GROUP BY p.projectid, p.projectname
//      ORDER BY count DESC LIMIT 10`,
//     params, "overdue"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/sla
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getSLACompliance = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol, closedCol } = await getSchema();

//   if (statusCol && dateCol && closedCol) {
//     const rows = await sq(
//       `SELECT
//          SUM(CASE WHEN ${isClosed(statusCol)} AND ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL AND (${closedCol}::date - ${dateCol}::date) <= 30 THEN 1 ELSE 0 END) AS within_sla,
//          SUM(CASE WHEN ${isClosed(statusCol)} AND ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL AND (${closedCol}::date - ${dateCol}::date) > 30  THEN 1 ELSE 0 END) AS breached
//        FROM expanded_factissues WHERE 1=1${clause}`,
//       params, "sla"
//     );
//     const within  = parseInt(rows[0]?.within_sla) || 0;
//     const breached= parseInt(rows[0]?.breached)   || 0;
//     if (within + breached > 0) {
//       return res.json([{ name:"Within SLA", value:within }, { name:"Breached", value:breached }]);
//     }
//   }

//   // Fallback: resolved vs open
//   if (statusCol) {
//     const rows = await sq(
//       `SELECT
//          SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END) AS within_sla,
//          SUM(CASE WHEN ${isOpen(statusCol)}   THEN 1 ELSE 0 END) AS breached
//        FROM expanded_factissues WHERE 1=1${clause}`,
//       params, "sla-fb"
//     );
//     const within  = parseInt(rows[0]?.within_sla) || 0;
//     const breached= parseInt(rows[0]?.breached)   || 0;
//     return res.json([{ name:"Resolved", value:within }, { name:"Open", value:breached }]);
//   }

//   // No status column — return by type
//   const rows = await sq(
//     `SELECT COALESCE(issuetype,'Unknown') AS name, COUNT(*) AS value FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY value DESC`,
//     params, "sla-type"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/cumulative-trend
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getCumulativeTrend = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { dateCol } = await getSchema();

//   if (dateCol) {
//     const rows = await sq(
//       `SELECT
//          TO_CHAR(DATE_TRUNC('month', ${dateCol}::date), 'Mon YY') AS date,
//          COUNT(*) AS monthly,
//          SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', ${dateCol}::date)) AS total
//        FROM expanded_factissues
//        WHERE ${dateCol} IS NOT NULL${clause}
//        GROUP BY DATE_TRUNC('month', ${dateCol}::date)
//        ORDER BY DATE_TRUNC('month', ${dateCol}::date)`,
//       params, "cumul"
//     );
//     if (rows.length) return res.json(rows);
//   }

//   const rows = await sq(
//     `SELECT
//        COALESCE(sprint,'No Sprint') AS date,
//        COUNT(*) AS monthly,
//        SUM(COUNT(*)) OVER (ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST) AS total
//      FROM expanded_factissues WHERE 1=1${clause}
//      GROUP BY sprint ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST`,
//     params, "cumul-fb"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/project-list  — sidebar
// // NOTE: Does NOT use p.status — it may not exist; uses projStatusCol if detected
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getProjectList = async (req, res) => {
//   const { projStatusCol, statusCol } = await getSchema();

//   // Build status expression for project table (may not exist)
//   const projStatus = projStatusCol
//     ? `COALESCE(p.${projStatusCol},'Active') AS status`
//     : `'Active' AS status`;

//   // Build open count expression for issue table
//   const openExpr = statusCol
//     ? `SUM(CASE WHEN ${isOpen("i." + statusCol)} THEN 1 ELSE 0 END)`
//     : `COUNT(i.issueid)`;

//   const rows = await sq(
//     `SELECT
//        p.projectid,
//        p.projectid   AS project_id,
//        p.projectname AS name,
//        p.projectname,
//        ${projStatus},
//        COALESCE(p.budgetallocated,0)::float AS budget_total,
//        COALESCE(p.budgetused,0)::float      AS budget_used,
//        COUNT(i.issueid)   AS issue_count,
//        ${openExpr}        AS open_count
//      FROM expanded_factprojects p
//      LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
//      GROUP BY p.projectid, p.projectname, ${projStatusCol ? "p."+projStatusCol+"," : ""} p.budgetallocated, p.budgetused
//      ORDER BY p.projectname`,
//     [], "projectList"
//   );
//   res.json(rows);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/dashboard/role-overview
// // ─────────────────────────────────────────────────────────────────────────────
// exports.getRoleOverview = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol, dateCol } = await getSchema();

//   const resolvedExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)}  THEN 1 ELSE 0 END)` : `0`;
//   const openExpr     = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)}    THEN 1 ELSE 0 END)` : `COUNT(*)`;
//   const blockedExpr  = statusCol ? `SUM(CASE WHEN ${isBlocked(statusCol)} THEN 1 ELSE 0 END)` : `0`;
//   const pClause      = clause.replace("projectid", "p.projectid");
//   const orderBy      = dateCol ? `MIN(${dateCol}) NULLS LAST` : `sprint`;

//   const [teamStats, sprintBreakdown, monthlyTrend, summary] = await Promise.all([
//     sq(
//       `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS total_issues,
//          ${resolvedExpr} AS resolved, ${openExpr} AS open, ${blockedExpr} AS blocked,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
//        FROM expanded_factissues WHERE 1=1${clause}
//        GROUP BY assigneeteam ORDER BY total_issues DESC`,
//       params, "teamStats"
//     ),
//     sq(
//       `SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS total,
//          SUM(CASE WHEN assigneeteam='Frontend' THEN 1 ELSE 0 END) AS frontend,
//          SUM(CASE WHEN assigneeteam='Backend'  THEN 1 ELSE 0 END) AS backend,
//          SUM(CASE WHEN assigneeteam='QA'       THEN 1 ELSE 0 END) AS qa,
//          SUM(CASE WHEN assigneeteam='DevOps'   THEN 1 ELSE 0 END) AS devops
//        FROM expanded_factissues WHERE 1=1${clause}
//        GROUP BY sprint ORDER BY ${orderBy} LIMIT 10`,
//       params, "sprintBreak"
//     ),
//     dateCol ? sq(
//       `SELECT TO_CHAR(DATE_TRUNC('month',${dateCol}::date),'Mon YY') AS month,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
//        FROM expanded_factissues WHERE ${dateCol} IS NOT NULL${clause}
//        GROUP BY DATE_TRUNC('month',${dateCol}::date)
//        ORDER BY DATE_TRUNC('month',${dateCol}::date) DESC LIMIT 6`,
//       params, "monthly"
//     ) : sq(
//       `SELECT COALESCE(sprint,'No Sprint') AS month,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
//          SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
//        FROM expanded_factissues WHERE 1=1${clause}
//        GROUP BY sprint ORDER BY MIN(sprint) DESC LIMIT 6`,
//       params, "monthly-fb"
//     ),
//     sq(
//       `SELECT COUNT(DISTINCT p.projectid) AS total_projects, COUNT(DISTINCT i.issueid) AS total_issues,
//          SUM(CASE WHEN LOWER(COALESCE(i.issuetype,''))='bug'  THEN 1 ELSE 0 END) AS total_bugs,
//          SUM(CASE WHEN LOWER(COALESCE(i.issuetype,''))='task' THEN 1 ELSE 0 END) AS total_tasks,
//          ${statusCol ? `SUM(CASE WHEN ${isBlocked("i."+statusCol)} THEN 1 ELSE 0 END)` : "0"} AS blocked_issues,
//          COALESCE(SUM(p.budgetused),0)      AS total_budget_used,
//          COALESCE(SUM(p.budgetallocated),0) AS total_budget_allocated
//        FROM expanded_factprojects p
//        LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
//        WHERE 1=1${pClause}`,
//       params, "summary"
//     ),
//   ]);

//   const s = summary[0] || {};
//   res.json({
//     summary: {
//       totalProjects:        parseInt(s.total_projects)||0,
//       totalIssues:          parseInt(s.total_issues)||0,
//       totalBugs:            parseInt(s.total_bugs)||0,
//       totalTasks:           parseInt(s.total_tasks)||0,
//       blockedIssues:        parseInt(s.blocked_issues)||0,
//       totalBudgetUsed:      parseFloat(s.total_budget_used)||0,
//       totalBudgetAllocated: parseFloat(s.total_budget_allocated)||0,
//     },
//     teamStats,
//     sprintBreakdown,
//     monthlyTrend: [...monthlyTrend].reverse(),
//   });
// };

// // Backwards-compat combined endpoint
// exports.getDashboardCharts = async (req, res) => {
//   const { clause, params } = pf(req.query.projectId);
//   const { statusCol } = await getSchema();
//   const statusExpr = statusCol || "issuetype";
//   const [byStatus, byType, bySprint, byTeam] = await Promise.all([
//     sq(`SELECT ${statusExpr} AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY ${statusExpr} ORDER BY count DESC`, params, "cs"),
//     sq(`SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`, params, "ct"),
//     sq(`SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY sprint ORDER BY count DESC LIMIT 15`, params, "csp"),
//     sq(`SELECT COALESCE(assigneeteam,'Unassigned') AS assigneeteam, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY assigneeteam ORDER BY count DESC`, params, "ctm"),
//   ]);
//   res.json({ byStatus, byType, bySprint, byTeam, trend:[], ageDistrib:[], burndown:[], byDeveloper:[] });
// };



// const pool = require("../db");

// exports.getDashboardStats = async (req, res) => {
//   try {
//     const projects = await pool.query("SELECT COUNT(*) FROM expanded_factprojects");
//     const issues   = await pool.query("SELECT COUNT(*) FROM expanded_factissues");
//     const bugs     = await pool.query(
//       "SELECT COUNT(*) FROM expanded_factissues WHERE issuetype = 'Bug'"
//     );

//     res.json({
//       totalProjects: parseInt(projects.rows[0].count || 0),
//       totalIssues:   parseInt(issues.rows[0].count || 0),
//       totalBugs:     parseInt(bugs.rows[0].count || 0),
//     });
//   } catch (err) {
//     console.error("Dashboard stats error:", err.message);
//     res.status(500).json({ message: "Failed to fetch stats" });
//   }
// };

// exports.getDashboardCharts = async (req, res) => {
//   try {
//     // 1. Project Status Distribution
//     const statusQuery = `
//       SELECT status, COUNT(*) as count 
//       FROM expanded_factprojects 
//       GROUP BY status 
//       ORDER BY count DESC
//     `;
//     const statusResult = await pool.query(statusQuery);

//     // 2. Resolution Time (avg hours per sprint) - assuming you already fixed the EXTRACT issue with AGE()
//     const resolutionQuery = `
//       SELECT 
//         sprint, 
//         AVG(EXTRACT(EPOCH FROM AGE(closeddate, createddate)) / 3600) AS avg_hours
//       FROM expanded_factissues 
//       WHERE closeddate IS NOT NULL 
//       GROUP BY sprint 
//       ORDER BY sprint
//     `;
//     const resolutionResult = await pool.query(resolutionQuery);

//     // 3. Budget Trend
//     const budgetQuery = `
//       SELECT 
//         dd.monthname || ' ' || dd.year AS month,
//         AVG(p.budgetallocated) AS avg_allocated,
//         AVG(p.budgetused) AS avg_used
//       FROM expanded_factprojects p
//       JOIN dimdate dd ON DATE_TRUNC('month', p.startdate::date) = dd.date::date
//       GROUP BY dd.year, dd.monthnumber, dd.monthname
//       ORDER BY dd.year, dd.monthnumber
//     `;
//     const budgetResult = await pool.query(budgetQuery);

//     // 4. Bugs per Sprint
//     const bugsPerSprintQuery = `
//       SELECT sprint, COUNT(*) as count 
//       FROM expanded_factissues WHERE issuetype = 'Bug' 
//       GROUP BY sprint ORDER BY count DESC
//     `;
//     const bugsPerSprintResult = await pool.query(bugsPerSprintQuery);

//     // 5. Project Duration
//     const projectDurationQuery = `
//       SELECT projectname, (enddate - startdate) as duration_days 
//       FROM expanded_factprojects ORDER BY duration_days
//     `;
//     const projectDurationResult = await pool.query(projectDurationQuery);

//     // 6. Issues per Project
//     const issuesPerProjectQuery = `
//       SELECT projectid, COUNT(*) as count FROM expanded_factissues GROUP BY projectid
//     `;
//     const issuesPerProjectResult = await pool.query(issuesPerProjectQuery);

//     // 7. Issues per Sprint
//     const sprintQuery = `
//       SELECT sprint, COUNT(*) as count 
//       FROM expanded_factissues 
//       GROUP BY sprint 
//       ORDER BY count DESC
//     `;
//     const sprintResult = await pool.query(sprintQuery);

//     // 8. Issues by Type
//     const typeQuery = `
//       SELECT issuetype as issuetypename, COUNT(*) as count 
//       FROM expanded_factissues 
//       GROUP BY issuetype 
//       ORDER BY count DESC
//     `;
//     const typeResult = await pool.query(typeQuery);

//     // 9. Team Load
//     const teamQuery = `
//       SELECT assigneeteam, COUNT(*) as count 
//       FROM expanded_factissues 
//       GROUP BY assigneeteam 
//       ORDER BY count DESC
//     `;
//     const teamResult = await pool.query(teamQuery);

//     // SINGLE response – merge everything
//     res.json({
//       statusDistribution: statusResult.rows,
//       resolutionTime: resolutionResult.rows,
//       budgetTrend: budgetResult.rows,
//       bugsPerSprint: bugsPerSprintResult.rows,
//       projectDuration: projectDurationResult.rows,
//       issuesPerProject: issuesPerProjectResult.rows,
//       issuesPerSprint: sprintResult.rows,
//       issuesByType: typeResult.rows,
//       teamLoad: teamResult.rows,
//     });

//   } catch (err) {
//     console.error("Chart data error:", err.message);
//     console.error("Full error:", err);
//     if (err.stack) console.error("Stack:", err.stack);
//     if (err.sql) console.error("Failing query:", err.sql);
    
//     // Send ONE error response
//     res.status(500).json({ 
//       message: "Failed to fetch chart data", 
//       error: err.message 
//     });
//   }
// };