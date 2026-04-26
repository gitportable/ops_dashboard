
import api from "./axios";
 
// ── Basic CRUD ──────────────────────────────────────────────────────────────
export const getIssues = () => api.get("/issues").then(r => r.data);
 
export const createIssue = (data) => api.post("/issues", data);
 
export const updateIssueStatus = (id, status) =>
  api.put(`/issues/${id}/status`, { status });
 
export const updateIssue = (id, data) => api.put(`/issues/${id}`, data);

// ── Filtered by project ─────────────────────────────────────────────────────
// Used by ProjectMonitor + MyProjects (show issues for a specific project only)
export const getProjectIssues = (projectId) =>
  api.get(`/issues/project/${projectId}`).then((r) => r.data);
 
// ── Filtered by logged-in user ──────────────────────────────────────────────
// Used by Developer "My Tasks" page — returns only issues from
// projects assigned to this developer (backend filters by req.user.id)
export const getMyTasks = () =>
  api.get("/issues/my-tasks").then((r) => r.data);
 
// Used by Tester "QA Queue" — issues from tester's assigned projects
export const getMyIssues = () =>
  api.get("/issues/my-issues").then((r) => r.data);
 
// ── Dashboard / reporting ───────────────────────────────────────────────────
export const getIssueStats = (projectId) =>
  api
    .get("/issues/stats", projectId ? { params: { projectId } } : {})
    .then((r) => r.data);
 



// import api from "./axios";

// export const getIssues = () => api.get("/issues");
// export const updateIssueStatus = (id, status) =>
//   api.put(`/issues/${id}/status`, { status });
