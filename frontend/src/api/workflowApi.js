import api from "./axios";

export const getWorkflows = () => api.get("/workflows");
export const createWorkflow = (data) => api.post("/workflows", data);
export const updateWorkflow = (id, data) => api.put(`/workflows/${id}`, data);
export const deleteWorkflow = (id) => api.delete(`/workflows/${id}`);
