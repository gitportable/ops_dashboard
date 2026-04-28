const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

const VALID_STAGES = ["Raw Material", "Cell", "Module", "Testing", "Dispatch"];
const VALID_STATUSES = ["Open", "In Progress", "Completed", "On Hold", "Cancelled"];

const isValidStage = (stage) => VALID_STAGES.includes(stage);
const isValidStatus = (status) => VALID_STATUSES.includes(status);

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wo.*, COALESCE(u.name, u.email) AS assigned_to_name, m.machine_name
      FROM work_orders wo
      LEFT JOIN users u ON u.id = wo.assigned_to
      LEFT JOIN machines m ON m.id = wo.machine_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("[workOrderRoutes GET /]", err.message);
    res.status(500).json({ message: "Failed to fetch work orders" });
  }
});

router.get("/project/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT wo.*, COALESCE(u.name, u.email) AS assigned_to_name
        FROM work_orders wo
        LEFT JOIN users u ON u.id = wo.assigned_to
        WHERE wo.project_id = $1
      `,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[workOrderRoutes GET /project/:projectId]", err.message);
    res.status(500).json({ message: "Failed to fetch project work orders" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT wo.*, COALESCE(u.name, u.email) AS assigned_to_name
        FROM work_orders wo
        LEFT JOIN users u ON u.id = wo.assigned_to
        WHERE wo.id = $1
      `,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Work order not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[workOrderRoutes GET /:id]", err.message);
    res.status(500).json({ message: "Failed to fetch work order" });
  }
});

router.post("/", rbac("superadmin", "admin"), async (req, res) => {
  const {
    wo_number,
    batch_lot,
    project_id,
    stage,
    status,
    description,
    assigned_to,
    priority,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    machine_id,
    supervisor,
    team_size,
    target_units,
    completed_units,
    rejection_count,
    remarks,
    shift,
  } = req.body || {};

  if (!wo_number || !project_id || !stage || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!isValidStage(stage)) {
    return res.status(400).json({ message: "Invalid stage" });
  }
  if (!isValidStatus(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO work_orders
          (wo_number, batch_lot, project_id, stage, status, description, assigned_to, created_by,
           priority, planned_start_date, planned_end_date, actual_start_date, actual_end_date,
           machine_id, supervisor, team_size, target_units, completed_units, rejection_count,
           remarks, shift)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19,
           $20, $21)
        RETURNING *
      `,
      [
        wo_number,
        batch_lot || null,
        project_id,
        stage,
        status,
        description || null,
        assigned_to || null,
        req.user.userId,
        priority || null,
        planned_start_date || null,
        planned_end_date || null,
        actual_start_date || null,
        actual_end_date || null,
        machine_id || null,
        supervisor || null,
        team_size ?? null,
        target_units ?? null,
        completed_units ?? null,
        rejection_count ?? null,
        remarks || null,
        shift || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[workOrderRoutes POST /]", err.message);
    res.status(500).json({ message: "Failed to create work order" });
  }
});

router.put("/:id", rbac("superadmin", "admin", "developer"), async (req, res) => {
  const {
    wo_number,
    batch_lot,
    project_id,
    stage,
    status,
    description,
    assigned_to,
    priority,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    machine_id,
    supervisor,
    team_size,
    target_units,
    completed_units,
    rejection_count,
    remarks,
    shift,
  } = req.body || {};

  if (stage !== undefined && !isValidStage(stage)) {
    return res.status(400).json({ message: "Invalid stage" });
  }
  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (name, value) => {
    fields.push(`${name} = $${idx++}`);
    values.push(value);
  };

  if (wo_number !== undefined) addField("wo_number", wo_number);
  if (batch_lot !== undefined) addField("batch_lot", batch_lot || null);
  if (project_id !== undefined) addField("project_id", project_id);
  if (stage !== undefined) addField("stage", stage);
  if (status !== undefined) addField("status", status);
  if (description !== undefined) addField("description", description || null);
  if (assigned_to !== undefined) addField("assigned_to", assigned_to || null);
  if (priority !== undefined) addField("priority", priority || null);
  if (planned_start_date !== undefined) addField("planned_start_date", planned_start_date || null);
  if (planned_end_date !== undefined) addField("planned_end_date", planned_end_date || null);
  if (actual_start_date !== undefined) addField("actual_start_date", actual_start_date || null);
  if (actual_end_date !== undefined) addField("actual_end_date", actual_end_date || null);
  if (machine_id !== undefined) addField("machine_id", machine_id || null);
  if (supervisor !== undefined) addField("supervisor", supervisor || null);
  if (team_size !== undefined) addField("team_size", team_size ?? null);
  if (target_units !== undefined) addField("target_units", target_units ?? null);
  if (completed_units !== undefined) addField("completed_units", completed_units ?? null);
  if (rejection_count !== undefined) addField("rejection_count", rejection_count ?? null);
  if (remarks !== undefined) addField("remarks", remarks || null);
  if (shift !== undefined) addField("shift", shift || null);

  if (fields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  fields.push("updated_at = NOW()");
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE work_orders SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Work order not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[workOrderRoutes PUT /:id]", err.message);
    res.status(500).json({ message: "Failed to update work order" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM work_orders WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Work order not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[workOrderRoutes DELETE /:id]", err.message);
    res.status(500).json({ message: "Failed to delete work order" });
  }
});

module.exports = router;
