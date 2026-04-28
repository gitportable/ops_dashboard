
const pool = require("../db");

async function sq(sql, params = [], label = "") {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (err) {
    console.error(`[dashboard:${label}] ERROR: ${err.message}`);
    console.error(`  SQL: ${sql.replace(/\s+/g, " ").trim().slice(0, 300)}`);
    return [];
  }
}

let _schema = null;

async function getSchema() {
  if (_schema) return _schema;

  // Fetch all columns from both tables
  const [issueCols, projectCols] = await Promise.all([
    sq(`SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factissues' ORDER BY ordinal_position`, [], "schema-issues"),
    sq(`SELECT column_name FROM information_schema.columns WHERE table_name='expanded_factprojects' ORDER BY ordinal_position`, [], "schema-projects"),
  ]);

  const ic = issueCols.map(r => r.column_name.toLowerCase());
  const pc = projectCols.map(r => r.column_name.toLowerCase());

  const statusCol =
    ic.find(c => c === "status")         ||
    ic.find(c => c === "issue_status")   ||
    ic.find(c => c === "issuestatus")    ||
    ic.find(c => c === "current_status") ||
    ic.find(c => c === "currentstatus")  ||
    ic.find(c => c === "state")          ||
    ic.find(c => c === "issuestate")     ||
    ic.find(c => c.includes("status"))   ||
    ic.find(c => c.includes("state"))    ||
    null;

  const dateCol =
    ic.find(c => c === "createddate")   ||
    ic.find(c => c === "created_date")  ||
    ic.find(c => c === "createdon")     ||
    ic.find(c => c === "created_at")    ||
    ic.find(c => c === "date_created")  ||
    ic.find(c => c.includes("created")) ||
    null;

  
  const closedCol =
    ic.find(c => c === "closeddate")    ||
    ic.find(c => c === "closed_date")   ||
    ic.find(c => c === "closedon")      ||
    ic.find(c => c === "resolved_date") ||
    ic.find(c => c === "resolveddate")  ||
    ic.find(c => c.includes("close"))   ||
    ic.find(c => c.includes("resolv"))  ||
    null;

  const projStatusCol =
    pc.find(c => c === "status")        ||
    pc.find(c => c === "project_status")||
    pc.find(c => c === "projectstatus") ||
    pc.find(c => c.includes("status"))  ||
    null;

  let finalStatusCol = statusCol;
  if (!finalStatusCol && closedCol) {
    finalStatusCol = `(CASE WHEN ${closedCol} IS NOT NULL THEN 'Resolved' ELSE 'Open' END)`;
  }

  _schema = {
    issueColumns:   ic,
    projectColumns: pc,
    statusCol:      finalStatusCol,
    dateCol,
    closedCol,
    projStatusCol,
  };

  console.log("[schema] issue columns:", ic.join(", "));
  console.log("[schema] statusCol:", statusCol, "| dateCol:", dateCol, "| closedCol:", closedCol);
  console.log("[schema] project columns:", pc.join(", "), "| projStatusCol:", projStatusCol);

  return _schema;
}

function pf(projectId, col = "projectid", idx = 1) {
  if (!projectId) return { clause: "", params: [] };
  return { clause: ` AND ${col}::text = $${idx}`, params: [String(projectId)] };
}


function formatCol(col) {
  if (!col) return "''";

  if (col.startsWith("i.(") || col.startsWith("p.(") || col.startsWith("pa.(")) {
    const pfx = col.split(".")[0];
    return col.replace(new RegExp(`^${pfx}\\.\\(CASE WHEN ([a-z_]+)\\s`, 'g'), `(CASE WHEN ${pfx}.$1 `);
  }
  return col;
}

