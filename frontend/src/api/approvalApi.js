import api from "./axios";

export const createApproval = (data) =>
  api.post("/approvals", data).then((r) => r.data);

export const getMyPendingApprovals = () =>
  api.get("/approvals/my-pending").then((r) => r.data);

export const getIssueApprovals = (issueId) =>
  api.get(`/approvals/issue/${issueId}`).then((r) => r.data);

export const approveRequest = (id) =>
  api.put(`/approvals/${id}/approve`).then((r) => r.data);

export const rejectRequest = (id) =>
  api.put(`/approvals/${id}/reject`).then((r) => r.data);
