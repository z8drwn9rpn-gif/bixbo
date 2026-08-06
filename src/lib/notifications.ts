/**
 * BIXBO notification runtime.
 *
 * Additive layer on top of the existing storage: preferences live in
 * settings.notif (all optional, so old data migrates safely). Nothing here
 * mutates or replaces existing app logic.
 *
 * Delivery rules:
 *  - App visible  -> in-app sonner toast
 *  - App hidden   -> system notification via the push service worker
 *  - Quiet hours  -> everything except medication reminders is suppressed
 *  - Every reminder is de-duplicated by a stable key stored in localStorage
 */
import { useEffect } from "react";
import { toast } from "sonner";

import {
  getBixbo,
  hasAnyLog,
  nextPredictedPeriod,
  setBixbo,
  todayKey,
  addDays,
  type BixboData,
  type NotificationPrefs,
} from "./storage";
import { showCyclePredictions } from "./health";

export type NotifCategory =
  | "meds"
  | "period"
  | "ovulation"
  | "dailyLog"
  | "symptom"
  | "appointments"
  | "mood"
  | "hydration"
  | "marketing";

export const DEFAULT_NOTIF_PREFS: Required<
  Omit<NotificationPrefs, "promptSnoozedAt" | "promptAnswered">
> = {
  enabled: false,
  meds: true,
  period: true,
  ovulation: true,
  dailyLog: true,
  symptom: true,
  appointments: true,
  mood: false,
  hydration: false,
  marketing: false,
  dailyLogTime: "20:00",
  symptomTime: "18:00",
  moodTime: "20:30",
  hydrationStart: "09:00",
  hydrationEnd: "20:00",
  hydrationEveryHours: 3,
  quietStart: "22:00",
  quietEnd: "07:00",
};

export type ResolvedPrefs = typeof DEFAULT_NOTIF_PREFS & Pick<NotificationPrefs, "promptSnoozedAt" | "promptAnswered">;

export function notifPrefs(data: Pick<BixboData, "settings">): ResolvedPrefs {
  const raw = data.settings?.notif ?? {};
  return { ...DEFAULT_NOTIF_PREFS, ...raw };
}

export function saveNotifPrefs(patch: Partial<NotificationPrefs>) {
  setBixbo((d) => ({
    ...d,
    settings: { ...d.settings, notif: { ...(d.settings.notif ?? {}), ...patch } },
  }));
}

export const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  meds: "Medication reminders",
  period: "Period reminders",
  ovulation: "Ovulation reminders",
  dailyLog: "Daily log reminders",
  symptom: "Symptom reminders",
  appointments: "Appointment reminders",
  mood: "Mood reminders",
  hydration: "Hydration reminders",
  marketing: "News & tips",
};

/* ------------------------------------------------------------------ */
/* Service worker registration (exactly once per page session)         */
/* ------------------------------------------------------------------ */

const SW_URL = "/bixbo-push-sw.js";
let swPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    typeof ServiceWorkerRegistration !== "undefined" &&
    "showNotification" in ServiceWorkerRegistration.prototype
  );
}

export function ensurePushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return Promise.resolve(null);
  if (swPromise) return swPromise;

  swPromise = (async () => {
    try {
      const existing = await navigator.serviceWorker.getRegistration(SW_URL);
      const reg = existing ?? (await navigator.serviceWorker.register(SW_URL, { scope: "/" }));
      await navigator.serviceWorker.ready.catch(() => undefined);
      return reg;
    } catch (error) {
      console.warn("BIXBO: push service worker unavailable", error);
      return null;
    }
  })();

  return swPromise;
}

/* ------------------------------------------------------------------ */
/* Permission + push subscription                                      */
/* ------------------------------------------------------------------ */

export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

