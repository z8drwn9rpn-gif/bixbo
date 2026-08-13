import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Period and Couple runtime regressions", () => {
  it("always renders actual logged Period on the calendar when cycle tracking is visible", () => {
    const source = read("src/components/MonthCalendar.tsx");
    expect(source).toContain('periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor)');
  });

  it("uses the later first-comparison day for both Couple directions", () => {
    const source = read("src/features/couple/CouplePage.tsx");
    expect(source).toContain("const myFirstComparisonDay");
    expect(source).toContain("const comparisonStartDay");
    expect(source).toContain("myFirstComparisonDay > partnerFirstComparisonDay");
  });
});
