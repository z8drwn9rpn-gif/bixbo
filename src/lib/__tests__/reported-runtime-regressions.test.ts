import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("reported runtime regressions", () => {
  it("keeps logged Period visible independently of the admin calendar surface", () => {
    const source = read("src/components/MonthCalendar.tsx");
    expect(source).toContain('periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor)');
    expect(source).not.toContain('!isRegistrySurfaceEnabled(data, "period", "calendar") ? null');
  });

  it("uses a symmetric Couple comparison start day", () => {
    const source = read("src/routes/couple.tsx");
    expect(source).toContain("const myFirstComparisonDay");
    expect(source).toContain("const comparisonStartDay");
    expect(source).toContain("myFirstComparisonDay > partnerFirstComparisonDay");
  });

  it("makes the Notes rich editor explicitly iOS-focusable", () => {
    const source = read("src/routes/notes-editor.tsx");
    expect(source).toContain('role="textbox"');
    expect(source).toContain('inputMode="text"');
    expect(source).toContain("editorRef.current?.focus()");
  });

  it("has a route-editor fallback for Admin Customize", () => {
    const source = read("src/components/GlobalAdminModeController.tsx");
    expect(source).toContain("data-bixbo-admin-page-opener");
    for (const path of [
      "src/components/AdminEditOverlay.tsx",
      "src/components/CoupleAdminEditOverlay.tsx",
      "src/components/HakAdminEditOverlay.tsx",
      "src/components/UniversalAdminPageEditor.tsx",
    ]) {
      expect(read(path)).toContain("data-bixbo-admin-page-opener");
    }
  });
});
