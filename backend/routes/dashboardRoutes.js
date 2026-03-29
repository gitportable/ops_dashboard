const router     = require("express").Router();
const auth       = require("../middleware/auth");
const c          = require("../controllers/dashboardController");

router.use(auth);
router.get("/stats",            c.getDashboardStats);
router.get("/by-status",        c.getByStatus);
router.get("/by-type",          c.getByType);
router.get("/by-sprint",        c.getBySprint);
router.get("/by-team",          c.getByTeam);
router.get("/trend",            c.getTrend);
router.get("/age-distribution", c.getAgeDistribution);
router.get("/burndown",         c.getBurndown);
router.get("/velocity",         c.getVelocityData);
router.get("/budget",           c.getBudgetUtilization);
router.get("/resolution-time",  c.getResolutionTime);
router.get("/project-health",   c.getProjectHealth);
router.get("/overdue",          c.getOverdueIssues);
router.get("/sla",              c.getSLACompliance);
router.get("/cumulative-trend", c.getCumulativeTrend);
router.get("/project-list",     c.getProjectList);
router.get("/role-overview",    c.getRoleOverview);
router.get("/charts",           c.getDashboardCharts);
router.get("/schema",           c.getSchema);          

module.exports = router;
