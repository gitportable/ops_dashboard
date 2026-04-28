const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(authenticateToken);

// Vendors
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vendors");
    res.json(result.rows);
  } catch (err) {
    console.error("[vendorRoutes GET /]", err.message);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

router.post("/", rbac("superadmin"), async (req, res) => {
  const { name, contact_name, contact_email, contact_phone, address, notes } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }
  try {
    const result = await pool.query(
      `
        INSERT INTO vendors (name, contact_name, contact_email, contact_phone, address, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        name,
        contact_name || null,
        contact_email || null,
        contact_phone || null,
        address || null,
        notes || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes POST /]", err.message);
    res.status(500).json({ message: "Failed to create vendor" });
  }
});

router.put("/:id", rbac("superadmin"), async (req, res) => {
  const { name, contact_name, contact_email, contact_phone, address, notes } = req.body || {};
  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (field, value) => {
    fields.push(`${field} = $${idx++}`);
    values.push(value);
  };

  if (name !== undefined) addField("name", name);
  if (contact_name !== undefined) addField("contact_name", contact_name || null);
  if (contact_email !== undefined) addField("contact_email", contact_email || null);
  if (contact_phone !== undefined) addField("contact_phone", contact_phone || null);
  if (address !== undefined) addField("address", address || null);
  if (notes !== undefined) addField("notes", notes || null);

  if (fields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE vendors SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes PUT /:id]", err.message);
    res.status(500).json({ message: "Failed to update vendor" });
  }
});

router.delete("/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vendors WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[vendorRoutes DELETE /:id]", err.message);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
});

// Vendor Issues
router.get("/:id/issues", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vendor_issues WHERE vendor_id = $1",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[vendorRoutes GET /:id/issues]", err.message);
    res.status(500).json({ message: "Failed to fetch vendor issues" });
  }
});

router.post("/:id/issues", rbac("superadmin", "admin"), async (req, res) => {
  const {
    issue_type,
    description,
    severity,
    impact_area,
    quantity_affected,
    estimated_loss,
    due_date,
    resolution_notes,
  } = req.body || {};
  if (!issue_type || !description || !severity) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const result = await pool.query(
      `
        INSERT INTO vendor_issues (
          vendor_id,
          issue_type,
          description,
          severity,
          impact_area,
          quantity_affected,
          estimated_loss,
          due_date,
          resolution_notes,
          reported_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        req.params.id,
        issue_type,
        description,
        severity,
        impact_area || null,
        quantity_affected === "" ? null : quantity_affected ?? null,
        estimated_loss === "" ? null : estimated_loss ?? null,
        due_date || null,
        resolution_notes || null,
        req.user.userId,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes POST /:id/issues]", err.message);
    res.status(500).json({ message: "Failed to create vendor issue" });
  }
});

router.put("/issues/:issueId", rbac("superadmin", "admin"), async (req, res) => {
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ message: "status is required" });
  }
  try {
    const result = await pool.query(
      "UPDATE vendor_issues SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.issueId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes PUT /issues/:issueId]", err.message);
    res.status(500).json({ message: "Failed to update vendor issue" });
  }
});

// Purchase Orders
router.get("/purchase-orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM purchase_orders");
    res.json(result.rows);
  } catch (err) {
    console.error("[vendorRoutes GET /purchase-orders]", err.message);
    res.status(500).json({ message: "Failed to fetch purchase orders" });
  }
});

router.post("/purchase-orders", rbac("superadmin", "admin"), async (req, res) => {
  const {
    po_number,
    vendor_id,
    amount,
    status,
    expected_date,
    project_id,
    gst_number,
    invoice_number,
    payment_terms,
    delivery_address,
    material_category,
    quantity,
    unit_price,
    tax_amount,
    total_amount,
    payment_status,
    received_date,
    quality_check_status,
    remarks,
  } = req.body || {};
  if (!po_number || !vendor_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const result = await pool.query(
      `
        INSERT INTO purchase_orders
          (
            po_number,
            vendor_id,
            amount,
            status,
            expected_date,
            project_id,
            gst_number,
            invoice_number,
            payment_terms,
            delivery_address,
            material_category,
            quantity,
            unit_price,
            tax_amount,
            total_amount,
            payment_status,
            received_date,
            quality_check_status,
            remarks
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `,
      [
        po_number,
        vendor_id,
        amount ?? null,
        status || null,
        expected_date || null,
        project_id || null,
        gst_number || null,
        invoice_number || null,
        payment_terms || null,
        delivery_address || null,
        material_category || null,
        quantity === "" ? null : quantity ?? null,
        unit_price === "" ? null : unit_price ?? null,
        tax_amount === "" ? null : tax_amount ?? null,
        total_amount === "" ? null : total_amount ?? null,
        payment_status || null,
        received_date || null,
        quality_check_status || null,
        remarks || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes POST /purchase-orders]", err.message);
    res.status(500).json({ message: "Failed to create purchase order" });
  }
});

router.put("/purchase-orders/:id", rbac("superadmin", "admin"), async (req, res) => {
  const {
    po_number,
    vendor_id,
    amount,
    status,
    expected_date,
    project_id,
    gst_number,
    invoice_number,
    payment_terms,
    delivery_address,
    material_category,
    quantity,
    unit_price,
    tax_amount,
    total_amount,
    payment_status,
    received_date,
    quality_check_status,
    remarks,
  } = req.body || {};
  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (field, value) => {
    fields.push(`${field} = $${idx++}`);
    values.push(value);
  };

  if (po_number !== undefined) addField("po_number", po_number);
  if (vendor_id !== undefined) addField("vendor_id", vendor_id);
  if (amount !== undefined) addField("amount", amount ?? null);
  if (status !== undefined) addField("status", status || null);
  if (expected_date !== undefined) addField("expected_date", expected_date || null);
  if (project_id !== undefined) addField("project_id", project_id || null);
  if (gst_number !== undefined) addField("gst_number", gst_number || null);
  if (invoice_number !== undefined) addField("invoice_number", invoice_number || null);
  if (payment_terms !== undefined) addField("payment_terms", payment_terms || null);
  if (delivery_address !== undefined) addField("delivery_address", delivery_address || null);
  if (material_category !== undefined) addField("material_category", material_category || null);
  if (quantity !== undefined) addField("quantity", quantity === "" ? null : quantity ?? null);
  if (unit_price !== undefined) addField("unit_price", unit_price === "" ? null : unit_price ?? null);
  if (tax_amount !== undefined) addField("tax_amount", tax_amount === "" ? null : tax_amount ?? null);
  if (total_amount !== undefined) addField("total_amount", total_amount === "" ? null : total_amount ?? null);
  if (payment_status !== undefined) addField("payment_status", payment_status || null);
  if (received_date !== undefined) addField("received_date", received_date || null);
  if (quality_check_status !== undefined) addField("quality_check_status", quality_check_status || null);
  if (remarks !== undefined) addField("remarks", remarks || null);

  if (fields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE purchase_orders SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[vendorRoutes PUT /purchase-orders/:id]", err.message);
    res.status(500).json({ message: "Failed to update purchase order" });
  }
});

router.delete("/purchase-orders/:id", rbac("superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM purchase_orders WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[vendorRoutes DELETE /purchase-orders/:id]", err.message);
    res.status(500).json({ message: "Failed to delete purchase order" });
  }
});

module.exports = router;
