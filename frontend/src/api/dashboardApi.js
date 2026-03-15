import api from "./axios";

// export const getDashboardStats = () => api.get("/dashboard");
import api from "./axios";
import { useQuery } from "@tanstack/react-query";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};

export const useDashboardCharts = () => {
  return useQuery({
    queryKey: ["dashboardCharts"],
    queryFn: () => api.get("/dashboard/charts").then(res => res.data),
    staleTime: 5 * 60 * 1000,  // Cache 5 min, but invalidate on updates
    refetchInterval: 30000,    // Poll every 30s for "real-time" without sockets
  });
};
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const getDashboardCharts = async () => {
  const response = await api.get("/dashboard/charts");
  return response.data;
};