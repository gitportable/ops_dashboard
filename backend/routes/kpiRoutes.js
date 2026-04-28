const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

async function sq(sql, params = [], label = "") {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (err) {
    console.error(`[kpi:${label}] ERROR: ${err.message}`);
    console.error(`  FULL SQL: ${sql.replace(/\s+/g, " ").trim()}`);
    return [];
  }
}

let _schema = null;

async function getSchema() {
  if (_schema) return _schema;

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

  const projectIdCol =
    ic.find(c => c === "projectid")   ||
    ic.find(c => c === "project_id")  ||
    ic.find(c => c.includes("project") && c.includes("id")) ||
    null;

  const projectIdColProj =
    pc.find(c => c === "projectid")   ||
    pc.find(c => c === "project_id")  ||
    pc.find(c => c.includes("project") && c.includes("id")) ||
    null;

  const projectNameCol =
    pc.find(c => c === "projectname")  ||
    pc.find(c => c === "project_name") ||
    pc.find(c => c === "name")         ||
    pc.find(c => c.includes("name"))   ||
    null;

  const assigneeTeamCol =
    ic.find(c => c === "assigneeteam")   ||
    ic.find(c => c === "assignee_team")  ||
    ic.find(c => c === "assignedteam")   ||
    ic.find(c => c === "team")           ||
    ic.find(c => c.includes("team"))     ||
    null;

  const sprintCol =
    ic.find(c => c === "sprint")        ||
    ic.find(c => c === "sprint_name")   ||
    ic.find(c => c === "sprintname")    ||
    ic.find(c => c.includes("sprint"))  ||
    null;

  const issueIdCol =
    ic.find(c => c === "issue_id") ||
    ic.find(c => c === "issueid")  ||
    ic.find(c => c === "id")       ||
    null;

  let finalStatusCol = statusCol;
  if (!finalStatusCol && closedCol) {
    finalStatusCol = `(CASE WHEN ${closedCol} IS NOT NULL THEN 'Resolved' ELSE 'Open' END)`;
  }

  _schema = {
    issueColumns: ic,
    projectColumns: pc,
    statusCol: finalStatusCol,
    dateCol,
    closedCol,
    projectIdCol,
    projectIdColProj,
    projectNameCol,
    assigneeTeamCol,
    sprintCol,
    issueIdCol,
  };

  return _schema;
}

function formatCol(col) {
  if (!col) return "''";
  if (col.startsWith("i.(") || col.startsWith("p.(")) {
    const pfx = col.split(".")[0];
    return col.replace(new RegExp(`^${pfx}\\.\\(CASE WHEN ([a-z_]+)\\s`, "g"), `(CASE WHEN ${pfx}.$1 `);
  }
  return col;
}

function isOpen(col)   { const c = formatCol(col); return `LOWER(COALESCE(${c},'')) NOT IN ('done','verified','closed','complete','completed','resolved')`; }
function isClosed(col) { const c = formatCol(col); return `LOWER(COALESCE(${c},'')) IN ('done','verified','closed','complete','completed','resolved')`; }
function isBlocked(col){ const c = formatCol(col); return `LOWER(COALESCE(${c},'')) = 'blocked'`; }

router.use(authenticateToken);

router.get("/cycle-time", rbac("superadmin", "admin"), async (req, res) => {
  const { dateCol, closedCol, projectIdCol, projectIdColProj, projectNameCol } = await getSchema();
  if (!dateCol || !closedCol || !projectIdCol) return res.json([]);

  const projId = projectIdColProj || "projectid";
  const projName = projectNameCol || projId;

  const rows = await sq(
    `
      SELECT
        i.${projectIdCol} AS projectid,
        COALESCE(p.${projName}::text, i.${projectIdCol}::text, 'Unknown') AS project_name,
        AVG(EXTRACT(EPOCH FROM (i.${closedCol} - i.${dateCol})) / 86400) AS avg_cycle_days,
        MIN(EXTRACT(EPOCH FROM (i.${closedCol} - i.${dateCol})) / 86400) AS min_cycle_days,
        MAX(EXTRACT(EPOCH FROM (i.${closedCol} - i.${dateCol})) / 86400) AS max_cycle_days,
        COUNT(*) AS issue_count
      FROM expanded_factissues i
      LEFT JOIN expanded_factprojects p ON i.${projectIdCol}::text = p.${projId}::text
      WHERE i.${closedCol} IS NOT NULL AND i.${dateCol} IS NOT NULL
      GROUP BY i.${projectIdCol}, p.${projName}
      ORDER BY avg_cycle_days DESC NULLS LAST
    `,
    [],
    "cycle-time"
  );
  res.json(rows);
});

