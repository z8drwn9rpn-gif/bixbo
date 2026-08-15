/**
 * BIXBO notification runtime.
 *
 * Local delivery:
 *  - App visible -> sonner toast
 *  - App hidden  -> Service Worker notification
 *
 * Remote delivery:
 *  - The browser PushSubscription and a notification-only schedule snapshot
 *    are stored through Supabase Edge Functions.
 *  - A Supabase cron invokes send-due-push every minute.
 *  - The VAPID private key exists only inside Supabase Edge Function secrets.
 */
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  getBixbo,
  hasAnyLog,
  nextPredictedPeriod,
  setBixbo,
  subscribeBixboChanges,
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
  | "sleep"
  | "marketing";

export const DEFAULT_NOTIF_PREFS: Required<Omit<NotificationPrefs, "promptSnoozedAt" | "promptAnswered">> = {
  enabled: false,
  meds: true,
  period: true,
  ovulation: true,
  dailyLog: true,
  symptom: true,
  appointments: true,
  mood: false,
  hydration: false,
  sleep: false,
  marketing: false,
  dailyLogTime: "20:00",
  symptomTime: "18:00",
  moodTime: "20:30",
  hydrationStart: "09:00",
  hydrationEnd: "20:00",
  hydrationEveryHours: 3,
  sleepTime: "22:30",
  quietHoursEnabled: false,
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
    settings: {
      ...d.settings,
      notif: { ...(d.settings.notif ?? {}), ...patch },
    },
  }));

  // Never recreate a PushSubscription while the master preference is off.
  // Other preference changes are synced only when remote push is enabled.
  if (patch.enabled === false) return;
  queueMicrotask(() => void syncPushState().catch(logPushError));
}

export const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  meds: "Medication reminders",
  period: "Period reminders",
  ovulation: "Ovulation reminders",
  dailyLog: "Daily log reminders",
  symptom: "Symptom reminders",
  appointments: "Appointments & calendar events",
  mood: "Mood reminders",
  hydration: "Hydration reminders",
  sleep: "Sleep reminders",
  marketing: "News & tips",
};

/* ------------------------------------------------------------------ */
/* Service worker                                                      */
/* ------------------------------------------------------------------ */

const SW_URL = "/bixbo-push-sw.js";
let swPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function logPushError(error: unknown) {
  console.warn("BIXBO Web Push:", error);
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );
}

export function ensurePushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return Promise.resolve(null);
  if (swPromise) return swPromise;

  swPromise = (async () => {
    try {
      // Always register the expected script. This also upgrades installations
      // that still have an older service worker controlling scope "/".
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: "/",
        updateViaCache: "none",
      });

      await registration.update().catch(() => undefined);
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      logPushError(error);
      return null;
    }
  })();

  return swPromise;
}

/* ------------------------------------------------------------------ */
/* Permission + subscription                                           */
/* ------------------------------------------------------------------ */

export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

function vapidPublicKey(): string {
  const value = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim();
  if (!value) {
    throw new Error("Missing VITE_VAPID_PUBLIC_KEY.");
  }
  return value;
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (Notification.permission !== "granted") return null;

  const registration = await ensurePushWorker();
  if (!registration) return null;

  const current = await registration.pushManager.getSubscription();
  if (current) return current;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
  });
}

const PENDING_DELETE_KEY = "bixbo:pending-push-deletes";

function readPendingDeleteEndpoints(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PENDING_DELETE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writePendingDeleteEndpoints(endpoints: string[]) {
  if (typeof window === "undefined") return;
  try {
    const unique = [...new Set(endpoints.filter(Boolean))];
    if (unique.length) window.localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(unique));
    else window.localStorage.removeItem(PENDING_DELETE_KEY);
  } catch {
    // A full localStorage must not prevent disabling notifications.
  }
}

function queuePendingDelete(endpoint: string | undefined) {
  if (!endpoint) return;
  writePendingDeleteEndpoints([...readPendingDeleteEndpoints(), endpoint]);
}

