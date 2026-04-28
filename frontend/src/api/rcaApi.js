import api from "./axios";

export const getRcaForIssue = (issueId) => api.get(`/rca/issue/${issueId}`).then((r) => r.data);
export const createRca = (issueId, data) => api.post(`/rca/issue/${issueId}`, data).then((r) => r.data);
export const updateRca = (rcaId, data) => api.put(`/rca/${rcaId}`, data).then((r) => r.data);
export const getCapaItems = (rcaId) => api.get(`/rca/${rcaId}/capa`).then((r) => r.data);
export const createCapa = (rcaId, data) => api.post(`/rca/${rcaId}/capa`, data).then((r) => r.data);
export const updateCapa = (id, data) => api.put(`/rca/capa/${id}`, data).then((r) => r.data);
export const deleteCapa = (id) => api.delete(`/rca/capa/${id}`).then((r) => r.data);
export const getAllCapa = () => api.get("/rca/capa/all").then((r) => r.data);