router.get("/team-efficiency", rbac("superadmin", "admin"), async (req, res) => {
  const { statusCol, assigneeTeamCol } = await getSchema();
  const teamExpr = assigneeTeamCol ? `COALESCE(${assigneeTeamCol}, 'Unassigned')` : `'Unassigned'`;
  const doneExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END)` : `0`;
  const blockedExpr = statusCol ? `SUM(CASE WHEN ${isBlocked(statusCol)} THEN 1 ELSE 0 END)` : `0`;

  const rows = await sq(
    `
      SELECT ${teamExpr} AS team,
             COUNT(*) AS total,
             ${doneExpr} AS done,
             ${blockedExpr} AS blocked
      FROM expanded_factissues
      GROUP BY ${teamExpr}
      ORDER BY total DESC
    `,
    [],
    "team-efficiency"
  );

  const result = rows.map(r => {
    const total = Number(r.total) || 0;
    const done = Number(r.done) || 0;
    const efficiency = total ? Math.round((done / total) * 10000) / 100 : 0;
    return { ...r, efficiency_pct: efficiency };
  });
  res.json(result);
});

router.get("/sprint-velocity", rbac("superadmin", "admin"), async (req, res) => {
  const { statusCol, sprintCol } = await getSchema();
  const sprintExpr = sprintCol ? `COALESCE(${sprintCol}, 'No Sprint')` : `'No Sprint'`;
  const doneExpr = statusCol ? `SUM(CASE WHEN ${isClosed(statusCol)} THEN 1 ELSE 0 END)` : `0`;

  const rows = await sq(
    `
      SELECT ${sprintExpr} AS sprint,
             COUNT(*) AS total,
             ${doneExpr} AS done
      FROM expanded_factissues
      GROUP BY ${sprintExpr}
      ORDER BY total DESC
    `,
    [],
    "sprint-velocity"
  );

  const result = rows.map(r => {
    const total = Number(r.total) || 0;
    const done = Number(r.done) || 0;
    const velocity = total ? Math.round((done / total) * 10000) / 100 : 0;
    return { ...r, velocity_pct: velocity };
  });
  res.json(result);
});

router.get("/open-aging", rbac("superadmin", "admin"), async (req, res) => {
  const { statusCol, dateCol, issueIdCol, projectIdCol, assigneeTeamCol } = await getSchema();
  if (!dateCol) {
    return res.json({ over7: 0, over14: 0, over30: 0, issues: [] });
  }

  const openClause = statusCol ? `AND ${isOpen(statusCol)}` : "";
  const idCol = issueIdCol || "id";
  const projCol = projectIdCol || "projectid";
  const teamCol = assigneeTeamCol || "assigneeteam";

  const counts = await sq(
    `
      SELECT
        SUM(CASE WHEN age_days >= 7 THEN 1 ELSE 0 END) AS over7,
        SUM(CASE WHEN age_days >= 14 THEN 1 ELSE 0 END) AS over14,
        SUM(CASE WHEN age_days >= 30 THEN 1 ELSE 0 END) AS over30
      FROM (
        SELECT EXTRACT(EPOCH FROM (NOW() - ${dateCol})) / 86400 AS age_days
        FROM expanded_factissues
        WHERE ${dateCol} IS NOT NULL ${openClause}
      ) t
    `,
    [],
    "open-aging-counts"
  );

  const issues = await sq(
    `
        SELECT
          issueid AS issue_id,
          projectid,
          assigneeteam,
          status,
          createddate,
          ROUND((EXTRACT(EPOCH FROM (NOW() - createddate)) / 86400)::numeric, 2) AS age_days
        FROM expanded_factissues
        WHERE createddate IS NOT NULL
        AND LOWER(COALESCE(status,'')) NOT IN 
          ('done','verified','closed','complete','completed','resolved')
        ORDER BY createddate ASC
        LIMIT 10
    `,
    [],
    "open-aging-issues"
  );

  res.json({
    over7: Number(counts[0]?.over7) || 0,
    over14: Number(counts[0]?.over14) || 0,
    over30: Number(counts[0]?.over30) || 0,
    issues,
  });
});

module.exports = router;
