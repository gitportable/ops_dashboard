import api from './axios';

export const getAlertRules = () => api.get('/inventory-alerts').then(r => r.data);
export const getTriggeredAlerts = () => api.get('/inventory-alerts/triggered').then(r => r.data);
export const createAlertRule = (data) => api.post('/inventory-alerts', data).then(r => r.data);
export const updateAlertRule = (id, data) => api.put(`/inventory-alerts/${id}`, data).then(r => r.data);
export const deleteAlertRule = (id) => api.delete(`/inventory-alerts/${id}`).then(r => r.data);
