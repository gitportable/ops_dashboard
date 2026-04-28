
import api from "./axios";

export const getIssues = () => api.get("/issues");
export const createIssue = (data) => api.post("/issues", data);
export const updateIssueStatus = (id, status) =>
  api.put(`/issues/${id}/status`, { status }); 
export const deleteIssue = (id) => api.delete(`/issues/${id}`);
export const getProjectIssues = (projectId) =>
  api.get(`/issues/project/${projectId}`).then((response) => {
    console.log(response.data);
    return response.data;
  });

export const getMyTasks = () =>
  api.get("/issues/my-tasks").then((r) => r.data);

export const getMyIssues = () =>
  api.get("/issues/my-issues").then((r) => r.data);
export const getIssueStats = (projectId) =>
  api
    .get("/issues/stats", projectId ? { params: { projectId } } : {})
    .then((r) => r.data);

export const getIssueById = (id) => {
  const numericId = typeof id === "string"
    ? parseInt(id.replace(/^I0*/i, ""), 10)
    : id;
  return api.get(`/issues/${numericId}`);
};
 
