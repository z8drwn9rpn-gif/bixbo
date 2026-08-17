import { useEffect } from "react";

import { setBixbo } from "@/lib/storage";

type TakenAction = {
  date: string;
  slot: string;
  takenAt?: string;
};

type WorkerMessage =
  | { type: "BIXBO_MED_TAKEN"; action?: TakenAction }
  | { type: "BIXBO_MED_ACTIONS"; actions?: TakenAction[] };

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

export function MedicationNotificationActionBridge() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (!message) return;

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
