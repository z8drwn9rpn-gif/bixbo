/* BIXBO push/messaging service worker.
   Push + notification handling only. It intentionally has NO fetch handler and
   caches nothing, so it cannot serve stale HTML or interfere with app updates. */

const BIXBO_PUSH_SW_VERSION = "2026.08.17.2";
const MED_ACTION_DB = "bixbo-notification-actions";
const MED_ACTION_STORE = "pending-med-actions";

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

function validMedicationAction(value) {
  if (!value || typeof value !== "object") return null;
  const date = typeof value.date === "string" ? value.date : "";
  const slot = typeof value.slot === "string" ? value.slot : "";
  const token = typeof value.token === "string" ? value.token : "";
  const actionUrl = typeof value.actionUrl === "string" ? value.actionUrl : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slot || !token || !actionUrl) return null;
  try {
    const parsed = new URL(actionUrl);
    if (parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { date, slot, token, actionUrl };
}

function buildOptions(payload) {
  const tag = payload.tag || "bixbo";
  const medicationAction = payload.category === "meds" ? validMedicationAction(payload.medicationAction) : null;

  return {
    body: payload.body || "",
    tag,
    renotify: false,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    actions: medicationAction
      ? [
          { action: "taken", title: "Taken ✓" },
          { action: "remind-later", title: "Remind later" },
        ]
      : undefined,
    data: {
      url: safeUrl(payload.url),
      category: payload.category || "general",
      tag,
      medicationAction,
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

function openActionDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MED_ACTION_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MED_ACTION_STORE)) {
        db.createObjectStore(MED_ACTION_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueTakenAction(action) {
  const db = await openActionDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MED_ACTION_STORE, "readwrite");
    tx.objectStore(MED_ACTION_STORE).put({
      id: `${action.date}|${action.slot}`,
      date: action.date,
      slot: action.slot,
      takenAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function drainTakenActions() {
  const db = await openActionDb();
  const actions = await new Promise((resolve, reject) => {
    const tx = db.transaction(MED_ACTION_STORE, "readwrite");
    const store = tx.objectStore(MED_ACTION_STORE);
    const getAll = store.getAll();
    getAll.onsuccess = () => {
      const result = Array.isArray(getAll.result) ? getAll.result : [];
      store.clear();
      resolve(result);
    };
    getAll.onerror = () => reject(getAll.error);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return actions;
}

async function notifyClients(message) {
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) client.postMessage(message);
}

async function callMedicationAction(actionData, action) {
  const response = await fetch(actionData.actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: actionData.token,
      action,
      snoozeMinutes: action === "remind-later" ? 10 : undefined,
    }),
  });
  if (!response.ok) throw new Error(`Medication action failed (${response.status}).`);
  return response.json().catch(() => ({ ok: true }));
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

  if (message.type === "BIXBO_DRAIN_MED_ACTIONS" && event.source) {
    event.waitUntil(
      drainTakenActions().then((actions) => {
        event.source.postMessage({ type: "BIXBO_MED_ACTIONS", actions });
      }).catch(() => undefined),
    );
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
  const data = event.notification.data || {};
  const medicationAction = validMedicationAction(data.medicationAction);
  const clickedAction = event.action;
  event.notification.close();

  if (medicationAction && (clickedAction === "taken" || clickedAction === "remind-later")) {
    event.waitUntil(
      (async () => {
        if (clickedAction === "taken") {
          await queueTakenAction(medicationAction).catch(() => undefined);
          await notifyClients({
            type: "BIXBO_MED_TAKEN",
            action: {
              date: medicationAction.date,
              slot: medicationAction.slot,
              takenAt: new Date().toISOString(),
            },
          }).catch(() => undefined);
        }

        try {
          await callMedicationAction(medicationAction, clickedAction);
        } catch {
          if (clickedAction === "remind-later") {
            await self.registration.showNotification("BIXBO", {
              body: "Could not snooze this medication reminder. Open BIXBO to check it.",
              tag: `med-action-error-${medicationAction.slot}`,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              data: { url: "/", category: "meds" },
            });
          }
        }
      })(),
    );
    return;
  }

  const url = safeUrl(data.url);

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
