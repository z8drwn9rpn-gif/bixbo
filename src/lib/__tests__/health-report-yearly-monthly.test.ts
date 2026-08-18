import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { average, type ReportDaySummary } from "../healthReport";
import { aggregateReportMonths, twelveCalendarMonthRange } from "../yearlyHealthReport";

const page = readFileSync("src/components/HealthReportPageAudited.tsx", "utf8");
const yearlyParts = readFileSync("src/components/health-report/YearlyHealthReportParts.tsx", "utf8");

function day(key: string, pain?: number): ReportDaySummary {
  return { key, log: {}, notes: [], pain, bowelTypes: [], bowelLogCount: 0, noBowelMovementCount: 0, urinaryOnlyCount: 0 };
}

describe("yearly PDF monthly reporting", () => {
  it("uses exactly the current calendar month plus the previous 11 months", () => {
    expect(twelveCalendarMonthRange("2026-08-18")).toEqual(["2025-09-01", "2026-08-18"]);
    expect(twelveCalendarMonthRange("2026-01-05")).toEqual(["2025-02-01", "2026-01-05"]);
  });

  it("aggregates to calendar months and gives months equal weight", () => {
    const source = [day("2026-01-05", 10), ...Array.from({ length: 10 }, (_, index) => day(`2026-02-${String(index + 1).padStart(2, "0")}`, 0))];
    const months = aggregateReportMonths(source);
    expect(months).toHaveLength(2);
    expect(months.map((month) => month.pain)).toEqual([10, 0]);
    expect(average(months.map((month) => month.pain))).toBe(5);
    expect(average(source.map((item) => item.pain))).toBeCloseTo(10 / 11);
  });

  it("can represent at most 12 reporting units for the one-year preset", () => {
    const source = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2025, 8 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      return day(key, index);
    });
    expect(aggregateReportMonths(source)).toHaveLength(12);
  });

  it("wires only the 1-year preset to monthly range and monthly report mode", () => {
    expect(page).toContain('preset === "365" ? twelveCalendarMonthRange(today)');
    expect(page).toContain('yearly={preset === "365"}');
    expect(page).toContain('12-month report');
    expect(page).toContain(': [addDays(today, -(Number(preset) - 1)), today]');
  });

  it("uses monthly pain, frequency, Coverage, timeline and details in yearly mode", () => {
    expect(page).toContain("const months = yearly ? aggregateReportMonths(days");
    expect(page).toContain("<YearlyPainTrend months={months} locale={locale} />");
    expect(page).toContain("Pain by month");
    expect(page).toContain("monthly average of daily pain averages");
    expect(page).toContain("recordedMonths.length / Math.max(1, months.length)");
    expect(page).toContain("<YearlyTimelineTable months={pageMonths}");
    expect(page).toContain("buildYearlyHealthDetailPages(months, units, locale)");
    expect(yearlyParts).toContain('className="timeline"');
    expect(yearlyParts).toContain('className="chart"');
    expect(yearlyParts).toContain("months.map((month, index) => <text");
    expect(yearlyParts).toContain("Pain monthly average");
  });

  it("retains the existing daily 7/30/90 report paths unchanged", () => {
    expect(page).toContain('<HealthReportPainTrend days={days} locale={locale} />');
    expect(page).toContain('<h2>Pain by day <small>daily average of real pain measurements</small></h2>');
    expect(page).toContain('<h2>Symptom frequency <small>(recorded days)</small></h2>');
    expect(page).toContain('<DetailedTimelineTable days={pageDays} data={data} units={units} locale={locale} />');
    expect(page).toContain("const trendPages = paginateReportDays(days, 30);");
  });
});
