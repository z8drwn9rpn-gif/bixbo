import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Insights dashboard photo-matched cards", () => {
  test("wires the approved card set into Insights", () => {
    const route = readFileSync("src/routes/insights.tsx", "utf8");
    expect(route).toContain("PainInsightsCard");
    expect(route).toContain("SymptomsTrendInsightsCard");
    expect(route).not.toContain("HotFlashesInsightsCard");
    expect(route).toContain("TimeOfDayInsightsCard");
    expect(route).toContain("MedsAdherenceInsightsCard");
    expect(route).toContain("SukSukInsightsCard");
    expect(route).toContain('data-bixbo-jump-label={t("ŠukŠuk")}');
    expect(route).toContain('<InsightsJumpControl refreshKey="insights" />');
    expect(route).not.toContain("insightsFilter");
  });

  test("moves SukSuk out of the HAK calendar", () => {
    const hak = readFileSync("src/components/home/BirthControlCard.tsx", "utf8");
    expect(hak).not.toContain("<SukSukPeriodChart");
    expect(hak).not.toContain('from "@/components/home/SukSukPeriodChart"');
  });

  test("keeps quick insights, BIXBO icons, compact meds dots, and one-line tiles", () => {
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");
    const bowel = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");
    const primitives = readFileSync("src/features/insights/InsightDashboardPrimitives.tsx", "utf8");

    for (const source of [pain, symptoms, time, meds]) expect(source).toContain("QuickInsights");
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
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");

    expect(heatmap).toContain("grid h-8 w-full grid-cols-3 rounded-xl");
    expect(primitives).toContain("grid h-8 w-full grid-cols-3 rounded-xl");
    expect(heatmap).toContain("text-[10px] font-semibold");
    expect(primitives).toContain("text-[10px] font-semibold");
    expect(pain).toContain('h-[150px]');
    expect(time).toContain('h-[150px]');
    expect(symptoms).toContain('h-[150px]');
    expect(symptoms).toContain("DashboardPeriodControl");
  });

  test("keeps dense medication rows and non-overlapping SukSuk tiles", () => {
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");

    expect(meds).toContain("items-center gap-1.5 py-1");
    expect(meds).toContain("h-1 overflow-hidden rounded-full");
    expect(suk).toContain('className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">days with intimacy');
    expect(suk).toContain('className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">best day');
  });

  test("provides one switchable bar chart for the six requested symptoms", () => {
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");
    for (const label of ["Headache", "Tetany episode", "Panic episode", "Nausea", "Pressure", "Hot flashes"]) {
      expect(symptoms).toContain(label);
    }
    expect(symptoms).toContain('type SymptomKey = "headache" | "tetany" | "panic" | "nausea" | "pressure" | "hotFlashes"');
    expect(symptoms).toContain('role="group" aria-label="Symptom shown in chart"');
    expect(symptoms).toContain("headacheIntensity");
    expect(symptoms).toContain("nauseaSeverity");
    expect(symptoms).toContain("pressureIntensity");
    expect(symptoms).toContain("day.tetany");
    expect(symptoms).toContain("day.panic");
    expect(symptoms).toContain("hotFlashes");
    expect(symptoms).toContain("InsightFloatingTooltip");
    expect(symptoms).toContain("gridTemplateColumns");
  });

  test("uses the canonical Pain scale colors for every Symptoms trend bar and tooltip", () => {
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");
    expect(symptoms).toContain("painHexColor((value / max) * 10)");
    expect(symptoms).toContain("background: symptomIntensityColor(bucket.value, max)");
    expect(symptoms).toContain("color: symptomIntensityColor(activeBucket.value, max)");
    expect(symptoms).not.toContain("vividPainChartColor");
  });

  test("uses the BIXBO brain, Quick Insights, and Pain-style Peak Lowest Trend cards", () => {
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");
    expect(symptoms).toContain('BrainIcon');
    expect(symptoms).toContain('data-symptoms-brain-icon="true"');
    expect(symptoms).toContain("QuickInsights");
    expect(symptoms).toContain('{ label: "Peak"');
    expect(symptoms).toContain('{ label: "Lowest"');
    expect(symptoms).toContain('{ label: "Trend"');
    expect(symptoms).toContain("previousAverage");
    expect(symptoms).toContain("trendPct");
  });

  test("reserves Blueberry wording for cycle UI, not general Quick Insights", () => {
    const pain = readFileSync("src/features/insights/PainInsightsCard.tsx", "utf8");
    const symptoms = readFileSync("src/features/insights/SymptomsTrendInsightsCard.tsx", "utf8");
    const time = readFileSync("src/features/insights/TimeOfDayInsightsCard.tsx", "utf8");
    const meds = readFileSync("src/features/insights/MedsAdherenceInsightsCard.tsx", "utf8");
    const suk = readFileSync("src/features/insights/SukSukInsightsCard.tsx", "utf8");

    for (const source of [pain, symptoms, time, meds, suk]) expect(source).not.toMatch(/blueberry/i);
    expect(pain).toContain("Pain was lower early in the period");
    expect(pain).toContain("Pain was higher early in the period");
    expect(time).toContain("No tetany episodes in this period");
    expect(time).toContain("No panic attacks in this period");
    expect(meds).toContain("No scheduled doses in this period");
    expect(suk).toContain("No intimacy moments were logged in this period.");
  });
});
