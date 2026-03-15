// const router = require("express").Router();
// const auth = require("../middleware/auth");
// const controller = require("../controllers/dashboardController.js");  // ← check this path
// // Add to your existing issueRoutes.js
// router.put('/:issueId', authenticateToken, issueController.updateIssue);
// router.get('/my-issues', authenticateToken, issueController.getMyIssues);
// // Basic stats route
// router.get("/", auth, controller.getDashboardStats);

// // Charts route (if you added it)
// router.get("/charts", auth, controller.getDashboardCharts);

// module.exports = router;


const express = require('express');
const router = express.Router();

// Import all controllers
const issueController = require('../controllers/issueController');
const dashboardController = require('../controllers/dashboardController'); // ← FIXED: import this

// Import auth middleware
const authenticateToken = require('../middleware/auth');

// Protect ALL routes in this file
router.use(authenticateToken);

// Dashboard stats (KPIs: total projects, issues, bugs)
router.get('/', dashboardController.getDashboardStats);

// Dashboard charts (status, resolution time, budget, bugs per sprint, etc.)
router.get('/charts', dashboardController.getDashboardCharts);

// Issues routes (moved here from issueRoutes if needed, or keep separate)
router.get('/issues', issueController.getAllIssues);          // All issues (role-filtered)
router.get('/issues/my-issues', issueController.getMyIssues); // Tester/Dev only
router.post('/issues', issueController.createIssue);          // Create new issue
router.put('/issues/:issueId', issueController.updateIssue);  // Update issue
router.put('/issues/:issueId/status', issueController.updateIssueStatus); // Status only

// Delete issue (admin/superadmin only) - only one route
router.delete('/issues/:issueId', (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role?.toLowerCase())) {
    return res.status(403).json({ message: "Not authorized to delete issues" });
  }
  next();
}, issueController.deleteIssue || ((req, res) => res.status(501).json({ message: "Delete not implemented yet" })));

module.exports = router;




























// const express = require('express');
// const router = express.Router();

// const issueController = require('../controllers/issueController');
// const authenticateToken = require('../middleware/auth'); // ← FIXED: import here

// // Apply authentication to all routes in this file
// router.use(authenticateToken);

// // Existing routes (your original ones)
// router.get('/', issueController.getAllIssues);
// router.post('/', issueController.createIssue);
// router.get('/my-issues', issueController.getMyIssues);
// router.delete('/:issueId', authenticateToken, issueController.deleteIssue);
// router.get('/', dashboardController.getDashboardStats);
// router.put('/:issueId', issueController.updateIssue);
// router.put('/:issueId/status', issueController.updateIssueStatus);
// router.get('/charts', dashboardController.getDashboardCharts);
// // Optional: If you want to restrict some routes further (admin only)
// router.delete('/:issueId', (req, res, next) => {
//   if (!['admin', 'superadmin'].includes(req.user.role?.toLowerCase())) {
//     return res.status(403).json({ message: "Not authorized to delete issues" });
//   }
//   next();
// }, issueController.deleteIssue); // add delete if you have it

// module.exports = router;