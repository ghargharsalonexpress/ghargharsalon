import { useSyncExternalStore } from "react";
import type { ProSelfDto } from "@brand/shared";
import { isStandalone, platform } from "@/lib/pwa";

/**
 * Device readiness for job alerts (plan Phase 4): the browser's own permission states, watched
 * live, plus two small per-device flags (test alert received, battery steps done).
 */
export type PermissionValue = "granted" | "prompt" | "denied" | "unsupported";

type Listener = () => void;

function permissionStore(name: "notifications" | "geolocation") {
  let value: PermissionValue = "prompt";
  let started = false;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((listener) => listener());

  const read = (): PermissionValue => {
    if (name === "notifications") {
      if (!("Notification" in window)) return "unsupported";
      return Notification.permission === "default" ? "prompt" : Notification.permission;
    }
    return "geolocation" in navigator ? value : "unsupported";
  };

  const start = () => {
    if (started) return;
    started = true;
    value = read();
    if (!("permissions" in navigator)) return;
    navigator.permissions
      .query({ name: name as PermissionName })
      .then((status) => {
        value = status.state;
        notify();
        status.addEventListener("change", () => {
          value = status.state;
          notify();
        });
      })
      .catch(() => undefined);
  };

  return {
    subscribe: (listener: Listener) => {
      start();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: (): PermissionValue => (name === "notifications" ? read() : value),
    /** After a prompt answered in-page, re-read immediately. */
    refresh: () => {
      value = read() === "unsupported" ? "unsupported" : value;
      notify();
    },
    set: (next: PermissionValue) => {
      value = next;
      notify();
    },
  };
}

export const notificationPermission = permissionStore("notifications");
export const locationPermission = permissionStore("geolocation");

export const useNotificationPermission = () => useSyncExternalStore(notificationPermission.subscribe, notificationPermission.get, () => "prompt" as PermissionValue);
export const useLocationPermission = () => useSyncExternalStore(locationPermission.subscribe, locationPermission.get, () => "prompt" as PermissionValue);

const standaloneQuery = typeof window === "undefined" ? null : window.matchMedia("(display-mode: standalone)");
export const useStandalone = () =>
  useSyncExternalStore(
    (listener) => {
      standaloneQuery?.addEventListener("change", listener);
      return () => standaloneQuery?.removeEventListener("change", listener);
    },
    isStandalone,
    () => false,
  );

// ---------- per-device flags ----------

const flagListeners = new Set<Listener>();

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setDeviceFlag(key: DeviceFlag, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: the step simply shows again next time.
  }
  flagListeners.forEach((listener) => listener());
}

export type DeviceFlag = "pro:alertTested" | "pro:batteryDone";

export const useDeviceFlag = (key: DeviceFlag) =>
  useSyncExternalStore(
    (listener) => {
      flagListeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        flagListeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    () => readFlag(key),
    () => false,
  );

// ---------- readiness ----------

export interface Readiness {
  install: boolean;
  alerts: boolean;
  location: boolean;
  battery: boolean;
  /** What must be done before the Online switch works. */
  ready: boolean;
}

/** The checks that gate the Online switch (plan Phase 4): alerts proven by a test, location allowed. */
export function useReadiness(me: ProSelfDto): Readiness {
  const standalone = useStandalone();
  const notifications = useNotificationPermission();
  const location = useLocationPermission();
  const alertTested = useDeviceFlag("pro:alertTested");
  const batteryDone = useDeviceFlag("pro:batteryDone");
  const device = platform();

  const install = standalone || device === "desktop";
  const alerts = me.vapidPublicKey !== null && notifications === "granted" && alertTested;
  // iPhones only receive alerts in the Home Screen app.
  const ready = alerts && location === "granted" && (device !== "ios" || standalone);
  return { install, alerts, location: location === "granted", battery: batteryDone || device === "desktop", ready };
}
