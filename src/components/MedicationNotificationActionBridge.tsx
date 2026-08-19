import { useEffect, useLayoutEffect } from "react";

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

const DEEP_LINK_RETRY_MS = 80;
const DEEP_LINK_MAX_ATTEMPTS = 60;

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

function normalizeNotificationTarget(value: unknown): string | null {
  const target = notificationPath(value);
  if (!target || typeof window === "undefined") return target;

  const parsed = new URL(target, window.location.origin);

  // Notification taps must open the daily medication checklist, never the
  // standalone Manage meds screen. Keep /meds available for explicit app nav.
  if (parsed.pathname === "/meds") {
    parsed.pathname = "/";
    parsed.search = "";
    parsed.searchParams.set("log", "meds");
    parsed.hash = "";
  }

  // Older event pushes used ?event=<id>, which Home interpreted as an edit
  // request. Convert those notification-only deep links to Calendar events.
  const legacyEventId = parsed.pathname === "/" ? parsed.searchParams.get("event") : null;
  if (legacyEventId) {
    parsed.searchParams.delete("event");
    parsed.searchParams.set("calendar", "events");
    parsed.searchParams.set("calendarEvent", legacyEventId);
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
}

function openNotificationDestination(value: unknown) {
  const target = normalizeNotificationTarget(value);
  if (!target) return;

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === target) return;

  // A full same-origin navigation is intentional here. iOS installed PWAs can
  // focus an existing window without honoring WindowClient.navigate() from the
  // service worker. Let the live app window perform the deep link itself.
  window.location.assign(target);
}

function replaceCurrentUrl(url: URL) {
  const next = `${url.pathname}${url.search}${url.hash}` || "/";
  window.history.replaceState(window.history.state, "", next);
}

function clearNotificationParams(...names: string[]) {
  const current = new URL(window.location.href);
  for (const name of names) current.searchParams.delete(name);
  replaceCurrentUrl(current);
}

function eventDate(eventId: string | null): string | null {
  if (!eventId) return null;
  const event = (getBixbo().events ?? []).find((entry) => String(entry.id) === eventId);
  return event?.startDate ?? null;
}

function startNotificationDeepLink(): () => void {
  if (typeof window === "undefined" || window.location.pathname !== "/") return () => undefined;

  const initial = new URL(window.location.href);
  const legacyEventId = initial.searchParams.get("event");
  const calendarEventId = initial.searchParams.get("calendarEvent") ?? legacyEventId;
  const wantsMeds = initial.searchParams.get("log") === "meds";
  const wantsCalendarEvents = initial.searchParams.get("calendar") === "events" || Boolean(legacyEventId);

  if (!wantsMeds && !wantsCalendarEvents) return () => undefined;

  // Strip the legacy ?event= key before HomePage's normal editor deep-link
  // effect can consume it. Preserve the id under a notification-only key.
  if (legacyEventId) {
    initial.searchParams.delete("event");
    initial.searchParams.set("calendar", "events");
    initial.searchParams.set("calendarEvent", legacyEventId);
    replaceCurrentUrl(initial);
  }

  if (wantsCalendarEvents) {
    const date = eventDate(calendarEventId);
    if (date && window.location.hash !== `#date=${date}`) {
      // CalendarTargetBridge owns month/day navigation and removes the hash
      // after it reaches the correct calendar month.
      window.location.hash = `date=${date}`;
    }
  }

  let cancelled = false;
  let attempts = 0;
  let timer: number | undefined;

  const retry = () => {
    if (cancelled || attempts >= DEEP_LINK_MAX_ATTEMPTS) return;
    timer = window.setTimeout(step, DEEP_LINK_RETRY_MS);
  };

  const step = () => {
    if (cancelled) return;
    attempts += 1;

    if (wantsMeds) {
      const meds = document.querySelector<HTMLButtonElement>('button[data-log-category="meds"]');
      if (meds) {
        meds.click();
        clearNotificationParams("log");
        return;
      }

      // HomePage listens for this event and opens the Log category chooser.
      // Retry the open request only while no category menu exists, so an
      // already-open menu can never be toggled closed by the retry loop.
      const menuOpen = Boolean(document.querySelector("button[data-log-category]"));
      if (!menuOpen && (attempts === 1 || attempts % 8 === 0)) {
        window.dispatchEvent(new CustomEvent("bixbo:toggle-log"));
      }
      retry();
      return;
    }

    if (wantsCalendarEvents) {
      // Wait for CalendarTargetBridge to finish any #date= navigation first.
      if (window.location.hash.startsWith("#date=")) {
        retry();
        return;
      }

      // The first direct button in the calendar header is the existing
      // Calendar events / To do launcher. On an event notification the target
      // month necessarily contains an event, so this control is present.
      const calendarEvents = document.querySelector<HTMLButtonElement>(".bixbo-calendar > div > button");
      if (calendarEvents) {
        calendarEvents.click();
        clearNotificationParams("calendar", "calendarEvent", "event");
        return;
      }
      retry();
    }
  };

  timer = window.setTimeout(step, 120);
  return () => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

export function MedicationNotificationActionBridge() {
  // Run notification URL normalization before HomePage's passive editor-link
  // effect. This prevents legacy event pushes from briefly opening Event edit.
  useLayoutEffect(() => startNotificationDeepLink(), []);

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
