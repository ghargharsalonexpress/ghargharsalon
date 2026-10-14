import type {
  AdminAlertDto,
  AdminAuditRow,
  AdminBookingDetailDto,
  AdminBookingRow,
  AdminCancelInput,
  AdminCustomerDetailDto,
  AdminCustomerRow,
  AdminDashboardDto,
  AdminEligibleProDto,
  AdminLiveDto,
  AdminPaymentRow,
  AdminProPerformanceDto,
  AdminRefundInput,
  AdminRefundRow,
  AdminReviewRow,
  BookingDto,
  OfferDto,
  Paged,
  Settings,
  SettingsResponse,
} from "@brand/shared";
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api";

/** Query string from a filter object, skipping empty values. */
const qs = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : "";
};

// ---------- dashboard, alerts, live ----------

export const dashboardQuery = queryOptions({
  queryKey: ["admin", "dashboard"] as const,
  queryFn: () => api.get<AdminDashboardDto>("/v1/admin/dashboard"),
  refetchInterval: 15_000,
});

export const alertsQuery = (all: boolean) =>
  queryOptions({
    queryKey: ["admin", "alerts", all] as const,
    queryFn: () => api.get<AdminAlertDto[]>(`/v1/admin/alerts${all ? "?all=1" : ""}`),
    refetchInterval: 15_000,
  });

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/v1/admin/alerts/${id}/resolve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "booking"] });
    },
  });
}

export const liveQuery = queryOptions({
  queryKey: ["admin", "live"] as const,
  queryFn: () => api.get<AdminLiveDto>("/v1/admin/live"),
  refetchInterval: 10_000,
});

// ---------- bookings ----------

export interface BookingFilters {
  view: string;
  q: string;
  from: string;
  to: string;
  page: number;
}

export const bookingsQuery = (filters: BookingFilters) =>
  queryOptions({
    queryKey: ["admin", "bookings", filters] as const,
    queryFn: () => api.get<Paged<AdminBookingRow>>(`/v1/admin/bookings${qs({ ...filters, view: filters.view === "all" ? null : filters.view })}`),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });

/** The CSV opens as a normal download: same-site cookies go with it, no CORS involved. */
export const bookingsExportUrl = (filters: Omit<BookingFilters, "page">) => `${API_BASE_URL}/v1/admin/bookings/export.csv${qs({ ...filters, view: filters.view === "all" ? null : filters.view })}`;

export const adminBookingQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "booking", id] as const,
    queryFn: () => api.get<AdminBookingDetailDto>(`/v1/admin/bookings/${id}`),
    refetchInterval: 15_000,
  });

export const eligibleQuery = (id: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["admin", "booking", id, "eligible"] as const,
    queryFn: () => api.get<AdminEligibleProDto[]>(`/v1/admin/bookings/${id}/eligible`),
    enabled,
    staleTime: 0,
  });

function useBookingRefresh(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "booking", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };
}

export function useBookingActions(id: string) {
  const refresh = useBookingRefresh(id);
  return {
    note: useMutation({ mutationFn: (text: string) => api.post<void>(`/v1/admin/bookings/${id}/notes`, { text }), onSuccess: refresh }),
    offer: useMutation({ mutationFn: (professionalId: string) => api.post<OfferDto>(`/v1/admin/bookings/${id}/offer`, { professionalId }), onSuccess: refresh }),
    reassign: useMutation({ mutationFn: () => api.post<BookingDto>(`/v1/admin/bookings/${id}/reassign`), onSuccess: refresh }),
    unlockCode: useMutation({ mutationFn: () => api.post<void>(`/v1/admin/bookings/${id}/unlock-code`), onSuccess: refresh }),
    cancel: useMutation({ mutationFn: (input: AdminCancelInput) => api.post<BookingDto>(`/v1/admin/bookings/${id}/cancel`, input), onSuccess: refresh }),
    refund: useMutation({ mutationFn: (input: AdminRefundInput) => api.post<void>(`/v1/admin/bookings/${id}/refund`, input), onSuccess: refresh }),
  };
}

// ---------- customers ----------

export const customersQuery = (filters: { q: string; status: string; page: number }) =>
  queryOptions({
    queryKey: ["admin", "customers", filters] as const,
    queryFn: () => api.get<Paged<AdminCustomerRow>>(`/v1/admin/customers${qs(filters)}`),
    placeholderData: keepPreviousData,
  });

export const customerQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "customer", id] as const,
    queryFn: () => api.get<AdminCustomerDetailDto>(`/v1/admin/customers/${id}`),
  });

export function useCustomerStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: "active" | "blocked"; reason: string }) => api.post<{ status: string }>(`/v1/admin/customers/${id}/status`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "customer", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
  });
}

// ---------- money ----------

export const paymentsQuery = (filters: { status: string; page: number }) =>
  queryOptions({
    queryKey: ["admin", "payments", filters] as const,
    queryFn: () => api.get<Paged<AdminPaymentRow>>(`/v1/admin/payments${qs(filters)}`),
    placeholderData: keepPreviousData,
  });

export const refundsQuery = (filters: { status: string; page: number }) =>
  queryOptions({
    queryKey: ["admin", "refunds", filters] as const,
    queryFn: () => api.get<Paged<AdminRefundRow>>(`/v1/admin/refunds${qs(filters)}`),
    placeholderData: keepPreviousData,
  });

export function useRetryRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/v1/admin/refunds/${id}/retry`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "booking"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// ---------- reviews ----------

export const reviewsQuery = (filters: { rating: string; hidden: string; page: number }) =>
  queryOptions({
    queryKey: ["admin", "reviews", filters] as const,
    queryFn: () => api.get<Paged<AdminReviewRow>>(`/v1/admin/reviews${qs(filters)}`),
    placeholderData: keepPreviousData,
  });

export function useReviewVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, hidden }: { bookingId: string; hidden: boolean }) => api.post<{ hidden: boolean }>(`/v1/admin/reviews/${bookingId}/visibility`, { hidden }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

// ---------- professionals: performance and payouts ----------

export const performanceQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "professional", id, "performance"] as const,
    queryFn: () => api.get<AdminProPerformanceDto>(`/v1/admin/professionals/${id}/performance`),
  });

export function useMarkPayout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ jobs: number; paidPaise: number }>(`/v1/admin/professionals/${id}/payouts`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "professional", id, "performance"] }),
  });
}

// ---------- settings and audit ----------

export const settingsQuery = queryOptions({
  queryKey: ["admin", "settings"] as const,
  queryFn: () => api.get<SettingsResponse>("/v1/admin/settings"),
});

export const settingsHistoryQuery = queryOptions({
  queryKey: ["admin", "settings", "history"] as const,
  queryFn: () => api.get<Array<{ version: number; changedAt: string; changedBy: string | null }>>("/v1/admin/settings/history"),
});

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { version: number; settings: Settings }) => api.put<SettingsResponse>("/v1/admin/settings", input),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQuery.queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["info"] });
    },
  });
}

export const auditQuery = (filters: { action: string; entityType: string; entityId: string; page: number }) =>
  queryOptions({
    queryKey: ["admin", "audit", filters] as const,
    queryFn: () => api.get<Paged<AdminAuditRow>>(`/v1/admin/audit${qs(filters)}`),
    placeholderData: keepPreviousData,
  });
