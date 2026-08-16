import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProductAnalyticsEvent =
  | "onboarding_started"
  | "onboarding_completed"
  | "account_created";

const ALLOWED_EVENTS = new Set<ProductAnalyticsEvent>([
  "onboarding_started",
  "onboarding_completed",
  "account_created",
]);

/**
 * Privacy-first product telemetry.
 *
 * The event table intentionally has no user id, route/path, free-form payload,
 * health fields, note contents, medication names, device fingerprint or session id.
 * Events are also opt-in: callers must pass the user's existing analytics preference.
 */
export async function trackProductEvent(event: ProductAnalyticsEvent, analyticsEnabled: boolean): Promise<void> {
  if (!analyticsEnabled || !ALLOWED_EVENTS.has(event)) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  const db = supabase as unknown as SupabaseClient;
  const { error } = await db.from("product_analytics_events").insert({ event_name: event });
  if (error) console.warn("[BIXBO analytics] Event was not recorded.", error.message);
}
