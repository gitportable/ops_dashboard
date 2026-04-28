const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const pool = require('../db');

router.use(authenticateToken);

// GET all CAPA items (admin dashboard) — must be before /:rcaId routes
router.get('/capa/all', rbac('tester', 'admin', 'superadmin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, r.issue_id, r.root_cause,
             COALESCE(u.name, u.email) as assigned_to_name
      FROM capa_items c
      LEFT JOIN rca_reports r ON r.id = c.rca_id
      LEFT JOIN users u ON u.id = c.assigned_to
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getAllCAPAs error:', err.message);
    res.status(500).json({ message: 'Failed to fetch all CAPA items' });
  }
});

// GET RCA for an issue
router.get('/issue/:issueId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rca_reports WHERE issue_id = $1',
      [req.params.issueId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('getRCA error:', err.message);
    res.status(500).json({ message: 'Failed to fetch RCA' });
  }
});

// POST create RCA for an issue
router.post('/issue/:issueId', rbac('tester', 'admin', 'superadmin'), async (req, res) => {
  const { problem_statement, root_cause, contributing_factors, impact_assessment, five_why_analysis } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO rca_reports
       (issue_id, problem_statement, root_cause, contributing_factors, impact_assessment, five_why_analysis, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.issueId, problem_statement, root_cause, contributing_factors, impact_assessment,
       JSON.stringify(five_why_analysis || []), req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createRCA error:', err.message);
    res.status(500).json({ message: 'Failed to create RCA' });
  }
});

// PUT update RCA
router.put('/:id', rbac('tester', 'admin', 'superadmin'), async (req, res) => {
  const { problem_statement, root_cause, contributing_factors, impact_assessment, five_why_analysis } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rca_reports SET
       problem_statement = COALESCE($1, problem_statement),
       root_cause = COALESCE($2, root_cause),
       contributing_factors = COALESCE($3, contributing_factors),
       impact_assessment = COALESCE($4, impact_assessment),
       five_why_analysis = COALESCE($5, five_why_analysis),
       updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [problem_statement, root_cause, contributing_factors, impact_assessment,
       five_why_analysis ? JSON.stringify(five_why_analysis) : null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'RCA not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateRCA error:', err.message);
    res.status(500).json({ message: 'Failed to update RCA' });
  }
});

// GET all CAPA items for an RCA
router.get('/:rcaId/capa', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COALESCE(u.name, u.email) as assigned_to_name
       FROM capa_items c
       LEFT JOIN users u ON u.id = c.assigned_to
       WHERE c.rca_id = $1 ORDER BY c.created_at ASC`,
      [req.params.rcaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCAPAs error:', err.message);
    res.status(500).json({ message: 'Failed to fetch CAPA items' });
  }
});

// POST create CAPA item
router.post('/:rcaId/capa', rbac('tester', 'admin', 'superadmin'), async (req, res) => {
  const { action_type, description, assigned_to, due_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO capa_items (rca_id, issue_id, action_type, description, assigned_to, due_date)
       SELECT $1, issue_id, $2, $3, $4, $5 FROM rca_reports WHERE id = $1 RETURNING *`,
      [req.params.rcaId, action_type, description, assigned_to || null, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCAPA error:', err.message);
    res.status(500).json({ message: 'Failed to create CAPA item' });
  }
});

// PUT update CAPA item
router.put('/capa/:id', rbac('tester', 'admin', 'superadmin'), async (req, res) => {
  const { status, description, due_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE capa_items SET
       status = COALESCE($1, status),
       description = COALESCE($2, description),
       due_date = COALESCE($3, due_date)
       WHERE id = $4 RETURNING *`,
      [status, description, due_date, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'CAPA item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateCAPA error:', err.message);
    res.status(500).json({ message: 'Failed to update CAPA item' });
  }
});

// DELETE CAPA item
router.delete('/capa/:id', rbac('superadmin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM capa_items WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'CAPA item not found' });
    res.json({ message: 'CAPA item deleted' });
  } catch (err) {
    console.error('deleteCAPA error:', err.message);
    res.status(500).json({ message: 'Failed to delete CAPA item' });
  }
});

module.exports = router;
