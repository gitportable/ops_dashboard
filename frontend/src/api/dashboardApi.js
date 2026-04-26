import { useQuery } from "@tanstack/react-query";
import api from "./axios";

const get = (url) => api.get(url).then((r) => r.data);

// Each hook accepts an optional projectId to filter data to one project
// Named useQ (starts with "use") so ESLint rules-of-hooks is satisfied
const useQ = (key, url, projectId) => useQuery({
  queryKey: [key, projectId ?? "all"],
  queryFn: () => get(projectId ? `${url}?projectId=${projectId}` : url),
  staleTime: 60000,
});

export const useDashboardStats    = (pid) => useQ("dash-stats",    "/dashboard/stats",            pid);
export const useByStatus          = (pid) => useQ("dash-status",   "/dashboard/by-status",        pid);
export const useByType            = (pid) => useQ("dash-type",     "/dashboard/by-type",          pid);
export const useBySprint          = (pid) => useQ("dash-sprint",   "/dashboard/by-sprint",        pid);
export const useBySeverity        = (pid) => useQ("dash-severity", "/dashboard/by-severity",      pid);
export const useByTeam            = (pid) => useQ("dash-team",     "/dashboard/by-team",          pid);
export const useTrend             = (pid) => useQ("dash-trend",    "/dashboard/trend",            pid);
export const useAgeDistribution   = (pid) => useQ("dash-age",      "/dashboard/age-distribution", pid);
export const useBurndown          = (pid) => useQ("dash-burndown", "/dashboard/burndown",         pid);
export const useVelocityData      = (pid) => useQ("dash-velocity", "/dashboard/velocity",         pid);
export const useBudgetUtilization = (pid) => useQ("dash-budget",   "/dashboard/budget",           pid);
export const useResolutionTime    = (pid) => useQ("dash-resTime",  "/dashboard/resolution-time",  pid);
export const useProjectHealth     = (pid) => useQ("dash-health",   "/dashboard/project-health",   pid);
export const useOverdueIssues     = (pid) => useQ("dash-overdue",  "/dashboard/overdue",          pid);
export const useSLACompliance     = (pid) => useQ("dash-sla",      "/dashboard/sla",              pid);
export const useCumulativeTrend   = (pid) => useQ("dash-cumul",    "/dashboard/cumulative-trend", pid);
export const useProjectList       = ()    => useQuery({ queryKey:["dash-projectList"], queryFn:() => get("/dashboard/project-list"), staleTime:300000 });
export const useRoleOverview      = (pid) => useQ("dash-role",     "/dashboard/role-overview",    pid);
export const useRoadmapData       = (pid) => useQ("dash-roadmap",  "/dashboard/roadmap",          pid);
export const useSolarStats = () => {
  return useQuery({
    queryKey: ["solarStats"],
    queryFn: () => api.get("/dashboard/solar-stats").then(r => r.data),
  });
};



// ── Backwards-compat shim for MyRoadmap.js and ResourceAllocation.js ─────────
export const useDashboardCharts = (pid) => {
  const s  = useByStatus(pid);
  const t  = useByType(pid);
  const sp = useBySprint(pid);
  const tm = useByTeam(pid);
  const tr = useTrend(pid);
  const ag = useAgeDistribution(pid);
  const bu = useBurndown(pid);

  return {
    isLoading: s.isLoading || t.isLoading || sp.isLoading || tm.isLoading,
    isError:   s.isError   || t.isError   || sp.isError   || tm.isError,
    data: {
      byStatus:    s.data  || [],
      byType:      t.data  || [],
      bySprint:    sp.data || [],
      byTeam:      tm.data || [],
      trend:       tr.data || [],
      ageDistrib:  ag.data || [],
      burndown:    bu.data || [],
      byDeveloper: [],
    },
  };
};
// import api from './axios';
// import { useQuery } from '@tanstack/react-query';

// // ── Raw fetchers ────────────────────────────────────────────────────────────

// export const getDashboardStats = () =>
//   api.get('/dashboard/stats').then(r => r.data);

// export const getDashboardCharts = () =>
//   api.get('/dashboard/charts').then(r => r.data);

