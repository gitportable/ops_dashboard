const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, role, COALESCE(name, email) AS name FROM users ORDER BY email"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[userRoutes /]", err.message);
    res.json([]);
  }
});
router.get("/all", auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        COALESCE(u.name, u.email) AS name,
        u.email,
        LOWER(COALESCE(u.role,'unknown')) AS role,
        COALESCE(u.status,'approved')     AS status,
        u.created_at,
        COUNT(DISTINCT pa.project_id)     AS project_count
      FROM users u
      LEFT JOIN project_assignments pa ON pa.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.role, u.status, u.created_at
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("[userRoutes /all]", err.message);
    try {
      const r2 = await pool.query(
        `SELECT id, COALESCE(name,email) AS name, email,
                LOWER(COALESCE(role,'unknown')) AS role,
                COALESCE(status,'approved') AS status, created_at
         FROM users ORDER BY created_at DESC`
      );
      res.json(r2.rows);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
});

router.get("/:id/projects", auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.projectid as id, p.projectname as name, COALESCE(p.status, 'Active') as status, 
             COALESCE(p.budgetallocated, 0) as budgetallocated, COALESCE(p.budgetused, 0) as budgetused
      FROM project_assignments pa
      JOIN expanded_factprojects p ON pa.project_id::text = p.projectid::text
      WHERE pa.user_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("[userRoutes /:id/projects]", err.message);
    res.status(500).json({ message: "Failed to fetch user projects" });
  }
});

router.put("/:id/role", auth, async (req, res) => {
  try {
    if ((req.user.role||"").toLowerCase() !== "superadmin")
      return res.status(403).json({ message: "SuperAdmin only" });
    const { role } = req.body;
    if (!["developer","tester","admin","superadmin"].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, req.params.id]);
    res.json({ message: "Role updated" });
  } catch (err) { res.status(500).json({ message: "Failed to update role" }); }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    const callerRole = (req.user.role||"").toLowerCase();
    if (!["admin","superadmin"].includes(callerRole))
      return res.status(403).json({ message: "Admin only" });
    const { status } = req.body;
    if (!["approved","rejected","suspended","pending"].includes(status))
      return res.status(400).json({ message: "Invalid status" });
    await pool.query("UPDATE users SET status=$1 WHERE id=$2", [status, req.params.id]);
    res.json({ message: "Status updated" });
  } catch (err) { res.status(500).json({ message: "Failed to update status" }); }
});

module.exports = router;
