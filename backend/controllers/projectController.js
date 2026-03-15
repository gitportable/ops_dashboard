const pool = require("../db");
exports.getAllProjects = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Not authorized to view all projects" });
    }

    const query = `
      SELECT 
        p.projectid, 
        p.projectname, 
        p.status, 
        p.budgetallocated, 
        p.budgetused,
        p.startdate,
        p.enddate,
        -- Get the most recent sprint name
        (SELECT i.sprint FROM expanded_factissues i 
         WHERE i.projectid = p.projectid 
         ORDER BY i.sprint DESC LIMIT 1) as current_sprint,
        -- Total number of issues
        (SELECT COUNT(*) FROM expanded_factissues i 
         WHERE i.projectid = p.projectid) as totalissues,
        -- Number of solved issues
        (SELECT COUNT(*) FROM expanded_factissues i 
         WHERE i.projectid = p.projectid AND i.closeddate IS NOT NULL) as solvedissues
      FROM expanded_factprojects p
      ORDER BY p.projectname;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("getAllProjects error:", err);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};
// Get ALL projects (admin/superadmin only)
// exports.getAllProjects = async (req, res) => {
//   try {
//     if (!['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
//       return res.status(403).json({ message: "Not authorized to view all projects" });
//     }
//     const result = await pool.query(`SELECT * FROM expanded_factprojects ORDER BY projectname`);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("getAllProjects error:", err);
//     res.status(500).json({ message: "Failed to fetch projects" });
//   }
// };

// Get MY assigned projects (tester/developer see only theirs)
exports.getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const query = `
      SELECT p.*, pa.role_in_project, pa.assigned_at
      FROM expanded_factprojects p
      JOIN project_assignments pa ON TRIM(p.projectid) = TRIM(pa.project_id)
      WHERE pa.user_id = $1
      ORDER BY p.projectname
    `;

    const result = await pool.query(query, [userId]);
    
    console.log(`[GetMyProjects] Found ${result.rowCount} projects for User ID: ${userId}`);
    res.json(result.rows);
  } catch (err) {
    console.error("getMyProjects error:", err);
    res.status(500).json({ message: "Failed to fetch assigned projects" });
  }
};
// Get specific project with members and stats
exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT p.*, 
            (SELECT COUNT(*) FROM issues WHERE project_id = p.projectid AND status = 'Solved') as solvedIssues,
            (SELECT COUNT(*) FROM issues WHERE project_id = p.projectid) as totalIssues,
            (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', u.id, 'email', u.email, 'role', u.role))
            FROM users u 
            JOIN project_assignments pm ON u.id = pm.user_id 
            WHERE pm.project_id = p.projectid) as members
            FROM projects p 
            WHERE p.projectid = ?`;
        
        const [results] = await db.execute(query, [id]);
        if (results.length === 0) return res.status(404).json({ message: "Project not found" });
        
        res.json(results[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.instantAssign = async (req, res) => {
  const { project_id, email } = req.body;
  
  try {
    // 1. Check if user already exists
    let userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    let userId= userResult.rows[0]?.id;

    if (userResult.rowCount === 0) {
      // 2. Create a new user if they don't exist
      // Default password and role for new users created on the fly
      const newUser = await pool.query(
        "INSERT INTO users (email, role, password) VALUES ($1, 'tester', 'imtester') RETURNING id",
        [email]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // 3. Assign the user to the project
    await pool.query(
      `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
       VALUES ($1, $2, 'developer', $3)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [project_id, userId, req.user.id]
    );

    res.status(201).json({ message: "Member assigned successfully" });
  } catch (err) {
    console.error("instantAssign error:", err);
    res.status(500).json({ message: "Server error during assignment" });
  }
};
// Assign a member to a project
exports.assignMember = async (req, res) => {
    const { project_id, user_id } = req.body;
    try {
        // const query = "INSERT INTO project_members (project_id, user_id) VALUES($1, $2, 'developer')";
        // await db.execute(query, [project_id, user_id]);
        res.json({ message: "User assigned to project successfully" });
    } catch (err) {
        res.status(500).json({ error: "User is already assigned or DB error" });
    }
};
// Get single project (with access check)
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    // Check assignment (except for admin/superadmin)
    if (!['admin', 'superadmin'].includes(role)) {
      const assignCheck = await pool.query(
        `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      );
      if (assignCheck.rowCount === 0) {
        return res.status(403).json({ message: "Not assigned to this project" });
      }
    }

    const result = await pool.query(
      `SELECT * FROM expanded_factprojects WHERE projectid = $1`,
      [projectId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getProject error:", err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
};
exports.assignUserToProject = async (req, res) => {
  try {
    const { project_id, user_id, role_in_project = 'viewer' } = req.body;

    // Use the table name from your DESCRIBE results: project_assignments
    const result = await pool.query(
      `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (project_id, user_id) DO NOTHING -- Prevents double assignment error
       RETURNING *`,
      [project_id, user_id, role_in_project, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("assignUserToProject error:", err);
    res.status(500).json({ message: "Failed to assign user" });
  }
};
// Assign user to project (admin/superadmin only)
// exports.assignUserToProject = async (req, res) => {
//   try {
//     if (!['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
//       return res.status(403).json({ message: "Not authorized to assign users" });
//     }

//     const { project_id, user_id, role_in_project = 'viewer' } = req.body;

//     if (!project_id || !user_id) {
//       return res.status(400).json({ message: "project_id and user_id required" });
//     }

//     if (!['lead', 'developer', 'tester', 'viewer'].includes(role_in_project)) {
//       return res.status(400).json({ message: "Invalid role_in_project" });
//     }

//     const existing = await pool.query(
//       `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
//       [project_id, user_id]
//     );

//     if (existing.rowCount > 0) {
//       return res.status(409).json({ message: "User already assigned" });
//     }

//     const result = await pool.query(
//       `INSERT INTO project_assignments (project_id, user_id, role_in_project, assigned_by)
//        VALUES ($1, $2, $3, $4) RETURNING *`,
//       [project_id, user_id, role_in_project, req.user.id]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error("assignUserToProject error:", err);
//     res.status(500).json({ message: "Failed to assign user" });
//   }
// };
exports.requestProjectChange = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { field, new_value, reason } = req.body;
    const userId = req.user.id; // From your auth middleware

    // Validate that we allow this type of request
    const allowedFields = ['status', 'startdate', 'enddate', 'budgetallocated', 'new_user_assignment'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: "Invalid change field" });
    }

    // Insert into your change_requests table
    const result = await pool.query(
      `INSERT INTO change_requests (project_id, requested_by, field, new_value, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [projectId, userId, field, new_value, reason]
    );

    res.json({ message: "Request submitted", requestId: result.rows[0].id });
  } catch (err) {
    console.error("Error in requestProjectChange:", err);
    res.status(500).json({ message: "Database error while submitting request" });
  }
};
// Request project change (tester/developer)
// exports.requestProjectChange = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const { field, new_value, reason } = req.body;

//     if (!field || !new_value || !reason) {
//       return res.status(400).json({ message: "field, new_value, reason required" });
//     }

//     if (!['status', 'startdate', 'enddate', 'budgetallocated'].includes(field.toLowerCase())) {
//       return res.status(400).json({ message: "Invalid field" });
//     }

//     const userId = req.user.id;

//     const assignCheck = await pool.query(
//       `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
//       [projectId, userId]
//     );

//     if (assignCheck.rowCount === 0) {
//       return res.status(403).json({ message: "Not assigned to this project" });
//     }

//     // Save to change_requests table
//     const result = await pool.query(
//       `INSERT INTO change_requests (project_id, requested_by, field, new_value, reason)
//        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
//       [projectId, userId, field, new_value, reason]
//     );

//     res.json({ message: "Request submitted for approval", requestId: result.rows[0].id });
//   } catch (err) {
//     console.error("requestProjectChange error:", err);
//     res.status(500).json({ message: "Failed to submit request" });
//   }
// };

// Submit sprint change request (tester/developer)
exports.submitSprintRequest = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { newSprint, reason } = req.body;
    const userId = req.user.id;

    const assignCheck = await pool.query(
      `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    if (assignCheck.rowCount === 0) {
      return res.status(403).json({ message: "Not assigned to this project" });
    }

    const result = await pool.query(
      `INSERT INTO change_requests (project_id, requested_by, field, new_value, reason)
       VALUES ($1, $2, 'sprint', $3, $4) RETURNING *`,
      [projectId, userId, newSprint, reason]
    );

    res.json({ message: "Sprint request submitted for approval", requestId: result.rows[0].id });
  } catch (err) {
    console.error("submitSprintRequest error:", err);
    res.status(500).json({ message: "Failed to submit request" });
  }
};

// Approve change request (admin/superadmin)
exports.approveSprintRequest = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Not authorized to approve" });
    }

    const { requestId, approve } = req.body;

    const request = await pool.query(
      `SELECT * FROM change_requests WHERE id = $1 AND status = 'pending'`,
      [requestId]
    );

    if (request.rowCount === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const cr = request.rows[0];

    if (approve) {
      if (cr.field === 'sprint') {
        await pool.query(
          `UPDATE expanded_factissues SET sprint = $1 WHERE projectid = $2`,
          [cr.new_value, cr.project_id]
        );
      } else if (cr.field === 'enddate') {
        await pool.query(
          `UPDATE expanded_factprojects SET enddate = $1 WHERE projectid = $2`,
          [cr.new_value, cr.project_id]
        );
      } // Add more fields as needed

      await pool.query(
        `UPDATE change_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [req.user.id, requestId]
      );
    } else {
      await pool.query(
        `UPDATE change_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [req.user.id, requestId]
      );
    }

    res.json({ message: approve ? "Request approved and applied" : "Request rejected" });
  } catch (err) {
    console.error("approveSprintRequest error:", err);
    res.status(500).json({ message: "Failed to approve request" });
  }
};

// Get project insights (monthly bugs/tasks, duration)
exports.getProjectInsights = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    // Check assignment (except admin/superadmin)
    if (!['admin', 'superadmin'].includes(role)) {
      const assignCheck = await pool.query(
        `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      );

      if (assignCheck.rowCount === 0) {
        return res.status(403).json({ message: "Not assigned to this project" });
      }
    }

    // Duration
    const durationResult = await pool.query(
      `SELECT (enddate - startdate) AS duration_days FROM expanded_factprojects WHERE projectid = $1`,
      [projectId]
    );
    const duration = durationResult.rows[0]?.duration_days || 0;

    // Monthly bugs/tasks solved (tester sees QA only)
    let monthlyQuery = `
      SELECT 
        dd.monthname || ' ' || dd.year AS month,
        COUNT(CASE WHEN i.issuetype = 'Bug' AND i.closeddate IS NOT NULL THEN 1 END) AS bugs_solved,
        COUNT(CASE WHEN i.issuetype = 'Task' AND i.closeddate IS NOT NULL THEN 1 END) AS tasks_solved
      FROM expanded_factissues i
      JOIN expanded_factprojects p ON i.projectid = p.projectid
      LEFT JOIN dimdate dd ON DATE_TRUNC('month', i.closeddate::date) = dd.date::date
      WHERE p.projectid = $1
    `;
    const params = [projectId];

    if (role === 'tester') {
      monthlyQuery += ` AND i.assigneeteam = 'QA'`;
    } else if (role === 'developer') {
      monthlyQuery += ` AND i.assigneeteam IN ('Frontend', 'Backend', 'DevOps')`;
    }

    monthlyQuery += `
      GROUP BY dd.year, dd.monthnumber, dd.monthname
      ORDER BY dd.year, dd.monthnumber
    `;

    const monthlyInsights = await pool.query(monthlyQuery, params);

    res.json({
      duration_days: duration,
      monthly_insights: monthlyInsights.rows
    });
  } catch (err) {
    console.error("getProjectInsights error:", err);
    res.status(500).json({ message: "Failed to fetch insights" });
  }
};
// Get all users for the dropdown menu
exports.getUsers = async (req, res) => {
  try {
    // This query pulls from your 'users' table which has 'id', 'email', and 'role'
    const result = await pool.query("SELECT id, email, role FROM users ORDER BY email ASC");
    
    if (result.rows.length === 0) {
       console.log("Database Warning: No users found in the users table.");
    }

    res.json(result.rows);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// const pool = require("../db");

// exports.updateProject = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;

//   if (Object.keys(fields).length === 0) {
//     return res.status(403).json({ message: "No permitted fields to update" });
//   }

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   try {
//     await pool.query(
//       `UPDATE expanded_factprojects SET ${setClause} WHERE projectid = $${values.length + 1}`,
//       [...values, id]
//     );
//     res.json({ message: "Project updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update project" });
//   }
// };

// exports.getAllProjects = async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM expanded_factprojects ORDER BY projectid"
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch projects" });
//   }
// };





// const pool = require("../db");

// exports.updateProject = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;

//   if (Object.keys(fields).length === 0)
//     return res.status(403).json({ message: "No permitted fields to update" });

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   await pool.query(
//     `UPDATE expanded_factprojects SET ${setClause} WHERE projectid = $${values.length + 1}`,
//     [...values, id]
//   );

//   res.json({ message: "Project updated successfully" });
// };

// exports.getAllProjects = async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM expanded_factprojects ORDER BY projectid");
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch projects" });
//   }
// };






// const pool = require("../db");

// exports.updateProject = async (req, res) => {
//   const { id } = req.params;
//   const fields = req.filteredBody;
//   exports.getAllProjects = async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM expanded_factprojects ORDER BY projectid");
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
//   };
//   if (Object.keys(fields).length === 0)
//     return res.status(403).json({ message: "No permitted fields to update" });

//   const setClause = Object.keys(fields)
//     .map((key, i) => `${key} = $${i + 1}`)
//     .join(", ");

//   const values = Object.values(fields);

//   await pool.query(
//     `UPDATE expanded_factprojects SET ${setClause} WHERE projectid = $${
//       values.length + 1
//     }`,
//     [...values, id]
//   );

//   res.json({ message: "Project updated successfully" });
// };
