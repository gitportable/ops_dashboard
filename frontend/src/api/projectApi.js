import api from "./axios";
export const getProjects = () => api.get("/projects/all"); // Admin view
export const getMyProjects = () => api.get("/projects/my-projects"); // Assigned view
export const updateBudget = (id, budget_used) => api.put(`/projects/${id}/budget`, { budget_used });
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const createProject = (data) => api.post("/projects", data);
export const deleteProject = (id) => api.delete(`/projects/${id}`); 
export const getProjectById = (id) => api.get(`/projects/${id}`);
export const getProjectStats = (id) => api.get(`/projects/${id}/stats`);
export const assignMemberToProject = (projectId, userId) => 
  api.post(`/projects/assign-member`, { project_id: projectId, user_id: userId });
export const removeMemberFromProject = (projectId, userId) => 
  api.post(`/projects/remove-member`, { project_id: projectId, user_id: userId });  