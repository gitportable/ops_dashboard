
const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const rbac       = require("../middleware/rbac");
const controller = require("../controllers/projectController");

router.use(auth);
router.get("/all", rbac("admin", "superadmin"), controller.getAllProjects);
router.get("/my-projects", controller.getMyProjects);
router.get("/users", rbac("admin", "superadmin"), controller.getUsers);
router.post("/assign", rbac("admin", "superadmin"), controller.assignUserToProject);
router.post("/instant-assign", rbac("admin", "superadmin"), controller.instantAssign);
router.put("/approve-sprint-request", rbac("admin", "superadmin"), controller.approveSprintRequest);
router.get("/:projectId/stats", controller.getProjectStats);
router.get("/:projectId/insights", controller.getProjectInsights);
router.post("/:projectId/request-change", controller.requestProjectChange);
router.post("/:projectId/sprint-request", controller.submitSprintRequest);
router.get("/:projectId", controller.getProject);
router.put("/:projectId", rbac("admin", "superadmin"), controller.updateProject);
router.delete("/:projectId", rbac("superadmin"), controller.deleteProject);
module.exports = router;
