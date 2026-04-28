const pool = require("../db");

async function sq(sql, params = [], label = "") {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (err) {
    console.error(`[projectController][${label}] ${err.message}`);
    return [];
  }
}

exports.getAllProjects = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes((req.user.role || "").toLowerCase())) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const rows = await sq(`
      SELECT
        p.projectid,
        p.projectid     as project_id,
        p.projectname,
        p.projectname   as name,
        p.status,
        COALESCE(p.budgetallocated, 0)::float as budgetallocated,
        COALESCE(p.budgetallocated, 0)::float as budget_total,
        COALESCE(p.budgetused, 0)::float      as budgetused,
        COALESCE(p.budgetused, 0)::float      as budget_used,
        p.startdate,
        p.enddate,
        COUNT(DISTINCT pa.user_id) as membercount,
        COUNT(DISTINCT i.issueid)  as issuecount,
        (SELECT i2.sprint FROM expanded_factissues i2
         WHERE i2.projectid::text = p.projectid::text
         ORDER BY i2.sprint DESC LIMIT 1) as sprint
      FROM expanded_factprojects p
      LEFT JOIN project_assignments pa ON pa.project_id::text = p.projectid::text
      LEFT JOIN expanded_factissues i   ON i.projectid::text  = p.projectid::text
      GROUP BY p.projectid, p.projectname, p.status,
               p.budgetallocated, p.budgetused, p.startdate, p.enddate
      ORDER BY p.projectname`, [], "getAllProjects");
    res.json(rows);
  } catch (err) {
    console.error("getAllProjects error:", err.message);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT
        p.projectid,
        p.projectid     as project_id,
        p.projectname,
        p.projectname   as name,
        p.status,
        COALESCE(p.budgetallocated, 0)::float as budget_total,
        COALESCE(p.budgetused, 0)::float      as budget_used,
        p.startdate,
        p.enddate,
        pa.role as member_role,
        pa.created_at,
        COUNT(DISTINCT i.issueid) as issuecount
      FROM expanded_factprojects p
      JOIN project_assignments pa ON p.projectid::text = pa.project_id::text AND pa.user_id = $1
      LEFT JOIN expanded_factissues i ON i.projectid::text = p.projectid::text
      GROUP BY p.projectid, p.projectname, p.status,
               p.budgetallocated, p.budgetused, p.startdate, p.enddate,
               pa.role, pa.created_at
      ORDER BY p.projectname`,
      [userId]
    );
    console.log(`[getMyProjects] User ${userId}: ${result.rowCount} projects found`);
    res.json(result.rows);
  } catch (err) {
    console.error("getMyProjects error:", err.message);
    res.status(500).json({ message: "Failed to fetch assigned projects" });
  }
};

exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId        = req.user.id;
    const role          = (req.user.role || "").toLowerCase();

    if (!projectId || projectId === "undefined") {
      return res.status(400).json({ message: "Valid projectId required" });
    }

    if (!["admin", "superadmin"].includes(role)) {
      const check = await pool.query(
        "SELECT 1 FROM project_assignments WHERE project_id::text=$1 AND user_id=$2",
        [projectId, userId]
      );
      if (check.rowCount === 0) return res.status(403).json({ message: "Not assigned to this project" });
    }

    const result = await pool.query(`
      SELECT
        p.*,
        p.projectid   as project_id,
        p.projectname as name,
        (
          SELECT COUNT(DISTINCT pa.user_id)
          FROM project_assignments pa
          WHERE pa.project_id::text = p.projectid::text
        ) as membercount,
        (
          SELECT COUNT(DISTINCT i.issueid)
          FROM expanded_factissues i
          WHERE i.projectid::text = p.projectid::text
        ) as issuecount
      FROM expanded_factprojects p
      WHERE p.projectid::text = $1`,
      [projectId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Project not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getProject error:", err.message);
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId || projectId === "undefined") {
      return res.status(400).json({ message: "Valid projectId required" });
    }
    const [byStatus, byType, bySprint] = await Promise.all([
      sq(`SELECT COALESCE(status,'Unknown') as status, COUNT(*) as count FROM expanded_factissues WHERE projectid::text=$1 GROUP BY status`, [projectId], "pStats-status"),
      sq(`SELECT COALESCE(issuetype,'Unknown') as issue_type, COUNT(*) as count FROM expanded_factissues WHERE projectid::text=$1 GROUP BY issuetype`, [projectId], "pStats-type"),
      sq(`SELECT COALESCE(sprint,'No Sprint') as sprint, COUNT(*) as count FROM expanded_factissues WHERE projectid::text=$1 GROUP BY sprint ORDER BY MIN(createddate)`, [projectId], "pStats-sprint"),
    ]);
    res.json({ byStatus, byType, bySprint });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project stats" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) return res.status(403).json({ message: "Not authorized" });
    const { projectId } = req.params;
    const { projectname, status, budgetallocated, budgetused, startdate, enddate } = req.body;
    const result = await pool.query(`
      UPDATE expanded_factprojects
      SET projectname    = COALESCE($1, projectname),
          status         = COALESCE($2, status),
          budgetallocated= COALESCE($3, budgetallocated),
          budgetused     = COALESCE($4, budgetused),
          startdate      = COALESCE($5, startdate),
          enddate        = COALESCE($6, enddate)
      WHERE projectid::text = $7 RETURNING *`,
      [projectname, status, budgetallocated, budgetused, startdate, enddate, projectId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Project not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateProject error:", err.message);
    res.status(500).json({ message: "Failed to update project" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    if ((req.user.role || "").toLowerCase() !== "superadmin") {
      return res.status(403).json({ message: "SuperAdmin access required" });
    }
    const { projectId } = req.params;
    await pool.query("DELETE FROM expanded_factissues   WHERE projectid::text = $1", [projectId]);
    await pool.query("DELETE FROM project_assignments   WHERE project_id::text = $1", [projectId]);
    await pool.query("DELETE FROM expanded_factprojects WHERE projectid::text = $1", [projectId]);
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("deleteProject error:", err.message);
    res.status(500).json({ message: "Failed to delete project" });
  }
};

exports.assignUserToProject = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes((req.user.role || "").toLowerCase())) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { project_id, user_id, role_in_project = "member" } = req.body;
    if (!project_id || !user_id) return res.status(400).json({ message: "project_id and user_id required" });
    await pool.query(
      `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (project_id, user_id) DO UPDATE SET role_in_project=$3`,
      [project_id, user_id, role_in_project, req.user.id]
    );
    res.status(201).json({ message: "User assigned to project" });
  } catch (err) {
    console.error("assignUserToProject error:", err.message);
    res.status(500).json({ message: "Failed to assign user" });
  }
};

exports.instantAssign = async (req, res) => {
  const { project_id, email } = req.body;
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    let userId = existing.rows[0]?.id;
    if (!userId) {
      const bcrypt   = require("bcryptjs");
      const hashed   = bcrypt.hashSync("changeme123", 10);
      const newUser  = await pool.query(
        "INSERT INTO users (email, role, password, status) VALUES ($1,'tester',$2,'approved') RETURNING id",
        [email, hashed]
      );
      userId = newUser.rows[0].id;
    }
    await pool.query(
      `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
       VALUES ($1,$2,'developer',$3) ON CONFLICT (project_id, user_id) DO NOTHING`,
      [project_id, userId, req.user.id]
    );
    res.status(201).json({ message: "Member assigned successfully" });
  } catch (err) {
    console.error("instantAssign error:", err.message);
    res.status(500).json({ message: "Failed to assign member" });
  }
};

exports.requestProjectChange = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { field, new_value, reason } = req.body;
    if (!field || !new_value) return res.status(400).json({ message: "field and new_value required" });
    await pool.query(
      `INSERT INTO change_requests (project_id, requested_by, field, new_value, reason, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',NOW())`,
      [projectId, req.user.id, field, new_value, reason || null]
    );
    res.status(201).json({ message: "Change request submitted" });
  } catch (err) {
    console.error("requestProjectChange error:", err.message);
    res.status(500).json({ message: "Failed to submit request" });
  }
};

