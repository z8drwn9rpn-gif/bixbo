/**
 * BIXBO push-subscription
 *
 * Authenticated endpoint used by the app to register a device for Web Push,
 * remove it again, keep the reminder profile in sync, and send a real test
 * push. It never trusts a user_id from the request body: the caller identity
 * always comes from the verified Supabase JWT.
 *
 * Actions: upsert | delete | sync-profile | status | test
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

import {
  assertVapidKeyPair,
  corsHeaders,
  json,
  readVapidConfig,
  sendWebPush,
  type PushTarget,
} from "./webpush.ts";

type SubscriptionJson = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown } | null;
};

type Body = {
  action?: unknown;
  subscription?: SubscriptionJson | null;
  endpoint?: unknown;
  userAgent?: unknown;
  profile?: Record<string, unknown> | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, error: "Sign in to manage notifications." }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ ok: false, error: "Your session has expired. Sign in again." }, 401);
  }
  const userId = userData.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, error: "Request body must be JSON." }, 400);
  }

  const action = text(body.action) || "upsert";
  const db = admin();

  try {
    /* ---------------------------------------------------------- */
    if (action === "upsert") {
      const subscription = body.subscription ?? null;
      const endpoint = text(subscription?.endpoint);
      const p256dh = text(subscription?.keys?.p256dh);
      const auth = text(subscription?.keys?.auth);

      if (!endpoint || !p256dh || !auth) {
        return json({ ok: false, error: "The push subscription is incomplete." }, 400);
      }
      try {
        new URL(endpoint);
      } catch {
        return json({ ok: false, error: "The push endpoint is not a valid URL." }, 400);
      }

      const expiration = typeof subscription?.expirationTime === "number" ? subscription.expirationTime : null;

      // The endpoint is globally unique. If this device previously belonged to
      // another account, hand it over instead of failing the unique index.
      const { error: takeoverError } = await db
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .neq("user_id", userId);
      if (takeoverError) throw takeoverError;

      const { error } = await db.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          expiration_time: expiration,
          user_agent: text(body.userAgent).slice(0, 400) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;

      return json({ ok: true, action, endpoint });
    }

    /* ---------------------------------------------------------- */
    if (action === "delete") {
      const endpoint = text(body.endpoint) || text(body.subscription?.endpoint);
      if (!endpoint) return json({ ok: false, error: "An endpoint is required." }, 400);

      // Scoped to the caller: nobody can remove another user's device.
      const { error } = await db
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .eq("user_id", userId);
      if (error) throw error;

      return json({ ok: true, action, endpoint });
    }

    /* ---------------------------------------------------------- */
    if (action === "sync-profile") {
      const profile = body.profile;
      if (!profile || typeof profile !== "object") {
        return json({ ok: false, error: "A reminder profile is required." }, 400);
      }

      const timezone = text((profile as { timezone?: unknown }).timezone) || "UTC";

      const { error } = await db.from("push_reminder_profiles").upsert(
        {
          user_id: userId,
          timezone,
          profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      return json({ ok: true, action, timezone });
    }

    /* ---------------------------------------------------------- */
    if (action === "status") {
      const [{ count, error: countError }, { data: profileRow, error: profileError }] = await Promise.all([
        db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        db.from("push_reminder_profiles").select("timezone, updated_at").eq("user_id", userId).maybeSingle(),
      ]);
      if (countError) throw countError;
      if (profileError) throw profileError;

      return json({
        ok: true,
        action,
        devices: count ?? 0,
        timezone: profileRow?.timezone ?? null,
        profileUpdatedAt: profileRow?.updated_at ?? null,
      });
    }

    /* ---------------------------------------------------------- */
    if (action === "test") {
      const config = readVapidConfig();
      await assertVapidKeyPair(config);

      const only = text(body.endpoint);
      let query = db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
      if (only) query = query.eq("endpoint", only);

      const { data: rows, error } = await query;
      if (error) throw error;

      const targets = (rows ?? []) as PushTarget[];
      if (!targets.length) {
        return json({ ok: false, error: "This device is not registered for notifications yet." }, 409);
      }

      let delivered = 0;
      let failed = 0;
      let removed = 0;
      const errors: string[] = [];

      for (const target of targets) {
        const result = await sendWebPush(config, target, {
          title: "BIXBO 🌶️",
          body: "Test notification — reminders are working on this device.",
          url: "/notifications",
          tag: "bixbo-test",
          category: "test",
        });

        if (result.ok) {
          delivered += 1;
          continue;
        }

        failed += 1;
        if (result.error) errors.push(result.error);

        if (result.gone) {
          await db.from("push_subscriptions").delete().eq("endpoint", target.endpoint).eq("user_id", userId);
          removed += 1;
        }
      }

      return json({
        ok: delivered > 0,
        action,
        attempted: targets.length,
        delivered,
        failed,
        removed,
        error: delivered > 0 ? undefined : errors[0] || "The push service rejected every device.",
      });
    }

    return json({ ok: false, error: `Unknown action "${action}".` }, 400);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unexpected server error.";
    console.error("push-subscription failed", action, message);
    return json({ ok: false, error: message }, 500);
  }
});
