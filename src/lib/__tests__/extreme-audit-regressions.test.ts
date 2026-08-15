import { describe, expect, it } from "vitest";
import { avgDayPain } from "@/lib/domain/pain";
import { resolveScheduledDose } from "@/lib/medicationAdherence";
import { dayBowelSymptoms } from "@/lib/patterns";
import { hasAnyLog, type Med } from "@/lib/storage";
import { safeInternalNext } from "@/routes/auth";
import { assertBrowserSafeSupabaseKey } from "@/integrations/supabase/client";

describe("extreme audit semantic regressions", () => {
  it("does not double count symptom-only Pain follow-ups", () => {
    expect(avgDayPain({ pain: [
      { score: 7 },
      { score: 7, entryKind: "symptom-update" },
      { score: 3 },
    ] })).toBe(5);
  });

  it("treats custom/admin-only days as logged days", () => {
    expect(hasAnyLog({ customLogs: { custom: [{ id: "x", time: "10:00", values: {} }] } })).toBe(true);
    expect(hasAnyLog({ adminFields: { field: [{ id: "x", time: "10:00", value: "yes" }] } })).toBe(true);
  });

  it("excludes urinary-only records from bowel analytics but preserves Bristol Type 0", () => {
    expect(dayBowelSymptoms({ bowel: [{ id: "u", time: "09:00", bristol: -2, urinaryOnly: true }] })).toBeNull();
    expect(dayBowelSymptoms({ bowel: [{ id: "b", time: "09:00", bristol: 0 }] })).toBe(1);
  });

  it("uses time-aware medication eligibility for historical and current doses", () => {
    const med: Med = { id: "m", name: "M", times: ["21:00"], dose: "1" };
    const historical = resolveScheduledDose(med, "2026-08-14", "21:00", {}, {}, new Date("2026-08-15T10:00:00"));
    const futureToday = resolveScheduledDose(med, "2026-08-15", "21:00", {}, {}, new Date("2026-08-15T10:00:00"));
    expect(historical.eligible).toBe(true);
    expect(futureToday.eligible).toBe(false);
  });

  it("rejects external/backslash auth next routes", () => {
    expect(safeInternalNext("/settings?tab=privacy#lock")).toBe("/settings?tab=privacy#lock");
    expect(safeInternalNext("//evil.example")).toBe("");
    expect(safeInternalNext("/\\evil.example")).toBe("");
    expect(safeInternalNext("/ok\nhttps://evil.example")).toBe("");
  });

  it("fails closed if a Supabase secret key is configured in the browser", () => {
    expect(() => assertBrowserSafeSupabaseKey("sb_secret_should-never-be-client-side")).toThrow(/secret key/i);
    expect(() => assertBrowserSafeSupabaseKey("sb_publishable_public")).not.toThrow();
  });
});
