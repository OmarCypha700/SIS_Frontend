/*
 * Service worker for the student portal.
 *
 * - Installable app shell: hashed Next.js assets are cached; pages always come from the network,
 *   with an offline page when there is no connection.
 * - Records, results and other API data (/api/*) and uploads (/media/*) are NEVER cached, so
 *   nothing personal is left on shared or lost devices.
 * - Web push: shows the notification, updates the app-icon badge and tells open windows to play
 *   the notification sound and refresh the bell.
 */
const VERSION = "v1";
const SHELL_CACHE = `sis-shell-${VERSION}`;
const ASSET_CACHE = `sis-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/sounds/notification.wav"];
const ICON = "/api/v1/institution/app-icon/?size=192&purpose=any";
const BADGE = "/api/v1/institution/app-icon/?size=96&purpose=badge";
// Registered as /sw.js?dev=1 by `next dev`: build assets change on every edit, so skip caching them.
const DEV = new URL(self.location.href).searchParams.has("dev");

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) return; // never cached

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Build output under /_next/static is content-hashed and never changes: cache first.
  if (!DEV && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/sounds/"))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});

async function setBadge(count) {
  try {
    if (!self.navigator.setAppBadge) return;
    if (count > 0) await self.navigator.setAppBadge(count);
    else await self.navigator.clearAppBadge();
  } catch {
    // Badging is not supported everywhere; ignore.
  }
}

async function tellWindows(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) client.postMessage(message);
  return windows;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data?.text() };
  }
  const title = data.title || "New notification";
  event.waitUntil(
    (async () => {
      await setBadge(Number(data.unread) || 0);
      await tellWindows({ type: "notification", notification: data });
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: ICON,
        badge: BADGE,
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        timestamp: Date.now(),
        data: { link: data.link || "/notifications", id: data.id },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { link = "/notifications", id } = event.notification.data || {};
  const target = new URL(link, self.location.origin);
  if (id) target.searchParams.set("n", id); // the page marks it read
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) return existing.navigate(target.href);
        existing.postMessage({ type: "navigate", url: target.pathname + target.search });
        return undefined;
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "SKIP_WAITING") self.skipWaiting();
  if (message.type === "BADGE") event.waitUntil(setBadge(Number(message.count) || 0));
  if (message.type === "CLEAR") {
    // Signing out: remove cached assets, the badge and any notifications still on screen.
    event.waitUntil(
      (async () => {
        for (const key of await caches.keys()) if (key !== SHELL_CACHE) await caches.delete(key);
        await setBadge(0);
        for (const n of await self.registration.getNotifications()) n.close();
      })(),
    );
  }
});
