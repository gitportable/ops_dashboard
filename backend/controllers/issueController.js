// const pool = require("../db");

// exports.updateIssue = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;

//   if ("createddate" in req.body) {
//     return res.status(403).json({ message: "CreatedDate is immutable" });
//   }

//   if (Object.keys(fields).length === 0) {
//     return res.status(403).json({ message: "No permitted fields to update" });
//   }

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   try {
//     await pool.query(
//       `UPDATE expanded_factissues SET ${setClause} WHERE issueid = $${values.length + 1}`,
//       [...values, id]
//     );
//     res.json({ message: "Issue updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update issue" });
//   }
// };

// exports.getAllIssues = async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM expanded_factissues ORDER BY issueid"
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch issues" });
//   }
// };

// exports.updateIssueStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;
//   const generateIssueId = () => {
//   return 'I' + Date.now(); };
//   if (!status) {
//     return res.status(400).json({ message: "Status required" });
//   }

//   try {
//     await pool.query(
//       "UPDATE expanded_factissues SET status = $1 WHERE issueid = $2",
//       [status, id]
//     );
//     res.json({ message: "Status updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update status" });
//   }
// };
const pool = require("../db");
const { io } = require("../server"); // Make sure server.js exports { io }

exports.getAllIssues = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const userId = req.user.id;

    let query = `
      SELECT i.* 
      FROM expanded_factissues i
    `;
    const params = [];

    // Role-based filtering
    if (role === 'tester' || role === 'developer') {
      query += `
        JOIN project_assignments pa ON i.projectid = pa.project_id
        WHERE pa.user_id = $1
      `;
      params.push(userId);

      if (role === 'tester') {
        query += ` AND i.assigneeteam = 'QA'`;
      } else if (role === 'developer') {
        query += ` AND i.assigneeteam IN ('Frontend', 'Backend', 'DevOps')`;
      }
    }
    // Admin/superadmin see everything — no extra WHERE

    query += ` ORDER BY i.issueid DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get all issues error:", err.message);
    res.status(500).json({ message: "Failed to fetch issues" });
  }
};

exports.getMyIssues = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    let query = `
      SELECT i.* 
      FROM expanded_factissues i
      JOIN project_assignments pa ON i.projectid = pa.project_id
      WHERE pa.user_id = $1
    `;
    const params = [userId];

    if (role === 'tester') {
      query += ` AND i.assigneeteam = 'QA'`;
    } else if (role === 'developer') {
      query += ` AND i.assigneeteam IN ('Frontend', 'Backend', 'DevOps')`;
    }

    query += ` ORDER BY i.createddate DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("getMyIssues error:", err);
    res.status(500).json({ message: "Failed to fetch my issues" });
  }
};

exports.createIssue = async (req, res) => {
  const { projectid, sprint, issuetype, description, assigneeteam } = req.body;

  if (!projectid || !sprint || !issuetype || !assigneeteam) {
    return res.status(400).json({ message: "Missing required fields: projectid, sprint, issuetype, assigneeteam" });
  }

  const validTypes = ["Bug", "Task", "Story", "Epic"];
  if (!validTypes.includes(issuetype)) {
    return res.status(400).json({ message: `Invalid issuetype. Must be one of: ${validTypes.join(", ")}` });
  }

  // Optional: Check if user is assigned to project
  const assignCheck = await pool.query(
    `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
    [projectid, req.user.id]
  );

  if (assignCheck.rowCount === 0 && !['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
    return res.status(403).json({ message: "Not authorized to create issues in this project" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO expanded_factissues 
       (projectid, sprint, issuetype, createddate, assigneeteam, description, status) 
       VALUES ($1, $2, $3, NOW(), $4, $5, 'Open') 
       RETURNING *`,
      [projectid, sprint, issuetype, assigneeteam, description || null]
    );

    const newIssue = result.rows[0];

    io.emit("issueCreated", newIssue);

    res.status(201).json({
      message: "Issue created successfully",
      issue: newIssue
    });
  } catch (err) {
    console.error("Create issue error:", err.message);
    res.status(500).json({ message: "Failed to create issue", error: err.message });
  }
};

