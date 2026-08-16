import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Period and Couple runtime regressions", () => {
  it("always renders actual logged Period on the calendar when cycle tracking is visible", () => {
    const source = read("src/components/MonthCalendar.tsx");
    expect(source).toContain("periodColorVar(periodLevel)");
    expect(source).toMatch(/periodColor:\s*cycleTrackingHidden\s*\?\s*null\s*:\s*\(periodColorVar\(periodLevel\)\s*\?\?\s*[a-zA-Z]+\)/);
  });

  it("uses the later first-comparison day for both Couple directions", () => {
    const source = read("src/features/couple/CouplePage.tsx");
    expect(source).toContain("const myFirstComparisonDay");
    expect(source).toContain("const comparisonStartDay");
    expect(source).toContain("myFirstComparisonDay > partnerFirstComparisonDay");
  });

  it("opens Couple Settings from the no-partner card instead of redirecting to Profile", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const route = read("src/routes/couple.tsx");
    expect(page).toContain("onOpenSettings");
    expect(page).not.toContain('to="/settings"');
    expect(route).toContain("<CouplePage onOpenSettings={openSettings} />");
  });

  it("keeps Couple Settings in the app header and shows the cycle calendar only for a partner", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const route = read("src/routes/couple.tsx");
    const calendar = read("src/features/couple/BlueberrySection.tsx");
    expect(route).not.toContain("fixed right-4");
    expect(page).toContain('stickyHeader={false} right={<button type="button" onClick={onOpenSettings}');
    expect(page.indexOf("<BlueberrySection partner={partner}")).toBeGreaterThan(page.indexOf('activeTab === "overview"'));
    expect(page).not.toContain("<BlueberrySection partner={view}");
    expect(calendar).toContain("const cycle = partner.cycle");
    expect(calendar).not.toContain("useBixbo");
  });
});
