const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// GET /api/users  — used by assignment dropdowns
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

// GET /api/users/all  — full list for admin users management page
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

// GET /api/users/:id/projects — get projects assigned to a user
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

// PUT /api/users/:id/role  — superadmin only
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

// PUT /api/users/:id/status
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


// const express = require("express");
// const router = express.Router();
// // IMPORTANT: Adjust this path to match your other working routes!
// const db = require("../db"); 

// router.get("/", async (req, res) => {
//   try {
//     // 1. Try to fetch from DB
//     // NOTE: If this fails, check if your table is named 'users' or 'Users'
//     const [rows] = await db.query("SELECT id, name, role FROM users");
//     res.json(rows);
//   } catch (err) {
//     console.error("CRITICAL DB ERROR:", err.message);
    
//     // 2. FALLBACK: If DB fails, send an empty array so the frontend doesn't crash
//     // This allows the page to load even if the user list is broken
//     res.status(200).json([]); 
//   }
// });
// module.exports = router;



// const express = require("express");
// const router = express.Router();
// // Adjust this path to where your DB connection is
// const db = require("../db");
// // Get all users for the "Assign Member" dropdown
// router.get("/", async (req, res) => {
//   try {
//     // Replace 'users' with your actual table name if it's different
//     const [users] = await db.execute("SELECT id, name, role FROM users");
//     res.json(users);
//   } catch (err) {
//     console.error("Error fetching users:", err);
//     res.status(500).json({ message: "Failed to fetch users" });
//   }
// });

// module.exports = router;
