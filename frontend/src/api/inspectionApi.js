import api from "./axios";

export const getInspectionItems = (issueId) =>
  api.get(`/inspection/issue/${issueId}`).then((r) => r.data);

export const addInspectionItem = (issueId, item_text) =>
  api.post(`/inspection/issue/${issueId}`, { item_text }).then((r) => r.data);

export const checkInspectionItem = (id) =>
  api.put(`/inspection/${id}/check`).then((r) => r.data);

export const uncheckInspectionItem = (id) =>
  api.put(`/inspection/${id}/uncheck`).then((r) => r.data);

export const deleteInspectionItem = (id) =>
  api.delete(`/inspection/${id}`).then((r) => r.data);

export const getInspectionComplete = (issueId) =>
  api.get(`/inspection/issue/${issueId}/complete`).then((r) => r.data);
