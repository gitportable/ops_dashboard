import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./axios";

export const useWorkOrders = () => {
  return useQuery({
    queryKey: ["workOrders"],
    queryFn: () => api.get("/production/workorders").then((res) => res.data),
    staleTime: 30000,
  });
};

export const useUpdateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, status }) =>
      api.put(`/production/workorders/${id}`, { stage, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      queryClient.invalidateQueries({ queryKey: ["solarStats"] });
    },
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/production/workorders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      queryClient.invalidateQueries({ queryKey: ["solarStats"] });
    },
  });
};