async function requireAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in to enable reminders when BIXBO is fully closed.");
  return data.user;
}

async function invokePushSubscription(
  action: "upsert" | "delete",
  subscription?: PushSubscription,
  endpointOverride?: string,
) {
  const body =
    action === "upsert"
      ? {
          action,
          subscription: subscription?.toJSON(),
          userAgent: navigator.userAgent,
        }
      : {
          action,
          endpoint: endpointOverride ?? subscription?.endpoint,
        };

  const { error } = await supabase.functions.invoke("push-subscription", { body });
  if (error) throw error;
}

export async function flushPendingPushDeletes(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const endpoints = readPendingDeleteEndpoints();
  if (!endpoints.length) return;

  try {
    await requireAuthenticatedUser();
  } catch {
    return;
  }

  const failed: string[] = [];
  for (const endpoint of endpoints) {
    try {
      await invokePushSubscription("delete", undefined, endpoint);
    } catch {
      failed.push(endpoint);
    }
  }
  writePendingDeleteEndpoints(failed);
}

/**
 * Enables remote Web Push and stores the device subscription server-side.
 * The user must be authenticated in Supabase.
 */
export async function enableRemotePush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("Web Push is not supported in this browser.");

  // Check authentication before showing the browser permission prompt.
  await requireAuthenticatedUser();

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const subscription = await ensurePushSubscription();
  if (!subscription) throw new Error("The browser did not create a push subscription.");

  try {
    await invokePushSubscription("upsert", subscription);
    saveNotifPrefs({ enabled: true, promptAnswered: true });
    await syncPushState();
    return subscription;
  } catch (error) {
    // Browser permission and a browser subscription do not mean the server
    // subscription succeeded. Keep the master state off on failure.
    saveNotifPrefs({ enabled: false, promptAnswered: true });
    throw error;
  }
}

/**
 * Removes this browser from the server and unsubscribes it from PushManager.
 */
export async function disableRemotePush(): Promise<void> {
  // Turn the master preference off first so no concurrent sync can recreate
  // the subscription while deletion is in progress.
  saveNotifPrefs({ enabled: false, promptAnswered: true });

  const registration = await ensurePushWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await requireAuthenticatedUser();
    await invokePushSubscription("delete", subscription);
  } catch (error) {
    queuePendingDelete(subscription.endpoint);
    logPushError(error);
  } finally {
    await subscription.unsubscribe().catch(logPushError);
  }
}

/**
 * Backwards-compatible function used by the existing notification settings page.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  try {
    await enableRemotePush();
    return "granted";
  } catch (error) {
    logPushError(error);
    // Permission may be granted even though the authenticated server upsert
    // failed. Never report remote push as enabled in that state.
    saveNotifPrefs({ promptAnswered: true, enabled: false });
    return Notification.permission;
  }
}

/* ------------------------------------------------------------------ */
/* Server snapshot                                                     */
/* ------------------------------------------------------------------ */

type ServerMedication = {
  id: string;
  name: string;
  dose?: string;
  times: string[];
};

type ServerAppointment = {
  id: string;
  title: string;
  startsAt: string;
};

type PushSnapshot = {
  timezone: string;
  localDate: string;
  prefs: ResolvedPrefs;
  medications: ServerMedication[];
  takenMedicationSlots: string[];
  hasLogToday: boolean;
  nextPeriodStart: string | null;
  showCyclePredictions: boolean;
  appointments: ServerAppointment[];
};

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function appointmentIso(date: string, time?: string): string | null {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "09:00").split(":").map(Number);

  if (!year || !month || !day) return null;
  const local = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

