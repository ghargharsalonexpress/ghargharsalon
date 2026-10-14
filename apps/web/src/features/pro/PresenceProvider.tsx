import { type ReactNode, useEffect, useRef, useState } from "react";
import type { LocationFix, PresenceDto, ProSelfDto } from "@brand/shared";
import { useQueryClient } from "@tanstack/react-query";
import { unlockAlarm } from "@/lib/alarm";
import { rememberFix } from "@/lib/device";
import { currentFix, proMeQuery, sendHeartbeat, setPresence } from "./api";
import { PresenceContext } from "./presenceContext";

type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean };

/**
 * Keeps a professional reachable while online (plan W12, A8): a location watch, a heartbeat
 * every ~20 s while the panel is visible, and the screen kept on (Wake Lock, re-acquired when
 * the panel becomes visible again). Lives in the pro layout, so it runs on every pro page.
 */
export function PresenceProvider({ me, children }: { me: ProSelfDto; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const lastFix = useRef<LocationFix | null>(null);
  const online = me.presence.state !== "offline";

  const store = (presence: PresenceDto) => queryClient.setQueryData(proMeQuery.queryKey, (previous) => (previous ? { ...previous, presence } : previous));

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    let wakeLock: WakeLockSentinelLike | null = null;

    const keepScreenOn = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || (wakeLock && !wakeLock.released)) return;
      try {
        wakeLock = (await (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock.request("screen")) ?? null;
      } catch {
        // Battery saver or the browser said no: the screen may sleep; the hint on Home explains.
      }
    };

    const watchId = "geolocation" in navigator
      ? navigator.geolocation.watchPosition(
          (position) => {
            lastFix.current = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) };
            rememberFix(lastFix.current);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
        )
      : null;

    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const presence = await sendHeartbeat(lastFix.current);
        if (cancelled) return;
        setReconnecting(false);
        store(presence);
      } catch {
        if (!cancelled) setReconnecting(true);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void beat();
      void keepScreenOn();
    };

    const timer = window.setInterval(() => void beat(), me.heartbeatSeconds * 1000);
    document.addEventListener("visibilitychange", onVisibility);
    void keepScreenOn();
    void beat();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      void wakeLock?.release().catch(() => undefined);
    };
    // store() only writes to the query cache; it doesn't need to restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, me.heartbeatSeconds]);

  const run = async (action: () => Promise<PresenceDto>) => {
    setError(null);
    setPending(true);
    try {
      store(await action());
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  };

  const goOnline = () =>
    run(async () => {
      // The tap that turns Online on also unlocks the job alarm sound (plan C10).
      unlockAlarm();
      const fix = await currentFix();
      lastFix.current = fix;
      return setPresence(true, fix);
    });

  const goOffline = () => run(() => setPresence(false));

  return <PresenceContext value={{ me, presence: me.presence, online, reconnecting, pending, error, goOnline, goOffline }}>{children}</PresenceContext>;
}
