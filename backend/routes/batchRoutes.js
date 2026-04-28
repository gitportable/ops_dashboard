const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM batch_lots");
    res.json(result.rows);
  } catch (err) {
    console.error("[batchRoutes GET /]", err.message);
    res.status(500).json({ message: "Failed to fetch batches" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM batch_lots WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[batchRoutes GET /:id]", err.message);
    res.status(500).json({ message: "Failed to fetch batch" });
  }
});

router.post("/", rbac("superadmin"), async (req, res) => {
  const {
    lot_number,
    material_type,
    quantity,
    supplier,
    received_date,
    qc_status,
    notes,
    project_id,
    cell_efficiency,
    power_rating_w,
    storage_location,
    rejection_count,
    rejection_reason,
    certificate_number,
  } = req.body || {};

  if (!lot_number) {
    return res.status(400).json({ message: "lot_number is required" });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO batch_lots
          (lot_number, material_type, quantity, supplier, received_date, qc_status, notes, project_id, cell_efficiency, power_rating_w, storage_location, rejection_count, rejection_reason, certificate_number)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
      [
        lot_number,
        material_type || null,
        quantity ?? null,
        supplier || null,
        received_date || null,
        qc_status || null,
        notes || null,
        project_id || null,
        cell_efficiency ?? null,
        power_rating_w ?? null,
        storage_location || null,
        rejection_count ?? null,
        rejection_reason || null,
        certificate_number || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[batchRoutes POST /]", err.message);
    res.status(500).json({ message: "Failed to create batch" });
  }
});

router.put("/:id", rbac("superadmin", "admin"), async (req, res) => {
  const {
    lot_number,
    material_type,
    quantity,
    supplier,
    received_date,
    qc_status,
    notes,
    project_id,
    cell_efficiency,
    power_rating_w,
    storage_location,
    rejection_count,
    rejection_reason,
    certificate_number,
  } = req.body || {};

  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (name, value) => {
    fields.push(`${name} = $${idx++}`);
    values.push(value);
  };

  if (lot_number !== undefined) addField("lot_number", lot_number);
  if (material_type !== undefined) addField("material_type", material_type || null);
  if (quantity !== undefined) addField("quantity", quantity ?? null);
  if (supplier !== undefined) addField("supplier", supplier || null);
  if (received_date !== undefined) addField("received_date", received_date || null);
  if (qc_status !== undefined) addField("qc_status", qc_status || null);
  if (notes !== undefined) addField("notes", notes || null);
  if (project_id !== undefined) addField("project_id", project_id || null);
  if (cell_efficiency !== undefined) addField("cell_efficiency", cell_efficiency ?? null);
  if (power_rating_w !== undefined) addField("power_rating_w", power_rating_w ?? null);
  if (storage_location !== undefined) addField("storage_location", storage_location || null);
  if (rejection_count !== undefined) addField("rejection_count", rejection_count ?? null);
  if (rejection_reason !== undefined) addField("rejection_reason", rejection_reason || null);
  if (certificate_number !== undefined) addField("certificate_number", certificate_number || null);

  if (fields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE batch_lots SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[batchRoutes PUT /:id]", err.message);
    res.status(500).json({ message: "Failed to update batch" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM batch_lots WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[batchRoutes DELETE /:id]", err.message);
    res.status(500).json({ message: "Failed to delete batch" });
  }
});

module.exports = router;
