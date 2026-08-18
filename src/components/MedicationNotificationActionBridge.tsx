import { useEffect } from "react";

import { setBixbo } from "@/lib/storage";

type TakenAction = {
  date: string;
  slot: string;
  takenAt?: string;
};

type WorkerMessage =
  | { type: "BIXBO_MED_TAKEN"; action?: TakenAction }
  | { type: "BIXBO_MED_ACTIONS"; actions?: TakenAction[] }
  | { type: "BIXBO_NOTIFICATION_OPEN"; url?: string };

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validSlot(value: unknown): value is string {
  return typeof value === "string" && /^[^@]+@\d{1,2}:\d{2}$/.test(value);
}

function timeFromAction(value: string | undefined): string {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
    }
  }
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function applyTakenAction(action: TakenAction | undefined) {
  if (!action || !validDate(action.date) || !validSlot(action.slot)) return;

  setBixbo((data) => ({
    ...data,
    medLog: {
      ...data.medLog,
      [action.date]: {
        ...(data.medLog[action.date] ?? {}),
        [action.slot]: true,
      },
    },
    medLogTimes: {
      ...data.medLogTimes,
      [action.date]: {
        ...(data.medLogTimes[action.date] ?? {}),
        [action.slot]: data.medLogTimes[action.date]?.[action.slot] ?? timeFromAction(action.takenAt),
      },
    },
  }));
}

function notificationPath(value: unknown): string | null {
  if (typeof window === "undefined" || typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return null;
  }
}

function openNotificationDestination(value: unknown) {
  const target = notificationPath(value);
  if (!target) return;

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === target) return;

  // A full same-origin navigation is intentional here. iOS installed PWAs can
  // focus an existing window without honoring WindowClient.navigate() from the
  // service worker. Let the live app window perform the deep link itself.
  window.location.assign(target);
}

export function MedicationNotificationActionBridge() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === "BIXBO_NOTIFICATION_OPEN") {
        openNotificationDestination(message.url);
        return;
      }

      if (message.type === "BIXBO_MED_TAKEN") {
        applyTakenAction(message.action);
        return;
      }

      if (message.type === "BIXBO_MED_ACTIONS") {
        for (const action of message.actions ?? []) applyTakenAction(action);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage as EventListener);

    void navigator.serviceWorker.ready.then((registration) => {
      const worker = registration.active ?? navigator.serviceWorker.controller;
      worker?.postMessage({ type: "BIXBO_DRAIN_MED_ACTIONS" });
    }).catch(() => undefined);

    return () => navigator.serviceWorker.removeEventListener("message", onMessage as EventListener);
  }, []);

  return null;
}
