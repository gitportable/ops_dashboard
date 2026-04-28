import api from "./axios";

export const getMachines = () => api.get("/machines").then((r) => r.data);

export const createMachine = (data) =>
  api.post("/machines", data).then((r) => r.data);

export const updateMachine = (id, data) =>
  api.put(`/machines/${id}`, data).then((r) => r.data);

export const deleteMachine = (id) =>
  api.delete(`/machines/${id}`).then((r) => r.data);

export const getMachineIssues = (machineId) =>
  api.get(`/machines/${machineId}/issues`).then((r) => r.data);

export const assignMachineToIssue = (issueId, machineId) =>
  api
    .put(`/issues/${issueId}/machine`, { machine_id: machineId })
    .then((r) => r.data);
