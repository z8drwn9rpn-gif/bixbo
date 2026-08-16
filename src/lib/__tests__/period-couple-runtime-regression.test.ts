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

  it("keeps Couple Settings in the app header and shows the cycle calendar only for the chosen partner account", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const route = read("src/routes/couple.tsx");
    const calendar = read("src/features/couple/BlueberrySection.tsx");
    expect(route).not.toContain("fixed right-4");
    expect(page).toContain("stickyHeader={false}");
    expect(page).toContain("onClick={onOpenSettings}");
    expect(page.indexOf("<BlueberrySection")).toBeGreaterThan(page.indexOf('activeTab === "overview"'));
    expect(page).not.toContain("<BlueberrySection partner={view}");
    expect(page).toContain('session?.user.email?.trim().toLowerCase() === "jakubikm02@gmail.com"');
    expect(page).toContain("canViewPartnerCycle && partner.gender !== \"male\"");
    expect(calendar).toContain("const cycle = partner.cycle");
    expect(calendar).not.toContain("useBixbo");
  });

  it("uses selected Couple names in Health Similarity and saves the current name for partner sharing", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const overview = read("src/features/couple/CoupleOverviewPanel.tsx");
    const settings = read("src/features/couple/CoupleSettings.tsx");
    expect(page).toContain("myName={myCoupleName}");
    expect(page).toContain("partnerName={partnerName}");
    expect(overview).toContain("{myName} + {partnerName}");
    expect(settings).toContain("updateProfile({ display_name: nextName })");
    expect(settings).toContain('t("Your Couple name")');
  });

  it("keeps Health partner-only with today visible and earlier entries expandable", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const health = read("src/features/couple/PartnerHealthDashboard.tsx");
    expect(page).toContain("<PartnerHealthDashboard");
    expect(page).not.toContain("My shared details");
    expect(page).toContain("visibleDay={visibleHealthDay}");
    expect(health).toContain('t("Show earlier entries")');
    expect(health).toContain("<details");
    expect(health).toContain("currentPain");
    expect(health).toContain("olderPain");
  });

  it("shows symptom-only follow-ups inside the complete Couple pain record without counting them as new pain", () => {
    const page = read("src/features/couple/CouplePage.tsx");
    const health = read("src/features/couple/PartnerHealthDashboard.tsx");
    const utils = read("src/features/couple/coupleUtils.ts");
    expect(page).toContain("output.push({ ...pain, dateKey: day })");
    expect(page).toContain('const myPain = collectPain(view.dayLogs).filter((entry) => entry.entryKind !== "symptom-update")');
    expect(page).toContain('filter((pain) => pain.entryKind !== "symptom-update")');
    expect(health).toContain('candidate.entryKind === "symptom-update" && candidate.sourcePainId === entry.id');
    expect(health).toContain("<SymptomUpdateCard");
    expect(health).toContain("entry.nauseaTriggers");
    expect(health).toContain("entry.nauseaSymptoms");
    expect(health).toContain("entry.nauseaHelped");
    expect(health).toContain("entry.hotFlashesNote");
    expect(health).toContain("entry.headacheMed");
    expect(health).toContain("entry.stress");
    expect(health).toContain("entry.bodyBattery");
    expect(utils).toContain('entry.entryKind !== "symptom-update"');
  });
});
