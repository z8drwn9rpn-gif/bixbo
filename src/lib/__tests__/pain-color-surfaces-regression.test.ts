import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const calendar = readFileSync("src/components/MonthCalendar.tsx", "utf8");
const couple = readFileSync("src/features/couple/coupleUtils.ts", "utf8");
const insights = readFileSync("src/features/insights/shared.tsx", "utf8");
const insightsMaterial = readFileSync("src/features/insights/insights-3d.css", "utf8");
const report = readFileSync("src/components/HealthReportPageAudited.tsx", "utf8");

describe("Pain colour surface consistency", () => {
  it("uses the shared half-step-aware pain colour on every pain surface", () => {
    expect(calendar).toContain("function calendarPainColor(value:number){return painColor(value);}");
    expect(couple).toContain("return painColor(value);");
    expect(insights).toContain("return painColor(value);");
    expect(report).toContain('import { painColor } from "@/lib/domain/pain";');
  });

  it("does not restore the old rounding palette in calendar, Couple, or Insights", () => {
    expect(calendar).not.toContain("CALENDAR_PAIN_COLORS");
    expect(couple).not.toContain("COUPLE_PAIN_COLORS");
    expect(insights).not.toContain("VIVID_PAIN_CHART_COLORS[Math.max(0, Math.min(10, Math.round(value)))]");
  });

  it("keeps Pain and Symptoms chart colours vivid without changing their chart geometry", () => {
    expect(insightsMaterial).toContain('[data-bixbo-insight-chart-card="pain"] [data-bixbo-chart-mark="bar"]');
    expect(insightsMaterial).toContain('[data-symptoms-trend-card="true"] [style*="height"][style*="background"]');
    expect(insightsMaterial).toContain("filter: saturate(1.42) contrast(1.075);");
  });
});
