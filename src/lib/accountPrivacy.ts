import { supabase } from "@/integrations/supabase/client";
import { HEALTH_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "./legalConsent";

type PrivacyAction =
  | "export-cloud-data"
  | "accept-current-legal"
  | "withdraw-health-consent"
  | "grant-health-consent"
  | "delete-account";

type PrivacyResult = Record<string, unknown> & { ok?: boolean; error?: string };

async function invokePrivacy(action: PrivacyAction, extra: Record<string, unknown> = {}): Promise<PrivacyResult> {
  const { data, error } = await supabase.functions.invoke("account-privacy", {
    body: { action, ...extra },
  });
  if (error) throw error;
  const result = (data ?? {}) as PrivacyResult;
  if (!result.ok) throw new Error(typeof result.error === "string" ? result.error : "Privacy action failed.");
  return result;
}

export async function downloadCloudDataExport(): Promise<void> {
  const result = await invokePrivacy("export-cloud-data");
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bixbo-cloud-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function acceptCurrentLegalTerms(): Promise<PrivacyResult> {
  return invokePrivacy("accept-current-legal", {
    termsAccepted: true,
    privacyAcknowledged: true,
    healthConsent: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    healthConsentVersion: HEALTH_CONSENT_VERSION,
  });
}

export async function withdrawCloudHealthConsent(): Promise<PrivacyResult> {
  return invokePrivacy("withdraw-health-consent");
}

export async function grantCloudHealthConsent(): Promise<PrivacyResult> {
  return invokePrivacy("grant-health-consent", { healthConsentVersion: HEALTH_CONSENT_VERSION });
}

export async function deleteCloudAccount(): Promise<PrivacyResult> {
  return invokePrivacy("delete-account");
}
