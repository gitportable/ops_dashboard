
const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const rbac       = require("../middleware/rbac");
const controller = require("../controllers/projectController");
const pool       = require("../db");

router.use(auth);
router.get("/all", rbac("admin", "superadmin"), controller.getAllProjects);
router.get("/my-projects", controller.getMyProjects);
router.get("/users", rbac("admin", "superadmin"), controller.getUsers);
router.post("/assign", rbac("admin", "superadmin"), controller.assignUserToProject);
router.post("/instant-assign", rbac("admin", "superadmin"), controller.instantAssign);
router.put("/approve-sprint-request", rbac("admin", "superadmin"), controller.approveSprintRequest);
router.post("/", rbac("admin", "superadmin"), async (req, res) => {
  const { projectname, projectid, status, startdate, budgetallocated, budgetused, memberIds } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO expanded_factprojects
       (projectname, projectid, status, startdate, budgetallocated, budgetused, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [projectname, projectid, status, startdate, budgetallocated, budgetused]
    );

    const newProjectId = result.rows[0].projectid;

    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const assignValues = memberIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      const assignParams = [newProjectId, ...memberIds];
      await pool.query(
        `INSERT INTO project_assignments (project_id, user_id) VALUES ${assignValues} ON CONFLICT DO NOTHING`,
        assignParams
      );
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Project ID already exists" });
    }
    return res.status(500).json({ message: "Failed to create project" });
  }
});
router.get("/:projectId/stats", controller.getProjectStats);
router.get("/:projectId/insights", controller.getProjectInsights);
router.post("/:projectId/request-change", controller.requestProjectChange);
router.post("/:projectId/sprint-request", controller.submitSprintRequest);
router.put("/:projectId/budget", rbac("admin", "superadmin"), async (req, res) => {
  const { projectId } = req.params;
  const { budget_used } = req.body || {};

  try {
    const result = await pool.query(
      `UPDATE expanded_factprojects
       SET budgetused = $1, budget_used = $1
       WHERE projectid = $2
       RETURNING *`,
      [budget_used, projectId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update project budget" });
  }
});

router.get("/:projectId/members", async (req, res) => {
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, pa.created_at as assigned_at
       FROM project_assignments pa
       JOIN users u ON pa.user_id = u.id
       WHERE TRIM(pa.project_id) = TRIM($1)`,
      [projectId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch project members" });
  }
});

router.get("/:projectId", controller.getProject);
router.put("/:projectId", rbac("admin", "superadmin"), controller.updateProject);
router.delete("/:projectId", rbac("superadmin"), controller.deleteProject);
module.exports = router;
