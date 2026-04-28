const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workflow_templates");
    res.json(result.rows);
  } catch (err) {
    console.error("[workflowRoutes GET /]", err.message);
    res.status(500).json({ message: "Failed to fetch workflow templates" });
  }
});

router.post("/", rbac("superadmin"), async (req, res) => {
  const { name, description, steps } = req.body;
  if (typeof name !== "string" || name.trim() === "" || !Array.isArray(steps)) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO workflow_templates (name, description, steps, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
      [name.trim(), description ?? null, JSON.stringify(steps), req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[workflowRoutes POST /]", err.message);
    res.status(500).json({ message: "Failed to create workflow template" });
  }
});

router.put("/:id", rbac("superadmin"), async (req, res) => {
  const { name, description, steps } = req.body;
  if (typeof name !== "string" || name.trim() === "" || !Array.isArray(steps)) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const result = await pool.query(
      "UPDATE workflow_templates SET name = $1, description = $2, steps = $3 WHERE id = $4 RETURNING *",
      [name.trim(), description ?? null, JSON.stringify(steps), req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Workflow template not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[workflowRoutes PUT /:id]", err.message);
    res.status(500).json({ message: "Failed to update workflow template" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM workflow_templates WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Workflow template not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[workflowRoutes DELETE /:id]", err.message);
    res.status(500).json({ message: "Failed to delete workflow template" });
  }
});

module.exports = router;
