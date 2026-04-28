const router = require("express").Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");

const getUserId = (req) => req.user?.userId || req.user?.id;

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM field_tickets
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("field tickets list error:", err.message);
    return res.status(500).json({ message: "Failed to fetch field tickets" });
  }
});

router.get("/project/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM field_tickets
       WHERE project_id::text = $1
       ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("field tickets by project error:", err.message);
    return res.status(500).json({ message: "Failed to fetch project field tickets" });
  }
});

router.post("/", rbac("admin", "superadmin"), async (req, res) => {
  const {
    ticket_type,
    customer_name,
    contact_number,
    state,
    city,
    plant_capacity_kw,
    site_name,
    location,
    description,
    resolution_notes,
    sla_due_date,
    escalation_level,
    no_of_panels,
    inverter_model,
    commissioning_date,
    last_service_date,
    next_service_due,
    amc_contract_number,
    claim_number,
    component_failed,
    failure_date,
    replacement_approved,
    status,
    priority,
    assigned_to,
    project_id,
    warranty_expiry,
  } = req.body || {};

  try {
    const result = await pool.query(
      `INSERT INTO field_tickets
        (ticket_type, customer_name, contact_number, state, city, plant_capacity_kw,
         site_name, location, description, resolution_notes, sla_due_date, escalation_level,
         no_of_panels, inverter_model, commissioning_date, last_service_date, next_service_due,
         amc_contract_number, claim_number, component_failed, failure_date, replacement_approved,
         status, priority, assigned_to, project_id, warranty_expiry, created_by)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING *`,
      [
        ticket_type || null,
        customer_name || null,
        contact_number || null,
        state || null,
        city || null,
        plant_capacity_kw || null,
        site_name || null,
        location || null,
        description || null,
        resolution_notes || null,
        sla_due_date || null,
        escalation_level || "None",
        no_of_panels || null,
        inverter_model || null,
        commissioning_date || null,
        last_service_date || null,
        next_service_due || null,
        amc_contract_number || null,
        claim_number || null,
        component_failed || null,
        failure_date || null,
        replacement_approved ?? null,
        status || "Open",
        priority || "Medium",
        assigned_to || null,
        project_id || null,
        warranty_expiry || null,
        getUserId(req),
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("field ticket create error:", err.message);
    return res.status(500).json({ message: "Failed to create field ticket" });
  }
});

router.put("/:id", rbac("admin", "superadmin", "developer"), async (req, res) => {
  const {
    ticket_type,
    customer_name,
    contact_number,
    state,
    city,
    plant_capacity_kw,
    site_name,
    location,
    description,
    resolution_notes,
    sla_due_date,
    escalation_level,
    no_of_panels,
    inverter_model,
    commissioning_date,
    last_service_date,
    next_service_due,
    amc_contract_number,
    claim_number,
    component_failed,
    failure_date,
    replacement_approved,
    status,
    priority,
    assigned_to,
    project_id,
    warranty_expiry,
  } = req.body || {};

  try {
    const isResolved = (status || "").toLowerCase() === "resolved";
    const result = await pool.query(
      `UPDATE field_tickets
       SET ticket_type = COALESCE($1, ticket_type),
           customer_name = COALESCE($2, customer_name),
           contact_number = COALESCE($3, contact_number),
           state = COALESCE($4, state),
           city = COALESCE($5, city),
           plant_capacity_kw = COALESCE($6, plant_capacity_kw),
           site_name = COALESCE($7, site_name),
           location = COALESCE($8, location),
           description = COALESCE($9, description),
           resolution_notes = COALESCE($10, resolution_notes),
           sla_due_date = COALESCE($11, sla_due_date),
           escalation_level = COALESCE($12, escalation_level),
           no_of_panels = COALESCE($13, no_of_panels),
           inverter_model = COALESCE($14, inverter_model),
           commissioning_date = COALESCE($15, commissioning_date),
           last_service_date = COALESCE($16, last_service_date),
           next_service_due = COALESCE($17, next_service_due),
           amc_contract_number = COALESCE($18, amc_contract_number),
           claim_number = COALESCE($19, claim_number),
           component_failed = COALESCE($20, component_failed),
           failure_date = COALESCE($21, failure_date),
           replacement_approved = COALESCE($22, replacement_approved),
           status = COALESCE($23, status),
           priority = COALESCE($24, priority),
           assigned_to = COALESCE($25, assigned_to),
           project_id = COALESCE($26, project_id),
           warranty_expiry = COALESCE($27, warranty_expiry),
           resolved_at = CASE WHEN $28 THEN NOW() ELSE resolved_at END
       WHERE id = $29
       RETURNING *`,
      [
        ticket_type,
        customer_name,
        contact_number,
        state,
        city,
        plant_capacity_kw,
        site_name,
        location,
        description,
        resolution_notes,
        sla_due_date,
        escalation_level,
        no_of_panels,
        inverter_model,
        commissioning_date,
        last_service_date,
        next_service_due,
        amc_contract_number,
        claim_number,
        component_failed,
        failure_date,
        replacement_approved,
        status,
        priority,
        assigned_to,
        project_id,
        warranty_expiry,
        isResolved,
        req.params.id,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("field ticket update error:", err.message);
    return res.status(500).json({ message: "Failed to update field ticket" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM field_tickets WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found" });
    return res.json({ message: "Ticket deleted" });
  } catch (err) {
    console.error("field ticket delete error:", err.message);
    return res.status(500).json({ message: "Failed to delete field ticket" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM field_tickets WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("field ticket get error:", err.message);
    return res.status(500).json({ message: "Failed to fetch ticket" });
  }
});

module.exports = router;
