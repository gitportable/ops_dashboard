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

exports.getInstallations = async (req, res) => {
  try {
    const rows = await sq("SELECT * FROM installations ORDER BY installation_date DESC", [], "getInstallations");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch installations" });
  }
};

exports.createInstallation = async (req, res) => {
  try {
    const { project_id, customer_name, site_location, pv_capacity_kw, installation_date } = req.body;
    const rows = await sq(`
      INSERT INTO installations (project_id, customer_name, site_location, pv_capacity_kw, installation_date)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [project_id, customer_name, site_location, pv_capacity_kw, installation_date], "createInstallation");
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create installation" });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const rows = await sq(`
      SELECT t.*, i.customer_name, i.site_location 
      FROM maintenance_tickets t
      JOIN installations i ON t.installation_id = i.id
      ORDER BY t.created_at DESC
    `, [], "getTickets");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolved_at } = req.body;
    await sq(`
      UPDATE maintenance_tickets 
      SET status = $1, resolved_at = $2 
      WHERE id = $3
    `, [status, resolved_at, id], "updateTicket");
    res.json({ message: "Ticket updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update ticket" });
  }
};
exports.createTicket = async (req, res) => {
  try {
    const { installation_id, ticket_type, description, priority, assigned_to } = req.body;
    const rows = await sq(`
      INSERT INTO maintenance_tickets (installation_id, ticket_type, description, priority, assigned_to, status)
      VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *
    `, [installation_id, ticket_type, description, priority, assigned_to], "createTicket");
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create ticket" });
  }
};
