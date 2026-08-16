import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parts = readFileSync("src/components/health-report/HealthReportPdfParts.tsx", "utf8");
const page = readFileSync("src/components/HealthReportPageAudited.tsx", "utf8");

describe("PDF report rendering regression", () => {
  it("keeps the PDF heatmap on the Insights vivid severity palette", () => {
    expect(parts).toContain('"#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B"');
    expect(parts).toContain('"#F47B16", "#F05A28", "#EF4444", "#DC2626", "#B91C1C"');
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
    const frequency = page.indexOf('<h2>Symptom frequency <small>(days)</small></h2>');
    const patterns = page.indexOf('<HealthReportObservedPatterns days={days} />');
    expect(frequency).toBeGreaterThanOrEqual(0);
    expect(patterns).toBeGreaterThan(frequency);
  });
});
