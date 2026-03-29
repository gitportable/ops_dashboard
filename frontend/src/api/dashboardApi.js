import { useQuery } from "@tanstack/react-query";
import api from "./axios";

const get = (url) => api.get(url).then((r) => r.data);
const useQ = (key, url, projectId) => useQuery({
  queryKey: [key, projectId ?? "all"],
  queryFn: () => get(projectId ? `${url}?projectId=${projectId}` : url),
  staleTime: 60000,
});

export const useDashboardStats    = (pid) => useQ("dash-stats",    "/dashboard/stats",            pid);
export const useByStatus          = (pid) => useQ("dash-status",   "/dashboard/by-status",        pid);
export const useByType            = (pid) => useQ("dash-type",     "/dashboard/by-type",          pid);
export const useBySprint          = (pid) => useQ("dash-sprint",   "/dashboard/by-sprint",        pid);
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