function isOpen(col)     { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) NOT IN ('done','verified','closed','complete','completed','resolved')`; }
function isClosed(col)   { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) IN ('done','verified','closed','complete','completed','resolved')`; }
function isBlocked(col)  { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) = 'blocked'`; }
function isInReview(col) { const c=formatCol(col); return `LOWER(COALESCE(${c},'')) IN ('in review','review','in_review','testing')`; }

exports.getSchema = async (req, res) => {
  _schema = null; // force refresh
  const schema = await getSchema();
  res.json({
    message: "Schema detected successfully",
    ...schema,
    hint: !schema.statusCol
      ? "WARNING: No status column found! Charts filtering by status will show no data."
      : `Status column found: "${schema.statusCol}" — charts should work`,
  });
};

exports.getDashboardStats = async (req, res) => {
  try {
    const role    = (req.user.role || "").toLowerCase();
    const userId  = req.user.id;
    const isAdmin = ["admin", "superadmin"].includes(role);
    const { statusCol } = await getSchema();

    if (isAdmin) {
      const [open, resolved, proj, users] = await Promise.all([
        statusCol
          ? sq(`SELECT COUNT(*) AS c FROM expanded_factissues WHERE ${isOpen(statusCol)}`, [], "open")
          : sq(`SELECT COUNT(*) AS c FROM expanded_factissues`, [], "open-all"),
        statusCol
          ? sq(`SELECT COUNT(*) AS c FROM expanded_factissues WHERE ${isClosed(statusCol)}`, [], "resolved")
          : sq(`SELECT 0 AS c`, [], "resolved-skip"),
        sq(`SELECT COUNT(*) AS c FROM expanded_factprojects`, [], "proj"),
        sq(`SELECT COUNT(*) AS c FROM users`, [], "users"),
      ]);
      return res.json({
        openIssues:     parseInt(open[0]?.c)     || 0,
        resolvedIssues: parseInt(resolved[0]?.c) || 0,
        totalProjects:  parseInt(proj[0]?.c)     || 0,
        totalUsers:     parseInt(users[0]?.c)    || 0,
        overdueCount:   0,
      });
    }

    const [open, resolved, myP] = await Promise.all([
      sq(`SELECT COUNT(*) AS c FROM expanded_factissues i JOIN project_assignments pa ON i.projectid::text=pa.project_id::text WHERE pa.user_id=$1${statusCol ? ` AND ${isOpen("i."+statusCol)}` : ""}`, [userId], "open-u"),
      sq(`SELECT COUNT(*) AS c FROM expanded_factissues i JOIN project_assignments pa ON i.projectid::text=pa.project_id::text WHERE pa.user_id=$1${statusCol ? ` AND ${isClosed("i."+statusCol)}` : " AND 1=0"}`, [userId], "res-u"),
      sq(`SELECT COUNT(*) AS c FROM project_assignments WHERE user_id=$1`, [userId], "myp"),
    ]);

    res.json({
      openIssues:     parseInt(open[0]?.c)     || 0,
      resolvedIssues: parseInt(resolved[0]?.c) || 0,
      myProjects:     parseInt(myP[0]?.c)      || 0,
    });
  } catch (err) {
    console.error("[getDashboardStats]", err.message);
    res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
};

exports.getByStatus = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol } = await getSchema();

  if (!statusCol) {
    const rows = await sq(
      `SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`,
      params, "byStatus-fallback"
    );
    return res.json(rows);
  }

  const rows = await sq(
    `SELECT ${statusCol} AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY ${statusCol} ORDER BY count DESC`,
    params, "byStatus"
  );
  res.json(rows);
};

exports.getByType = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const rows = await sq(
    `SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`,
    params, "byType"
  );
  res.json(rows);
};

exports.getBySprint = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const rows = await sq(
    `SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY sprint ORDER BY count DESC LIMIT 15`,
    params, "bySprint"
  );
  res.json(rows);
};

exports.getByTeam = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const rows = await sq(
    `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY assigneeteam ORDER BY count DESC`,
    params, "byTeam"
  );
  res.json(rows);
};
exports.getTrend = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol } = await getSchema();

  const openExpr   = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)}   THEN 1 ELSE 0 END)` : `COUNT(*)`;
  const closedExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END)` : `0`;

  if (dateCol) {
    const rows = await sq(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', ${dateCol}::date), 'Mon YY') AS date,
         ${openExpr}   AS open,
         ${closedExpr} AS closed
       FROM expanded_factissues
       WHERE ${dateCol} IS NOT NULL${clause}
       GROUP BY DATE_TRUNC('month', ${dateCol}::date)
       ORDER BY DATE_TRUNC('month', ${dateCol}::date)`,
      params, "trend-date"
    );
    if (rows.length) return res.json(rows);
  }

  const rows = await sq(
    `SELECT
       COALESCE(sprint,'No Sprint') AS date,
       ${openExpr}   AS open,
       ${closedExpr} AS closed
     FROM expanded_factissues WHERE 1=1${clause}
     GROUP BY sprint ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST`,
    params, "trend-sprint"
  );
  res.json(rows);
};

