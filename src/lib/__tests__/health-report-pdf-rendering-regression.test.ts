import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parts = readFileSync("src/components/health-report/HealthReportPdfParts.tsx", "utf8");
const page = readFileSync("src/components/HealthReportPageAudited.tsx", "utf8");

describe("PDF report rendering regression", () => {
  it("keeps the PDF heatmap on the Insights vivid severity palette", () => {
    expect(parts).toContain('import { PAIN_COLOR_HEX, painColor } from "@/lib/domain/pain";');
    expect(parts).toContain("function insightSeverityColor");
    expect(parts).toContain('background: value == null ? "#FFFFFF" : insightSeverityColor(value, item.max)');
  });

  it("renders recorded period with PDF-safe visible colors", () => {
    expect(parts).toContain('spotting: "#C7CFF3"');
    expect(parts).toContain('light: "#8D9DF5"');
    expect(parts).toContain('medium: "#5F60E0"');
    expect(parts).toContain('heavy: "#452CB4"');
    expect(parts).toContain('"very-heavy": "#320080"');
    expect(parts).toContain("reportPeriodLevel(day.key, day.log, data.cycle)");
    expect(parts).toContain('style={{ background: level ? PERIOD_PDF_COLORS[level] : "#FFFFFF" }}');
  });

  it("keeps Observed patterns after Symptoms frequency", () => {
    const frequency = page.indexOf('<h2>Symptom frequency <small>(recorded days)</small></h2>');
    const patterns = page.indexOf('<HealthReportObservedPatterns days={days} recordedDayCount={symptomFrequencyDenominator} />');
    expect(frequency).toBeGreaterThanOrEqual(0);
    expect(patterns).toBeGreaterThan(frequency);
  });

  it("uses recorded-data days for symptom frequency but calendar days for Coverage", () => {
    expect(page).toContain("const symptomFrequencyDenominator = loggedDays.length;");
    expect(page).toContain("percentage(item.count, symptomFrequencyDenominator)");
    expect(page).toContain("loggedDays.length / Math.max(1, days.length)");
    expect(parts).toContain("percentage(hotFlashDays.length, recordedDayCount)");
    expect(parts).toContain("% of recorded days");
  });

  it("paginates long-range Trends without changing the Pain bars design", () => {
    expect(page).toContain("const trendPages = paginateReportDays(days, 30);");
    expect(page).toContain('number={2 + trendIndex} title="Trends"');
    expect(page).toContain('number={medicationPage} title="Medication"');
    expect(page).toContain("number={timelineStartPage + pageIndex}");
    expect(page).toContain("const detailStartPage = timelineStartPage + timelinePageCount;");
    expect(page).toContain(".painBars{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px;max-height:360px;overflow:hidden}");
  });

  it("keeps medication adherence inside tracked history and partial timeline doses accurate", () => {
    expect(page).toContain("firstRecordedScheduledMedicationDate(med, data.medLog, medLogItems)");
    expect(page).toContain("dateKeys.filter((date) => date >= trackingStart)");
    expect(parts).toContain("timelineScheduledMedicationLabel(med.name, state.allItems, state.selectedItems)");
  });

  it("samples only numeric point labels on long pain trends", () => {
    expect(parts).toContain("shouldShowPainPointLabel(days.length, point.index, tickEvery, pointIndex === points.length - 1)");
    expect(parts).toContain("dayCount <= 31");
  });
});
