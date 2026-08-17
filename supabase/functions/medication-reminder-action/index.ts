/**
 * BIXBO medication-reminder-action
 *
 * Public (JWT-less) endpoint used only by signed Web Push action buttons.
 * Each token is HMAC-bound to one user/date/medication slot and expires quickly.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

type Claims = {
  v?: number;
  u?: string;
  d?: string;
  s?: string;
  exp?: number;
};

type Body = {
  token?: unknown;
  action?: unknown;
  snoozeMinutes?: unknown;
};

type MedicationSnooze = {
  date: string;
  slot: string;
  remindAt: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MED_ACTION_CONTEXT = "bixbo-med-action-v1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function verifyToken(token: string): Promise<Claims | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const secret = String(
    Deno.env.get("BIXBO_VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
  ).trim();
  if (!secret) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${MED_ACTION_CONTEXT}:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  let valid = false;
  try {
    valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(signature), encoder.encode(payload));
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as Claims;
    if (claims.v !== 1) return null;
    if (!claims.u || !claims.d || !claims.s || !claims.exp) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(claims.d)) return null;
    if (!/^[^@]+@\d{1,2}:\d{2}$/.test(claims.s)) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, error: "Request body must be JSON." }, 400);
  }

  const action = text(body.action);
  if (action !== "taken" && action !== "remind-later") {
    return json({ ok: false, error: "Unsupported action." }, 400);
  }

  const claims = await verifyToken(text(body.token));
  if (!claims?.u || !claims.d || !claims.s) {
    return json({ ok: false, error: "Invalid or expired medication action." }, 401);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: readError } = await db
    .from("push_reminder_profiles")
    .select("profile, timezone")
    .eq("user_id", claims.u)
    .maybeSingle();
  if (readError) return json({ ok: false, error: readError.message }, 500);
  if (!row) return json({ ok: false, error: "Reminder profile was not found." }, 404);

  const profile = row.profile && typeof row.profile === "object"
    ? { ...(row.profile as Record<string, unknown>) }
    : {};
  const taken = new Set(
    Array.isArray(profile.takenMedicationSlots)
      ? profile.takenMedicationSlots.filter((value): value is string => typeof value === "string")
      : [],
  );
  const snoozes: MedicationSnooze[] = Array.isArray(profile.medicationSnoozes)
    ? profile.medicationSnoozes.filter((value): value is MedicationSnooze => {
        if (!value || typeof value !== "object") return false;
        const item = value as Record<string, unknown>;
        return typeof item.date === "string" && typeof item.slot === "string" && typeof item.remindAt === "string";
      })
    : [];

  let nextSnoozes = snoozes.filter((item) => !(item.date === claims.d && item.slot === claims.s));
  let remindAt: string | undefined;

  if (action === "taken") {
    if (profile.localDate === claims.d) taken.add(claims.s);
  } else {
    const requested = Number(body.snoozeMinutes);
    const minutes = Number.isFinite(requested) ? Math.min(60, Math.max(5, Math.round(requested))) : 10;
    remindAt = new Date(Date.now() + minutes * 60_000).toISOString();
    nextSnoozes = [...nextSnoozes, { date: claims.d, slot: claims.s, remindAt }];
  }

  const nextProfile = {
    ...profile,
    takenMedicationSlots: [...taken],
    medicationSnoozes: nextSnoozes,
  };

  const { error: updateError } = await db
    .from("push_reminder_profiles")
    .update({ profile: nextProfile, updated_at: new Date().toISOString() })
    .eq("user_id", claims.u);
  if (updateError) return json({ ok: false, error: updateError.message }, 500);

  return json({
    ok: true,
    action,
    date: claims.d,
    slot: claims.s,
    remindAt: remindAt ?? null,
  });
});
