import { useEffect } from "react";

import { getBixbo, setBixbo } from "@/lib/storage";

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

function removeSearchParam(name: string) {
  const current = new URL(window.location.href);
  if (!current.searchParams.has(name)) return;
  current.searchParams.delete(name);
  const clean = `${current.pathname}${current.search}${current.hash}` || "/";
  window.history.replaceState(window.history.state, "", clean);
}

function monthDeltaFromToday(dateKey: string): number | null {
  const [year, month] = dateKey.split("-").map(Number);
  if (!year || !month) return null;
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - 1 - now.getMonth());
}

function calendarMonthButton(direction: -1 | 1): HTMLButtonElement | null {
  const heading = document.querySelector<HTMLHeadingElement>('h2[data-bixbo-display-title]');
  const parent = heading?.parentElement;
  if (!parent) return null;
  const buttons = Array.from(parent.children).filter((node): node is HTMLButtonElement => node instanceof HTMLButtonElement);
  if (!buttons.length) return null;
  return direction < 0 ? buttons[0] ?? null : buttons[buttons.length - 1] ?? null;
}

export function MedicationNotificationActionBridge() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const timers = new Set<number>();
    const later = (fn: () => void, delay = 100) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, delay);
      timers.add(id);
    };

    const openMedsLogDeepLink = (attempt = 0) => {
      if (cancelled || window.location.pathname !== "/") return;
      const current = new URL(window.location.href);
      if (current.searchParams.get("log") !== "meds") return;

      const medsButton = document.querySelector<HTMLButtonElement>('button[data-log-category="meds"]');
      if (medsButton) {
        medsButton.click();
        removeSearchParam("log");
        return;
      }

      const menuOpen = Boolean(document.querySelector("[data-bixbo-log-menu]"));
      const formOpen = Boolean(document.querySelector("[data-bixbo-log-surface]"));
      if (!menuOpen && !formOpen) {
        window.dispatchEvent(new CustomEvent("bixbo:toggle-log"));
      }

      if (attempt < 40) later(() => openMedsLogDeepLink(attempt + 1), 100);
    };

    const openCalendarEventsDeepLink = (attempt = 0, remainingMoves?: number) => {
      if (cancelled || window.location.pathname !== "/") return;
      const current = new URL(window.location.href);
      const eventId = current.searchParams.get("calendarEvents");
      if (!eventId) return;

      const event = (getBixbo().events ?? []).find((entry) => String(entry.id) === eventId);
      if (!event) {
        if (attempt < 40) later(() => openCalendarEventsDeepLink(attempt + 1, remainingMoves), 100);
        return;
      }

      let moves = remainingMoves;
      if (moves == null) {
        const delta = monthDeltaFromToday(event.startDate);
        if (delta == null) return;
        moves = Math.max(-120, Math.min(120, delta));
      }

      if (moves !== 0) {
        const direction: -1 | 1 = moves < 0 ? -1 : 1;
        const button = calendarMonthButton(direction);
        if (!button) {
          if (attempt < 40) later(() => openCalendarEventsDeepLink(attempt + 1, moves), 100);
          return;
        }
        button.click();
        later(() => openCalendarEventsDeepLink(attempt + 1, moves! - direction), 110);
        return;
      }

      // MonthCalendar already owns the canonical Calendar events dialog. Open
      // that existing list rather than manufacturing another event UI or
      // jumping directly into the event editor.
      const eventsButton = document.querySelector<HTMLButtonElement>(".bixbo-calendar > div:first-child > button");
      if (eventsButton) {
        eventsButton.click();
        removeSearchParam("calendarEvents");
        return;
      }

      if (attempt < 50) later(() => openCalendarEventsDeepLink(attempt + 1, 0), 100);
    };

    const consumeNotificationDeepLink = () => {
      openMedsLogDeepLink();
      openCalendarEventsDeepLink();
    };

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

    // Home and the Log-sheet event listeners mount in the same React commit as
    // this bridge. Defer one tick, then retry for a few seconds so iOS PWA cold
    // starts and local-storage hydration cannot lose the notification target.
    later(consumeNotificationDeepLink, 120);

    void navigator.serviceWorker.ready.then((registration) => {
      const worker = registration.active ?? navigator.serviceWorker.controller;
      worker?.postMessage({ type: "BIXBO_DRAIN_MED_ACTIONS" });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      navigator.serviceWorker.removeEventListener("message", onMessage as EventListener);
    };
  }, []);

  return null;
}
