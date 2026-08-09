/**
 * BIXBO send-due-push
 *
 * Invoked every minute by pg_cron. For each user it replays their reminder
 * snapshot in their own timezone, works out which reminders fall due in this
 * minute, and delivers them via Web Push. `push_delivery_log.dedupe_key` is a
 * unique key, so a reminder is only ever sent once even if cron double-fires.
 *
 * Auth: verify_jwt = false, protected by a database-held cron secret.
 * The secret is read through a service-role-only RPC so it never needs to be
 * committed to source control.
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

/* ------------------------------------------------------------------ */
/* Snapshot shape mirrored from src/lib/notifications.ts               */
/* ------------------------------------------------------------------ */

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
  dailyLogTime?: string;
  symptomTime?: string;
  moodTime?: string;
  hydrationStart?: string;
  hydrationEnd?: string;
  hydrationEveryHours?: number;
  quietStart?: string;
  quietEnd?: string;
};

type Snapshot = {
  timezone?: string;
  localDate?: string;
  prefs?: Prefs;
  medications?: { id: string; name: string; dose?: string; times: string[] }[];
  takenMedicationSlots?: string[];
  hasLogToday?: boolean;
  nextPeriodStart?: string | null;
  showCyclePredictions?: boolean;
  appointments?: { id: string; title: string; startsAt: string }[];
};

type Reminder = {
  dedupeKey: string;
  category: string;
  payload: PushPayload;
  /** Medication reminders are the only category allowed inside quiet hours. */
  urgent?: boolean;
};

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

type LocalNow = { date: string; minutes: number; hhmm: string };

function localNow(timezone: string, now: Date): LocalNow {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    return localNow("UTC", now);
  }

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(hour) * 60 + Number(minute),
    hhmm: `${hour}:${minute}`,
  };
}

function toMinutes(hhmm: string | undefined, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!match) return fallback;
  const value = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(value) ? value : fallback;
}

/** True when `target` falls inside the minute window that just elapsed. */
function isDue(nowMinutes: number, target: number, windowMinutes = 2): boolean {
  const diff = nowMinutes - target;
  return diff >= 0 && diff < windowMinutes;
}

function inQuietHours(prefs: Prefs, nowMinutes: number): boolean {
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

/* ------------------------------------------------------------------ */
/* Reminder planning                                                   */
/* ------------------------------------------------------------------ */

function planReminders(userId: string, snapshot: Snapshot, now: Date): Reminder[] {
  const prefs = snapshot.prefs ?? {};
  if (!prefs.enabled) return [];

  const timezone = snapshot.timezone || "UTC";
  const local = localNow(timezone, now);
  const reminders: Reminder[] = [];
  const key = (parts: string[]) => [userId, ...parts].join("|");

  /* Medication ------------------------------------------------------ */
  if (prefs.meds !== false) {
    const taken = new Set(snapshot.takenMedicationSlots ?? []);
    // Slot state only counts when the snapshot describes the current local day.
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
  }

  /* Cycle ----------------------------------------------------------- */
  const nextPeriod = snapshot.showCyclePredictions === false ? null : snapshot.nextPeriodStart;

  if (nextPeriod && prefs.period !== false && isDue(local.minutes, 9 * 60)) {
    if (addDays(local.date, 1) === nextPeriod) {
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
  }

  if (nextPeriod && prefs.ovulation !== false && isDue(local.minutes, 9 * 60)) {
    // Ovulation is estimated 14 days before the next predicted period.
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

  /* Daily nudges ---------------------------------------------------- */
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

  /* Hydration ------------------------------------------------------- */
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

  /* Appointments ---------------------------------------------------- */
  if (prefs.appointments !== false) {
    for (const appointment of snapshot.appointments ?? []) {
      const startsAt = Date.parse(appointment.startsAt);
      if (!Number.isFinite(startsAt)) continue;

      const minutesUntil = Math.round((startsAt - now.getTime()) / 60000);
      for (const lead of [24 * 60, 120]) {
        if (minutesUntil > lead || minutesUntil <= lead - 2) continue;
        reminders.push({
          dedupeKey: key(["appointment", appointment.id, String(lead)]),
          category: "appointments",
          payload: {
            title: lead === 120 ? "Appointment in 2 hours" : "Appointment tomorrow",
            body: appointment.title || "Appointment",
            url: "/",
            tag: `appointment-${appointment.id}`,
            category: "appointments",
          },
        });
      }
    }
  }

  const quiet = inQuietHours(prefs, local.minutes);
  return quiet ? reminders.filter((reminder) => reminder.urgent) : reminders;
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Db = ReturnType<typeof createClient>;

async function deliver(
  db: Db,
  config: VapidConfig,
  userId: string,
  devices: PushTarget[],
  reminder: Reminder,
): Promise<{ delivered: number; removed: number }> {
  // Claim first: the unique dedupe_key makes concurrent/retried cron runs safe.
  const { error: claimError } = await db.from("push_delivery_log").insert({
    user_id: userId,
    dedupe_key: reminder.dedupeKey,
    category: reminder.category,
    status: "pending",
    attempts: 1,
  });
  if (claimError) return { delivered: 0, removed: 0 };

  let delivered = 0;
  let removed = 0;
  let lastError: string | undefined;

  for (const device of devices) {
    const result = await sendWebPush(config, device, reminder.payload);
    if (result.ok) {
      delivered += 1;
      continue;
    }

    lastError = result.error;
    if (result.gone) {
      await db.from("push_subscriptions").delete().eq("endpoint", device.endpoint);
      removed += 1;
    }
  }

  await db
    .from("push_delivery_log")
    .update({
      status: delivered > 0 ? "sent" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("dedupe_key", reminder.dedupeKey);

  if (delivered === 0 && lastError) {
    console.warn("push delivery failed", reminder.category, lastError);
  }

  return { delivered, removed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // pg_cron and this function read the same secret from the database. The RPC
  // is executable only by service_role, so browser clients cannot retrieve it.
  const { data: storedCronSecret, error: cronSecretError } = await db.rpc(
    "get_push_cron_secret_for_service",
  );

  // Environment fallback keeps deployments compatible during the one-time
  // migration window. Once the migration is applied, the DB value is used.
  const expectedSecret = String(
    storedCronSecret ?? Deno.env.get("PUSH_CRON_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "",
  ).trim();
  const providedSecret = (req.headers.get("x-cron-secret") ?? "").trim();

  if (cronSecretError) {
    console.error("send-due-push cron secret read failed:", cronSecretError.message);
  }

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
  if (profileError) {
    console.error("send-due-push profile read failed:", profileError.message);
    return json({ ok: false, error: profileError.message }, 500);
  }

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
