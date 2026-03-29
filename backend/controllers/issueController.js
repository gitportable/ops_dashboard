const pool = require("../db");

const getIo = (req) => req.app.get("io");

exports.getAllIssues = async (req, res) => {
  try {
    const role   = (req.user.role || "").toLowerCase();
    const userId = req.user.id;

    let query  = `SELECT i.*, p.projectname FROM expanded_factissues i LEFT JOIN expanded_factprojects p ON i.projectid = p.projectid`;
    const params = [];

    if (role === "developer" || role === "tester") {
      query += `
        JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
        WHERE pa.user_id = $1`;
      params.push(userId);
    }

    query += " ORDER BY i.issueid DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("getAllIssues error:", err.message);
    res.status(500).json({ message: "Failed to fetch issues" });
  }
};
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT i.*, p.projectname
       FROM expanded_factissues i
       JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
       JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
       WHERE pa.user_id = $1
       ORDER BY i.createddate DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getMyTasks error:", err.message);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

exports.getMyIssues = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT i.*, p.projectname
       FROM expanded_factissues i
       JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
       JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
       WHERE pa.user_id = $1
       ORDER BY i.createddate DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getMyIssues error:", err.message);
    res.status(500).json({ message: "Failed to fetch issues" });
  }
};

exports.getIssuesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId        = req.user.id;
    const role          = (req.user.role || "").toLowerCase();

    if (!projectId || projectId === "undefined") {
      return res.status(400).json({ message: "projectId is required" });
    }
    if (!["admin", "superadmin"].includes(role)) {
      const check = await pool.query(
        "SELECT 1 FROM project_assignments WHERE TRIM(project_id)=TRIM($1) AND user_id=$2",
        [projectId, userId]
      );
      if (check.rowCount === 0) {
        return res.status(403).json({ message: "Not assigned to this project" });
      }
    }

    const result = await pool.query(
      `SELECT i.*, p.projectname
       FROM expanded_factissues i
       LEFT JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
       WHERE TRIM(i.projectid) = TRIM($1)
       ORDER BY i.createddate DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getIssuesByProject error:", err.message);
    res.status(500).json({ message: "Failed to fetch project issues" });
  }
};

exports.createIssue = async (req, res) => {
  const { projectid, sprint, issuetype, description, assigneeteam } = req.body;

  if (!projectid || !issuetype || !assigneeteam) {
    return res.status(400).json({ message: "projectid, issuetype, assigneeteam are required" });
  }

  const validTypes = ["Bug", "Task", "Story", "Epic"];
  if (!validTypes.includes(issuetype)) {
    return res.status(400).json({ message: `Invalid issuetype. Must be: ${validTypes.join(", ")}` });
  }

  const role = (req.user.role || "").toLowerCase();
  if (!["admin", "superadmin"].includes(role)) {
    const check = await pool.query(
      "SELECT 1 FROM project_assignments WHERE TRIM(project_id)=TRIM($1) AND user_id=$2",
      [projectid, req.user.id]
    );
    if (check.rowCount === 0) {
      return res.status(403).json({ message: "Not authorized to create issues in this project" });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO expanded_factissues (projectid, sprint, issuetype, createddate, assigneeteam, description, status)
       VALUES ($1, $2, $3, NOW(), $4, $5, 'Open') RETURNING *`,
      [projectid, sprint || null, issuetype, assigneeteam, description || null]
    );
    const newIssue = result.rows[0];
    getIo(req)?.emit("issueCreated", newIssue);
    res.status(201).json({ message: "Issue created successfully", issue: newIssue });
  } catch (err) {
    console.error("createIssue error:", err.message);
    res.status(500).json({ message: "Failed to create issue" });
  }
};

exports.updateIssueStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status is required" });

  const validStatuses = [
    "Open", "In Progress", "In Review", "Done", "Blocked",
    "Verified", "Needs Info", "Escalated", "Testing", "Closed"
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });
  }

  try {
    const isClosing = ["Done", "Verified", "Closed"].includes(status);
    const result = await pool.query(
      `UPDATE expanded_factissues
       SET status     = $1,
           closeddate = CASE WHEN $2 THEN NOW() ELSE closeddate END
       WHERE issueid  = $3
       RETURNING *`,
      [status, isClosing, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });

    getIo(req)?.emit("issueUpdated", result.rows[0]);
    res.json({ message: "Status updated successfully", issue: result.rows[0] });
  } catch (err) {
    console.error("updateIssueStatus error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.updateIssue = async (req, res) => {
  const { id }    = req.params;
  const userId    = req.user.id;
  const role      = (req.user.role || "").toLowerCase();
  const { sprint, status, description, assigneeteam } = req.body;

  if ("createddate" in req.body) {
    return res.status(403).json({ message: "createddate is immutable" });
  }

  if (!["admin", "superadmin"].includes(role)) {
    const check = await pool.query(
      `SELECT 1 FROM project_assignments pa
       JOIN expanded_factissues i ON TRIM(pa.project_id) = TRIM(i.projectid)
       WHERE i.issueid = $1 AND pa.user_id = $2`,
      [id, userId]
    );
    if (check.rowCount === 0) {
      return res.status(403).json({ message: "Not assigned to this issue's project" });
    }
  }

  const updates = [];
  const values  = [];
  let   idx     = 1;

  if (sprint      !== undefined) { updates.push(`sprint       = $${idx++}`); values.push(sprint);      }
  if (status      !== undefined) { updates.push(`status       = $${idx++}`); values.push(status);      }
  if (description !== undefined) { updates.push(`description  = $${idx++}`); values.push(description); }
  if (assigneeteam!== undefined) { updates.push(`assigneeteam = $${idx++}`); values.push(assigneeteam);}

  if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE expanded_factissues
       SET ${updates.join(", ")},
           closeddate = CASE WHEN status = 'Done' THEN NOW() ELSE closeddate END
       WHERE issueid = $${idx}
       RETURNING *`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });
    getIo(req)?.emit("issueUpdated", result.rows[0]);
    res.json({ message: "Issue updated successfully", issue: result.rows[0] });
  } catch (err) {
    console.error("updateIssue error:", err.message);
    res.status(500).json({ message: "Failed to update issue" });
  }
};


exports.deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM expanded_factissues WHERE issueid = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });
    getIo(req)?.emit("issueDeleted", { issueId: id });
    res.json({ message: "Issue deleted successfully" });
  } catch (err) {
    console.error("deleteIssue error:", err.message);
    res.status(500).json({ message: "Failed to delete issue" });
  }
};
