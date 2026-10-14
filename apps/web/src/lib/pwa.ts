import { useEffect, useSyncExternalStore } from "react";

/**
 * Installable app and service worker (plan C3, Phase 4). One worker at "/" serves both the
 * customer site and the professional panel; each area points the page at its own manifest.
 */

// ---------- tiny external stores (useSyncExternalStore) ----------

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const installPrompt = createStore<InstallPromptEvent | null>(null);
const waitingWorker = createStore<ServiceWorker | null>(null);

// ---------- registration ----------

/** Registers /sw.js once the page has loaded; in development the worker caches nothing. */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep Chrome's install offer for our own "Install" button (readiness checklist).
    event.preventDefault();
    installPrompt.set(event as InstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => installPrompt.set(null));

  const url = import.meta.env.DEV ? "/sw.js?dev=1" : "/sw.js";
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(url);
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          // A new version is ready while an old one controls the page: offer "Refresh".
          if (worker.state === "installed" && navigator.serviceWorker.controller) waitingWorker.set(worker);
        });
      };
      if (registration.waiting && navigator.serviceWorker.controller) waitingWorker.set(registration.waiting);
      track(registration.installing);
      registration.addEventListener("updatefound", () => track(registration.installing));
    } catch {
      // No worker (private mode, old browser): the site still works, without alerts or offline.
    }
  };
  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });

  // A notification tap on a page this worker doesn't control yet arrives as a message.
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{ type?: string; url?: string }>) => {
    if (event.data?.type === "navigate" && event.data.url) window.location.assign(event.data.url);
  });
}

/** Reloads into the waiting version. The caller decides when (never during an active job). */
export function applyUpdate(): void {
  const worker = waitingWorker.get();
  if (!worker) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  worker.postMessage({ type: "SKIP_WAITING" });
}

export const useUpdateAvailable = (): boolean => useSyncExternalStore(waitingWorker.subscribe, () => waitingWorker.get() !== null, () => false);

// ---------- install ----------

export const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type Platform = "android" | "ios" | "desktop";

export function platform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS reports a Mac; touch points give it away.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

/** iOS major.minor, or null elsewhere. Web Push needs iOS 16.4+ and the app on the Home Screen. */
export function iosVersion(): number | null {
  const match = /OS (\d+)_(\d+)/.exec(navigator.userAgent);
  return match ? Number(match[1]) + Number(match[2]) / 100 : null;
}

export function useInstallPrompt(): { available: boolean; prompt: () => Promise<boolean> } {
  const event = useSyncExternalStore(installPrompt.subscribe, installPrompt.get, () => null);
  return {
    available: event !== null,
    prompt: async () => {
      if (!event) return false;
      await event.prompt();
      const { outcome } = await event.userChoice;
      installPrompt.set(null);
      return outcome === "accepted";
    },
  };
}

/** Points the page at an area's manifest while mounted (the professional panel installs as its own app). */
export function useManifest(href: string): void {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.getAttribute("href");
    link.setAttribute("href", href);
    return () => {
      if (previous) link.setAttribute("href", previous);
    };
  }, [href]);
}

// ---------- push ----------

export const pushSupported = (): boolean => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The VAPID public key (base64url) as the bytes PushManager.subscribe expects. */
export function vapidKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}
