import { onAuthLost } from "@/lib/api";
import { queryClient } from "./queryClient";
import type { router as appRouter } from "./router";
import { sessionQuery, setSessionUser } from "./session";

/**
 * When the API reports that a signed-in person's session is gone (expired, revoked after
 * a password reset, account blocked), send them to login and bring them back afterwards.
 */
export function installAuthLostHandler(router: typeof appRouter): void {
  onAuthLost(() => {
    const wasSignedIn = Boolean(queryClient.getQueryData(sessionQuery.queryKey)?.user);
    if (!wasSignedIn) return;
    setSessionUser(null);
    const here = window.location.pathname + window.location.search;
    void router.navigate(`/login?next=${encodeURIComponent(here)}&reason=expired`, { replace: true });
  });
}
