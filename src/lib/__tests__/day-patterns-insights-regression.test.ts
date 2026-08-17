import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Insights Day patterns", () => {
  it("renders Sleep, Weight and Body temperature below Time of Day Pattern", () => {
    const route = readFileSync("src/routes/insights.tsx", "utf8");
    const card = readFileSync("src/features/insights/DayPatternsInsightsCard.tsx", "utf8");

    expect(route).toContain('import { DayPatternsInsightsCard } from "@/features/insights/DayPatternsInsightsCard"');
    expect(route).toContain('data-bixbo-jump-label={t("Day patterns")}');
    expect(route.indexOf('id="TimeOfDayInsightsCard"')).toBeLessThan(route.indexOf('id="DayPatternsInsightsCard"'));
    expect(route.indexOf('id="DayPatternsInsightsCard"')).toBeLessThan(route.indexOf('id="MedsAdherenceInsightsCard"'));

    expect(card).toContain('title={t("Sleep")}');
    expect(card).toContain('title={t("Weight")}');
    expect(card).toContain('title={t("Body temperature")}');
    expect(card).toContain('data-bixbo-chart-mark="bar"');
    expect(card).toContain('filter: "saturate(1.5) contrast(1.08)"');
    expect(card).toContain('<Ico e="🌙"');
    expect(card).toContain('<Ico e="⚖️"');
    expect(card).toContain('<Ico e="🌡️"');
  });

  it("keeps Home vital tiles focused on logging instead of opening trend charts", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('label="Temp"');
    expect(home).toContain('label="Weight"');
    expect(home).not.toContain('setVitalTrendOpen("sleep")');
    expect(home).not.toContain('setVitalTrendOpen("temperature")');
    expect(home).not.toContain('setVitalTrendOpen("weight")');
  });
});
