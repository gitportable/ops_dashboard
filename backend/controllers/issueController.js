const pool = require("../db");
const getIo = (req) => req.app.get("io");

// Helper for safe queries
const sq = async (sql, params = [], label = "") => {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error(`[issueController:${label}]`, err.message);
    return [];
  }
};

const recordWorkflow = async (id, oldS, newS, user) => {
  try {
    console.log(`[recordWorkflow] Recording transition ${oldS} -> ${newS} for ${id}`);
    const res = await pool.query("SELECT workflow_history FROM expanded_factissues WHERE issueid = $1", [id]);
    let hist = res.rows[0]?.workflow_history || [];
    if (typeof hist === "string") hist = JSON.parse(hist);
    hist.push({ from: oldS, to: newS, date: new Date().toISOString(), user: user?.id || "system" });
    await pool.query("UPDATE expanded_factissues SET workflow_history = $1 WHERE issueid = $2", [JSON.stringify(hist), id]);
    console.log("[recordWorkflow] Successfully updated workflow history");
  } catch (err) { console.error("Workflow record error:", err); }
};

// ==================== BASIC FUNCTIONS ====================
// Add to issueController.js updateIssueStatus
exports.updateIssueStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || id === 'undefined') {
    return res.status(400).json({ message: "Invalid issue ID" });
  }

  const userRole = req.user?.role?.toLowerCase() || 'unknown';

  // Logic: Only Testers or Admins can set an issue to 'Closed', 'Approved', 'Verified'
  const closingStatuses = ['Closed', 'Approved', 'Verified', 'Done'];
  if (closingStatuses.includes(status) && !['tester', 'admin', 'superadmin'].includes(userRole)) {
    return res.status(403).json({ message: "Only QA/Admin can approve or close issues." });
  }

  try {
    console.log(`[updateIssueStatus] ID: ${id}, New Status: ${status}, User: ${userRole}`);
    // 1. Get current status BEFORE update
    const currentRes = await pool.query("SELECT status FROM expanded_factissues WHERE issueid = $1", [id]);
    if (currentRes.rowCount === 0) {
        console.warn(`[updateIssueStatus] Issue ${id} not found for status read`);
        return res.status(404).json({ message: "Issue not found" });
    }
    const oldStatus = currentRes.rows[0].status;
    console.log(`[updateIssueStatus] Old status found: ${oldStatus}`);

    // 2. Perform Update
    const result = await pool.query(`
      UPDATE expanded_factissues 
      SET status = $1,
          closeddate = CASE WHEN $1 IN ('Done','Verified','Closed','Approved') THEN NOW() ELSE closeddate END
      WHERE issueid = $2 
      RETURNING *
    `, [status, id]);

    if (result.rowCount === 0) {
        console.warn(`[updateIssueStatus] Issue ${id} not found during update`);
        return res.status(404).json({ message: "Issue not found" });
    }

    console.log(`[updateIssueStatus] Update successful for ${id}`);

    // 3. Record Workflow if status changed
    if (oldStatus !== status) {
      await recordWorkflow(id, oldStatus, status, req.user);
    }

    getIo(req)?.emit("issueUpdated", result.rows[0]);
    res.json({ message: "Status updated", issue: result.rows[0] });
  } catch (err) {
    console.error("updateIssueStatus CRITICAL ERROR:", err);
    res.status(500).json({ message: "Failed to update status", error: err.message, stack: err.stack });
  }
};
exports.getAllIssues = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM expanded_factissues ORDER BY createddate DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch issues" });
  }
};

exports.getMyTasks = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT i.* FROM expanded_factissues i
      JOIN project_assignments pa ON i.projectid::text = pa.project_id::text
      WHERE pa.user_id = $1
      ORDER BY i.createddate DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch my tasks" });
  }
};

exports.getMyIssues = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT i.* FROM expanded_factissues i
      JOIN project_assignments pa ON i.projectid::text = pa.project_id::text
      WHERE pa.user_id = $1
      ORDER BY i.createddate DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch my issues" });
  }
};

exports.getIssuesByProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM expanded_factissues 
      WHERE TRIM(projectid) = TRIM($1) 
      ORDER BY createddate DESC
    `, [projectId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch project issues" });
  }
};

exports.getIssuesByBatch = async (req, res) => {
  const { batchLot } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM expanded_factissues 
      WHERE TRIM(batch_lot) = TRIM($1)
      ORDER BY createddate DESC
    `, [batchLot]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch batch issues" });
  }
};

