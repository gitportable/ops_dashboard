const router = require("express").Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { filterIssueFields } = require("../middleware/fieldFilter");
const controller = require("../controllers/issueController");

// GET all issues
router.get(
  "/",
  auth,
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM expanded_factissues ORDER BY issueid"
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  }
);

// UPDATE issue (full update with field filtering)
router.put(
  "/:id",
  auth,
  rbac("admin", "developer", "tester"),
  filterIssueFields,
  controller.updateIssue
);

// UPDATE issue status only
router.put(
  "/:id/status",
  auth,
  rbac("developer", "tester", "admin", "superadmin"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status required" });
    }

    try {
      await pool.query(
        "UPDATE expanded_factissues SET status = $1 WHERE issueid = $2",
        [status, id]
      );
      res.json({ message: "Status updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update status" });
    }
  }
);
// Create new issue (dev/tester only)
router.post("/", auth, rbac("developer", "tester"), async (req, res) => {
  const { projectId, sprint, issueType, description, assigneeTeam } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO expanded_factissues (issueid, projectid, sprint, issuetype, createddate, assigneeteam, description) VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING *",
      [generateIssueId(), projectId, sprint, issueType, assigneeTeam, description] // generateIssueId() is a helper function below
    );
    const newIssue = result.rows[0];
    io.emit('issueCreated', newIssue); // Real-time broadcast
    res.json({ message: "Issue created", issue: newIssue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create issue" });
  }
});

// Update issue (dev/tester for status/sprint, admin for all)
router.put("/:id", auth, rbac("developer", "tester", "admin"), filterIssueFields, async (req, res) => {
  const { id } = req.params;
  const fields = req.filteredBody;
  try {
    const setClause = Object.keys(fields).map((key, i) => `${key} = $${i + 1}`).join(", ");
    const values = Object.values(fields);
    values.push(id);
    await pool.query(
      `UPDATE expanded_factissues SET ${setClause}, closeddate = COALESCE(closeddate, NOW()) WHERE issueid = $${values.length}`,
      values
    );
    io.emit('issueUpdated', { issueId: id, changes: fields }); // Real-time broadcast
    res.json({ message: "Issue updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update issue" });
  }
});

// New: Get issues by project (for admin/superadmin monitoring)
router.get("/project/:projectId", auth, rbac("admin", "superadmin"), async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM expanded_factissues WHERE projectid = $1 ORDER BY createddate DESC",
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch project issues" });
  }
});

// New: Audit log for changes (admin/superadmin)
router.get("/audit/:projectId", auth, rbac("admin", "superadmin"), async (req, res) => {
  const { projectId } = req.params;
  try {
    // Assuming you add an audit table or query changes from issues (e.g., created/closed dates)
    const result = await pool.query(
      "SELECT i.*, p.projectname FROM expanded_factissues i JOIN expanded_factprojects p ON i.projectid = p.projectid WHERE i.projectid = $1 ORDER BY i.closeddate DESC",
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit log" });
  }
});

module.exports = router;




// const router = require("express").Router();
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// const { filterIssueFields } = require("../middleware/fieldFilter");
// const controller = require("../controllers/issueController");

// // New GET route
// router.get(
//   "/",
//   auth,
//   async (req, res) => {   // ← you can add rbac(...) later if you want
//     try {
//       const result = await pool.query(
//         "SELECT * FROM expanded_factissues ORDER BY issueid"
//       );
//       res.json(result.rows);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Failed to fetch issues" });
//     }
//   }
// );

// // Your existing PUT route
// router.put(
//   "/:id",
//   auth,
//   rbac("admin", "developer", "tester"),
//   filterIssueFields,
//   controller.updateIssue
// );

// // Optional: the status endpoint we talked about
// router.put(
//   "/:id/status",
//   auth,
//   rbac("developer", "tester", "admin", "superadmin"),
//   async (req, res) => {
//     const { id } = req.params;
//     const { status } = req.body;

//     if (!status) return res.status(400).json({ message: "Status required" });

//     try {
//       await pool.query(
//         "UPDATE expanded_factissues SET status = $1 WHERE issueid = $2",
//         [status, id]
//       );
//       res.json({ message: "Status updated successfully" });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Failed to update status" });
//     }
//   }
// );

// module.exports = router;