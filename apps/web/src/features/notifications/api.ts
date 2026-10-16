import { type NotificationDto, type NotificationPage, RT } from "@brand/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";

/** The newest page of the bell's feed, with the unread count that drives the badge. */
export const notificationsQuery = queryOptions({
  queryKey: ["notifications"] as const,
  queryFn: () => api.get<NotificationPage>("/v1/me/notifications?limit=20"),
  // The socket pushes new rows; this is only the safety net for a missed event.
  refetchInterval: 60_000,
});

export function useNotifications(enabled: boolean) {
  return useQuery({ ...notificationsQuery, enabled });
}

/** Marks one notification read, or every unread one when no id is given. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => api.post<{ read: number; unread: number }>("/v1/me/notifications/read", id ? { id } : {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationsQuery.queryKey }),
  });
}

/**
 * Puts a new notification straight into the cached page, so the bell lights up the moment it
 * happens instead of waiting for the next poll.
 */
export function useLiveNotifications(enabled: boolean) {
  const queryClient = useQueryClient();
  useRealtime(
    {
      [RT.notificationNew]: (incoming: NotificationDto) => {
        queryClient.setQueryData(notificationsQuery.queryKey, (current: NotificationPage | undefined) => {
          if (!current) return current;
          if (current.items.some((item) => item.id === incoming.id)) return current;
          return { ...current, items: [incoming, ...current.items].slice(0, 20), unread: current.unread + 1 };
        });
      },
    },
    { enabled },
  );
}
