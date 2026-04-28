const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.use(authenticateToken);

// GET all alert rules
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM inventory_alert_rules ORDER BY created_at DESC'
  );
  res.json(result.rows);
});

// GET alerts that are currently triggered
// Joins alert rules with batch_lots to find materials below threshold
router.get('/triggered', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      r.id, r.material_type, r.threshold_quantity, r.alert_level,
      COALESCE(SUM(b.quantity), 0) as current_quantity,
      COUNT(b.id) as batch_count
    FROM inventory_alert_rules r
    LEFT JOIN batch_lots b ON b.material_type = r.material_type
      AND b.qc_status != 'Failed'
    WHERE r.is_active = true
    GROUP BY r.id, r.material_type, r.threshold_quantity, r.alert_level
    HAVING COALESCE(SUM(b.quantity), 0) < r.threshold_quantity
    ORDER BY r.alert_level DESC
  `);
  res.json(result.rows);
});

// POST create new alert rule
router.post('/', rbac('superadmin'), async (req, res) => {
  const { material_type, threshold_quantity, alert_level } = req.body;
  const result = await pool.query(
    `INSERT INTO inventory_alert_rules 
     (material_type, threshold_quantity, alert_level, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [material_type, threshold_quantity, alert_level || 'Warning', req.user.userId]
  );
  res.status(201).json(result.rows[0]);
});

// PUT update alert rule
router.put('/:id', rbac('superadmin'), async (req, res) => {
  const { material_type, threshold_quantity, alert_level, is_active } = req.body;
  const result = await pool.query(
    `UPDATE inventory_alert_rules 
     SET material_type=$1, threshold_quantity=$2, alert_level=$3, is_active=$4
     WHERE id=$5 RETURNING *`,
    [material_type, threshold_quantity, alert_level, is_active, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE alert rule
router.delete('/:id', rbac('superadmin'), async (req, res) => {
  await pool.query('DELETE FROM inventory_alert_rules WHERE id=$1', [req.params.id]);
  res.json({ message: 'Alert rule deleted' });
});

module.exports = router;
