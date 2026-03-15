const projectWriteRules = {
  superadmin: ["budgetallocated", "budgetspent", "status", "startdate", "enddate", "budget_used"],
  admin:      ["projectid", "projectname", "status", "startdate", "enddate", "budget_used"],
};

const issueWriteRules = {
  superadmin: [],
  admin: ["status", "closeddate", "sprint", "assigneeteam", "issuetype"],
  developer: ["status", "closeddate"],
  tester: ["status", "closeddate", "issuetype"],
};

exports.filterProjectFields = (req, res, next) => {
  const role = req.user.role;
  const allowed = projectWriteRules[role] || [];

  const filtered = {};
  Object.keys(req.body).forEach((key) => {
    if (allowed.includes(key.toLowerCase())) {
      filtered[key] = req.body[key];
    }
  });

  req.filteredBody = filtered;
  next();
};

exports.filterIssueFields = (req, res, next) => {
  const role = req.user.role;
  const allowed = issueWriteRules[role] || [];

  const filtered = {};
  Object.keys(req.body).forEach((key) => {
    if (allowed.includes(key.toLowerCase())) {
      filtered[key] = req.body[key];
    }
  });

  req.filteredBody = filtered;
  next();
};