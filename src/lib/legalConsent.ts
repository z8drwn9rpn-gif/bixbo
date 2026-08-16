import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const TERMS_VERSION = "2026-08-16";
export const PRIVACY_VERSION = "2026-08-16";
export const HEALTH_CONSENT_VERSION = "2026-08-16";

const PENDING_KEY = "bixbo:pending-legal-consent:v1";
const ONBOARDING_KEY = "bixbo:onboarding-completed:v1";

export type SignupLegalConsent = {
  termsAccepted: true;
  privacyAcknowledged: true;
  healthConsent: true;
  termsVersion: string;
  privacyVersion: string;
  healthConsentVersion: string;
  stagedAt: string;
};

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function signupLegalConsentMetadata(stagedAt = new Date().toISOString()): SignupLegalConsent {
  return {
    termsAccepted: true,
    privacyAcknowledged: true,
    healthConsent: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    healthConsentVersion: HEALTH_CONSENT_VERSION,
    stagedAt,
  };
}

export function stagePendingLegalConsent(): SignupLegalConsent {
  const pending = signupLegalConsentMetadata();
  browserStorage()?.setItem(PENDING_KEY, JSON.stringify(pending));
  return pending;
}

export function clearPendingLegalConsent(): void {
  browserStorage()?.removeItem(PENDING_KEY);
}

export function onboardingCompleted(): boolean {
  return browserStorage()?.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingCompleted(): void {
  browserStorage()?.setItem(ONBOARDING_KEY, "true");
}

function parseConsent(value: unknown): SignupLegalConsent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SignupLegalConsent>;
  if (
    candidate.termsAccepted !== true ||
    candidate.privacyAcknowledged !== true ||
    candidate.healthConsent !== true ||
    typeof candidate.termsVersion !== "string" || !candidate.termsVersion ||
    typeof candidate.privacyVersion !== "string" || !candidate.privacyVersion ||
    typeof candidate.healthConsentVersion !== "string" || !candidate.healthConsentVersion ||
    typeof candidate.stagedAt !== "string" || !candidate.stagedAt
  ) return null;
  return candidate as SignupLegalConsent;
}

function readPending(): SignupLegalConsent | null {
  const raw = browserStorage()?.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return parseConsent(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Persists signup consent once Supabase has established the user session.
 * The same consent snapshot is also sent as signup metadata so email
 * confirmation on another device does not lose the accepted versions.
 * Existing sign-ins without signup consent metadata are left untouched.
 */
export async function finalizePendingLegalConsent(): Promise<boolean> {
  const localPending = readPending();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;

  const metadataPending = parseConsent(data.user.user_metadata?.bixbo_legal_consent);
  const pending = localPending ?? metadataPending;
  if (!pending) return false;

  const db = supabase as unknown as SupabaseClient;
  const now = new Date().toISOString();
  const acceptedAt = Number.isFinite(Date.parse(pending.stagedAt)) ? pending.stagedAt : now;
  const { error: writeError } = await db.from("user_legal_consents").upsert(
    {
      user_id: data.user.id,
      terms_version: pending.termsVersion,
      terms_accepted_at: acceptedAt,
      privacy_version: pending.privacyVersion,
      privacy_acknowledged_at: acceptedAt,
      health_consent_version: pending.healthConsentVersion,
      health_consent_at: acceptedAt,
      health_consent_withdrawn_at: null,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (writeError) throw writeError;

  clearPendingLegalConsent();
  return !onboardingCompleted();
}