// ==================== SOLAR CREATE & UPDATE ====================

exports.createIssue = async (req, res) => {
  let {
    projectid, sprint, issuetype = "Bug", description, assigneeteam,
    batch_lot, production_stage, defect_type, severity = "Medium", image_url,
    subtasks = [], priority = "Medium", assignee
  } = req.body;

  // Auto-prepend 'P' if projectid is a plain number
  if (projectid && !isNaN(projectid)) {
    projectid = `P${projectid}`;
  }

  if (!projectid || !assigneeteam) {
    return res.status(400).json({ message: "projectid and assigneeteam are required" });
  }

  try {
    // Generate new I-prefixed ID
    const maxRes = await pool.query("SELECT issueid FROM expanded_factissues WHERE issueid LIKE 'I%' ORDER BY LENGTH(issueid) DESC, issueid DESC LIMIT 1");
    let nextId = "I1";
    if (maxRes.rows.length > 0) {
      const currentMax = maxRes.rows[0].issueid;
      const numPart = parseInt(currentMax.substring(1));
      if (!isNaN(numPart)) {
        nextId = "I" + (numPart + 1);
      }
    }

    const result = await pool.query(`
      INSERT INTO expanded_factissues 
      (issueid, projectid, sprint, issuetype, status, assigneeteam, description,
       batch_lot, production_stage, defect_type, severity, image_url, createddate, subtasks, priority, assignee)
      VALUES ($1, $2, $3, $4, 'Open', $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14)
      RETURNING *
    `, [nextId, projectid, sprint, issuetype, assigneeteam, description || null,
      batch_lot || null, production_stage || null, defect_type || null,
      severity, image_url || null, JSON.stringify(subtasks), priority, assignee || null]);

    const newIssue = result.rows[0];
    getIo(req)?.emit("issueCreated", newIssue);
    res.status(201).json({ message: "Solar issue created successfully", issue: newIssue });
  } catch (err) {
    console.error("CREATE ISSUE ERROR:", err.message);
    res.status(500).json({ message: "Failed to create issue", error: err.message });
  }
};

