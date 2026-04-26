
const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const rbac       = require("../middleware/rbac");
const controller = require("../controllers/projectController");

router.use(auth);

// ── IMPORTANT: Specific named paths MUST come before /:projectId ──────────

// GET all projects (admin/superadmin)
router.get("/all", rbac("admin", "superadmin"), controller.getAllProjects);

// GET my assigned projects (developer/tester)
router.get("/my-projects", controller.getMyProjects);

// GET user list for assign-member dropdown
router.get("/users", rbac("admin", "superadmin"), controller.getUsers);

// POST assign user to project
router.post("/assign", rbac("admin", "superadmin"), controller.assignUserToProject);

// POST instant-assign by email
router.post("/instant-assign", rbac("admin", "superadmin"), controller.instantAssign);

// PUT approve sprint/change request
router.put("/approve-sprint-request", rbac("admin", "superadmin"), controller.approveSprintRequest);

// ── Parameterized routes (must come AFTER named routes above) ─────────────

// GET project stats (for Dashboard charts by project)
router.get("/:projectId/stats", controller.getProjectStats);

// GET project insights
router.get("/:projectId/insights", controller.getProjectInsights);

// GET project members (users assigned to this project)
router.get("/:projectId/members", controller.getProjectMembers);

// POST request change
router.post("/:projectId/request-change", controller.requestProjectChange);

// POST sprint request
router.post("/:projectId/sprint-request", controller.submitSprintRequest);

// GET single project
router.get("/:projectId", controller.getProject);

// PUT update project (admin/superadmin)
router.put("/:projectId", rbac("admin", "superadmin"), controller.updateProject);

// DELETE project (superadmin only)
router.delete("/:projectId", rbac("superadmin"), controller.deleteProject);

module.exports = router;



// const express = require('express');
// const router = express.Router();

// // FIXED: Pointing to 'auth.js' instead of 'authMiddleware.js'
// const authMiddleware = require('../middleware/auth'); 
// const projectController = require('../controllers/projectController');

// // Apply the middleware to all routes
// router.use(authMiddleware);

// // --- Project Routes ---
// router.get('/my-projects', projectController.getMyProjects);
// router.get('/all', projectController.getAllProjects);
// router.get('/:projectId', projectController.getProject);

// // --- Assignment & Admin Routes ---
// router.post('/assign', projectController.assignUserToProject);
// router.post('/instant-assign', projectController.instantAssign);

// // --- Request & Insight Routes ---
// router.post('/:projectId/request-change', projectController.requestProjectChange);
// router.post('/:projectId/sprint-request', projectController.submitSprintRequest);
// router.put('/approve-sprint-request', projectController.approveSprintRequest);
// router.get('/:projectId/insights', projectController.getProjectInsights);

// module.exports = router;









// const express = require('express');
// const router = express.Router();
// const  authMiddleware  = require('../middleware/authMiddleware');
// const projectController = require('../controllers/projectController');
// const authenticateToken = require('../middleware/auth');

// // Protect all routes
// router.use(authenticateToken);

// // My assigned projects (tester/developer)
// router.get('/my-projects', projectController.getMyProjects);

// // All projects (admin/superadmin)
// router.get('/all', projectController.getAllProjects);

// // Single project
// router.get('/:projectId', projectController.getProject);

// // Assign user (admin/superadmin)
// router.post('/assign', projectController.assignUserToProject);

// // Request change (tester/developer)
// router.post('/:projectId/request-change', projectController.requestProjectChange);

// // Sprint request (tester/developer)
// router.post('/:projectId/sprint-request', projectController.submitSprintRequest);

// // Approve request (admin/superadmin)
// router.put('/approve-sprint-request', projectController.approveSprintRequest);
// router.put('/:projectId', projectController.requestProjectChange);
// // Insights (monthly bugs/tasks, duration)
// router.get('/:projectId/insights', projectController.getProjectInsights);
// router.post('/instant-assign', authMiddleware, projectController.instantAssign);
// router.post("/assign-member", async (req, res) => {
//   const { projectId, userId } = req.body;
  
//   try {
//     await db.query(
//       "INSERT INTO project_members (project_id, user_id) VALUES (?, ?)", 
//       [projectId, userId]
//     );
//     res.json({ message: "Member assigned successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Assignment failed" });
//   }
// });
// module.exports = router;















































































// const express = require('express');
// const router = express.Router();

// const projectController = require('../controllers/projectController');
// const authenticateToken = require('../middleware/auth'); // ← FIXED: default import

// // Apply authentication to ALL routes
// router.use(authenticateToken);

// // Get my assigned projects (all authenticated users)
// router.get('/my-projects', projectController.getMyProjects);

// // Get all projects (admin/superadmin only)
// router.get('/all', projectController.getAllProjects);

// // Get single project
// router.get('/:projectId', projectController.getProject);

// // Assign user to project (admin/superadmin only)
// router.post('/assign', projectController.assignUserToProject);
// router.post('/:projectId/sprint-request', authenticateToken, projectController.submitSprintRequest);
// router.put('/approve-sprint-request', authenticateToken, projectController.approveSprintRequest);
// // Request change (dev/tester/lead)
// router.post('/:projectId/request-change', projectController.requestProjectChange);
// // Add to your existing projectRoutes.js
// router.post('/:projectId/sprint-request', authenticateToken, projectController.submitSprintRequest);
// router.put('/approve-sprint', authenticateToken, projectController.approveSprintRequest);
// router.get('/:projectId/insights', authenticateToken, projectController.getProjectInsights);
// module.exports = router;




// const router = require("express").Router();
// const pool = require("../db");
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// const { filterProjectFields } = require("../middleware/fieldFilter");
// const controller = require("../controllers/projectController");

// // GET all projects
// router.get(
//   "/",
//   auth,
//   rbac("superadmin", "admin"),
//   async (req, res) => {
//     try {
//       const result = await pool.query(
//         "SELECT * FROM expanded_factprojects ORDER BY projectid"
//       );
//       res.json(result.rows);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Failed to fetch projects" });
//     }
//   }
// );

// // UPDATE project
// router.put(
//   "/:id",
//   auth,
//   rbac("superadmin", "admin"),
//   filterProjectFields,
//   controller.updateProject
// );

// module.exports = router;

// const router = require("express").Router();
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// const { filterProjectFields } = require("../middleware/fieldFilter");
// const controller = require("../controllers/projectController");

// // ← Add this new GET route here (after router is defined)
// router.get(
//   "/",
//   auth,
//   rbac("superadmin", "admin"),
//   async (req, res) => {
//     try {
//       const result = await pool.query(
//         "SELECT * FROM expanded_factprojects ORDER BY projectid"
//       );
//       res.json(result.rows);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Failed to fetch projects" });
//     }
//   }
// );

// // Your existing PUT route should stay below
// router.put(
//   "/:id",
//   auth,
//   rbac("superadmin", "admin"),
//   filterProjectFields,
//   controller.updateProject
// );

// module.exports = router;
