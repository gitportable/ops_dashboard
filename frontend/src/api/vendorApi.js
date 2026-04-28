import api from "./axios";

export const getVendors = () => api.get("/vendors");
export const createVendor = (data) => api.post("/vendors", data);
export const updateVendor = (id, data) => api.put(`/vendors/${id}`, data);
export const deleteVendor = (id) => api.delete(`/vendors/${id}`);

export const getVendorIssues = (vendorId) => api.get(`/vendors/${vendorId}/issues`);
export const logVendorIssue = (vendorId, data) =>
  api.post(`/vendors/${vendorId}/issues`, data);
export const updateVendorIssueStatus = (issueId, data) =>
  api.put(`/vendors/issues/${issueId}`, data);

export const getPurchaseOrders = () => api.get("/vendors/purchase-orders");
export const createPO = (data) => api.post("/vendors/purchase-orders", data);
export const updatePO = (id, data) =>
  api.put(`/vendors/purchase-orders/${id}`, data);
export const deletePO = (id) => api.delete(`/vendors/purchase-orders/${id}`);
