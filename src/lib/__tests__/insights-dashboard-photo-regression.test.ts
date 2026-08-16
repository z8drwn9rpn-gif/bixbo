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

  test("keeps photo-specific quick insights and compact meds dots", () => {
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const hot = readFileSync("src/features/insights/HotFlashesInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");
    for (const source of [pain, hot, time, meds]) expect(source).toContain("QuickInsights");
    expect(meds).toContain("h-3.5 w-3.5 rounded-full");
    expect(suk).toContain("Intimacy moments");
    expect(suk).toContain("Best day:");
  });
});