/**
 * Subscribes to the Push API when a VAPID public key is configured.
 * Without a key the app still delivers every reminder locally through the
 * same service worker, so this failing is never fatal.
 */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  const reg = await ensurePushWorker();
  if (!reg || !("pushManager" in reg)) return null;
  const key = import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined;

  try {
    const current = await reg.pushManager.getSubscription();
    if (current) return current;
    if (!key) return null;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  } catch (error) {
    console.warn("BIXBO: push subscription unavailable", error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") {
    await ensurePushWorker();
    void ensurePushSubscription();
    return "granted";
  }

  const result = await Notification.requestPermission();
  if (result === "granted") {
    await ensurePushWorker();
    void ensurePushSubscription();
    saveNotifPrefs({ enabled: true, promptAnswered: true });
  } else {
    saveNotifPrefs({ promptAnswered: true });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* De-duplication                                                      */
/* ------------------------------------------------------------------ */

const SENT_KEY = "bixbo:notif-sent";

function readSent(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSent(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  const cutoff = Date.now() - 8 * 86400000;
  const pruned = Object.fromEntries(Object.entries(map).filter(([, ts]) => ts > cutoff));
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(pruned));
  } catch {
    /* storage full — reminders simply repeat next session */
  }
}

function alreadySent(key: string): boolean {
  return Boolean(readSent()[key]);
}

function markSent(key: string) {
  const map = readSent();
  map[key] = Date.now();
  writeSent(map);
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function inQuietHours(prefs: ResolvedPrefs, at = new Date()): boolean {
  const start = minutesOf(prefs.quietStart);
  const end = minutesOf(prefs.quietEnd);
  const now = nowMinutes(at);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

export interface NotifPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  category: NotifCategory;
}

async function deliver(payload: NotifPayload) {
  const visible = typeof document !== "undefined" && document.visibilityState === "visible";

  if (visible) {
    toast(payload.title, { description: payload.body, duration: 8000 });
    return;
  }

  if (permissionState() !== "granted") return;
  const reg = await ensurePushWorker();
  if (!reg) return;

  try {
    const open = await reg.getNotifications({ tag: payload.tag });
    if (open.length) return;
    await reg.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url, category: payload.category, tag: payload.tag },
    });
  } catch (error) {
    console.warn("BIXBO: could not show notification", error);
  }
}