exports.updateIssue = async (req, res) => {
  const { id } = req.params;
  const {
    sprint, status, description, assigneeteam,
    batch_lot, production_stage, defect_type, severity, image_url, rca, capa, subtasks,
    priority, assignee
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE expanded_factissues 
      SET 
        sprint = COALESCE($1, sprint),
        status = COALESCE($2, status),
        description = COALESCE($3, description),
        assigneeteam = COALESCE($4, assigneeteam),
        batch_lot = COALESCE($5, batch_lot),
        production_stage = COALESCE($6, production_stage),
        defect_type = COALESCE($7, defect_type),
        severity = COALESCE($8, severity),
        image_url = COALESCE($9, image_url),
        rca = COALESCE($10, rca),
        capa = COALESCE($11, capa),
        subtasks = COALESCE($12, subtasks),
        priority = COALESCE($14, priority),
        assignee = COALESCE($15, assignee),
        closeddate = CASE WHEN $2 IN ('Done','Verified','Closed') THEN NOW() ELSE closeddate END
      WHERE TRIM(issueid) = TRIM($13) 
      RETURNING *
    `, [sprint, status, description, assigneeteam, batch_lot, production_stage,
      defect_type, severity, image_url, rca, capa, subtasks ? JSON.stringify(subtasks) : null, id, priority, assignee]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    getIo(req)?.emit("issueUpdated", result.rows[0]);
    res.json({ message: "Issue updated successfully", issue: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update issue" });
  }
};

exports.deleteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM expanded_factissues WHERE issueid = $1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });

    res.json({ message: "Issue deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete issue" });
  }
};

// ==================== EXPORT ALL FUNCTIONS ====================
module.exports = {
  getAllIssues: exports.getAllIssues,
  getMyTasks: exports.getMyTasks,
  getMyIssues: exports.getMyIssues,
  getIssuesByProject: exports.getIssuesByProject,
  createIssue: exports.createIssue,
  updateIssue: exports.updateIssue,
  updateIssueStatus: exports.updateIssueStatus,
  getIssuesByBatch: exports.getIssuesByBatch,
  deleteIssue: exports.deleteIssue,
};

// const pool = require("../db");

// // Helper — get io instance without circular require
// const getIo = (req) => req.app.get("io");

// // ── GET /api/issues  (admin/superadmin = all; dev/tester = assigned projects only) ──
// exports.getAllIssues = async (req, res) => {
//   try {
//     const role   = (req.user.role || "").toLowerCase();
//     const userId = req.user.id;

//     let query  = `SELECT i.*, p.projectname FROM expanded_factissues i LEFT JOIN expanded_factprojects p ON i.projectid = p.projectid`;
//     const params = [];

//     if (role === "developer" || role === "tester") {
//       query += `
//         JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
//         WHERE pa.user_id = $1`;
//       params.push(userId);
//     }

//     query += " ORDER BY i.issueid DESC";

//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getAllIssues error:", err.message);
//     res.status(500).json({ message: "Failed to fetch issues" });
//   }
// };

// // ── GET /api/issues/my-tasks  (developer — assigned-project issues) ─────────
// exports.getMyTasks = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const result = await pool.query(
//       `SELECT i.*, p.projectname
//        FROM expanded_factissues i
//        JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
//        JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
//        WHERE pa.user_id = $1
//        ORDER BY i.createddate DESC`,
//       [userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getMyTasks error:", err.message);
//     res.status(500).json({ message: "Failed to fetch tasks" });
//   }
// };

// // ── GET /api/issues/my-issues  (tester — assigned-project issues) ───────────
// exports.getMyIssues = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const result = await pool.query(
//       `SELECT i.*, p.projectname
//        FROM expanded_factissues i
//        JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
//        JOIN project_assignments pa ON TRIM(i.projectid) = TRIM(pa.project_id)
//        WHERE pa.user_id = $1
//        ORDER BY i.createddate DESC`,
//       [userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getMyIssues error:", err.message);
//     res.status(500).json({ message: "Failed to fetch issues" });
//   }
// };

// // ── GET /api/issues/project/:projectId ──────────────────────────────────────
// exports.getIssuesByProject = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const userId        = req.user.id;
//     const role          = (req.user.role || "").toLowerCase();

//     if (!projectId || projectId === "undefined") {
//       return res.status(400).json({ message: "projectId is required" });
//     }

//     // Non-admins must be assigned to the project
//     if (!["admin", "superadmin"].includes(role)) {
//       const check = await pool.query(
//         "SELECT 1 FROM project_assignments WHERE TRIM(project_id)=TRIM($1) AND user_id=$2",
//         [projectId, userId]
//       );
//       if (check.rowCount === 0) {
//         return res.status(403).json({ message: "Not assigned to this project" });
//       }
//     }

//     const result = await pool.query(
//       `SELECT i.*, p.projectname
//        FROM expanded_factissues i
//        LEFT JOIN expanded_factprojects p ON TRIM(i.projectid) = TRIM(p.projectid)
//        WHERE TRIM(i.projectid) = TRIM($1)
//        ORDER BY i.createddate DESC`,
//       [projectId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getIssuesByProject error:", err.message);
//     res.status(500).json({ message: "Failed to fetch project issues" });
//   }
// };

// // ── POST /api/issues ─────────────────────────────────────────────────────────
// exports.createIssue = async (req, res) => {
//   const { projectid, sprint, issuetype, description, assigneeteam } = req.body;

//   if (!projectid || !issuetype || !assigneeteam) {
//     return res.status(400).json({ message: "projectid, issuetype, assigneeteam are required" });
//   }

//   const validTypes = ["Bug", "Task", "Story", "Epic"];
//   if (!validTypes.includes(issuetype)) {
//     return res.status(400).json({ message: `Invalid issuetype. Must be: ${validTypes.join(", ")}` });
//   }

//   const role = (req.user.role || "").toLowerCase();
//   if (!["admin", "superadmin"].includes(role)) {
//     const check = await pool.query(
//       "SELECT 1 FROM project_assignments WHERE TRIM(project_id)=TRIM($1) AND user_id=$2",
//       [projectid, req.user.id]
//     );
//     if (check.rowCount === 0) {
//       return res.status(403).json({ message: "Not authorized to create issues in this project" });
//     }
//   }
// const { batch_lot, production_stage, defect_type, severity, image_url } = req.body;
//   try {
//     const result = await pool.query(
//       `
//   INSERT INTO expanded_factissues
//   (projectid, sprint, issuetype, status, assigneeteam, description,
//    batch_lot, production_stage, defect_type, severity, image_url)
//   VALUES ($1, $2, $3, 'Open', $4, $5, $6, $7, $8, $9, $10)
// `, [projectid, sprint, issuetype, assigneeteam, description,
//    batch_lot, production_stage, defect_type, severity, image_url]);
//     //   `INSERT INTO expanded_factissues (projectid, sprint, issuetype, createddate, assigneeteam, description, status)
//     //    VALUES ($1, $2, $3, NOW(), $4, $5, 'Open') RETURNING *`,
//     //   [projectid, sprint || null, issuetype, assigneeteam, description || null]
//     // );
//     const newIssue = result.rows[0];
//     getIo(req)?.emit("issueCreated", newIssue);
//     res.status(201).json({ message: "Issue created successfully", issue: newIssue });
//   } catch (err) {
//     console.error("createIssue error:", err.message);
//     res.status(500).json({ message: "Failed to create issue" });
//   }
// };

// // ── PUT /api/issues/:id/status ───────────────────────────────────────────────
// // FIX: Expanded valid statuses to include all statuses used in IssueTableDeveloper/Tester
// exports.updateIssueStatus = async (req, res) => {
//   const { id }     = req.params;
//   const { status } = req.body;

//   if (!status) return res.status(400).json({ message: "Status is required" });

//   const validStatuses = [
//     "Open", "In Progress", "In Review", "Done", "Blocked",
//     "Verified", "Needs Info", "Escalated", "Testing", "Closed"
//   ];
//   if (!validStatuses.includes(status)) {
//     return res.status(400).json({ message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });
//   }

//   try {
//     const isClosing = ["Done", "Verified", "Closed"].includes(status);
//     const result = await pool.query(
//       `UPDATE expanded_factissues
//        SET status     = $1,
//            closeddate = CASE WHEN $2 THEN NOW() ELSE closeddate END
//        WHERE issueid  = $3
//        RETURNING *`,
//       [status, isClosing, id]
//     );

//     if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });

//     getIo(req)?.emit("issueUpdated", result.rows[0]);
//     res.json({ message: "Status updated successfully", issue: result.rows[0] });
//   } catch (err) {
//     console.error("updateIssueStatus error:", err.message);
//     res.status(500).json({ message: "Failed to update status" });
//   }
// };

// // ── PUT /api/issues/:id ──────────────────────────────────────────────────────
// exports.updateIssue = async (req, res) => {
//   const { id }    = req.params;
//   const userId    = req.user.id;
//   const role      = (req.user.role || "").toLowerCase();
//   const { sprint, status, description, assigneeteam } = req.body;

//   if ("createddate" in req.body) {
//     return res.status(403).json({ message: "createddate is immutable" });
//   }

//   if (!["admin", "superadmin"].includes(role)) {
//     const check = await pool.query(
//       `SELECT 1 FROM project_assignments pa
//        JOIN expanded_factissues i ON TRIM(pa.project_id) = TRIM(i.projectid)
//        WHERE i.issueid = $1 AND pa.user_id = $2`,
//       [id, userId]
//     );
//     if (check.rowCount === 0) {
//       return res.status(403).json({ message: "Not assigned to this issue's project" });
//     }
//   }

//   const updates = [];
//   const values  = [];
//   let   idx     = 1;

//   if (sprint      !== undefined) { updates.push(`sprint       = $${idx++}`); values.push(sprint);      }
//   if (status      !== undefined) { updates.push(`status       = $${idx++}`); values.push(status);      }
//   if (description !== undefined) { updates.push(`description  = $${idx++}`); values.push(description); }
//   if (assigneeteam!== undefined) { updates.push(`assigneeteam = $${idx++}`); values.push(assigneeteam);}

//   if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

//   values.push(id);
//   try {
//     const result = await pool.query(
//       `UPDATE expanded_factissues
//        SET ${updates.join(", ")},
//            closeddate = CASE WHEN status = 'Done' THEN NOW() ELSE closeddate END
//        WHERE issueid = $${idx}
//        RETURNING *`,
//       values
//     );
//     if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });
//     getIo(req)?.emit("issueUpdated", result.rows[0]);
//     res.json({ message: "Issue updated successfully", issue: result.rows[0] });
//   } catch (err) {
//     console.error("updateIssue error:", err.message);
//     res.status(500).json({ message: "Failed to update issue" });
//   }
// };

// // ── DELETE /api/issues/:id ───────────────────────────────────────────────────
// exports.deleteIssue = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query(
//       "DELETE FROM expanded_factissues WHERE issueid = $1 RETURNING *",
//       [id]
//     );
//     if (result.rowCount === 0) return res.status(404).json({ message: "Issue not found" });
//     getIo(req)?.emit("issueDeleted", { issueId: id });
//     res.json({ message: "Issue deleted successfully" });
//   } catch (err) {
//     console.error("deleteIssue error:", err.message);
//     res.status(500).json({ message: "Failed to delete issue" });
//   }
// };



// const pool = require("../db");
// const { io } = require("../server"); // Make sure server.js exports { io }

// exports.getAllIssues = async (req, res) => {
//   try {
//     const role = req.user.role.toLowerCase();
//     const userId = req.user.id;

//     let query = `
//       SELECT i.*
//       FROM expanded_factissues i
//     `;
//     const params = [];

//     // Role-based filtering
//     if (role === 'tester' || role === 'developer') {
//       query += `
//         JOIN project_assignments pa ON i.projectid = pa.project_id
//         WHERE pa.user_id = $1
//       `;
//       params.push(userId);

//       if (role === 'tester') {
//         query += ` AND i.assigneeteam = 'QA'`;
//       } else if (role === 'developer') {
//         query += ` AND i.assigneeteam IN ('Frontend', 'Backend', 'DevOps')`;
//       }
//     }
//     // Admin/superadmin see everything — no extra WHERE

//     query += ` ORDER BY i.issueid DESC`;

//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Get all issues error:", err.message);
//     res.status(500).json({ message: "Failed to fetch issues" });
//   }
// };

// exports.getMyIssues = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const role = req.user.role.toLowerCase();

//     let query = `
//       SELECT i.*
//       FROM expanded_factissues i
//       JOIN project_assignments pa ON i.projectid = pa.project_id
//       WHERE pa.user_id = $1
//     `;
//     const params = [userId];

//     if (role === 'tester') {
//       query += ` AND i.assigneeteam = 'QA'`;
//     } else if (role === 'developer') {
//       query += ` AND i.assigneeteam IN ('Frontend', 'Backend', 'DevOps')`;
//     }

//     query += ` ORDER BY i.createddate DESC`;

//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getMyIssues error:", err);
//     res.status(500).json({ message: "Failed to fetch my issues" });
//   }
// };

// exports.createIssue = async (req, res) => {
//   const { projectid, sprint, issuetype, description, assigneeteam } = req.body;

//   if (!projectid || !sprint || !issuetype || !assigneeteam) {
//     return res.status(400).json({ message: "Missing required fields: projectid, sprint, issuetype, assigneeteam" });
//   }

//   const validTypes = ["Bug", "Task", "Story", "Epic"];
//   if (!validTypes.includes(issuetype)) {
//     return res.status(400).json({ message: `Invalid issuetype. Must be one of: ${validTypes.join(", ")}` });
//   }

//   // Optional: Check if user is assigned to project
//   const assignCheck = await pool.query(
//     `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
//     [projectid, req.user.id]
//   );

//   if (assignCheck.rowCount === 0 && !['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
//     return res.status(403).json({ message: "Not authorized to create issues in this project" });
//   }

//   try {
//     const result = await pool.query(
//       `INSERT INTO expanded_factissues
//        (projectid, sprint, issuetype, createddate, assigneeteam, description, status)
//        VALUES ($1, $2, $3, NOW(), $4, $5, 'Open')
//        RETURNING *`,
//       [projectid, sprint, issuetype, assigneeteam, description || null]
//     );

//     const newIssue = result.rows[0];

//     io.emit("issueCreated", newIssue);

//     res.status(201).json({
//       message: "Issue created successfully",
//       issue: newIssue
//     });
//   } catch (err) {
//     console.error("Create issue error:", err.message);
//     res.status(500).json({ message: "Failed to create issue", error: err.message });
//   }
// };

// exports.updateIssue = async (req, res) => {
//   const { issueId } = req.params;
//   const { sprint, status, description } = req.body;
//   const userId = req.user.id;

//   try {
//     // Check assignment to project
//     const assignCheck = await pool.query(`
//       SELECT 1 FROM project_assignments pa
//       JOIN expanded_factissues i ON pa.project_id = i.projectid
//       WHERE i.issueid = $1 AND pa.user_id = $2
//     `, [issueId, userId]);

//     if (assignCheck.rowCount === 0 && !['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
//       return res.status(403).json({ message: "Not assigned to this issue's project" });
//     }

//     // Prevent changing createddate
//     if ("createddate" in req.body) {
//       return res.status(403).json({ message: "CreatedDate is immutable" });
//     }

//     // Build dynamic update
//     const updates = [];
//     const values = [];
//     let paramIndex = 1;

//     if (sprint !== undefined) {
//       updates.push(`sprint = $${paramIndex}`);
//       values.push(sprint);
//       paramIndex++;
//     }
//     if (status !== undefined) {
//       updates.push(`status = $${paramIndex}`);
//       values.push(status);
//       paramIndex++;
//     }
//     if (description !== undefined) {
//       updates.push(`description = $${paramIndex}`);
//       values.push(description);
//       paramIndex++;
//     }

//     if (updates.length === 0) {
//       return res.status(400).json({ message: "No fields provided to update" });
//     }

//     values.push(issueId);

//     const result = await pool.query(
//       `UPDATE expanded_factissues
//        SET ${updates.join(", ")},
//            closeddate = CASE WHEN status = 'Done' THEN NOW() ELSE closeddate END,
//            updated_at = CURRENT_TIMESTAMP
//        WHERE issueid = $${paramIndex}
//        RETURNING *`,
//       values
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Issue not found" });
//     }

//     const updatedIssue = result.rows[0];

//     io.emit("issueUpdated", updatedIssue);

//     res.json({
//       message: "Issue updated successfully",
//       issue: updatedIssue
//     });
//   } catch (err) {
//     console.error("updateIssue error:", err.message);
//     res.status(500).json({ message: "Failed to update issue", error: err.message });
//   }
// };
// // Delete issue (admin/superadmin only)
// exports.deleteIssue = async (req, res) => {
//   try {
//     const { issueId } = req.params;

//     // Optional: extra check (though middleware already handles role)
//     if (!['admin', 'superadmin'].includes(req.user.role?.toLowerCase())) {
//       return res.status(403).json({ message: "Not authorized to delete issues" });
//     }

//     const result = await pool.query(
//       `DELETE FROM expanded_factissues WHERE issueid = $1 RETURNING *`,
//       [issueId]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Issue not found" });
//     }

//     const deletedIssue = result.rows[0];

//     // Notify via socket
//     io.emit("issueDeleted", { issueId, deletedIssue });

//     res.json({
//       message: "Issue deleted successfully",
//       deleted: deletedIssue
//     });
//   } catch (err) {
//     console.error("deleteIssue error:", err.message);
//     res.status(500).json({ message: "Failed to delete issue", error: err.message });
//   }
// };
// exports.updateIssueStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   if (!status) {
//     return res.status(400).json({ message: "Status is required" });
//   }

//   const validStatuses = ["Open", "In Progress", "Done", "Blocked", "Testing"];
//   if (!validStatuses.includes(status)) {
//     return res.status(400).json({
//       message: `Invalid status. Allowed: ${validStatuses.join(", ")}`
//     });
//   }

//   try {
//     const result = await pool.query(
//       `UPDATE expanded_factissues
//        SET status = $1,
//            closeddate = CASE WHEN $1 = 'Done' THEN NOW() ELSE closeddate END,
//            updated_at = CURRENT_TIMESTAMP
//        WHERE issueid = $2
//        RETURNING *`,
//       [status, id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Issue not found" });
//     }

//     const updatedIssue = result.rows[0];

//     io.emit("issueUpdated", updatedIssue);

//     res.json({
//       message: "Status updated successfully",
//       issue: updatedIssue
//     });
//   } catch (err) {
//     console.error("Update status error:", err.message);
//     res.status(500).json({ message: "Failed to update status", error: err.message });
//   }
// };














































































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