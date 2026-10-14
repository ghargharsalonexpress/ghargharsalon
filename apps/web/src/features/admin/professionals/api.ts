import type { AdminProfessionalRow, ProfessionalData, ProfessionalDto } from "@brand/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const adminProfessionalsQuery = queryOptions({
  queryKey: ["admin", "professionals"] as const,
  queryFn: () => api.get<AdminProfessionalRow[]>("/v1/admin/professionals"),
  // Presence changes by itself; the list refreshes while open (Phase 8 moves this to live updates).
  refetchInterval: 15_000,
});

export const adminProfessionalQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "professional", id] as const,
    queryFn: () => api.get<ProfessionalDto>(`/v1/admin/professionals/${encodeURIComponent(id)}`),
  });

function useRefresh() {
  const queryClient = useQueryClient();
  return (saved?: ProfessionalDto) => {
    if (saved) queryClient.setQueryData(adminProfessionalQuery(saved.id).queryKey, saved);
    return queryClient.invalidateQueries({ queryKey: ["admin", "professionals"] });
  };
}

export function useSaveProfessional() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, version, professional }: { id: string | null; version: number; professional: ProfessionalData }) =>
      id ? api.put<ProfessionalDto>(`/v1/admin/professionals/${id}`, { version, professional }) : api.post<ProfessionalDto>("/v1/admin/professionals", professional),
    onSuccess: (saved) => refresh(saved),
  });
}

export function useProfessionalStatus(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { status: "active" | "suspended"; reason: string }) => api.post<ProfessionalDto>(`/v1/admin/professionals/${id}/status`, input),
    onSuccess: (saved) => refresh(saved),
  });
}

export function useAdminTestAlert(id: string) {
  return useMutation({ mutationFn: () => api.post<{ sent: number; removed: number; failed: number }>(`/v1/admin/professionals/${id}/test-alert`) });
}