exports.submitSprintRequest = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { new_sprint, reason } = req.body;
    await pool.query(
      `INSERT INTO change_requests (project_id, requested_by, field, new_value, reason, status, created_at)
       VALUES ($1,$2,'sprint',$3,$4,'pending',NOW())`,
      [projectId, req.user.id, new_sprint, reason || null]
    );
    res.status(201).json({ message: "Sprint change request submitted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit sprint request" });
  }
};

exports.approveSprintRequest = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes((req.user.role || "").toLowerCase())) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { requestId, approve } = req.body;
    const request = await pool.query("SELECT * FROM change_requests WHERE id=$1 AND status='pending'", [requestId]);
    if (request.rowCount === 0) return res.status(404).json({ message: "Request not found" });
    const cr = request.rows[0];
    if (approve) {
      if (cr.field === "sprint") {
        await pool.query("UPDATE expanded_factissues SET sprint=$1 WHERE projectid::text=$2", [cr.new_value, cr.project_id]);
      } else if (cr.field === "enddate") {
        await pool.query("UPDATE expanded_factprojects SET enddate=$1 WHERE projectid::text=$2", [cr.new_value, cr.project_id]);
      }
      await pool.query("UPDATE change_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2", [req.user.id, requestId]);
    } else {
      await pool.query("UPDATE change_requests SET status='rejected', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2", [req.user.id, requestId]);
    }
    res.json({ message: approve ? "Request approved" : "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Failed to process request" });
  }
};

exports.getProjectInsights = async (req, res) => {
  try {
    const { projectId } = req.params;
    const role   = (req.user.role || "").toLowerCase();
    const userId = req.user.id;
    if (!["admin", "superadmin"].includes(role)) {
      const check = await pool.query(
        "SELECT 1 FROM project_assignments WHERE project_id::text=$1 AND user_id=$2",
        [projectId, userId]
      );
      if (check.rowCount === 0) return res.status(403).json({ message: "Not assigned" });
    }
    const duration = await sq(
      `SELECT (enddate::date - startdate::date) AS duration_days FROM expanded_factprojects WHERE projectid::text=$1`,
      [projectId], "duration"
    );
    const monthly = await sq(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', closeddate::timestamp), 'Mon YYYY') as month,
        SUM(CASE WHEN issuetype='Bug'  AND closeddate IS NOT NULL THEN 1 ELSE 0 END) as bugs_solved,
        SUM(CASE WHEN issuetype='Task' AND closeddate IS NOT NULL THEN 1 ELSE 0 END) as tasks_solved
      FROM expanded_factissues
      WHERE projectid::text=$1
        AND closeddate IS NOT NULL AND closeddate::text != ''
      GROUP BY DATE_TRUNC('month', closeddate::timestamp)
      ORDER BY MIN(DATE_TRUNC('month', closeddate::timestamp))`,
      [projectId], "monthly"
    );
    res.json({ duration_days: duration[0]?.duration_days || 0, monthly_insights: monthly });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch insights" });
  }
};

exports.getUsers = async (req, res) => {
  const rows = await sq("SELECT id, email, role, COALESCE(status,'approved') as status FROM users ORDER BY email ASC", [], "getUsers");
  res.json(rows);
};
