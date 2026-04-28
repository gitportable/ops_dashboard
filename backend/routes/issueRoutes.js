const router     = require("express").Router();
const auth       = require("../middleware/auth");
const rbac       = require("../middleware/rbac");
const controller = require("../controllers/issueController");
const pool       = require("../db");
const getIo      = (req) => req.app.get("io");
router.use(auth);
router.get("/", controller.getAllIssues);
router.get("/my-tasks", controller.getMyTasks);
router.get("/my-issues", controller.getMyIssues);
router.get("/project/:projectId", controller.getIssuesByProject);
router.post("/", rbac("developer", "tester", "admin", "superadmin"), controller.createIssue);
router.put("/bulk-assign-sprint", rbac("admin", "superadmin"), async (req, res) => {
  const { issueIds, sprint } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE expanded_factissues SET sprint = $1 WHERE issueid = ANY($2::text[])`,
      [sprint, issueIds]
    );
    getIo(req)?.emit("issueUpdated", { bulk: true, sprint });
    return res.status(200).json({ message: "Sprint assigned", updated: result.rowCount });
  } catch (err) {
    return res.status(500).json({ message: "Failed to assign sprint" });
  }
});
router.put("/:id/status", rbac("developer", "tester", "admin", "superadmin"), controller.updateIssueStatus);
router.put("/:id", rbac("developer", "tester", "admin", "superadmin"), controller.updateIssue);
router.put("/:id/machine", rbac("developer", "admin", "superadmin"), async (req, res) => {
  const { id } = req.params;
  const { machine_id } = req.body || {};
  const machineIdValue = machine_id === null || machine_id === undefined || machine_id === "" ? null : Number(machine_id);

  if (machineIdValue !== null && Number.isNaN(machineIdValue)) {
    return res.status(400).json({ message: "machine_id must be an integer or null" });
  }

  try {
    const result = await pool.query(
      `UPDATE expanded_factissues
       SET machine_id = $1
       WHERE issueid = $2
       RETURNING *`,
      [machineIdValue, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const updatedIssue = result.rows[0];
    getIo(req)?.emit("issueUpdated", updatedIssue);
    return res.status(200).json(updatedIssue);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update machine assignment" });
  }
});
router.delete("/:id", rbac("admin", "superadmin"), controller.deleteIssue);
router.get("/defect-summary", rbac("tester", "admin", "superadmin"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT MIN(issueid) as issueid, defect_category, COUNT(*) as count 
       FROM expanded_factissues 
       WHERE defect_category IS NOT NULL 
       GROUP BY defect_category`
    );
    res.json(result.rows);
  } catch (err) {
    try {
      const result2 = await pool.query(
        `SELECT defect_category, COUNT(*) as count 
         FROM issue_defect_details 
         GROUP BY defect_category`
      );
      res.json(result2.rows);
    } catch (err2) {
      console.error('[GET /defect-summary]', err2.message);
      res.status(500).json({ message: 'Failed to fetch defect summary' });
    }
  }
});
router.get("/:id", async (req, res) => {
  const rawId = req.params.id;
  const issueid = isNaN(rawId)
    ? rawId
    : 'I' + String(parseInt(rawId)).padStart(6, '0');

  try {
    const result = await pool.query(
      `SELECT * FROM expanded_factissues WHERE issueid = $1 LIMIT 1`,
      [issueid]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch issue" });
  }
});

router.put("/:id/defect-classify", rbac("tester", "admin", "superadmin"), async (req, res) => {
  const { id } = req.params;
  const { defect_category, defect_location } = req.body;
  try {
    await pool.query(
      `UPDATE expanded_factissues 
       SET defect_category = $1, defect_location = $2 
       WHERE issueid = $3`,
      [defect_category, defect_location, id]
    );
    console.log(`[PUT /:id/defect-classify] Updated expanded_factissues for issue ${id}`);
    res.status(200).json({ message: 'Defect classified' });
  } catch (err) {
    try {
      await pool.query(
        `INSERT INTO issue_defect_details (issue_id, defect_category, defect_location) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (issue_id) 
         DO UPDATE SET defect_category = EXCLUDED.defect_category, defect_location = EXCLUDED.defect_location`,
        [id, defect_category, defect_location]
      );
      console.log(`[PUT /:id/defect-classify] Inserted/Updated issue_defect_details for issue ${id}`);
      res.status(200).json({ message: 'Defect classified' });
    } catch (err2) {
      console.error('[PUT /:id/defect-classify] Fallback failed', err2.message);
      res.status(500).json({ message: 'Failed to classify defect' });
    }
  }
});

module.exports = router;