async function fire(prefs: ResolvedPrefs, payload: NotifPayload, dedupeKey: string) {
  if (!prefs[payload.category]) return;
  if (alreadySent(dedupeKey)) return;
  if (payload.category !== "meds" && inQuietHours(prefs)) return;

  markSent(dedupeKey);
  await deliver(payload);
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/** How late a time-based reminder may still fire (minutes). */
const GRACE = 90;

function dueNow(target: string, at = new Date()): boolean {
  const diff = nowMinutes(at) - minutesOf(target);
  return diff >= 0 && diff <= GRACE;
}

export async function runNotificationChecks(now = new Date()) {
  const data = getBixbo();
  const prefs = notifPrefs(data);
  if (!prefs.enabled) return;
  if (permissionState() === "denied") return;

  const today = todayKey();
  const log = data.dayLogs[today];
  const loggedToday = hasAnyLog(log);

  /* --- Medication reminders --- */
  if (prefs.meds) {
    for (const med of data.meds ?? []) {
      if (med.asNeeded) continue;
      for (const time of med.times ?? []) {
        if (!dueNow(time, now)) continue;
        const slot = `${med.id}@${time}`;
        if (data.medLog?.[today]?.[slot]) continue;
        await fire(
          prefs,
          {
            title: `Time for ${med.name}`,
            body: med.dose ? `Take your ${med.dose} dose.` : "Take your scheduled medication.",
            url: "/meds",
            tag: `med-${slot}-${today}`,
            category: "meds",
          },
          `med:${slot}:${today}`,
        );
      }
    }
  }

  /* --- Cycle reminders (hidden in male / pregnancy / postpartum modes) --- */
  if (showCyclePredictions(data)) {
    const next = nextPredictedPeriod(data.cycle);
    if (next) {
      const dayBefore = addDays(next.start, -1);
      if (prefs.period && today === dayBefore && dueNow("09:00", now)) {
        await fire(
          prefs,
          {
            title: "Period expected tomorrow",
            body: "Tomorrow your period is predicted to start.",
            url: "/",
            tag: `period-${next.start}`,
            category: "period",
          },
          `period:${next.start}`,
        );
      }

      if (prefs.ovulation) {
        const ovulation = addDays(next.start, -14);
        const dayBeforeOvulation = addDays(ovulation, -1);
        if (today === dayBeforeOvulation && dueNow("09:00", now)) {
          await fire(
            prefs,
            {
              title: "Ovulation window",
              body: "Ovulation window starts tomorrow.",
              url: "/",
              tag: `ovulation-${ovulation}`,
              category: "ovulation",
            },
            `ovulation:${ovulation}`,
          );
        }
      }
    }
  }

  /* --- Symptom reminder --- */
  if (prefs.symptom && !loggedToday && dueNow(prefs.symptomTime, now)) {
    await fire(
      prefs,
      {
        title: "How are you feeling today?",
        body: "Log today's symptoms in BIXBO.",
        url: "/",
        tag: `symptom-${today}`,
        category: "symptom",
      },
      `symptom:${today}`,
    );
  }

  /* --- Daily log reminder (max once a day, only when nothing logged) --- */
  if (prefs.dailyLog && !loggedToday && dueNow(prefs.dailyLogTime, now)) {
    await fire(
      prefs,
      {
        title: "Today's log is still empty",
        body: "Take a moment to write down how your day went.",
        url: "/",
        tag: `daily-${today}`,
        category: "dailyLog",
      },
      `daily:${today}`,
    );
  }

  /* --- Mood reminder --- */
  if (prefs.mood && dueNow(prefs.moodTime, now)) {
    await fire(
      prefs,
      {
        title: "How is your mood today?",
        body: "A quick mood check-in helps spot patterns.",
        url: "/",
        tag: `mood-${today}`,
        category: "mood",
      },
      `mood:${today}`,
    );
  }

  /* --- Hydration reminder --- */
  if (prefs.hydration) {
    const start = minutesOf(prefs.hydrationStart);
    const end = minutesOf(prefs.hydrationEnd);
    const step = Math.max(1, prefs.hydrationEveryHours) * 60;
    const cur = nowMinutes(now);
    if (cur >= start && cur <= end) {
      const slotIndex = Math.floor((cur - start) / step);
      const slotTime = start + slotIndex * step;
      if (cur - slotTime <= 30) {
        await fire(
          prefs,
          {
            title: "Time for some water",
            body: "A glass of water now keeps the day gentler.",
            url: "/",
            tag: `water-${today}-${slotIndex}`,
            category: "hydration",
          },
          `water:${today}:${slotIndex}`,
        );
      }
    }
  }

  /* --- Appointment reminders (24 h and 2 h before) --- */
  if (prefs.appointments) {
    const appointments = [...(data.pregnancy?.appointments ?? []), ...(data.postpartum?.visits ?? [])];
    for (const appt of appointments) {
      if (!appt?.date) continue;
      const [y, m, d] = appt.date.split("-").map(Number);
      if (!y || !m || !d) continue;
      const [hh, mm] = (appt.time ?? "09:00").split(":").map(Number);
      const when = new Date(y, m - 1, d, hh || 9, mm || 0);
      const diffMin = (when.getTime() - now.getTime()) / 60000;

      const windows: { label: string; at: number; key: string }[] = [
        { label: "tomorrow", at: 24 * 60, key: "24h" },
        { label: "in 2 hours", at: 120, key: "2h" },
      ];

      for (const w of windows) {
        if (diffMin <= w.at && diffMin > w.at - 30) {
          await fire(
            prefs,
            {
              title: `Appointment ${w.label}`,
              body: `${appt.title || "Appointment"}${appt.time ? ` at ${appt.time}` : ""}.`,
              url: "/",
              tag: `appt-${appt.id}-${w.key}`,
              category: "appointments",
            },
            `appt:${appt.id}:${w.key}`,
          );
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Runtime hook                                                        */
/* ------------------------------------------------------------------ */

const TICK_MS = 60000;

/** Mounted once from the root route. Safe to call on every render. */
export function useNotificationRuntime() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pushSupported()) return;

    let stopped = false;

    const tick = () => {
      if (stopped) return;
      void runNotificationChecks().catch((error) => console.warn("BIXBO notifications", error));
    };

    // Register the worker only when the user already granted permission.
    if (Notification.permission === "granted") void ensurePushWorker();

    const first = window.setTimeout(tick, 4000);
    const interval = window.setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Permission prompt eligibility                                       */
/* ------------------------------------------------------------------ */

const SNOOZE_DAYS = 5;

/** Number of days that already contain a log — used to delay the ask. */
export function loggedDayCount(data: BixboData): number {
  return Object.values(data.dayLogs ?? {}).filter((log) => hasAnyLog(log)).length;
}

export function shouldAskForPermission(data: BixboData): boolean {
  if (!pushSupported()) return false;
  if (Notification.permission !== "default") return false;
  const prefs = notifPrefs(data);
  if (prefs.promptAnswered) return false;
  if (prefs.promptSnoozedAt && Date.now() - prefs.promptSnoozedAt < SNOOZE_DAYS * 86400000) return false;
  return loggedDayCount(data) >= 3;
}

export function snoozePermissionPrompt() {
  saveNotifPrefs({ promptSnoozedAt: Date.now() });
}
