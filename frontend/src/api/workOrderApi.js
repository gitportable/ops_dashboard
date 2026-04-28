import api from "./axios";

export const getWorkOrders = () => api.get("/work-orders");
export const getWorkOrderById = (id) => api.get(`/work-orders/${id}`);
export const getWorkOrdersByProject = (projectId) =>
  api.get(`/work-orders/project/${projectId}`);
export const createWorkOrder = (data) => api.post("/work-orders", data);
export const updateWorkOrder = (id, data) => api.put(`/work-orders/${id}`, data);
export const deleteWorkOrder = (id) => api.delete(`/work-orders/${id}`);
