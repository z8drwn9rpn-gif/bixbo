import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Insights Recover & body", () => {
  it("renders one combined Sleep, Weight and Body temperature card below Time of Day Pattern", () => {
    const route = readFileSync("src/routes/insights.tsx", "utf8");
    const card = readFileSync("src/features/insights/DayPatternsInsightsCard.tsx", "utf8");

    expect(route).toContain('import { DayPatternsInsightsCard } from "@/features/insights/DayPatternsInsightsCard"');
    expect(route).toContain('data-bixbo-jump-label={t("Recover & body")}');
    expect(route.indexOf('id="TimeOfDayInsightsCard"')).toBeLessThan(route.indexOf('id="DayPatternsInsightsCard"'));
    expect(route.indexOf('id="DayPatternsInsightsCard"')).toBeLessThan(route.indexOf('id="MedsAdherenceInsightsCard"'));

    expect(card).toContain('t("Recover & body")');
    expect(card).toContain('<Ico e="🌳" size={29} />');
    expect(card).toContain('role="tablist"');
    expect(card).toContain('{ key: "sleep", label: t("Sleep") }');
    expect(card).toContain('{ key: "weight", label: t("Weight") }');
    expect(card).toContain('{ key: "temperature", label: t("Body temperature") }');
    expect(card).toContain('data-bixbo-chart-mark="bar"');
    expect(card).toContain('filter: "saturate(1.5) contrast(1.08)"');
    expect(card).toContain('<LineChart metric="weight" points={weightPoints} color={WEIGHT_COLOR} />');
    expect(card).toContain('<LineChart metric="temperature" points={temperaturePoints} color={TEMPERATURE_COLOR} />');
    expect(card).toContain('<QuickInsights items={[');
    expect(card).not.toContain('MetricCards');
  });

  it("keeps generic Insights time windows named period while Blueberry stays menstrual-only", () => {
    const card = readFileSync("src/features/insights/DayPatternsInsightsCard.tsx", "utf8");
    const i18n = readFileSync("src/hooks/useI18n.ts", "utf8");

    expect(card).toContain('No data in this period');
    expect(card).toContain('vs previous period');
    expect(card.toLowerCase()).not.toContain("blueberry");
    expect(i18n).toContain('return BLUEBERRY_UI_NAMES[key] ?? null;');
    expect(i18n).toContain('"Period & cycle": "Blueberry & cycle"');
    expect(i18n).not.toContain('Catch visible compound labels');
  });

  it("removes the old Home vital trend popup completely", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('label="Temp"');
    expect(home).toContain('label="Weight"');
    expect(home).not.toContain("VitalTrendPopup");
    expect(home).not.toContain("vitalTrendOpen");
    expect(home).not.toContain("createPortal");
    expect(home).not.toContain('setVitalTrendOpen("sleep")');
    expect(home).not.toContain('setVitalTrendOpen("temperature")');
    expect(home).not.toContain('setVitalTrendOpen("weight")');
  });
});
