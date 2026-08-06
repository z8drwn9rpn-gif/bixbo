/* BIXBO push/messaging service worker.
   Push + notification handling only. It intentionally has NO fetch handler and
   caches nothing, so it can never interfere with app caching or serve stale HTML. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function buildOptions(payload) {
  const tag = payload.tag || "bixbo";
  return {
    body: payload.body || "",
    tag,
    renotify: false,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: { url: payload.url || "/", category: payload.category || "general", tag },
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
  };
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "BIXBO", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "BIXBO";

  event.waitUntil(
    (async () => {
      // Avoid duplicates: if an identical tag is already on screen, skip.
      const existing = await self.registration.getNotifications({ tag: payload.tag || "bixbo" });
      if (existing.length) return;
      await self.registration.showNotification(title, buildOptions(payload));
    })(),
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "BIXBO_SHOW_NOTIFICATION" || !msg.payload) return;

  const payload = msg.payload;
  event.waitUntil(
    (async () => {
      const existing = await self.registration.getNotifications({ tag: payload.tag || "bixbo" });
      if (existing.length) return;
      await self.registration.showNotification(payload.title || "BIXBO", buildOptions(payload));
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              /* cross-origin or blocked navigation — focus is enough */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};
  // Let any open tab know the user dismissed it (used to back off repeats).
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({ type: "BIXBO_NOTIFICATION_CLOSED", category: data.category, tag: data.tag });
      }
    })(),
  );
});