exports.getAgeDistribution = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol } = await getSchema();

  const openFilter = statusCol ? `AND ${isOpen(statusCol)}` : "";

  if (dateCol) {
    const rows = await sq(
      `SELECT
         CASE
           WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '7 days'  THEN '0-7 days'
           WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '14 days' THEN '8-14 days'
           WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '30 days' THEN '15-30 days'
           WHEN ${dateCol}::date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days'
           ELSE '60+ days'
         END AS range,
         COUNT(*) AS count
       FROM expanded_factissues
       WHERE ${dateCol} IS NOT NULL ${openFilter}${clause}
       GROUP BY range`,
      params, "age"
    );
    if (rows.length) return res.json(rows);
  }

  // Fallback: group by sprint (shows distribution across sprints)
  const rows = await sq(
    `SELECT COALESCE(sprint,'No Sprint') AS range, COUNT(*) AS count
     FROM expanded_factissues WHERE 1=1 ${openFilter}${clause}
     GROUP BY sprint ORDER BY count DESC`,
    params, "age-fb"
  );
  res.json(rows);
};

exports.getBurndown = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol } = await getSchema();

  const doneExpr      = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)}   THEN 1 ELSE 0 END)` : `0`;
  const remainingExpr = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)} THEN 1 ELSE 0 END)` : `COUNT(*)`;
  const orderBy       = dateCol ? `MIN(${dateCol}) NULLS LAST` : `sprint`;

  const rows = await sq(
    `SELECT
       COALESCE(sprint,'No Sprint') AS sprint,
       COUNT(*) AS total,
       ${doneExpr}      AS done,
       ${remainingExpr} AS remaining
     FROM expanded_factissues WHERE 1=1${clause}
     GROUP BY sprint ORDER BY ${orderBy} LIMIT 10`,
    params, "burndown"
  );

  const maxR = rows.length ? Math.max(...rows.map(r => parseInt(r.remaining) || 0)) : 0;
  res.json(rows.map((r, i) => ({
    sprint:    r.sprint,
    total:     parseInt(r.total)     || 0,
    done:      parseInt(r.done)      || 0,
    remaining: parseInt(r.remaining) || 0,
    ideal:     Math.max(0, Math.round(maxR * (1 - i / Math.max(rows.length - 1, 1)))),
  })));
};

