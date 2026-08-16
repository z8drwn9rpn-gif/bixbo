import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";
import { PRIVACY_VERSION, TERMS_VERSION, HEALTH_CONSENT_VERSION, signupLegalConsentMetadata } from "../legalConsent";
import { BIXBO_BOTTOM_NAV_SHADOW, BIXBO_NAV_ARTWORK_FILTER, BIXBO_NAV_LOG_ARTWORK_FILTER } from "../designTokens";
import mcp from "../mcp";
import { toolDescriptors } from "../mcp/core";

const read = (path: string) => readFileSync(path, "utf8");

describe("release hardening contracts", () => {
  it("versions all three legal acknowledgements independently", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(HEALTH_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("carries the exact accepted versions in email-signup metadata", () => {
    const consent = signupLegalConsentMetadata("2026-08-16T08:00:00.000Z");
    expect(consent).toEqual({
      termsAccepted: true,
      privacyAcknowledged: true,
      healthConsent: true,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      healthConsentVersion: HEALTH_CONSENT_VERSION,
      stagedAt: "2026-08-16T08:00:00.000Z",
    });
    expect(read("src/routes/auth.tsx")).toContain("bixbo_legal_consent: legalConsent");
  });

  it("keeps product analytics free of health payload fields and navigation paths", () => {
    const source = read("src/lib/productAnalytics.ts");
    expect(source).not.toContain("pain_score");
    expect(source).not.toContain("medication_name");
    expect(source).not.toContain("note_text");
    expect(source).not.toContain("window.location");
    expect(source).not.toContain("user_id");
    expect(source).toContain('"first_log_created"');
    expect(source).toContain('"feature_area_opened"');
  });

  it("enforces withdrawn health consent and bounded analytics retention in SQL", () => {
    const migration = read("supabase/migrations/20260816201500_release_privacy_enforcement.sql");
    expect(migration).toContain("private.bixbo_health_consent_active");
    expect(migration).toContain("health_consent_withdrawn_at is null");
    expect(migration).toContain("Linked partner reads shared data");
    expect(migration).toContain("interval '90 days'");
    expect(migration).toContain("bixbo-product-analytics-retention");
  });

  it("provides authenticated cloud export, withdrawal, re-consent and deletion without exporting push auth secrets", () => {
    const edge = read("supabase/functions/account-privacy/index.ts");
    expect(edge).toContain('"export-cloud-data"');
    expect(edge).toContain('"accept-current-legal"');
    expect(edge).toContain('"withdraw-health-consent"');
    expect(edge).toContain('"grant-health-consent"');
    expect(edge).toContain('"delete-account"');
    expect(edge).toContain('select("id,endpoint,expiration_time,user_agent,created_at,updated_at")');
    expect(edge).not.toContain('select("id,endpoint,p256dh');
  });

  it("keeps first-run onboarding customizable instead of enabling every health category", () => {
    const onboarding = read("src/routes/onboarding.tsx");
    expect(onboarding).toContain("pain: false");
    expect(onboarding).toContain("tetany: false");
    expect(onboarding).toContain("UnitPreferences");
    expect(onboarding).toContain("Optional reproductive setup");
    expect(onboarding).toContain("Reminder preferences");
  });

  it("keeps shell and desktop navigation raw colours out of component source", () => {
    const shell = read("src/components/AppShell.tsx");
    const sideNav = read("src/components/SideNav.tsx");
    for (const source of [shell, sideNav]) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(source).not.toContain("rgba(");
    }
    expect(shell).toContain("BIXBO_ROUNDED_DISPLAY_SHADOW");
    expect(sideNav).toContain("BIXBO_SIDE_NAV_SHADOW");
    expect(sideNav).toContain("bg-tint");
  });

  it("keeps every existing BIXBO MCP tool after replacing the external SDK", () => {
    expect(toolDescriptors(mcp).map((tool) => tool.name)).toEqual([
      "get_day_log", "list_recent_days", "add_day_note", "add_todo", "list_notes", "create_note", "list_medications",
    ]);
  });

  it("centralizes BottomNav shadows without changing their existing values", () => {
    expect(BIXBO_BOTTOM_NAV_SHADOW).toContain("rgba(45,58,26,.28)");
    expect(BIXBO_NAV_LOG_ARTWORK_FILTER).toContain("rgba(52,67,30,0.20)");
    expect(BIXBO_NAV_ARTWORK_FILTER).toContain("rgba(52,67,30,0.18)");
  });
});
