const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");
const rbac    = require("../middleware/rbac");

// Local safeQuery helper
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

// ── GET /api/admin/system-health ─────────────────────────────────────────────
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
        // Recent issue activity (last 10) as a proxy for system activity
        sq(`SELECT issueid, sprint, COALESCE(status,'?') as status, assigneeteam, createddate
            FROM expanded_factissues
            ORDER BY createddate DESC LIMIT 10`, [], "recentActivity"),
      ]);

    // Try last_active if column exists
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

// ── GET /api/admin/audit-logs?page=1&limit=30 ────────────────────────────────
// Tries real audit_logs table; falls back to recent issue activity
router.get("/audit-logs", async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 30);
  const offset = (page - 1) * limit;

  try {
    // Try the real audit_logs table
    const result = await pool.query(
      `SELECT al.*, u.email as user_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json(result.rows);
  } catch (_) { /* table doesn't exist — fall through */ }

  // Fallback: use recent issue creates/updates as synthetic activity
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

// ── GET /api/admin/all-users — used by superadmin user management ─────────────
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