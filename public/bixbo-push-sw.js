/* BIXBO push/messaging service worker.
   Push + notification handling only. It intentionally has NO fetch handler and
   caches nothing, so it cannot serve stale HTML or interfere with app updates. */

const BIXBO_PUSH_SW_VERSION = "2026.08.06.1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function safeUrl(value) {
  try {
    const parsed = new URL(typeof value === "string" ? value : "/", self.location.origin);

    if (parsed.origin !== self.location.origin) return "/";

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return "/";
  }
}

function buildOptions(payload) {
  const tag = payload.tag || "bixbo";

  return {
    body: payload.body || "",
    tag,
    renotify: false,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: {
      url: safeUrl(payload.url),
      category: payload.category || "general",
      tag,
      swVersion: BIXBO_PUSH_SW_VERSION,
    },
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    timestamp: Number.isFinite(payload.timestamp) ? payload.timestamp : Date.now(),
  };
}

async function showPayload(payload) {
  const title = payload.title || "BIXBO";
  const tag = payload.tag || "bixbo";

  const existing = await self.registration.getNotifications({ tag });

  for (const notification of existing) {
    notification.close();
  }

  await self.registration.showNotification(title, buildOptions(payload));
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "BIXBO",
      body: event.data ? event.data.text() : "",
    };
  }

  event.waitUntil(showPayload(payload));
});

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message) return;

  if (message.type === "BIXBO_SHOW_NOTIFICATION" && message.payload) {
    event.waitUntil(showPayload(message.payload));
    return;
  }

  if (message.type === "BIXBO_GET_SW_VERSION" && event.source) {
    event.source.postMessage({
      type: "BIXBO_SW_VERSION",
      version: BIXBO_PUSH_SW_VERSION,
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = safeUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    (async () => {
      const target = new URL(url, self.location.origin).href;

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!("focus" in client)) continue;

        if ("navigate" in client) {
          try {
            await client.navigate(target);
          } catch {
            // Focus the existing BIXBO window if navigation fails.
          }
        }

        await client.focus();
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});

self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        client.postMessage({
          type: "BIXBO_NOTIFICATION_CLOSED",
          category: data.category,
          tag: data.tag,
        });
      }
    })(),
  );
});