function buildPushSnapshot(data = getBixbo()): PushSnapshot {
  const today = todayKey();
  const prefs = notifPrefs(data);
  const nextPeriod = showCyclePredictions(data) ? (nextPredictedPeriod(data.cycle)?.start ?? null) : null;

  const medications: ServerMedication[] = (data.meds ?? [])
    .filter((med) => !med.asNeeded && Array.isArray(med.times) && med.times.length > 0)
    .map((med) => ({
      id: String(med.id),
      name: med.name,
      dose: med.dose || undefined,
      times: med.times,
    }));

  const appointments: ServerAppointment[] = [
    ...[
      ...(data.pregnancy?.appointments ?? []),
      ...(data.postpartum?.visits ?? []),
    ].flatMap((appointment) => {
      if (!appointment?.id || !appointment.date) return [];
      const startsAt = appointmentIso(appointment.date, appointment.time);
      if (!startsAt) return [];
      return [
        {
          id: String(appointment.id),
          title: appointment.title || "Appointment",
          startsAt,
        },
      ];
    }),
    ...(data.events ?? []).flatMap((event) => {
      if (!event?.id || !event.startDate) return [];
      // Calendar events intentionally use 09:00 on the event date. The existing
      // server-side 24h appointment window therefore sends the main reminder at
      // 09:00 on the previous calendar day (18 Aug -> 17 Aug), even for all-day
      // events or events that have their own start time.
      const startsAt = appointmentIso(event.startDate, "09:00");
      if (!startsAt) return [];
      return [
        {
          id: `event:${String(event.id)}`,
          title: `Event: ${event.title || "Event"}`,
          startsAt,
        },
      ];
    }),
  ];

  return {
    timezone: browserTimezone(),
    localDate: today,
    prefs,
    medications,
    takenMedicationSlots: Object.keys(data.medLog?.[today] ?? {}).filter((slot) =>
      Boolean(data.medLog?.[today]?.[slot]),
    ),
    hasLogToday: hasAnyLog(data.dayLogs[today]),
    nextPeriodStart: nextPeriod,
    showCyclePredictions: showCyclePredictions(data),
    appointments,
  };
}

let syncPromise: Promise<void> | null = null;

/**
 * Sends only data needed to calculate reminders. It does not upload the complete
 * health log. The server row is protected by RLS and keyed to auth.uid().
 */
export async function syncPushState(): Promise<void> {
  if (typeof window === "undefined") return;

  await flushPendingPushDeletes();

  const prefs = notifPrefs(getBixbo());
  if (!prefs.enabled) return;
  if (Notification.permission !== "granted") return;

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    await requireAuthenticatedUser();
    const subscription = await ensurePushSubscription();
    if (!subscription) return;

    // Refresh/upsert first in case the browser rotated the subscription.
    await invokePushSubscription("upsert", subscription);

    const { error } = await supabase.functions.invoke("push-subscription", {
      body: {
        action: "sync-profile",
        profile: buildPushSnapshot(),
      },
    });

    if (error) throw error;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export type RemoteTestPushResult = {
  attempted: number;
  delivered: number;
  failed: number;
  removed: number;
};

/** Sends a real server-originated Web Push to every active device on this account. */
export async function sendTestPush(): Promise<RemoteTestPushResult> {
  await requireAuthenticatedUser();

  const prefs = notifPrefs(getBixbo());
  if (!prefs.enabled) throw new Error("Enable remote notifications before sending a test push.");
  if (Notification.permission !== "granted") throw new Error("Browser notification permission is not granted.");

  // Ensure this exact device and its latest reminder profile exist server-side.
  await syncPushState();
  const subscription = await ensurePushSubscription();
  if (!subscription) throw new Error("No active push subscription was found for this device.");

  const { data, error } = await supabase.functions.invoke("push-subscription", {
    body: { action: "test", endpoint: subscription.endpoint },
  });
  if (error) throw error;

  const result = data as Partial<RemoteTestPushResult> & { ok?: boolean; error?: string };
  if (!result?.ok) throw new Error(result?.error || "The server did not send the test notification.");

  return {
    attempted: Number(result.attempted ?? 0),
    delivered: Number(result.delivered ?? 0),
    failed: Number(result.failed ?? 0),
    removed: Number(result.removed ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Local fallback delivery                                             */
/* ------------------------------------------------------------------ */

const SENT_KEY = "bixbo:notif-sent";

function readSent(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSent(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  const cutoff = Date.now() - 8 * 86_400_000;
  const pruned = Object.fromEntries(Object.entries(map).filter(([, timestamp]) => timestamp > cutoff));
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(pruned));
  } catch {
    // A full localStorage must not break the app.
  }
}

function alreadySent(key: string): boolean {
  return Boolean(readSent()[key]);
}

function markSent(key: string) {
  const sent = readSent();
  sent[key] = Date.now();
  writeSent(sent);
}

export function minutesOf(hhmm: string): number {
  const [hour, minute] = hhmm.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function nowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function inQuietHours(prefs: ResolvedPrefs, at = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = minutesOf(prefs.quietStart);
  const end = minutesOf(prefs.quietEnd);
  const now = nowMinutes(at);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

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
    toast(payload.title, {
      description: payload.body,
      duration: 8000,
    });
    return;
  }

  if (permissionState() !== "granted") return;
  const registration = await ensurePushWorker();
  if (!registration) return;

  const open = await registration.getNotifications({ tag: payload.tag });
  if (open.length) return;

  await registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: payload.url,
      category: payload.category,
      tag: payload.tag,
    },
  });
}

