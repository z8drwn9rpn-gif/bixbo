import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProductAnalyticsEvent =
  | "onboarding_started"
  | "onboarding_completed"
  | "account_created"
  | "first_log_created"
  | "feature_area_opened";

const ALLOWED_EVENTS = new Set<ProductAnalyticsEvent>([
  "onboarding_started",
  "onboarding_completed",
  "account_created",
  "first_log_created",
  "feature_area_opened",
]);

/**
 * Privacy-first product telemetry.
 *
 * The event table intentionally has no user id, route/path, free-form payload,
 * health fields, note contents, medication names, device fingerprint or session id.
 * Events are opt-in: callers must pass the user's current analytics preference.
 *
 * Signup-start/signup-complete events are deliberately not emitted before the
 * user has had a chance to opt in. Billing/subscription events must not be added
 * until a real billing flow exists and has its own release/privacy review.
 */
export async function trackProductEvent(event: ProductAnalyticsEvent, analyticsEnabled: boolean): Promise<void> {
  if (!analyticsEnabled || !ALLOWED_EVENTS.has(event)) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  const db = supabase as unknown as SupabaseClient;
  const { error } = await db.from("product_analytics_events").insert({ event_name: event });
  if (error) console.warn("[BIXBO analytics] Event was not recorded.", error.message);
}
