const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const pool = require('../db');

router.use(authenticateToken);

// GET all POs with vendor and project details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        po.*,
        v.name as vendor_name,
        v.contact_email as vendor_email,
        p.projectname as project_name,
        COALESCE(u.name, u.email) as created_by_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN expanded_factprojects p ON p.projectid::text = po.project_id::text
      LEFT JOIN users u ON u.id = po.created_by
      ORDER BY po.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[poTracking GET /]', err.message);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
});

// GET single PO with full details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        po.*,
        v.name as vendor_name,
        v.contact_email as vendor_email,
        p.projectname as project_name,
        COALESCE(u.name, u.email) as created_by_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN expanded_factprojects p ON p.projectid::text = po.project_id::text
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = $1
    `, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'PO not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch PO' });
  }
});

// GET status history for a PO
router.get('/:id/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, COALESCE(u.name, u.email) as changed_by_name
      FROM po_status_history h
      LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.po_id = $1
      ORDER BY h.changed_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch PO history' });
  }
});

// PUT update PO status and log history
router.put('/:id/status', rbac('superadmin', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Shipped', 'In Transit', 'Received', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    // Get current status first
    const prev = await pool.query('SELECT status FROM purchase_orders WHERE id = $1', [req.params.id]);
    if (prev.rowCount === 0) return res.status(404).json({ message: 'PO not found' });
    const fromStatus = prev.rows[0].status;
    // Update PO status
    const result = await pool.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    // Log history
    await pool.query(
      `INSERT INTO po_status_history (po_id, from_status, to_status, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, fromStatus, status, req.user.userId, notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[poTracking PUT /:id/status]', err.message);
    res.status(500).json({ message: 'Failed to update PO status' });
  }
});

module.exports = router;