exports.getVelocityData = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const rows = await sq(
    `SELECT
       COALESCE(sprint,'No Sprint') AS sprint,
       COALESCE(assigneeteam,'Unassigned') AS assigneeteam,
       COUNT(*) FILTER (WHERE status = 'Done') AS done
     FROM expanded_factissues
     WHERE 1=1${clause}
     GROUP BY sprint, assigneeteam
     ORDER BY sprint`,
    params, "velocity"
  );

  const grouped = rows.reduce((acc, row) => {
    const sprint = row.sprint || "No Sprint";
    if (!acc[sprint]) {
      acc[sprint] = { sprint, Backend: 0, DevOps: 0, Frontend: 0, QA: 0 };
    }
    const teamRaw = String(row.assigneeteam || "").toLowerCase();
    const done = parseInt(row.done, 10) || 0;
    if (teamRaw === "backend") acc[sprint].Backend += done;
    if (teamRaw === "devops") acc[sprint].DevOps += done;
    if (teamRaw === "frontend") acc[sprint].Frontend += done;
    if (teamRaw === "qa") acc[sprint].QA += done;
    return acc;
  }, {});

  res.json(Object.values(grouped));
};

exports.getBudgetUtilization = async (req, res) => {
  const { clause, params } = pf(req.query.projectId, "projectid");
  const rows = await sq(
    `SELECT
       COALESCE(projectname,'Project '||projectid::text) AS name,
       COALESCE(budgetallocated,0)::float AS budget_total,
       COALESCE(budgetused,0)::float      AS budget_used
     FROM expanded_factprojects
     WHERE COALESCE(budgetallocated,0) > 0${clause}
     ORDER BY COALESCE(budgetused,0) DESC LIMIT 10`,
    params, "budget"
  );
  res.json(rows);
};
exports.getResolutionTime = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol, closedCol } = await getSchema();

  const closedFilter = statusCol ? ` AND ${isClosed(statusCol)}` : "";

  if (dateCol && closedCol) {
    const rows = await sq(
      `SELECT
         COALESCE(assigneeteam,'Unassigned') AS team,
         ROUND(AVG(${closedCol}::date - ${dateCol}::date)::numeric, 1) AS avg_days
       FROM expanded_factissues
       WHERE ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL${closedFilter}${clause}
       GROUP BY assigneeteam ORDER BY avg_days ASC NULLS LAST`,
      params, "resTime"
    );
    if (rows.length) return res.json(rows);
  }

  // Fallback: count closed issues per team
  const rows = await sq(
    `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS avg_days
     FROM expanded_factissues
     WHERE 1=1${closedFilter}${clause}
     GROUP BY assigneeteam ORDER BY avg_days DESC`,
    params, "resTime-fb"
  );
  res.json(rows);
};

exports.getProjectHealth = async (req, res) => {
  const { clause, params } = pf(req.query.projectId, "p.projectid");
  const { statusCol } = await getSchema();

  const doneExpr = statusCol
    ? `SUM(CASE WHEN ${isClosed("i." + statusCol)} THEN 1 ELSE 0 END)`
    : `COUNT(i.issueid) * 0`;

  const rows = await sq(
    `SELECT
       COALESCE(p.projectname,'Project '||p.projectid::text) AS name,
       CASE WHEN COUNT(i.issueid)=0 THEN 100
            ELSE ROUND(100.0 * ${doneExpr} / NULLIF(COUNT(i.issueid),0))
       END AS score
     FROM expanded_factprojects p
     LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
     WHERE 1=1${clause}
     GROUP BY p.projectid, p.projectname
     ORDER BY score DESC NULLS LAST LIMIT 10`,
    params, "health"
  );
  res.json(rows);
};
exports.getOverdueIssues = async (req, res) => {
  const { clause, params } = pf(req.query.projectId, "i.projectid");
  const { statusCol } = await getSchema();

  const openFilter = statusCol ? ` AND ${isOpen("i." + statusCol)}` : "";

  const rows = await sq(
    `SELECT
       COALESCE(p.projectname,'Project '||p.projectid::text) AS project,
       COUNT(i.issueid) AS count
     FROM expanded_factissues i
     JOIN expanded_factprojects p ON i.projectid::text = p.projectid::text
     WHERE 1=1${openFilter}${clause}
     GROUP BY p.projectid, p.projectname
     ORDER BY count DESC LIMIT 10`,
    params, "overdue"
  );
  res.json(rows);
};