// export const getIssueStats = (projectId) =>
//   api.get('/issues/stats', projectId ? { params: { projectId } } : {}).then(r => r.data);

// export const getVelocityData = () =>
//   api.get('/dashboard/velocity').then(r => r.data);

// export const getBudgetUtilization = () =>
//   api.get('/dashboard/budget').then(r => r.data);

// export const getResolutionTime = () =>
//   api.get('/dashboard/resolution-time').then(r => r.data);

// export const getSprintBurndown = (sprintId) =>
//   api.get(`/dashboard/burndown/${sprintId}`).then(r => r.data);

// export const getProjectHealth = () =>
//   api.get('/dashboard/project-health').then(r => r.data);

// export const getOverdueIssues = () =>
//   api.get('/dashboard/overdue').then(r => r.data);

// export const getSLACompliance = () =>
//   api.get('/dashboard/sla').then(r => r.data);

// export const getCumulativeTrend = () =>
//   api.get('/dashboard/cumulative-trend').then(r => r.data);

// // ── React Query hooks ───────────────────────────────────────────────────────

// export const useDashboardStats = () =>
//   useQuery({
//     queryKey: ['dashboardStats'],
//     queryFn: getDashboardStats,
//     staleTime: 5 * 60 * 1000,
//     retry: 1,
//   });

// export const useDashboardCharts = () =>
//   useQuery({
//     queryKey: ['dashboardCharts'],
//     queryFn: getDashboardCharts,
//     staleTime: 5 * 60 * 1000,
//     refetchInterval: 30000,
//   });

// export const useIssueStats = (projectId) =>
//   useQuery({
//     queryKey: ['issueStats', projectId],
//     queryFn: () => getIssueStats(projectId),
//     staleTime: 5 * 60 * 1000,
//   });

// export const useVelocityData = () =>
//   useQuery({
//     queryKey: ['velocityData'],
//     queryFn: getVelocityData,
//     staleTime: 10 * 60 * 1000,
//   });

// export const useBudgetUtilization = () =>
//   useQuery({
//     queryKey: ['budgetUtilization'],
//     queryFn: getBudgetUtilization,
//     staleTime: 5 * 60 * 1000,
//   });

// export const useResolutionTime = () =>
//   useQuery({
//     queryKey: ['resolutionTime'],
//     queryFn: getResolutionTime,
//     staleTime: 10 * 60 * 1000,
//   });

// export const useProjectHealth = () =>
//   useQuery({
//     queryKey: ['projectHealth'],
//     queryFn: getProjectHealth,
//     staleTime: 5 * 60 * 1000,
//   });

// export const useOverdueIssues = () =>
//   useQuery({
//     queryKey: ['overdueIssues'],
//     queryFn: getOverdueIssues,
//     staleTime: 5 * 60 * 1000,
//     refetchInterval: 60000,
//   });

// export const useSLACompliance = () =>
//   useQuery({
//     queryKey: ['slaCompliance'],
//     queryFn: getSLACompliance,
//     staleTime: 10 * 60 * 1000,
//   });

// export const useCumulativeTrend = () =>
//   useQuery({
//     queryKey: ['cumulativeTrend'],
//     queryFn: getCumulativeTrend,
//     staleTime: 10 * 60 * 1000,
//   });
















// // export const getDashboardStats = () => api.get("/dashboard");
// import api from "./axios";
// import { useQuery } from "@tanstack/react-query";

// export const getDashboardStats = async () => {
//   const response = await api.get("/dashboard");
//   return response.data;
// };

// export const useDashboardCharts = () => {
//   return useQuery({
//     queryKey: ["dashboardCharts"],
//     queryFn: () => api.get("/dashboard/charts").then(res => res.data),
//     staleTime: 5 * 60 * 1000,  // Cache 5 min, but invalidate on updates
//     refetchInterval: 30000,    // Poll every 30s for "real-time" without sockets
//   });
// };
// export const useDashboardStats = () => {
//   return useQuery({
//     queryKey: ["dashboardStats"],
//     queryFn: getDashboardStats,
//     staleTime: 5 * 60 * 1000,
//     retry: 1,
//   });
// };

// export const getDashboardCharts = async () => {
//   const response = await api.get("/dashboard/charts");
//   return response.data;
// };