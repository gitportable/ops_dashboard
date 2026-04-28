const router = require("express").Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

router.use(auth);

router.get("/issue/:issueId", async (req, res) => {
  const { issueId } = req.params;

  try {
    const result = await pool.query(
      `SELECT *
       FROM subtasks
       WHERE issue_id = $1
       ORDER BY id ASC`,
      [String(issueId)]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("get subtasks by issue error:", err.message);
    return res.status(500).json({ message: "Failed to fetch subtasks" });
  }
});

router.post("/issue/:issueId", rbac("developer", "admin", "superadmin"), async (req, res) => {
  const { issueId } = req.params;
  const { title } = req.body || {};
  const createdBy = req.user?.userId ?? req.user?.id;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: "title is required" });
  }

  if (!createdBy) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO subtasks (issue_id, title, is_done, created_by)
       VALUES ($1, $2, false, $3)
       RETURNING *`,
      [String(issueId), String(title).trim(), createdBy]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("create subtask error:", err.message);
    return res.status(500).json({ message: "Failed to create subtask" });
  }
});

router.put("/:id", rbac("developer", "admin", "superadmin"), async (req, res) => {
  const { id } = req.params;
  const { title, is_done } = req.body || {};
  const updates = [];
  const values = [];
  let idx = 1;

  if (title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(String(title).trim());
  }

  if (is_done !== undefined) {
    updates.push(`is_done = $${idx++}`);
    values.push(Boolean(is_done));
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE subtasks
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("update subtask error:", err.message);
    return res.status(500).json({ message: "Failed to update subtask" });
  }
});

router.delete("/:id", rbac("developer", "admin", "superadmin"), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM subtasks
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    return res.status(200).json({ message: "Subtask deleted" });
  } catch (err) {
    console.error("delete subtask error:", err.message);
    return res.status(500).json({ message: "Failed to delete subtask" });
  }
});

module.exports = router;
