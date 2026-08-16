import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Insights dashboard photo-matched cards", () => {
  test("wires the approved card set into Insights", () => {
    const route = readFileSync("src/routes/insights.tsx", "utf8");
    expect(route).toContain("PainInsightsCard");
    expect(route).toContain("HotFlashesInsightsCard");
    expect(route).toContain("TimeOfDayInsightsCard");
    expect(route).toContain("MedsAdherenceInsightsCard");
    expect(route).toContain("SukSukInsightsCard");
    expect(route).toContain('["sex", "ŠukŠuk"]');
  });

  test("moves SukSuk out of the HAK calendar", () => {
    const hak = readFileSync("src/components/home/BirthControlCard.tsx", "utf8");
    expect(hak).not.toContain("<SukSukPeriodChart");
    expect(hak).not.toContain('from "@/components/home/SukSukPeriodChart"');
  });

  test("keeps quick insights, BIXBO icons, compact meds dots, and one-line tiles", () => {
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const hot = readFileSync("src/features/insights/HotFlashesInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");
    const bowel = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");
    const primitives = readFileSync("src/features/insights/InsightDashboardPrimitives.tsx", "utf8");

    for (const source of [pain, hot, time, meds]) expect(source).toContain("QuickInsights");
    expect(primitives).toContain("InsightGlyph");
    expect(meds).toContain("String.fromCodePoint(0x1f48a)");
    expect(meds).toContain("h-3 w-3 rounded-full");
    expect(suk).toContain("days with intimacy");
    expect(suk).toContain("Best day:");
    expect(bowel).toContain("h-[150px]");
    expect(primitives).toContain("whitespace-nowrap text-[15px]");
  });

  test("uses the Heatmap control and chart text scale across new Insights cards", () => {
    const heatmap = readFileSync("src/features/insights/YearHealthHeatmap.tsx", "utf8");
    const primitives = readFileSync("src/features/insights/InsightDashboardPrimitives.tsx", "utf8");
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const hot = readFileSync("src/features/insights/HotFlashesInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");

    expect(heatmap).toContain("grid h-8 w-full grid-cols-3 rounded-xl");
    expect(primitives).toContain("grid h-8 w-full grid-cols-3 rounded-xl");
    expect(heatmap).toContain("text-[10px] font-semibold");
    expect(primitives).toContain("text-[10px] font-semibold");
    expect(pain).toContain('h-[150px]');
    expect(hot).toContain('text-[10px]');
    expect(time).toContain('h-[150px]');
  });

  test("reserves Blueberry wording for cycle UI, not general Quick Insights", () => {
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const hot = readFileSync("src/features/insights/HotFlashesInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");

    for (const source of [pain, hot, time, meds, suk]) expect(source).not.toMatch(/blueberry/i);
    expect(pain).toContain("Pain was lower early in the period");
    expect(pain).toContain("Pain was higher early in the period");
    expect(time).toContain("No tetany episodes in this period");
    expect(time).toContain("No panic attacks in this period");
    expect(meds).toContain("No scheduled doses in this period");
    expect(suk).toContain("No intimacy moments were logged in this period.");
  });
});
