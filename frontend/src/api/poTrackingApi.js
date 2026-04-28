import api from './axios';

export const getAllPOs = () => api.get('/po-tracking').then(r => r.data);
export const getPOById = (id) => api.get(`/po-tracking/${id}`).then(r => r.data);
export const getPOHistory = (id) => api.get(`/po-tracking/${id}/history`).then(r => r.data);
export const updatePOStatus = (id, data) => api.put(`/po-tracking/${id}/status`, data).then(r => r.data);