exports.updateIssue = async (req, res) => {
  const { issueId } = req.params;
  const { sprint, status, description } = req.body;
  const userId = req.user.id;

  try {
    // Check assignment to project
    const assignCheck = await pool.query(`
      SELECT 1 FROM project_assignments pa
      JOIN expanded_factissues i ON pa.project_id = i.projectid
      WHERE i.issueid = $1 AND pa.user_id = $2
    `, [issueId, userId]);

    if (assignCheck.rowCount === 0 && !['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Not assigned to this issue's project" });
    }

    // Prevent changing createddate
    if ("createddate" in req.body) {
      return res.status(403).json({ message: "CreatedDate is immutable" });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (sprint !== undefined) {
      updates.push(`sprint = $${paramIndex}`);
      values.push(sprint);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    values.push(issueId);

    const result = await pool.query(
      `UPDATE expanded_factissues 
       SET ${updates.join(", ")}, 
           closeddate = CASE WHEN status = 'Done' THEN NOW() ELSE closeddate END,
           updated_at = CURRENT_TIMESTAMP
       WHERE issueid = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const updatedIssue = result.rows[0];

    io.emit("issueUpdated", updatedIssue);

    res.json({
      message: "Issue updated successfully",
      issue: updatedIssue
    });
  } catch (err) {
    console.error("updateIssue error:", err.message);
    res.status(500).json({ message: "Failed to update issue", error: err.message });
  }
};
// Delete issue (admin/superadmin only)
exports.deleteIssue = async (req, res) => {
  try {
    const { issueId } = req.params;

    // Optional: extra check (though middleware already handles role)
    if (!['admin', 'superadmin'].includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({ message: "Not authorized to delete issues" });
    }

    const result = await pool.query(
      `DELETE FROM expanded_factissues WHERE issueid = $1 RETURNING *`,
      [issueId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const deletedIssue = result.rows[0];

    // Notify via socket
    io.emit("issueDeleted", { issueId, deletedIssue });

    res.json({
      message: "Issue deleted successfully",
      deleted: deletedIssue
    });
  } catch (err) {
    console.error("deleteIssue error:", err.message);
    res.status(500).json({ message: "Failed to delete issue", error: err.message });
  }
};
exports.updateIssueStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  const validStatuses = ["Open", "In Progress", "Done", "Blocked", "Testing"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Allowed: ${validStatuses.join(", ")}`
    });
  }

  try {
    const result = await pool.query(
      `UPDATE expanded_factissues 
       SET status = $1,
           closeddate = CASE WHEN $1 = 'Done' THEN NOW() ELSE closeddate END,
           updated_at = CURRENT_TIMESTAMP
       WHERE issueid = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const updatedIssue = result.rows[0];

    io.emit("issueUpdated", updatedIssue);

    res.json({
      message: "Status updated successfully",
      issue: updatedIssue
    });
  } catch (err) {
    console.error("Update status error:", err.message);
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
};














































































// const pool = require("../db");

// exports.updateIssue = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;

//   if ("createddate" in req.body)
//     return res.status(403).json({ message: "CreatedDate is immutable" });

//   if (Object.keys(fields).length === 0)
//     return res.status(403).json({ message: "No permitted fields to update" });

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   await pool.query(
//     `UPDATE expanded_factissues SET ${setClause} WHERE issueid = $${values.length + 1}`,
//     [...values, id]
//   );

//   res.json({ message: "Issue updated successfully" });
// };

// exports.getAllIssues = async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM expanded_factissues ORDER BY issueid");
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch issues" });
//   }
// };

// exports.updateIssueStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   if (!status) return res.status(400).json({ message: "Status required" });

//   try {
//     await pool.query(
//       "UPDATE expanded_factissues SET status = $1 WHERE issueid = $2",
//       [status, id]
//     );
//     res.json({ message: "Status updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update status" });
//   }
// };









// const pool = require("../db");

// exports.updateIssue = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;
//   exports.getAllIssues = async (req, res) => { /* similar */ };

// exports.updateIssueStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   // You can add more validation here
//   await pool.query(
//     "UPDATE expanded_factissues SET status = $1 WHERE issueid = $2",
//     [status, id]
//   );
//   res.json({ message: "Status updated" });
//   };
//   if ("createddate" in req.body)
//     return res.status(403).json({ message: "CreatedDate is immutable" });

//   if (Object.keys(fields).length === 0)
//     return res.status(403).json({ message: "No permitted fields to update" });

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   await pool.query(
//     `UPDATE expanded_factissues SET ${setClause} WHERE issueid = $${
//       values.length + 1
//     }`,
//     [...values, id]
//   );

//   res.json({ message: "Issue updated successfully" });
// };