exports.getSLACompliance = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol, closedCol } = await getSchema();

  if (statusCol && dateCol && closedCol) {
    const rows = await sq(
      `SELECT
         SUM(CASE WHEN ${isClosed(statusCol)} AND ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL AND (${closedCol}::date - ${dateCol}::date) <= 30 THEN 1 ELSE 0 END) AS within_sla,
         SUM(CASE WHEN ${isClosed(statusCol)} AND ${closedCol} IS NOT NULL AND ${dateCol} IS NOT NULL AND (${closedCol}::date - ${dateCol}::date) > 30  THEN 1 ELSE 0 END) AS breached
       FROM expanded_factissues WHERE 1=1${clause}`,
      params, "sla"
    );
    const within  = parseInt(rows[0]?.within_sla) || 0;
    const breached= parseInt(rows[0]?.breached)   || 0;
    if (within + breached > 0) {
      return res.json([{ name:"Within SLA", value:within }, { name:"Breached", value:breached }]);
    }
  }

  if (statusCol) {
    const rows = await sq(
      `SELECT
         SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END) AS within_sla,
         SUM(CASE WHEN ${isOpen(statusCol)}   THEN 1 ELSE 0 END) AS breached
       FROM expanded_factissues WHERE 1=1${clause}`,
      params, "sla-fb"
    );
    const within  = parseInt(rows[0]?.within_sla) || 0;
    const breached= parseInt(rows[0]?.breached)   || 0;
    return res.json([{ name:"Resolved", value:within }, { name:"Open", value:breached }]);
  }

  // No status column — return by type
  const rows = await sq(
    `SELECT COALESCE(issuetype,'Unknown') AS name, COUNT(*) AS value FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY value DESC`,
    params, "sla-type"
  );
  res.json(rows);
};

