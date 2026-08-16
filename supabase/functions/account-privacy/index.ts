import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CURRENT_TERMS_VERSION = "2026-08-16";
const CURRENT_PRIVACY_VERSION = "2026-08-16";
const CURRENT_HEALTH_CONSENT_VERSION = "2026-08-16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type PrivacyAction =
  | "export-cloud-data"
  | "accept-current-legal"
  | "complete-onboarding"
  | "withdraw-health-consent"
  | "grant-health-consent"
  | "delete-account";

type PrivacyBody = {
  action?: unknown;
  termsAccepted?: unknown;
  privacyAcknowledged?: unknown;
  healthConsent?: unknown;
  termsVersion?: unknown;
  privacyVersion?: unknown;
  healthConsentVersion?: unknown;
};

function isPrivacyAction(value: unknown): value is PrivacyAction {
  return value === "export-cloud-data"
    || value === "accept-current-legal"
    || value === "complete-onboarding"
    || value === "withdraw-health-consent"
    || value === "grant-health-consent"
    || value === "delete-account";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, error: "Sign in to manage your account." }, 401);
  }

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json({ ok: false, error: "Your session has expired." }, 401);

  let body: PrivacyBody = {};
  try {
    body = (await req.json()) as PrivacyBody;
  } catch {
    return json({ ok: false, error: "Request body must be JSON." }, 400);
  }
  if (!isPrivacyAction(body.action)) return json({ ok: false, error: "Unknown action." }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = data.user.id;

  if (body.action === "export-cloud-data") {
    const [
      profileResult,
      dataResult,
      sharedResult,
      backupsResult,
      legalResult,
      partnerLinksResult,
      reminderResult,
      subscriptionsResult,
      deliveryResult,
    ] = await Promise.all([
      admin.from("profiles").select("id,display_name,gender,pairing_code,created_at,updated_at").eq("id", userId).maybeSingle(),
      admin.from("user_data").select("data,updated_at").eq("user_id", userId).maybeSingle(),
      admin.from("partner_shared_data").select("data,updated_at").eq("user_id", userId).maybeSingle(),
      admin.from("user_backups").select("id,created_at,schema_version,data").eq("user_id", userId).order("created_at", { ascending: true }),
      admin.from("user_legal_consents").select("terms_version,terms_accepted_at,privacy_version,privacy_acknowledged_at,health_consent_version,health_consent_at,health_consent_withdrawn_at,onboarding_completed_at,updated_at").eq("user_id", userId).maybeSingle(),
      admin.from("partner_links").select("a,b,created_at").or(`a.eq.${userId},b.eq.${userId}`),
      admin.from("push_reminder_profiles").select("timezone,profile,created_at,updated_at").eq("user_id", userId).maybeSingle(),
      // Web Push auth material (p256dh/auth) is deliberately excluded from portability output.
      admin.from("push_subscriptions").select("id,endpoint,expiration_time,user_agent,created_at,updated_at").eq("user_id", userId),
      admin.from("push_delivery_log").select("id,category,status,attempts,created_at,updated_at").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);

    const results = [profileResult, dataResult, sharedResult, backupsResult, legalResult, partnerLinksResult, reminderResult, subscriptionsResult, deliveryResult];
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("account-privacy export failed", failed.error.message);
      return json({ ok: false, error: "The cloud data export could not be prepared." }, 500);
    }

    return json({
      ok: true,
      exportedAt: new Date().toISOString(),
      account: {
        id: userId,
        email: data.user.email ?? null,
        createdAt: data.user.created_at,
        lastSignInAt: data.user.last_sign_in_at ?? null,
      },
      cloud: {
        profile: profileResult.data,
        diary: dataResult.data,
        partnerSharedProjection: sharedResult.data,
        backups: backupsResult.data ?? [],
        legalConsents: legalResult.data,
        partnerLinks: partnerLinksResult.data ?? [],
        reminderProfile: reminderResult.data,
        pushSubscriptions: subscriptionsResult.data ?? [],
        pushDeliveryLog: deliveryResult.data ?? [],
      },
      analyticsAttribution: "Product analytics are deliberately stored without a BIXBO user ID and therefore are not joined to this account export.",
    });
  }

  if (body.action === "accept-current-legal") {
    if (
      body.termsAccepted !== true
      || body.privacyAcknowledged !== true
      || body.healthConsent !== true
      || body.termsVersion !== CURRENT_TERMS_VERSION
      || body.privacyVersion !== CURRENT_PRIVACY_VERSION
      || body.healthConsentVersion !== CURRENT_HEALTH_CONSENT_VERSION
    ) {
      return json({ ok: false, error: "Current Terms, Privacy Policy and explicit health-data consent are all required." }, 400);
    }

    const now = new Date().toISOString();
    const { error: consentError } = await admin.from("user_legal_consents").upsert({
      user_id: userId,
      terms_version: CURRENT_TERMS_VERSION,
      terms_accepted_at: now,
      privacy_version: CURRENT_PRIVACY_VERSION,
      privacy_acknowledged_at: now,
      health_consent_version: CURRENT_HEALTH_CONSENT_VERSION,
      health_consent_at: now,
      health_consent_withdrawn_at: null,
      updated_at: now,
    }, { onConflict: "user_id" });

    if (consentError) {
      console.error("account-privacy current legal acceptance failed", consentError.message);
      return json({ ok: false, error: "The legal acceptance could not be recorded." }, 500);
    }
    return json({ ok: true, legalAccepted: true, healthConsentVersion: CURRENT_HEALTH_CONSENT_VERSION });
  }

  if (body.action === "complete-onboarding") {
    const now = new Date().toISOString();
    const { data: consent, error: onboardingError } = await admin
      .from("user_legal_consents")
      .update({ onboarding_completed_at: now, updated_at: now })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (onboardingError) {
      console.error("account-privacy onboarding completion failed", onboardingError.message);
      return json({ ok: false, error: "Onboarding completion could not be recorded." }, 500);
    }
    if (!consent) return json({ ok: false, error: "No legal-consent record exists for this account." }, 409);
    return json({ ok: true, onboardingCompleted: true });
  }

  if (body.action === "withdraw-health-consent") {
    const now = new Date().toISOString();
    const { data: consent, error: consentError } = await admin
      .from("user_legal_consents")
      .update({ health_consent_withdrawn_at: now, updated_at: now })
      .eq("user_id", userId)
      .is("health_consent_withdrawn_at", null)
      .select("user_id")
      .maybeSingle();

    if (consentError) {
      console.error("account-privacy consent withdrawal failed", consentError.message);
      return json({ ok: false, error: "Health-data consent could not be withdrawn." }, 500);
    }
    if (!consent) return json({ ok: false, error: "Health-data consent is already withdrawn or unavailable." }, 409);

    const cleanup = await Promise.all([
      admin.from("partner_links").delete().or(`a.eq.${userId},b.eq.${userId}`),
      admin.from("partner_shared_data").delete().eq("user_id", userId),
      admin.from("user_backups").delete().eq("user_id", userId),
      admin.from("user_data").delete().eq("user_id", userId),
      admin.from("push_delivery_log").delete().eq("user_id", userId),
      admin.from("push_reminder_profiles").delete().eq("user_id", userId),
      admin.from("push_subscriptions").delete().eq("user_id", userId),
      admin.from("profiles").update({ gender: null }).eq("id", userId),
    ]);
    const cleanupFailure = cleanup.find((result) => result.error);
    if (cleanupFailure?.error) {
      console.error("account-privacy withdrawal cleanup failed", cleanupFailure.error.message);
      return json({
        ok: false,
        consentWithdrawn: true,
        cloudProcessingBlocked: true,
        error: "Consent was withdrawn, but some cloud cleanup needs another attempt.",
      }, 500);
    }

    return json({
      ok: true,
      consentWithdrawn: true,
      cloudHealthDataDeleted: true,
      cloudProcessingBlocked: true,
      localDataPreserved: true,
    });
  }

  if (body.action === "grant-health-consent") {
    if (body.healthConsentVersion !== CURRENT_HEALTH_CONSENT_VERSION) {
      return json({ ok: false, error: "The current health-consent version is required." }, 400);
    }

    const now = new Date().toISOString();
    const { data: consent, error: consentError } = await admin
      .from("user_legal_consents")
      .update({
        health_consent_version: CURRENT_HEALTH_CONSENT_VERSION,
        health_consent_at: now,
        health_consent_withdrawn_at: null,
        updated_at: now,
      })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (consentError) {
      console.error("account-privacy re-consent failed", consentError.message);
      return json({ ok: false, error: "Health-data consent could not be recorded." }, 500);
    }
    if (!consent) return json({ ok: false, error: "No legal-consent record exists for this account." }, 409);

    return json({ ok: true, healthConsentGranted: true, healthConsentVersion: CURRENT_HEALTH_CONSENT_VERSION });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("account-privacy delete failed", deleteError.message);
    return json({ ok: false, error: "The cloud account could not be deleted." }, 500);
  }

  return json({ ok: true, deleted: true, localDataPreserved: true });
});
