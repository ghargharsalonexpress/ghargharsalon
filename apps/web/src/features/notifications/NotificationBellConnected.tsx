import { useCurrentUser } from "@/app/session";
import { NotificationBell } from "@/design-system";
import { useLiveNotifications, useMarkRead, useNotifications } from "./api";

/**
 * The bell with its data attached. The design-system component stays presentational, so the
 * shells can render it without knowing about queries or sockets.
 *
 * Renders nothing when signed out: there is no feed to show, and asking for one would 401.
 */
export function NotificationBellConnected() {
  const user = useCurrentUser();
  const signedIn = Boolean(user);
  const feed = useNotifications(signedIn);
  const markRead = useMarkRead();
  useLiveNotifications(signedIn);

  if (!signedIn) return null;

  return (
    <NotificationBell
      items={feed.data?.items ?? []}
      unread={feed.data?.unread ?? 0}
      loading={feed.isPending}
      onRead={(id) => markRead.mutate(id)}
    />
  );
}
