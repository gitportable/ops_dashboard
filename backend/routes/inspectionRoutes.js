const router = require("express").Router();
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(authenticateToken);

router.get("/issue/:issueId", async (req, res) => {
  const { issueId } = req.params;
  try {
    const result = await pool.query(
      `SELECT i.*, COALESCE(u.name, u.email) AS checked_by_name
       FROM inspection_checklists i
       LEFT JOIN users u ON u.id = i.checked_by
       WHERE i.issue_id = $1
       ORDER BY i.id ASC`,
      [String(issueId)]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("get inspection items error:", err.message);
    return res.status(500).json({ message: "Failed to fetch inspection items" });
  }
});

router.post(
  "/issue/:issueId",
  rbac("tester", "admin", "superadmin"),
  async (req, res) => {
    const { issueId } = req.params;
    const { item_text } = req.body || {};

    if (!item_text || !String(item_text).trim()) {
      return res.status(400).json({ message: "item_text is required" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO inspection_checklists (issue_id, item_text, is_checked, checked_by, checked_at)
         VALUES ($1, $2, false, NULL, NULL)
         RETURNING *`,
        [String(issueId), String(item_text).trim()]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("create inspection item error:", err.message);
      return res.status(500).json({ message: "Failed to create inspection item" });
    }
  }
);

router.put(
  "/:id/check",
  rbac("tester", "admin", "superadmin"),
  async (req, res) => {
    const { id } = req.params;
    const checkedBy = req.user?.userId ?? req.user?.id;

    try {
      const result = await pool.query(
        `UPDATE inspection_checklists
         SET is_checked = TRUE, checked_by = $1, checked_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [checkedBy, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("check inspection item error:", err.message);
      return res.status(500).json({ message: "Failed to check inspection item" });
    }
  }
);

router.put("/:id/uncheck", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE inspection_checklists
       SET is_checked = FALSE, checked_by = NULL, checked_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Inspection item not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("uncheck inspection item error:", err.message);
    return res.status(500).json({ message: "Failed to uncheck inspection item" });
  }
});

router.delete(
  "/:id",
  rbac("tester", "admin", "superadmin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `DELETE FROM inspection_checklists
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      return res.status(200).json({ message: "Inspection item deleted" });
    } catch (err) {
      console.error("delete inspection item error:", err.message);
      return res.status(500).json({ message: "Failed to delete inspection item" });
    }
  }
);

router.get("/issue/:issueId/complete", async (req, res) => {
  const { issueId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE is_checked = TRUE)::int AS checked
       FROM inspection_checklists
       WHERE issue_id = $1`,
      [String(issueId)]
    );
    const row = result.rows[0] || { total: 0, checked: 0 };
    const total = Number(row.total) || 0;
    const checked = Number(row.checked) || 0;
    return res.status(200).json({
      total,
      checked,
      all_complete: total > 0 && checked === total,
    });
  } catch (err) {
    console.error("inspection complete error:", err.message);
    return res.status(500).json({ message: "Failed to fetch inspection completion" });
  }
});

module.exports = router;
