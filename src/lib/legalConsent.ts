import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const TERMS_VERSION = "2026-08-16";
export const PRIVACY_VERSION = "2026-08-16";
export const HEALTH_CONSENT_VERSION = "2026-08-16";

const PENDING_KEY = "bixbo:pending-legal-consent:v1";
const ONBOARDING_KEY = "bixbo:onboarding-completed:v1";

type PendingLegalConsent = {
  termsAccepted: true;
  privacyAcknowledged: true;
  healthConsent: true;
  stagedAt: string;
};

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function stagePendingLegalConsent(): void {
  const storage = browserStorage();
  if (!storage) return;
  const pending: PendingLegalConsent = {
    termsAccepted: true,
    privacyAcknowledged: true,
    healthConsent: true,
    stagedAt: new Date().toISOString(),
  };
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
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

function readPending(): PendingLegalConsent | null {
  const raw = browserStorage()?.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingLegalConsent>;
    if (value.termsAccepted !== true || value.privacyAcknowledged !== true || value.healthConsent !== true) return null;
    return value as PendingLegalConsent;
  } catch {
    return null;
  }
}

/**
 * Persists a staged signup consent once Supabase has established the user session.
 * Returns true only when this browser came through the new-account consent flow,
 * which is used to route that account to onboarding without changing existing sign-ins.
 */
export async function finalizePendingLegalConsent(): Promise<boolean> {
  const pending = readPending();
  if (!pending) return false;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;

  const db = supabase as unknown as SupabaseClient;
  const now = new Date().toISOString();
  const { error: writeError } = await db.from("user_legal_consents").upsert(
    {
      user_id: data.user.id,
      terms_version: TERMS_VERSION,
      terms_accepted_at: now,
      privacy_version: PRIVACY_VERSION,
      privacy_acknowledged_at: now,
      health_consent_version: HEALTH_CONSENT_VERSION,
      health_consent_at: now,
      health_consent_withdrawn_at: null,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (writeError) throw writeError;

  clearPendingLegalConsent();
  return !onboardingCompleted();
}