async function fire(prefs: ResolvedPrefs, payload: NotifPayload, dedupeKey: string) {
  if (!prefs[payload.category]) return;
  if (alreadySent(dedupeKey)) return;
  if (payload.category !== "meds" && inQuietHours(prefs)) return;

  markSent(dedupeKey);
  await deliver(payload);
}

const GRACE = 90;

function dueNow(target: string, at = new Date()): boolean {
  const difference = nowMinutes(at) - minutesOf(target);
  return difference >= 0 && difference <= GRACE;
}

/**
 * Keeps the existing foreground/local fallback behavior. Remote push is
 * generated independently by send-due-push and therefore also works after the
 * app and browser UI have been closed.
 */
export async function runNotificationChecks(now = new Date()) {
  const data = getBixbo();
  const prefs = notifPrefs(data);
  if (!prefs.enabled) return;
  if (permissionState() === "denied") return;

  const today = todayKey();
  const log = data.dayLogs[today];
  const loggedToday = hasAnyLog(log);

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

      const ovulation = addDays(next.start, -14);
      const dayBeforeOvulation = addDays(ovulation, -1);
      if (prefs.ovulation && today === dayBeforeOvulation && dueNow("09:00", now)) {
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

  if (prefs.sleep && dueNow(prefs.sleepTime, now)) {
    await fire(
      prefs,
      {
        title: "Time to wind down",
        body: "A consistent sleep routine can make your health patterns easier to read.",
        url: "/",
        tag: `sleep-${today}`,
        category: "sleep",
      },
      `sleep:${today}`,
    );
  }

  if (prefs.hydration) {
    const start = minutesOf(prefs.hydrationStart);
    const end = minutesOf(prefs.hydrationEnd);
    const step = Math.max(1, prefs.hydrationEveryHours) * 60;
    const current = nowMinutes(now);

    if (current >= start && current <= end) {
      const slotIndex = Math.floor((current - start) / step);
      const slotTime = start + slotIndex * step;
      if (current - slotTime <= 30) {
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

  if (prefs.appointments) {
    const appointments = [
      ...(data.pregnancy?.appointments ?? []).map((appointment) => ({
        id: String(appointment.id),
        title: appointment.title || "Appointment",
        date: appointment.date,
        time: appointment.time,
        kind: "appointment" as const,
      })),
      ...(data.postpartum?.visits ?? []).map((appointment) => ({
        id: String(appointment.id),
        title: appointment.title || "Appointment",
        date: appointment.date,
        time: appointment.time,
        kind: "appointment" as const,
      })),
      ...(data.events ?? []).map((event) => ({
        id: `event:${String(event.id)}`,
        title: event.title || "Event",
        date: event.startDate,
        // Calendar-event reminders are intentionally anchored to 09:00 so an
        // event on the 18th produces its main reminder on the 17th at 09:00.
        time: "09:00",
        kind: "event" as const,
      })),
    ];

    for (const appointment of appointments) {
      if (!appointment?.date) continue;
      const startsAt = appointmentIso(appointment.date, appointment.time);
      if (!startsAt) continue;
      const difference = (new Date(startsAt).getTime() - now.getTime()) / 60_000;

      const windows = appointment.kind === "event"
        ? [{ label: "tomorrow", minutes: 24 * 60, key: "24h" }]
        : [
            { label: "tomorrow", minutes: 24 * 60, key: "24h" },
            { label: "in 2 hours", minutes: 120, key: "2h" },
          ];

      for (const window of windows) {
        if (difference <= window.minutes && difference > window.minutes - 30) {
          const prefix = appointment.kind === "event" ? "event" : "appt";
          await fire(
            prefs,
            {
              title: appointment.kind === "event" ? "Event tomorrow" : `Appointment ${window.label}`,
              body: `${appointment.title}.`,
              url: "/",
              tag: `${prefix}-${appointment.id}-${window.key}`,
              category: "appointments",
            },
            `${prefix}:${appointment.id}:${window.key}`,
          );
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Runtime hook                                                        */
/* ------------------------------------------------------------------ */

const TICK_MS = 60_000;
const SERVER_SYNC_MS = 5 * 60_000;

export function useNotificationRuntime() {
  useEffect(() => {
    if (typeof window === "undefined" || !pushSupported()) return;

    let stopped = false;
    let lastServerSync = 0;
    let stateSyncTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;

      await runNotificationChecks().catch(logPushError);

      if (Notification.permission === "granted" && Date.now() - lastServerSync >= SERVER_SYNC_MS) {
        lastServerSync = Date.now();
        await syncPushState().catch(logPushError);
      }
    };

    if (Notification.permission === "granted" && notifPrefs(getBixbo()).enabled) {
      void ensurePushWorker();
      void syncPushState().catch(logPushError);
    }

    const first = window.setTimeout(() => void tick(), 4000);
    const interval = window.setInterval(() => void tick(), TICK_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };

    const onOnline = () => {
      void flushPendingPushDeletes().finally(() => void syncPushState().catch(logPushError));
    };

    // Keep the server reminder snapshot current shortly after any relevant
    // local change instead of waiting for the five-minute interval.
    const unsubscribeStore = subscribeBixboChanges((_nextData, reason) => {
      if (reason !== "local") return;
      if (stateSyncTimer) window.clearTimeout(stateSyncTimer);
      stateSyncTimer = setTimeout(() => {
        stateSyncTimer = null;
        void syncPushState().catch(logPushError);
      }, 800);
    });

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      if (stateSyncTimer) window.clearTimeout(stateSyncTimer);
      unsubscribeStore();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Permission prompt                                                   */
/* ------------------------------------------------------------------ */

const SNOOZE_DAYS = 5;

export function loggedDayCount(data: BixboData): number {
  return Object.values(data.dayLogs ?? {}).filter((log) => hasAnyLog(log)).length;
}

export function shouldAskForPermission(data: BixboData): boolean {
  if (!pushSupported()) return false;
  if (Notification.permission !== "default") return false;
  const prefs = notifPrefs(data);
  if (prefs.promptAnswered) return false;
  if (prefs.promptSnoozedAt && Date.now() - prefs.promptSnoozedAt < SNOOZE_DAYS * 86_400_000) {
    return false;
  }
  return loggedDayCount(data) >= 3;
}

export function snoozePermissionPrompt() {
  saveNotifPrefs({ promptSnoozedAt: Date.now() });
}
