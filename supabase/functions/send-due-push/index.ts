/**
 * BIXBO send-due-push
 *
 * Invoked by pg_cron. Replays each user's reminder snapshot in their own
 * timezone and sends reminders that became due in the current minute window.
 * The database-held cron secret protects this function because verify_jwt is
 * intentionally disabled for the scheduler endpoint.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

import {
  assertVapidKeyPair,
  corsHeaders,
  json,
  readVapidConfig,
  sendWebPush,
  timingSafeEqual,
  type PushPayload,
  type PushTarget,
  type VapidConfig,
} from "./webpush.ts";

type Prefs = {
  enabled?: boolean;
  meds?: boolean;
  period?: boolean;
  ovulation?: boolean;
  dailyLog?: boolean;
  symptom?: boolean;
  appointments?: boolean;
  mood?: boolean;
  hydration?: boolean;
  sleep?: boolean;
  sleepTime?: string;
  quietHoursEnabled?: boolean;
  dailyLogTime?: string;
  symptomTime?: string;
  moodTime?: string;
  hydrationStart?: string;
  hydrationEnd?: string;
  hydrationEveryHours?: number;
  quietStart?: string;
  quietEnd?: string;
};

type MedicationSnooze = {
  date: string;
  slot: string;
  remindAt: string;
};

type Snapshot = {
  timezone?: string;
  localDate?: string;
  prefs?: Prefs;
  medications?: { id: string; name: string; dose?: string; times: string[] }[];
  takenMedicationSlots?: string[];
  medicationSnoozes?: MedicationSnooze[];
  hasLogToday?: boolean;
  nextPeriodStart?: string | null;
  showCyclePredictions?: boolean;
  appointments?: {
    id: string;
    title: string;
    startsAt: string;
    eventDate?: string;
    eventTime?: string;
  }[];
};

type Reminder = {
  dedupeKey: string;
  category: string;
  payload: PushPayload;
  urgent?: boolean;
  medicationAction?: { date: string; slot: string };
};

type LocalNow = { date: string; minutes: number; hhmm: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MED_ACTION_CONTEXT = "bixbo-med-action-v1";

type Db = ReturnType<typeof createClient>;

function localNow(timezone: string, now: Date): LocalNow {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
    const hour = get("hour") === "24" ? "00" : get("hour");
    const minute = get("minute");
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      minutes: Number(hour) * 60 + Number(minute),
      hhmm: `${hour}:${minute}`,
    };
  } catch {
    if (timezone !== "UTC") return localNow("UTC", now);
    return {
      date: now.toISOString().slice(0, 10),
      minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
      hhmm: now.toISOString().slice(11, 16),
    };
  }
}

function toMinutes(hhmm: string | undefined, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }
  return hour * 60 + minute;
}

function isDue(nowMinutes: number, targetMinutes: number, windowMinutes = 2): boolean {
  if (targetMinutes < 0) return false;
  const diff = nowMinutes - targetMinutes;
  return diff >= 0 && diff < windowMinutes;
}

function inQuietHours(prefs: Prefs, nowMinutes: number): boolean {
  if (prefs.quietHoursEnabled !== true) return false;
  const start = toMinutes(prefs.quietStart, 22 * 60);
  const end = toMinutes(prefs.quietEnd, 7 * 60);
  if (start === end) return false;
  return start < end ? nowMinutes >= start && nowMinutes < end : nowMinutes >= start || nowMinutes < end;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const base = Date.UTC(year, (month || 1) - 1, day || 1);
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

function medicationBySlot(snapshot: Snapshot, slot: string) {
  const separator = slot.lastIndexOf("@");
  if (separator <= 0) return undefined;
  const medId = slot.slice(0, separator);
  return (snapshot.medications ?? []).find((med) => med.id === medId);
}

function planReminders(userId: string, snapshot: Snapshot, now: Date): Reminder[] {
  const prefs = snapshot.prefs ?? {};
  if (!prefs.enabled) return [];

  const local = localNow(snapshot.timezone || "UTC", now);
  const reminders: Reminder[] = [];
  const key = (parts: string[]) => [userId, ...parts].join("|");

  if (prefs.meds !== false) {
    const taken = new Set(snapshot.takenMedicationSlots ?? []);
    const staleSnapshot = snapshot.localDate !== local.date;

    for (const med of snapshot.medications ?? []) {
      for (const time of med.times ?? []) {
        if (!isDue(local.minutes, toMinutes(time, -1))) continue;
        const slot = `${med.id}@${time}`;
        if (!staleSnapshot && taken.has(slot)) continue;
        reminders.push({
          dedupeKey: key(["meds", local.date, slot]),
          category: "meds",
          urgent: true,
          medicationAction: { date: local.date, slot },
          payload: {
            title: "Time for your medication",
            body: med.dose ? `${med.name} — ${med.dose}` : med.name,
            url: "/",
            tag: `meds-${slot}`,
            category: "meds",
            requireInteraction: true,
          },
        });
      }
    }

    for (const snooze of snapshot.medicationSnoozes ?? []) {
      if (snooze.date !== local.date || taken.has(snooze.slot)) continue;
      const remindAt = Date.parse(snooze.remindAt);
      if (!Number.isFinite(remindAt)) continue;
      const delay = now.getTime() - remindAt;
      if (delay < 0 || delay >= 2 * 60_000) continue;
      const med = medicationBySlot(snapshot, snooze.slot);
      if (!med) continue;
      reminders.push({
        dedupeKey: key(["meds-snooze", snooze.date, snooze.slot, snooze.remindAt]),
        category: "meds",
        urgent: true,
        medicationAction: { date: snooze.date, slot: snooze.slot },
        payload: {
          title: "Medication reminder",
          body: med.dose ? `${med.name} — ${med.dose}` : med.name,
          url: "/",
          tag: `meds-${snooze.slot}`,
          category: "meds",
          requireInteraction: true,
        },
      });
    }
  }

  const nextPeriod = snapshot.showCyclePredictions === false ? null : snapshot.nextPeriodStart;
  if (nextPeriod && prefs.period !== false && isDue(local.minutes, 9 * 60) && addDays(local.date, 1) === nextPeriod) {
    reminders.push({
      dedupeKey: key(["period", nextPeriod]),
      category: "period",
      payload: {
        title: "Period expected tomorrow",
        body: "A good moment to get what you need ready.",
        url: "/",
        tag: "period",
        category: "period",
      },
    });
  }

  if (nextPeriod && prefs.ovulation !== false && isDue(local.minutes, 9 * 60)) {
    const ovulation = addDays(nextPeriod, -14);
    if (addDays(local.date, 1) === ovulation) {
      reminders.push({
        dedupeKey: key(["ovulation", ovulation]),
        category: "ovulation",
        payload: {
          title: "Ovulation window starts tomorrow",
          body: "Your fertile days are predicted to begin.",
          url: "/insights",
          tag: "ovulation",
          category: "ovulation",
        },
      });
    }
  }

  const nothingLoggedToday = snapshot.localDate === local.date && snapshot.hasLogToday === false;
  if (prefs.dailyLog !== false && nothingLoggedToday && isDue(local.minutes, toMinutes(prefs.dailyLogTime, 20 * 60))) {
    reminders.push({
      dedupeKey: key(["dailyLog", local.date]),
      category: "dailyLog",
      payload: {
        title: "Nothing logged today",
        body: "Take a few seconds to note how the day went.",
        url: "/",
        tag: "daily-log",
        category: "dailyLog",
      },
    });
  }

  if (prefs.symptom !== false && nothingLoggedToday && isDue(local.minutes, toMinutes(prefs.symptomTime, 18 * 60))) {
    reminders.push({
      dedupeKey: key(["symptom", local.date]),
      category: "symptom",
      payload: {
        title: "How are you feeling?",
        body: "Log pain, energy or anything that stood out.",
        url: "/",
        tag: "symptom",
        category: "symptom",
      },
    });
  }

  if (prefs.mood === true && isDue(local.minutes, toMinutes(prefs.moodTime, 20 * 60 + 30))) {
    reminders.push({
      dedupeKey: key(["mood", local.date]),
      category: "mood",
      payload: {
        title: "Evening mood check-in",
        body: "How has your mood been today?",
        url: "/",
        tag: "mood",
        category: "mood",
      },
    });
  }

  if (prefs.sleep === true && isDue(local.minutes, toMinutes(prefs.sleepTime, 22 * 60 + 30), 5)) {
    reminders.push({
      dedupeKey: key(["sleep", local.date]),
      category: "sleep",
      payload: {
        title: "Sleep reminder",
        body: "Time to wind down and get ready for sleep.",
        url: "/",
        tag: `bixbo-sleep-${local.date}`,
        category: "sleep",
      },
    });
  }

  if (prefs.hydration === true) {
    const start = toMinutes(prefs.hydrationStart, 9 * 60);
    const end = toMinutes(prefs.hydrationEnd, 20 * 60);
    const every = Math.min(12, Math.max(1, Number(prefs.hydrationEveryHours) || 3)) * 60;
    for (let at = start; at <= end; at += every) {
      if (!isDue(local.minutes, at)) continue;
      reminders.push({
        dedupeKey: key(["hydration", local.date, String(at)]),
        category: "hydration",
        payload: {
          title: "Water break",
          body: "A glass of water now would be good.",
          url: "/",
          tag: "hydration",
          category: "hydration",
        },
      });
    }
  }

  if (prefs.appointments !== false) {
    for (const appointment of snapshot.appointments ?? []) {
      const isCalendarEvent = appointment.id.startsWith("event:");

      if (isCalendarEvent && appointment.eventDate) {
        if (addDays(local.date, 1) === appointment.eventDate && isDue(local.minutes, 9 * 60)) {
          reminders.push({
            dedupeKey: key(["event", appointment.id, "day-before", appointment.eventDate]),
            category: "appointments",
            payload: {
              title: "Event tomorrow",
              body: appointment.title || "Event",
              url: "/",
              tag: `event-${appointment.id}-tomorrow`,
              category: "appointments",
            },
          });
        }

        const eventMinutes = toMinutes(appointment.eventTime, -1);
        if (
          appointment.eventTime &&
          local.date === appointment.eventDate &&
          isDue(local.minutes, eventMinutes)
        ) {
          reminders.push({
            dedupeKey: key(["event", appointment.id, "start", appointment.eventDate, appointment.eventTime]),
            category: "appointments",
            payload: {
              title: "Event now",
              body: appointment.title || "Event",
              url: "/",
              tag: `event-${appointment.id}-start`,
              category: "appointments",
            },
          });
        }
        continue;
      }

      // Legacy event snapshots still carry only the synthetic 09:00 startsAt.
      // Keep their existing day-before reminder until the client syncs the new
      // eventDate/eventTime fields. Appointment behavior is unchanged.
      const startsAt = Date.parse(appointment.startsAt);
      if (!Number.isFinite(startsAt)) continue;
      const minutesUntil = Math.round((startsAt - now.getTime()) / 60000);
      const leads = isCalendarEvent ? [24 * 60] : [24 * 60, 120];

      for (const lead of leads) {
        if (minutesUntil > lead || minutesUntil <= lead - 2) continue;
        const kind = isCalendarEvent ? "event" : "appointment";
        reminders.push({
          dedupeKey: key([kind, appointment.id, String(lead)]),
          category: "appointments",
          payload: {
            title: isCalendarEvent ? "Event tomorrow" : lead === 120 ? "Appointment in 2 hours" : "Appointment tomorrow",
            body: appointment.title || (isCalendarEvent ? "Event" : "Appointment"),
            url: "/",
            tag: `${kind}-${appointment.id}`,
            category: "appointments",
          },
        });
      }
    }
  }

  return inQuietHours(prefs, local.minutes) ? reminders.filter((reminder) => reminder.urgent) : reminders;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signMedicationAction(userId: string, date: string, slot: string): Promise<string> {
  const secret = String(
    Deno.env.get("BIXBO_VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
  ).trim();
  if (!secret) throw new Error("Medication actions require the configured VAPID private key.");

  const encoder = new TextEncoder();
  const claims = {
    v: 1,
    u: userId,
    d: date,
    s: slot,
    exp: Math.floor(Date.now() / 1000) + 36 * 60 * 60,
  };
  const payload = bytesToB64url(encoder.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${MED_ACTION_CONTEXT}:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(signature))}`;
}

async function deliver(
  db: Db,
  config: VapidConfig,
  userId: string,
  devices: PushTarget[],
  reminder: Reminder,
): Promise<{ delivered: number; removed: number }> {
  const { error: claimError } = await db.from("push_delivery_log").insert({
    user_id: userId,
    dedupe_key: reminder.dedupeKey,
    category: reminder.category,
    status: "pending",
    attempts: 1,
  });
  if (claimError) return { delivered: 0, removed: 0 };

  let payload = reminder.payload;
  if (reminder.medicationAction) {
    try {
      const token = await signMedicationAction(
        userId,
        reminder.medicationAction.date,
        reminder.medicationAction.slot,
      );
      payload = {
        ...reminder.payload,
        medicationAction: {
          ...reminder.medicationAction,
          token,
          actionUrl: `${SUPABASE_URL}/functions/v1/medication-reminder-action`,
        },
      } as PushPayload;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not sign medication action.";
      console.error("push medication action signing failed:", message);
    }
  }

  let delivered = 0;
  let removed = 0;
  let lastError: string | undefined;
  for (const device of devices) {
    const result = await sendWebPush(config, device, payload);
    if (result.ok) delivered += 1;
    else {
      lastError = result.error;
      if (result.gone) {
        await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
        removed += 1;
      }
    }
  }

  await db
    .from("push_delivery_log")
    .update({ status: delivered > 0 ? "sent" : "failed", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("dedupe_key", reminder.dedupeKey);
  if (delivered === 0 && lastError) console.warn("push delivery failed", reminder.category, lastError);
  return { delivered, removed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: storedCronSecret, error: cronSecretError } = await db.rpc("get_push_cron_secret_for_service");
  const expectedSecret = String(
    storedCronSecret ?? Deno.env.get("PUSH_CRON_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "",
  ).trim();
  const providedSecret = (req.headers.get("x-cron-secret") ?? "").trim();

  if (cronSecretError) console.error("send-due-push cron secret read failed:", cronSecretError.message);
  if (!expectedSecret || !timingSafeEqual(expectedSecret, providedSecret)) {
    return json({ ok: false, error: "Forbidden." }, 403);
  }

  const startedAt = Date.now();
  const now = new Date();
  let config: VapidConfig;
  try {
    config = readVapidConfig();
    await assertVapidKeyPair(config);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "VAPID configuration is invalid.";
    console.error("send-due-push configuration error:", message);
    return json({ ok: false, error: message }, 500);
  }

  const { data: profiles, error: profileError } = await db
    .from("push_reminder_profiles")
    .select("user_id, timezone, profile");
  if (profileError) return json({ ok: false, error: profileError.message }, 500);

  let considered = 0;
  let sent = 0;
  let delivered = 0;
  let removed = 0;

  for (const row of profiles ?? []) {
    const userId = String(row.user_id);
    const snapshot = { ...((row.profile ?? {}) as Snapshot) };
    if (!snapshot.timezone) snapshot.timezone = String(row.timezone || "UTC");

    const reminders = planReminders(userId, snapshot, now);
    considered += reminders.length;
    if (!reminders.length) continue;

    const { data: deviceRows, error: deviceError } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (deviceError || !deviceRows?.length) continue;
    const devices = deviceRows as unknown as PushTarget[];

    for (const reminder of reminders) {
      const result = await deliver(db, config, userId, devices, reminder);
      if (result.delivered > 0) sent += 1;
      delivered += result.delivered;
      removed += result.removed;
    }
  }

  return json({
    ok: true,
    profiles: profiles?.length ?? 0,
    considered,
    reminders: sent,
    delivered,
    removedDevices: removed,
    ms: Date.now() - startedAt,
  });
});