exports.getCumulativeTrend = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { dateCol } = await getSchema();

  if (dateCol) {
    const rows = await sq(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', ${dateCol}::date), 'Mon YY') AS date,
         COUNT(*) AS monthly,
         SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', ${dateCol}::date)) AS total
       FROM expanded_factissues
       WHERE ${dateCol} IS NOT NULL${clause}
       GROUP BY DATE_TRUNC('month', ${dateCol}::date)
       ORDER BY DATE_TRUNC('month', ${dateCol}::date)`,
      params, "cumul"
    );
    if (rows.length) return res.json(rows);
  }

  const rows = await sq(
    `SELECT
       COALESCE(sprint,'No Sprint') AS date,
       COUNT(*) AS monthly,
       SUM(COUNT(*)) OVER (ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST) AS total
     FROM expanded_factissues WHERE 1=1${clause}
     GROUP BY sprint ORDER BY MIN(${dateCol || "sprint"}) NULLS LAST`,
    params, "cumul-fb"
  );
  res.json(rows);
};

exports.getProjectList = async (req, res) => {
  const { projStatusCol, statusCol } = await getSchema();
  const projStatus = projStatusCol
    ? `COALESCE(p.${projStatusCol},'Active') AS status`
    : `'Active' AS status`;

  const openExpr = statusCol
    ? `SUM(CASE WHEN ${isOpen("i." + statusCol)} THEN 1 ELSE 0 END)`
    : `COUNT(i.issueid)`;

  const rows = await sq(
    `SELECT
       p.projectid,
       p.projectid   AS project_id,
       p.projectname AS name,
       p.projectname,
       ${projStatus},
       COALESCE(p.budgetallocated,0)::float AS budget_total,
       COALESCE(p.budgetused,0)::float      AS budget_used,
       COUNT(i.issueid)   AS issue_count,
       ${openExpr}        AS open_count
     FROM expanded_factprojects p
     LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
     GROUP BY p.projectid, p.projectname, ${projStatusCol ? "p."+projStatusCol+"," : ""} p.budgetallocated, p.budgetused
     ORDER BY p.projectname`,
    [], "projectList"
  );
  res.json(rows);
};

exports.getRoleOverview = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol, dateCol } = await getSchema();

  const resolvedExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)}  THEN 1 ELSE 0 END)` : `0`;
  const openExpr     = statusCol ? `SUM(CASE WHEN ${isOpen(statusCol)}    THEN 1 ELSE 0 END)` : `COUNT(*)`;
  const blockedExpr  = statusCol ? `SUM(CASE WHEN ${isBlocked(statusCol)} THEN 1 ELSE 0 END)` : `0`;
  const pClause      = clause.replace("projectid", "p.projectid");
  const orderBy      = dateCol ? `MIN(${dateCol}) NULLS LAST` : `sprint`;

  const [teamStats, sprintBreakdown, monthlyTrend, summary] = await Promise.all([
    sq(
      `SELECT COALESCE(assigneeteam,'Unassigned') AS team, COUNT(*) AS total_issues,
         ${resolvedExpr} AS resolved, ${openExpr} AS open, ${blockedExpr} AS blocked,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
       FROM expanded_factissues WHERE 1=1${clause}
       GROUP BY assigneeteam ORDER BY total_issues DESC`,
      params, "teamStats"
    ),
    sq(
      `SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS total,
         SUM(CASE WHEN assigneeteam='Frontend' THEN 1 ELSE 0 END) AS frontend,
         SUM(CASE WHEN assigneeteam='Backend'  THEN 1 ELSE 0 END) AS backend,
         SUM(CASE WHEN assigneeteam='QA'       THEN 1 ELSE 0 END) AS qa,
         SUM(CASE WHEN assigneeteam='DevOps'   THEN 1 ELSE 0 END) AS devops
       FROM expanded_factissues WHERE 1=1${clause}
       GROUP BY sprint ORDER BY ${orderBy} LIMIT 10`,
      params, "sprintBreak"
    ),
    dateCol ? sq(
      `SELECT TO_CHAR(DATE_TRUNC('month',${dateCol}::date),'Mon YY') AS month,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
       FROM expanded_factissues WHERE ${dateCol} IS NOT NULL${clause}
       GROUP BY DATE_TRUNC('month',${dateCol}::date)
       ORDER BY DATE_TRUNC('month',${dateCol}::date) DESC LIMIT 6`,
      params, "monthly"
    ) : sq(
      `SELECT COALESCE(sprint,'No Sprint') AS month,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='bug'  THEN 1 ELSE 0 END) AS bugs,
         SUM(CASE WHEN LOWER(COALESCE(issuetype,''))='task' THEN 1 ELSE 0 END) AS tasks
       FROM expanded_factissues WHERE 1=1${clause}
       GROUP BY sprint ORDER BY MIN(sprint) DESC LIMIT 6`,
      params, "monthly-fb"
    ),
    sq(
      `SELECT COUNT(DISTINCT p.projectid) AS total_projects, COUNT(DISTINCT i.issueid) AS total_issues,
         SUM(CASE WHEN LOWER(COALESCE(i.issuetype,''))='bug'  THEN 1 ELSE 0 END) AS total_bugs,
         SUM(CASE WHEN LOWER(COALESCE(i.issuetype,''))='task' THEN 1 ELSE 0 END) AS total_tasks,
         ${statusCol ? `SUM(CASE WHEN ${isBlocked("i."+statusCol)} THEN 1 ELSE 0 END)` : "0"} AS blocked_issues,
         COALESCE(SUM(p.budgetused),0)      AS total_budget_used,
         COALESCE(SUM(p.budgetallocated),0) AS total_budget_allocated
       FROM expanded_factprojects p
       LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
       WHERE 1=1${pClause}`,
      params, "summary"
    ),
  ]);

  const s = summary[0] || {};
  res.json({
    summary: {
      totalProjects:        parseInt(s.total_projects)||0,
      totalIssues:          parseInt(s.total_issues)||0,
      totalBugs:            parseInt(s.total_bugs)||0,
      totalTasks:           parseInt(s.total_tasks)||0,
      blockedIssues:        parseInt(s.blocked_issues)||0,
      totalBudgetUsed:      parseFloat(s.total_budget_used)||0,
      totalBudgetAllocated: parseFloat(s.total_budget_allocated)||0,
    },
    teamStats,
    sprintBreakdown,
    monthlyTrend: [...monthlyTrend].reverse(),
  });
};

exports.getDashboardCharts = async (req, res) => {
  const { clause, params } = pf(req.query.projectId);
  const { statusCol } = await getSchema();
  const statusExpr = statusCol || "issuetype";
  const [byStatus, byType, bySprint, byTeam, stageRows, velocityRows, workloadRows] = await Promise.all([
    sq(`SELECT ${statusExpr} AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY ${statusExpr} ORDER BY count DESC`, params, "cs"),
    sq(`SELECT COALESCE(issuetype,'Unknown') AS label, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY issuetype ORDER BY count DESC`, params, "ct"),
    sq(`SELECT COALESCE(sprint,'No Sprint') AS sprint, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY sprint ORDER BY count DESC LIMIT 15`, params, "csp"),
    sq(`SELECT COALESCE(assigneeteam,'Unassigned') AS assigneeteam, COUNT(*) AS count FROM expanded_factissues WHERE 1=1${clause} GROUP BY assigneeteam ORDER BY count DESC`, params, "ctm"),
    sq(
      `SELECT stage, COUNT(*) AS count
       FROM expanded_factissues
       WHERE stage IS NOT NULL${clause}
       GROUP BY stage
       ORDER BY stage`,
      params,
      "stageData"
    ),
    sq(
      `SELECT COALESCE(sprint,'No Sprint') AS sprint, COALESCE(assigneeteam,'Unassigned') AS assigneeteam,
              COUNT(*) FILTER (WHERE status = 'Done') AS done
       FROM expanded_factissues
       WHERE 1=1${clause}
       GROUP BY sprint, assigneeteam`,
      params,
      "velocityData"
    ),
    sq(
      `SELECT COALESCE(assigneeteam,'Unassigned') AS assigneeteam,
              COUNT(*) FILTER (WHERE status='Open') AS open,
              COUNT(*) FILTER (WHERE status='In Progress') AS in_progress
       FROM expanded_factissues
       WHERE 1=1${clause}
       GROUP BY assigneeteam`,
      params,
      "workloadData"
    ),
  ]);

  const velocityGrouped = velocityRows.reduce((acc, row) => {
    const sprint = row.sprint || "No Sprint";
    if (!acc[sprint]) {
      acc[sprint] = { sprint, Backend: 0, DevOps: 0, Frontend: 0, QA: 0 };
    }
    const teamRaw = String(row.assigneeteam || "").toLowerCase();
    const done = parseInt(row.done, 10) || 0;
    if (teamRaw === "backend") acc[sprint].Backend += done;
    if (teamRaw === "devops") acc[sprint].DevOps += done;
    if (teamRaw === "frontend") acc[sprint].Frontend += done;
    if (teamRaw === "qa") acc[sprint].QA += done;
    return acc;
  }, {});

  const stageData = stageRows.map((r) => ({
    stage: r.stage,
    count: parseInt(r.count, 10) || 0,
  }));
  const workloadData = workloadRows.map((r) => ({
    assigneeteam: r.assigneeteam,
    open: parseInt(r.open, 10) || 0,
    in_progress: parseInt(r.in_progress, 10) || 0,
  }));

  res.json({
    byStatus,
    byType,
    bySprint,
    byTeam,
    stageData,
    velocityData: Object.values(velocityGrouped),
    workloadData,
    trend: [],
    ageDistrib: [],
    burndown: [],
    byDeveloper: [],
  });
};

