/*
 * Service worker (plan C3, C10): job alerts by Web Push, and a light offline shell.
 * Registered at "/sw.js" (scope "/"). With "?dev=1" (Vite dev server) nothing is cached,
 * so development always sees fresh code.
 */
const VERSION = "v1";
const CACHES = { shell: `shell-${VERSION}`, assets: `assets-${VERSION}`, images: `images-${VERSION}` };
const DEV = new URL(self.location.href).searchParams.get("dev") === "1";

self.addEventListener("install", (event) => {
  if (DEV) return;
  // The page decides when a new version takes over (never mid-job), see SKIP_WAITING below.
  event.waitUntil(caches.open(CACHES.shell).then((cache) => cache.add("/")).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(Object.values(CACHES));
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ---------- caching (production only) ----------

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
      const cache = await caches.open(CACHES.shell);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/", { cacheName: CACHES.shell });
    return cached || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || fresh;
}

self.addEventListener("fetch", (event) => {
  if (DEV) return;
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    // Catalogue photos from the media CDN; API calls are never cached here.
    if (request.destination === "image") event.respondWith(staleWhileRevalidate(request, CACHES.images));
    return;
  }
  if (request.mode === "navigate") return event.respondWith(networkFirstShell(request));
  // Hashed build files never change, so the first copy is good forever.
  if (url.pathname.startsWith("/assets/")) return event.respondWith(cacheFirst(request, CACHES.assets));
  if (request.destination === "image" || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request, CACHES.images));
  }
});

// ---------- push (plan C10) ----------

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = null;
  }
  if (!payload || !payload.title) payload = { kind: "message", title: "Ghar Ghar Salon Express", body: event.data ? event.data.text() : "", url: "/" };
  const expired = typeof payload.expiresAt === "number" && Date.now() > payload.expiresAt;

  event.waitUntil(
    (async () => {
      // Browsers require a visible notification for every push; an expired offer says so quietly.
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        renotify: Boolean(payload.tag) && !expired,
        silent: expired,
        requireInteraction: Boolean(payload.requireInteraction) && !expired,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        vibrate: payload.kind === "offer" ? [400, 150, 400, 150, 400] : undefined,
        actions: Array.isArray(payload.actions) ? payload.actions : [],
        data: { url: payload.url || "/", kind: payload.kind, expiresAt: payload.expiresAt, actions: payload.actionUrls || {} },
      });
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: "push", payload });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  // An action button (e.g. "Accept" on an offer) can open its own address.
  const target = (event.action && data.actions && data.actions[event.action]) || data.url || "/";
  const url = new URL(target, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) {
          try {
            await client.navigate(url);
            return;
          } catch {
            // Not controlled by this worker yet: let the page navigate itself.
          }
        }
        client.postMessage({ type: "navigate", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
