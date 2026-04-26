import api from "./axios";

export const getDefects = () => api.get("/qa/defects").then(r => r.data);
export const getDefectStats = () => api.get("/qa/defects/stats").then(r => r.data);
export const createDefect = (data) => api.post("/qa/defects", data);
export const updateRCA = (id, data) => api.put(`/qa/defects/${id}/rca`, data);
export const uploadDefectImage = (id, imageUrl) => api.post(`/qa/defects/${id}/image`, { imageUrl });

export const getVendors = () => api.get("/supply-chain/vendors").then(r => r.data);
export const createVendor = (data) => api.post("/supply-chain/vendors", data);
export const getPurchaseOrders = () => api.get("/supply-chain/pos").then(r => r.data);
export const createPO = (data) => api.post("/supply-chain/pos", data);
export const getInventory = () => api.get("/supply-chain/inventory").then(r => r.data);
export const updateInventory = (id, data) => api.put(`/supply-chain/inventory/${id}`, data);
export const updatePOStatus = (id, data) => api.put(`/supply-chain/pos/${id}`, data);

export const getInstallations = () => api.get("/field-service/installations").then(r => r.data);
export const createInstallation = (data) => api.post("/field-service/installations", data);
export const getTickets = () => api.get("/field-service/tickets").then(r => r.data);
export const createTicket = (data) => api.post("/field-service/tickets", data);
export const updateTicket = (id, data) => api.put(`/field-service/tickets/${id}`, data);
