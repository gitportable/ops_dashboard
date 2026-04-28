const router = require("express").Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         m.*,
         u.name AS assigned_technician_name
       FROM machines m
       LEFT JOIN users u ON u.id = m.assigned_technician
       ORDER BY m.id DESC`
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("machines list error:", err.message);
    return res.status(500).json({ message: "Failed to fetch machines" });
  }
});

router.get("/:id/issues", async (req, res) => {
  const { id } = req.params;

  try {
    const hasMachineIdColumn = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'expanded_factissues'
           AND column_name = 'machine_id'
       ) AS exists`
    );

    if (hasMachineIdColumn.rows[0]?.exists) {
      const direct = await pool.query(
        `SELECT *
         FROM expanded_factissues
         WHERE machine_id = $1
         ORDER BY createddate DESC NULLS LAST`,
        [id]
      );
      return res.status(200).json(direct.rows);
    }

    const hasMappingTable = await pool.query(
      `SELECT to_regclass('public.issue_machine_links') IS NOT NULL AS exists`
    );

    if (hasMappingTable.rows[0]?.exists) {
      try {
        const mappedByIssueId = await pool.query(
          `SELECT i.*
           FROM issue_machine_links l
           JOIN expanded_factissues i ON i.issueid::text = l.issue_id::text
           WHERE l.machine_id = $1
           ORDER BY i.createddate DESC NULLS LAST`,
          [id]
        );
        return res.status(200).json(mappedByIssueId.rows);
      } catch {
        const mappedByIssueid = await pool.query(
          `SELECT i.*
           FROM issue_machine_links l
           JOIN expanded_factissues i ON i.issueid::text = l.issueid::text
           WHERE l.machine_id = $1
           ORDER BY i.createddate DESC NULLS LAST`,
          [id]
        );
        return res.status(200).json(mappedByIssueid.rows);
      }
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error("machine issues fetch error:", err.message);
    return res.status(500).json({ message: "Failed to fetch machine issues" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         m.*,
         u.name AS assigned_technician_name
       FROM machines m
       LEFT JOIN users u ON u.id = m.assigned_technician
       WHERE m.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Machine not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("machine get error:", err.message);
    return res.status(500).json({ message: "Failed to fetch machine" });
  }
});

router.post("/", rbac("admin", "superadmin"), async (req, res) => {
  const {
    machine_code,
    machine_name,
    location,
    machine_type,
    status,
    project_id,
    manufacturer,
    model_number,
    serial_number,
    capacity_per_hour,
    power_consumption_kw,
    purchase_date,
    warranty_expiry,
    last_maintenance_date,
    next_maintenance_due,
    maintenance_frequency_days,
    assigned_technician,
    production_stage,
    efficiency_rating,
    notes,
  } = req.body || {};

  try {
    const result = await pool.query(
      `INSERT INTO machines
        (machine_code, machine_name, location, machine_type, status, project_id,
         manufacturer, model_number, serial_number, capacity_per_hour, power_consumption_kw,
         purchase_date, warranty_expiry, last_maintenance_date, next_maintenance_due,
         maintenance_frequency_days, assigned_technician, production_stage, efficiency_rating, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        machine_code || null,
        machine_name || null,
        location || null,
        machine_type || null,
        status || null,
        project_id || null,
        manufacturer || null,
        model_number || null,
        serial_number || null,
        capacity_per_hour || null,
        power_consumption_kw || null,
        purchase_date || null,
        warranty_expiry || null,
        last_maintenance_date || null,
        next_maintenance_due || null,
        maintenance_frequency_days || null,
        assigned_technician || null,
        production_stage || null,
        efficiency_rating || null,
        notes || null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("machine create error:", err.message);
    return res.status(500).json({ message: "Failed to create machine" });
  }
});

router.put("/:id", rbac("admin", "superadmin"), async (req, res) => {
  const { id } = req.params;
  const {
    machine_code,
    machine_name,
    location,
    machine_type,
    status,
    project_id,
    manufacturer,
    model_number,
    serial_number,
    capacity_per_hour,
    power_consumption_kw,
    purchase_date,
    warranty_expiry,
    last_maintenance_date,
    next_maintenance_due,
    maintenance_frequency_days,
    assigned_technician,
    production_stage,
    efficiency_rating,
    notes,
  } = req.body || {};

  try {
    const result = await pool.query(
      `UPDATE machines
       SET machine_code = COALESCE($1, machine_code),
           machine_name = COALESCE($2, machine_name),
           location = COALESCE($3, location),
           machine_type = COALESCE($4, machine_type),
           status = COALESCE($5, status),
           project_id = COALESCE($6, project_id),
           manufacturer = COALESCE($7, manufacturer),
           model_number = COALESCE($8, model_number),
           serial_number = COALESCE($9, serial_number),
           capacity_per_hour = COALESCE($10, capacity_per_hour),
           power_consumption_kw = COALESCE($11, power_consumption_kw),
           purchase_date = COALESCE($12, purchase_date),
           warranty_expiry = COALESCE($13, warranty_expiry),
           last_maintenance_date = COALESCE($14, last_maintenance_date),
           next_maintenance_due = COALESCE($15, next_maintenance_due),
           maintenance_frequency_days = COALESCE($16, maintenance_frequency_days),
           assigned_technician = COALESCE($17, assigned_technician),
           production_stage = COALESCE($18, production_stage),
           efficiency_rating = COALESCE($19, efficiency_rating),
           notes = COALESCE($20, notes)
       WHERE id = $21
       RETURNING *`,
      [
        machine_code,
        machine_name,
        location,
        machine_type,
        status,
        project_id,
        manufacturer,
        model_number,
        serial_number,
        capacity_per_hour,
        power_consumption_kw,
        purchase_date,
        warranty_expiry,
        last_maintenance_date,
        next_maintenance_due,
        maintenance_frequency_days,
        assigned_technician,
        production_stage,
        efficiency_rating,
        notes,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Machine not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("machine update error:", err.message);
    return res.status(500).json({ message: "Failed to update machine" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM machines
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Machine not found" });
    }

    return res.status(200).json({ message: "Machine deleted" });
  } catch (err) {
    console.error("machine delete error:", err.message);
    return res.status(500).json({ message: "Failed to delete machine" });
  }
});

module.exports = router;
