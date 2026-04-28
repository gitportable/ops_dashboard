const router = require("express").Router();
const auth = require("../middleware/auth");
const pool = require("../db");

const getIo = (req) => req.app.get("io");
const getUserId = (req) => req.user?.userId || req.user?.id;

router.use(auth);

router.post("/", async (req, res) => {
  const { issue_id, approver_id, comments } = req.body || {};
  const requestedBy = getUserId(req);

  if (!issue_id || !approver_id) {
    return res.status(400).json({ message: "issue_id and approver_id are required" });
  }

  try {
    // BUG FIX 1: issueid is text (e.g. 'I000004') — cast to text, not int
    const issueCheck = await pool.query(
      "SELECT issueid FROM expanded_factissues WHERE issueid = $1",
      [String(issue_id)]
    );
    if (issueCheck.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // BUG FIX 2: table is approval_requests NOT approvals
    const result = await pool.query(
      `INSERT INTO approval_requests (issue_id, approver_id, requested_by, comments, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING *`,
      [String(issue_id), approver_id, requestedBy, comments || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("create approval error:", err.message);
    return res.status(500).json({ message: "Failed to create approval request" });
  }
});

router.get("/my-pending", async (req, res) => {
  const approverId = getUserId(req);
  try {
    // BUG FIX 3: table is approval_requests NOT approvals
    const result = await pool.query(
      `SELECT *
       FROM approval_requests
       WHERE approver_id = $1
         AND LOWER(COALESCE(status, '')) = 'pending'
       ORDER BY id DESC`,
      [approverId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("my pending approvals error:", err.message);
    return res.status(500).json({ message: "Failed to fetch pending approvals" });
  }
});

router.get("/issue/:issueId", async (req, res) => {
  const { issueId } = req.params;
  try {
    // BUG FIX 4: table is approval_requests NOT approvals
    const result = await pool.query(
      `SELECT *
       FROM approval_requests
       WHERE issue_id = $1
       ORDER BY id DESC`,
      [String(issueId)]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("issue approvals error:", err.message);
    return res.status(500).json({ message: "Failed to fetch issue approvals" });
  }
});

router.put("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // BUG FIX 5: table is approval_requests NOT approvals
    const approval = await client.query(
      `UPDATE approval_requests
       SET status = 'Approved', resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (approval.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Approval request not found" });
    }

    // BUG FIX 6: issue_id is stored as text — use String()
    const issueId = String(approval.rows[0].issue_id);
    const updatedIssue = await client.query(
      `UPDATE expanded_factissues
       SET status = 'Verified', closeddate = NOW()
       WHERE issueid = $1
       RETURNING *`,
      [issueId]
    );
    if (updatedIssue.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Issue not found" });
    }

    await client.query("COMMIT");
    getIo(req)?.emit("issueUpdated", updatedIssue.rows[0]);
    return res.json({ message: "Approval recorded", approval: approval.rows[0], issue: updatedIssue.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("approve request error:", err.message);
    return res.status(500).json({ message: "Failed to approve request" });
  } finally {
    client.release();
  }
});

router.put("/:id/reject", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // BUG FIX 7: table is approval_requests NOT approvals
    const approval = await client.query(
      `UPDATE approval_requests
       SET status = 'Rejected', resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (approval.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Approval request not found" });
    }

    // BUG FIX 8: issue_id is stored as text — use String()
    const issueId = String(approval.rows[0].issue_id);
    const updatedIssue = await client.query(
      `UPDATE expanded_factissues
       SET status = 'Needs Info'
       WHERE issueid = $1
       RETURNING *`,
      [issueId]
    );
    if (updatedIssue.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Issue not found" });
    }

    await client.query("COMMIT");
    getIo(req)?.emit("issueUpdated", updatedIssue.rows[0]);
    return res.json({ message: "Rejection recorded", approval: approval.rows[0], issue: updatedIssue.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("reject request error:", err.message);
    return res.status(500).json({ message: "Failed to reject request" });
  } finally {
    client.release();
  }
});

module.exports = router;