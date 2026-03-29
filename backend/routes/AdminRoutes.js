const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");
const rbac    = require("../middleware/rbac");


async function sq(sql, params = [], label = "") {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (err) {
    console.error(`[admin][${label}] ${err.message}`);
    return [];
  }
}

router.use(auth, rbac("superadmin"));

router.get("/system-health", async (req, res) => {
  try {
    const [issuesByStatus, projectCount, userCount, usersByRole, recentActivity] =
      await Promise.all([
        sq(`SELECT COALESCE(status,'Unknown') as status, COUNT(*) as count
            FROM expanded_factissues GROUP BY status ORDER BY count DESC`, [], "status"),
        sq(`SELECT COUNT(*) as c FROM expanded_factprojects`, [], "projCount"),
        sq(`SELECT COUNT(*) as c FROM users`, [], "userCount"),
        sq(`SELECT LOWER(COALESCE(role,'unknown')) as role, COUNT(*) as count
            FROM users GROUP BY LOWER(role) ORDER BY count DESC`, [], "usersByRole"),
 
        sq(`SELECT issueid, sprint, COALESCE(status,'?') as status, assigneeteam, createddate
            FROM expanded_factissues
            ORDER BY createddate DESC LIMIT 10`, [], "recentActivity"),
      ]);

    let activeUsers = 0;
    const au = await sq(`SELECT COUNT(*) as c FROM users WHERE last_active > NOW() - INTERVAL '1 hour'`, [], "activeUsers");
    if (au.length) activeUsers = parseInt(au[0]?.c) || 0;

    res.json({
      activeUsers,
      totalProjects:  parseInt(projectCount[0]?.c) || 0,
      totalUsers:     parseInt(userCount[0]?.c)    || 0,
      usersByRole,
      issuesByStatus,
      recentActivity,
      dbStatus:   "connected",
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[system-health]", err.message);
    res.status(500).json({ message: "Failed to fetch system health", error: err.message });
  }
});

router.get("/audit-logs", async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 30);
  const offset = (page - 1) * limit;

  try {
  
    const result = await pool.query(
      `SELECT al.*, u.email as user_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json(result.rows);
  } catch (_) { }

  const fallback = await sq(
    `SELECT
       issueid::text        as id,
       createddate          as created_at,
       'Issue created · Sprint: ' || COALESCE(sprint,'?') || ' · Status: ' || COALESCE(status,'?') as action,
       'Issue #' || issueid as resource,
       'info'               as level,
       NULL                 as user_name
     FROM expanded_factissues
     WHERE createddate IS NOT NULL
     ORDER BY createddate DESC LIMIT $1 OFFSET $2`,
    [limit, offset], "auditFallback"
  );
  res.json(fallback);
});

router.get("/all-users", async (req, res) => {
  const rows = await sq(
    `SELECT id, email, role, COALESCE(status,'approved') as status,
            name, created_at
     FROM users ORDER BY created_at DESC`,
    [], "allUsers"
  );
  res.json(rows);
});

module.exports = router;
