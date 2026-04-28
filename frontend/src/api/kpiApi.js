import api from "./axios";

export const getCycleTime = () => api.get("/kpi/cycle-time");
export const getTeamEfficiency = () => api.get("/kpi/team-efficiency");
export const getSprintVelocity = () => api.get("/kpi/sprint-velocity");
export const getOpenAging = () => api.get("/kpi/open-aging");
