const pool = require("../db");

const sq = async (q, params = [], name = "query") => {
  try {
    const res = await pool.query(q, params);
    return res.rows;
  } catch (err) {
    console.error(`DB Error (${name}):`, err.message);
    throw err;
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name, category, contact_person, email, performance_score } = req.body;
    const result = await pool.query(`
      INSERT INTO vendors (name, category, contact_person, email, performance_score, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [name, category, contact_person, email, performance_score || 100]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create vendor" });
  }
};

exports.createPO = async (req, res) => {
  try {
    const { po_number, vendor_id, item_description, quantity, amount, eta } = req.body;
    const result = await pool.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, item_description, quantity, amount, eta, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [po_number, vendor_id, item_description, quantity, amount, eta]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create PO" });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const rows = await sq("SELECT * FROM vendors ORDER BY performance_score DESC", [], "getVendors");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const rows = await sq(`
      SELECT po.*, v.name as vendor_name 
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.created_at DESC
    `, [], "getPOs");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch purchase orders" });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const rows = await sq("SELECT * FROM inventory ORDER BY current_stock ASC", [], "getInventory");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

exports.updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, received_date } = req.body;
    await sq(`
      UPDATE purchase_orders 
      SET status = $1, received_date = $2 
      WHERE id = $3
    `, [status, received_date, id], "updatePO");
    res.json({ message: "PO status updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update PO" });
  }
};
