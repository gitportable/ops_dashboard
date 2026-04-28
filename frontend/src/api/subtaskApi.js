import api from "./axios";

export const getSubtasks = (issueId) =>
  api.get(`/subtasks/issue/${issueId}`).then((r) => r.data);

export const createSubtask = (issueId, title) =>
  api.post(`/subtasks/issue/${issueId}`, { title }).then((r) => r.data);

export const updateSubtask = (id, data) =>
  api.put(`/subtasks/${id}`, data).then((r) => r.data);

export const deleteSubtask = (id) =>
  api.delete(`/subtasks/${id}`).then((r) => r.data);
