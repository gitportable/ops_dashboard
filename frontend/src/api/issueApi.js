import api from "./axios";

export const getIssues = () => api.get("/issues");
export const updateIssueStatus = (id, status) =>
  api.put(`/issues/${id}/status`, { status });
