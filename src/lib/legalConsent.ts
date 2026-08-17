import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const TERMS_VERSION = "2026-08-16";
export const PRIVACY_VERSION = "2026-08-16";
export const HEALTH_CONSENT_VERSION = "2026-08-16";
export const CLOUD_HEALTH_CONSENT_CHANGED_EVENT = "bixbo:cloud-health-consent-changed";

const PENDING_KEY = "bixbo:pending-legal-consent:v1";
const ONBOARDING_KEY = "bixbo:onboarding-completed:v1";
const CLOUD_CONSENT_WITHDRAWN_KEY = "bixbo:cloud-health-consent-withdrawn:v1";

export type SignupLegalConsent = {
  termsAccepted: true;
  privacyAcknowledged: true;
  healthConsent: true;
  termsVersion: string;
  privacyVersion: string;
  healthConsentVersion: string;
  stagedAt: string;
};

export type CloudHealthConsentState = "active" | "withdrawn" | "missing" | "signed-out";

type LegalWriteAction = "accept-current-legal" | "complete-onboarding";
type LegalWriteResult = { ok?: boolean; error?: string } & Record<string, unknown>;

let cloudHealthConsentStateInFlight: Promise<CloudHealthConsentState> | null = null;

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function notifyCloudHealthConsentChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLOUD_HEALTH_CONSENT_CHANGED_EVENT));
}

async function invokeLegalWrite(action: LegalWriteAction, extra: Record<string, unknown> = {}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("account-privacy", {
    body: { action, ...extra },
  });
  if (error) throw error;
  const result = (data ?? {}) as LegalWriteResult;
  if (!result.ok) throw new Error(typeof result.error === "string" ? result.error : "Legal state could not be recorded.");
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

export function localCloudHealthConsentWithdrawn(): boolean {
  return browserStorage()?.getItem(CLOUD_CONSENT_WITHDRAWN_KEY) === "true";
}

export function markLocalCloudHealthConsentWithdrawn(): void {
  browserStorage()?.setItem(CLOUD_CONSENT_WITHDRAWN_KEY, "true");
  notifyCloudHealthConsentChanged();
}

export function clearLocalCloudHealthConsentWithdrawn(): void {
  browserStorage()?.removeItem(CLOUD_CONSENT_WITHDRAWN_KEY);
  notifyCloudHealthConsentChanged();
}

export async function markOnboardingCompleted(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) {
    await invokeLegalWrite("complete-onboarding");
  }
  browserStorage()?.setItem(ONBOARDING_KEY, "true");
}

async function readCloudHealthConsentState(): Promise<CloudHealthConsentState> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return "signed-out";

  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db
    .from("user_legal_consents")
    .select("terms_version,privacy_version,health_consent_version,health_consent_withdrawn_at")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return "missing";

  const versionsCurrent = data.terms_version === TERMS_VERSION
    && data.privacy_version === PRIVACY_VERSION
    && data.health_consent_version === HEALTH_CONSENT_VERSION;
  if (!versionsCurrent) return "missing";
  return data.health_consent_withdrawn_at ? "withdrawn" : "active";
}

/**
 * Fail-closed cloud consent state used by auth/privacy controls.
 * Local BIXBO data remains available regardless of this state.
 *
 * Multiple auth/runtime listeners can request the same state during one startup
 * burst. Share only the currently executing lookup so those listeners cannot
 * fan out identical Supabase reads; once it settles, the next caller performs
 * a fresh legal-state check.
 */
export function cloudHealthConsentState(): Promise<CloudHealthConsentState> {
  if (cloudHealthConsentStateInFlight) return cloudHealthConsentStateInFlight;

  const request = readCloudHealthConsentState();
  cloudHealthConsentStateInFlight = request;
  void request.finally(() => {
    if (cloudHealthConsentStateInFlight === request) cloudHealthConsentStateInFlight = null;
  }).catch(() => undefined);
  return request;
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

function isCurrentConsent(pending: SignupLegalConsent): boolean {
  return pending.termsVersion === TERMS_VERSION
    && pending.privacyVersion === PRIVACY_VERSION
    && pending.healthConsentVersion === HEALTH_CONSENT_VERSION;
}

/**
 * Finalizes only a genuinely missing consent record. A previously recorded row
 * always wins over persistent signup metadata, especially after withdrawal, so
 * signing in can never silently re-grant health-data consent.
 */
export async function finalizePendingLegalConsent(): Promise<boolean> {
  const localPending = readPending();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;

  const db = supabase as unknown as SupabaseClient;
  const { data: existing, error: existingError } = await db
    .from("user_legal_consents")
    .select("onboarding_completed_at,health_consent_withdrawn_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    clearPendingLegalConsent();
    return !onboardingCompleted() && !existing.onboarding_completed_at;
  }

  const metadataPending = parseConsent(data.user.user_metadata?.bixbo_legal_consent);
  const pending = localPending ?? metadataPending;
  if (!pending) return false;

  if (!isCurrentConsent(pending)) {
    clearPendingLegalConsent();
    return false;
  }

  await invokeLegalWrite("accept-current-legal", {
    termsAccepted: true,
    privacyAcknowledged: true,
    healthConsent: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    healthConsentVersion: HEALTH_CONSENT_VERSION,
  });

  const { data: legalState, error: stateError } = await db
    .from("user_legal_consents")
    .select("onboarding_completed_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (stateError) throw stateError;

  clearPendingLegalConsent();
  clearLocalCloudHealthConsentWithdrawn();
  return !onboardingCompleted() && !legalState?.onboarding_completed_at;
}
