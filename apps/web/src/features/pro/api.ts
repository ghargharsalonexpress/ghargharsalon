import type { BookingDto, DeclineReason, LocationFix, OfferDto, PresenceDto, ProEarningsDto, ProJobDto, ProJobSummaryDto, ProSelfDto } from "@brand/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { currentFix, DeviceError } from "@/lib/device";
import { vapidKeyBytes } from "@/lib/pwa";

export { currentFix, DeviceError };

export const proMeQuery = queryOptions({
  queryKey: ["pro", "me"] as const,
  queryFn: () => api.get<ProSelfDto>("/v1/pro/me"),
  staleTime: 30_000,
});

export const useProMe = () => useQuery(proMeQuery);

export const setPresence = (online: boolean, location?: LocationFix) => api.post<PresenceDto>("/v1/pro/presence", { online, ...(location ? { location } : {}) });
export const sendHeartbeat = (location?: LocationFix | null) => api.post<PresenceDto>("/v1/pro/heartbeat", location ? { location } : {});
export const sendTestAlert = () => api.post<{ sent: number; removed: number; failed: number }>("/v1/pro/push-test");

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => window.setTimeout(() => reject(new DeviceError("timeout")), ms))]);

/**
 * Asks for notification permission (from a tap), subscribes this browser and registers it
 * with the server. Re-running is safe: an existing subscription is re-sent (plan W11: re-subscribe on open).
 */
export async function subscribeToAlerts(vapidPublicKey: string): Promise<number> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new DeviceError("unsupported");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new DeviceError("denied");
  const registration = await withTimeout(navigator.serviceWorker.ready, 10_000);
  let subscription: PushSubscription;
  try {
    subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(vapidPublicKey) }));
  } catch {
    throw new DeviceError("failed");
  }
  const { devices } = await api.post<{ devices: number }>("/v1/pro/push-subscriptions", subscription.toJSON());
  return devices;
}

/** Re-sends an existing subscription silently (no prompt); returns false when there is none. */
export async function refreshAlertSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return false;
  const registration = await withTimeout(navigator.serviceWorker.ready, 10_000).catch(() => null);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  await api.post("/v1/pro/push-subscriptions", subscription.toJSON());
  return true;
}

// ---------- job alerts (plan Phase 6) ----------

export const offerQuery = (id: string) =>
  queryOptions({
    queryKey: ["pro", "offer", id] as const,
    queryFn: () => api.get<OfferDto>(`/v1/pro/offers/${id}`),
    staleTime: 5_000,
  });

/** Alerts still open for this professional (after a reconnect, or opening the app from a notification). */
export const openOffersQuery = queryOptions({
  queryKey: ["pro", "offers", "open"] as const,
  queryFn: () => api.get<OfferDto[]>("/v1/pro/offers"),
  staleTime: 0,
});

export const acceptOffer = (id: string) => api.post<BookingDto>(`/v1/pro/offers/${id}/accept`);
export const declineOffer = (id: string, reason?: DeclineReason) => api.post<void>(`/v1/pro/offers/${id}/decline`, reason ? { reason } : {});

// ---------- jobs (plan Phase 7) ----------

const LIVE_JOB = new Set(["accepted", "arrived", "in_progress"]);

export const proJobQuery = (id: string) =>
  queryOptions({
    queryKey: ["pro", "job", id] as const,
    queryFn: () => api.get<ProJobDto>(`/v1/pro/jobs/${id}`),
    // Real-time events refetch it; polling is the safety net while the job is live.
    refetchInterval: (query) => (query.state.data && LIVE_JOB.has(query.state.data.status) ? 20_000 : false),
  });

export const proJobsQuery = queryOptions({
  queryKey: ["pro", "jobs"] as const,
  queryFn: () => api.get<{ current: ProJobSummaryDto[]; past: ProJobSummaryDto[] }>("/v1/pro/jobs"),
});

export const proEarningsQuery = queryOptions({
  queryKey: ["pro", "earnings"] as const,
  queryFn: () => api.get<ProEarningsDto>("/v1/pro/jobs/earnings"),
});

export const jobActions = {
  arrived: (id: string, input: { location?: LocationFix; confirmFar?: boolean }) => api.post<ProJobDto>(`/v1/pro/jobs/${id}/arrived`, input),
  start: (id: string, otp: string) => api.post<ProJobDto>(`/v1/pro/jobs/${id}/start`, { otp }),
  complete: (id: string, confirmEarly = false) => api.post<ProJobDto>(`/v1/pro/jobs/${id}/complete`, confirmEarly ? { confirmEarly } : {}),
  logCall: (id: string) => api.post<void>(`/v1/pro/jobs/${id}/call`),
  customerUnavailable: (id: string) => api.post<ProJobDto>(`/v1/pro/jobs/${id}/customer-unavailable`),
  cancel: (id: string, reason: string) => api.post<void>(`/v1/pro/jobs/${id}/cancel`, { reason }),
  location: (id: string, location: LocationFix, heading: number | null) => api.post<{ accepted: boolean }>(`/v1/pro/jobs/${id}/location`, { location, heading }),
};
