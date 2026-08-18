import fs from "node:fs";

const pagePath = "src/components/HealthReportPageAudited.tsx";
const pageBefore = fs.readFileSync(pagePath, "utf8");
const cssMarker = "const CSS = String.raw`";
const cssBefore = pageBefore.slice(pageBefore.indexOf(cssMarker));

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

const yearlyLib = String.raw`import { average, mode, type ReportDaySummary } from "./healthReport";

export type ReportMonthSummary = {
  key: string;
  monthKey: string;
  days: ReportDaySummary[];
  recorded: boolean;
  recordedDayCount: number;
  pain?: number;
  headache?: number;
  hotFlashes?: number;
  nausea?: number;
  tetany?: number;
  panic?: number;
  sleep?: number;
  bowelMode?: number;
  bowelTypes: number[];
  bowelLogCount: number;
  noBowelMovementCount: number;
  hasNoBowelMovement: boolean;
  hasPain: boolean;
  hasHeadache: boolean;
  hasHotFlashes: boolean;
  hasTetany: boolean;
  hasPanic: boolean;
  hasNausea: boolean;
  extraMeds: Array<{ label: string; count: number }>;
  extraMedCount: number;
  tensCount: number;
  foodLogCount: number;
  workoutCount: number;
  noteCount: number;
  periodLogged: boolean;
  latestWeight?: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Current calendar month plus the previous 11 calendar months. */
export function twelveCalendarMonthRange(today: string): [string, string] {
  const [year, month] = today.split("-").map(Number);
  const zeroBased = (year * 12 + (month - 1)) - 11;
  const startYear = Math.floor(zeroBased / 12);
  const startMonth = (zeroBased % 12 + 12) % 12 + 1;
  return [\`${"${startYear}"}-\${pad2(startMonth)}-01\`, today];
}

function latestMonthWeight(days: ReportDaySummary[]): number | undefined {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    const entries = day.log.weightEntries ?? [];
    const value = entries.length ? entries.at(-1)?.value : day.log.weight;
    if (value != null && Number.isFinite(value)) return value;
  }
  return undefined;
}

function symptomFlags(days: ReportDaySummary[]) {
  return {
    hasPain: days.some((day) => day.pain != null),
    hasHeadache: days.some((day) => (day.log.pain ?? []).some((entry) => entry.headache || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0)),
    hasHotFlashes: days.some((day) => (day.log.pain ?? []).some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)),
    hasTetany: days.some((day) => (day.log.tetany?.length ?? 0) > 0),
    hasPanic: days.some((day) => (day.log.panic?.length ?? 0) > 0),
    hasNausea: days.some((day) => (day.log.pain ?? []).some((entry) => entry.nausea || entry.nauseaSeverity != null || (entry.nauseaTypes?.length ?? 0) > 0)),
  };
}

/**
 * Collapse raw daily report summaries into calendar-month reporting units.
 * Monthly health values are averages of the available daily summaries. A later
 * yearly average therefore gives every month equal weight, regardless of how
 * many daily values happened to be recorded inside that month.
 */
export function aggregateReportMonths(days: ReportDaySummary[], recordedDayKeys = new Set<string>()): ReportMonthSummary[] {
  const groups = new Map<string, ReportDaySummary[]>();
  days.forEach((day) => {
    const monthKey = day.key.slice(0, 7);
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), day]);
  });

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, monthDays]) => {
    const bowelTypes = monthDays.flatMap((day) => day.bowelTypes);
    const noBowelMovementCount = monthDays.reduce((total, day) => total + day.noBowelMovementCount, 0);
    const extra = new Map<string, { label: string; count: number }>();
    monthDays.forEach((day) => (day.log.extraMeds ?? []).forEach((entry) => {
      const normalized = entry.name.trim().toLocaleLowerCase();
      const previous = extra.get(normalized);
      extra.set(normalized, { label: previous?.label ?? entry.name, count: (previous?.count ?? 0) + 1 });
    }));
    const recordedDayCount = monthDays.filter((day) => recordedDayKeys.has(day.key)).length;

    return {
      key: \`\${monthKey}-01\`,
      monthKey,
      days: monthDays,
      recorded: recordedDayCount > 0,
      recordedDayCount,
      pain: average(monthDays.map((day) => day.pain)),
      headache: average(monthDays.map((day) => day.headache)),
      hotFlashes: average(monthDays.map((day) => day.hotFlashes)),
      nausea: average(monthDays.map((day) => day.nausea)),
      tetany: average(monthDays.map((day) => day.tetany)),
      panic: average(monthDays.map((day) => day.panic)),
      sleep: average(monthDays.map((day) => day.sleep)),
      bowelMode: mode(bowelTypes),
      bowelTypes,
      bowelLogCount: monthDays.reduce((total, day) => total + day.bowelLogCount, 0),
      noBowelMovementCount,
      hasNoBowelMovement: noBowelMovementCount > 0,
      ...symptomFlags(monthDays),
      extraMeds: [...extra.values()],
      extraMedCount: [...extra.values()].reduce((total, item) => total + item.count, 0),
      tensCount: monthDays.reduce((total, day) => total + (day.log.heat ?? []).filter((entry) => entry.kind === "tens").length, 0),
      foodLogCount: monthDays.reduce((total, day) => total + (day.log.food?.length ?? 0), 0),
      workoutCount: monthDays.reduce((total, day) => total + (day.log.workout?.length ?? 0), 0),
      noteCount: monthDays.reduce((total, day) => total + day.notes.length, 0),
      periodLogged: monthDays.some((day) => Boolean(day.log.periodInfo?.level ?? day.log.period)),
      latestWeight: latestMonthWeight(monthDays),
    };
  });
}
`;

const yearlyParts = String.raw`import type { CSSProperties } from "react";

import type { HealthReportDetailRow } from "@/components/health-report/HealthReportDetailParts";
import { painColor } from "@/lib/domain/pain";
import { mode, paginateReportDays } from "@/lib/healthReport";
import type { ReportMonthSummary } from "@/lib/yearlyHealthReport";
import { formatWeight, type UnitPreferences } from "@/lib/preferences";
import type { BixboData } from "@/lib/storage";

const compactNumber = (value: number | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(1).replace(/\.0$/, "");
const percentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;
const monthDate = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

export function monthLabel(monthKey: string, locale: string): string {
  return monthDate(monthKey).toLocaleDateString(locale, { month: "short", year: "numeric" });
}

function shortMonthLabel(monthKey: string, locale: string): string {
  return monthDate(monthKey).toLocaleDateString(locale, { month: "short" });
}

function YearlyPainHighlights({ months, locale }: { months: ReportMonthSummary[]; locale: string }) {
  const painMonths = months.filter((month) => month.pain != null);
  const mostPainful = painMonths.reduce<ReportMonthSummary | undefined>((best, month) => {
    if (!best) return month;
    if ((month.pain ?? -1) > (best.pain ?? -1) || (month.pain === best.pain && month.monthKey > best.monthKey)) return month;
    return best;
  }, undefined);
  const bestPainFree = [...painMonths].reverse().find((month) => month.pain === 0);
  const cardStyle: CSSProperties = { border: "1px solid #dde1cf", borderRadius: 7, padding: "6px 8px", minWidth: 0 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 6, fontWeight: 700, textTransform: "uppercase" };
  const valueStyle: CSSProperties = { display: "block", fontFamily: '\"Instrument Serif\", Georgia, serif', fontSize: 12, marginTop: 2 };
  const noteStyle: CSSProperties = { display: "block", fontSize: 5.8, color: "#707668", lineHeight: 1.2, marginTop: 2 };
  return <div style={{ marginTop: 7 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
      <div style={cardStyle}><span style={labelStyle}>Most painful month</span><strong style={valueStyle}>{mostPainful ? monthLabel(mostPainful.monthKey, locale) : "—"}</strong><small style={noteStyle}>{mostPainful?.pain != null ? \`\${compactNumber(mostPainful.pain)}/10 monthly average\` : "No monthly pain value recorded"}</small></div>
      <div style={cardStyle}><span style={labelStyle}>Best month without pain</span><strong style={valueStyle}>{bestPainFree ? monthLabel(bestPainFree.monthKey, locale) : "—"}</strong><small style={noteStyle}>{bestPainFree ? "Explicit monthly 0/10 average" : "No explicit 0/10 month recorded"}</small></div>
    </div>
    <p style={{ margin: "5px 0 0", fontSize: 5.8, lineHeight: 1.25, color: "#707668" }}>Missing monthly pain data is never treated as zero.</p>
  </div>;
}

export function YearlyPainTrend({ months, locale }: { months: ReportMonthSummary[]; locale: string }) {
  const points = months.map((month, index) => month.pain == null ? null : { index, value: month.pain, key: month.monthKey }).filter((item): item is { index: number; value: number; key: string } => item != null);
  if (points.length < 2) return <><div className="emptyTrend">Not enough monthly pain data for a trend.</div><YearlyPainHighlights months={months} locale={locale} /></>;
  const width = 650;
  const height = 170;
  const left = 34;
  const right = 10;
  const top = 18;
  const bottom = 34;
  const x = (index: number) => left + (index / Math.max(1, months.length - 1)) * (width - left - right);
  const y = (value: number) => height - bottom - (value / 10) * (height - top - bottom);
  const segments: typeof points[] = [];
  let segment: typeof points = [];
  points.forEach((point, index) => {
    if (index && point.index !== points[index - 1].index + 1) {
      if (segment.length) segments.push(segment);
      segment = [];
    }
    segment.push(point);
  });
  if (segment.length) segments.push(segment);
  return <>
    <svg viewBox={\`0 0 \${width} \${height}\`} className="chart">
      {[0, 2, 4, 6, 8, 10].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 7} y={y(value) + 3} textAnchor="end">{value}</text></g>)}
      {months.map((month, index) => <text key={month.monthKey} className="xLabel" x={x(index)} y={height - 9} textAnchor="middle">{shortMonthLabel(month.monthKey, locale)}</text>)}
      {segments.map((items, index) => items.length > 1 ? <polyline key={index} points={items.map((point) => \`\${x(point.index)},\${y(point.value)}\`).join(" ")} /> : null)}
      {points.map((point) => <g key={point.key}><circle cx={x(point.index)} cy={y(point.value)} r="3.2" fill={painColor(point.value)} /><text className="pointLabel" x={x(point.index)} y={y(point.value) - 7} textAnchor="middle">{compactNumber(point.value)}</text></g>)}
    </svg>
    <div className="trendLegend"><span><i />Pain monthly average</span><span>Missing month = no recorded monthly pain value, not zero</span></div>
    <YearlyPainHighlights months={months} locale={locale} />
  </>;
}

export function YearlyObservedPatterns({ months, recordedMonthCount }: { months: ReportMonthSummary[]; recordedMonthCount: number }) {
  const headacheMonths = months.filter((month) => month.hasHeadache);
  const hotFlashMonths = months.filter((month) => month.hasHotFlashes);
  const panicMonths = months.filter((month) => month.hasPanic);
  const commonBowel = mode(months.map((month) => month.bowelMode).filter((value): value is number => value != null));
  const patterns: string[] = [];
  if (headacheMonths.length >= 2) patterns.push(\`Headache was recorded in \${headacheMonths.length} months; \${headacheMonths.filter((month) => month.hasPain).length} overlapped with recorded pain.\`);
  if (hotFlashMonths.length >= 2) patterns.push(\`Hot flashes were recorded in \${hotFlashMonths.length} months (\${percentage(hotFlashMonths.length, recordedMonthCount)}% of recorded months).\`);
  if (panicMonths.length) patterns.push(\`\${panicMonths.length} month\${panicMonths.length === 1 ? "" : "s"} with panic attacks recorded.\`);
  if (commonBowel != null) patterns.push(\`Most common monthly bowel value: Type \${commonBowel}.\`);
  return <div className="observedPatterns">
    <h2>Observed patterns</h2>
    <div style={{ display: "grid", gap: 3 }}>
      {patterns.length ? patterns.map((pattern, index) => <div key={pattern} style={{ display: "grid", gridTemplateColumns: "17px 1fr", gap: 4, fontSize: 6.2, lineHeight: 1.25 }}><b style={{ color: "#7f8950" }}>{String(index + 1).padStart(2, "0")}</b><span>{pattern}</span></div>) : <p style={{ margin: 0, fontSize: 6.2, lineHeight: 1.25, color: "#707668" }}>No repeated monthly pattern met the report threshold in this range.</p>}
    </div>
  </div>;
}

function monthlySymptomText(month: ReportMonthSummary): string {
  const values: string[] = [];
  if (month.pain != null) values.push(\`Pain \${compactNumber(month.pain)}/10\`);
  if (month.headache != null) values.push(\`Headache \${compactNumber(month.headache)}/10\`);
  if (month.hotFlashes != null) values.push(\`Hot flashes \${compactNumber(month.hotFlashes)}/5\`);
  if (month.tetany != null) values.push(\`Tetany \${compactNumber(month.tetany)}/5\`);
  if (month.panic != null) values.push(\`Panic \${compactNumber(month.panic)}/10\`);
  if (month.nausea != null) values.push(\`Nausea \${compactNumber(month.nausea)}/10\`);
  return values.join(" · ") || "—";
}

function monthlyExtraText(month: ReportMonthSummary, data: BixboData): string {
  const values = month.extraMeds.map((item) => \`\${item.label} ×\${item.count}\`);
  const prnCheckboxes = data.meds.filter((med) => med.asNeeded).reduce((total, med) => total + month.days.filter((day) => Boolean(data.medLog[day.key]?.[\`\${med.id}@asneeded\`])).length, 0);
  if (prnCheckboxes) values.push(\`PRN checkbox ×\${prnCheckboxes}\`);
  return values.join(" · ") || "—";
}

function monthlyContextText(month: ReportMonthSummary, units: UnitPreferences): string {
  const values: string[] = [];
  if (!month.recorded) return "No recorded health data";
  if (month.sleep != null) values.push(\`Sleep avg \${compactNumber(month.sleep)} h\`);
  if (month.bowelMode != null) values.push(\`Bowel Type \${month.bowelMode}\`);
  if (month.latestWeight != null) values.push(\`Weight \${formatWeight(month.latestWeight, units)}\`);
  if (month.periodLogged) values.push("Period recorded");
  if (month.foodLogCount) values.push(\`Food logs ×\${month.foodLogCount}\`);
  if (month.workoutCount) values.push(\`Workout ×\${month.workoutCount}\`);
  if (month.noteCount) values.push(\`Notes ×\${month.noteCount}\`);
  return values.join(" · ") || "Recorded data present";
}

export function YearlyTimelineTable({ months, data, units, locale }: { months: ReportMonthSummary[]; data: BixboData; units: UnitPreferences; locale: string }) {
  return <table className="timeline"><thead><tr><th>Month</th><th>Pain & symptoms</th><th>Taken meds</th><th>Extra meds / PRN</th><th>TENS</th><th>Context / notes</th></tr></thead><tbody>{months.length ? months.map((month) => <tr key={month.monthKey}><td><b>{monthLabel(month.monthKey, locale)}</b></td><td>{monthlySymptomText(month)}</td><td>{data.meds.some((med) => !med.asNeeded) ? "See Medication page" : "—"}</td><td>{monthlyExtraText(month, data)}</td><td>{month.tensCount ? \`\${month.tensCount} session\${month.tensCount === 1 ? "" : "s"}\` : "—"}</td><td>{monthlyContextText(month, units)}</td></tr>) : <tr><td colSpan={6}>No monthly records in this range.</td></tr>}</tbody></table>;
}

function monthlyDetail(month: ReportMonthSummary, units: UnitPreferences): string {
  if (!month.recorded) return "No recorded health values in this month.";
  const values: string[] = [];
  if (month.pain != null) values.push(\`Pain monthly avg: \${compactNumber(month.pain)}/10\`);
  if (month.headache != null) values.push(\`Headache monthly avg: \${compactNumber(month.headache)}/10\`);
  if (month.hotFlashes != null) values.push(\`Hot flashes monthly avg: \${compactNumber(month.hotFlashes)}/5\`);
  if (month.nausea != null) values.push(\`Nausea monthly avg: \${compactNumber(month.nausea)}/10\`);
  if (month.tetany != null) values.push(\`Tetany monthly avg: \${compactNumber(month.tetany)}/5\`);
  if (month.panic != null) values.push(\`Panic monthly avg: \${compactNumber(month.panic)}/10\`);
  if (month.sleep != null) values.push(\`Sleep monthly avg: \${compactNumber(month.sleep)} h\`);
  if (month.bowelMode != null) values.push(\`Most common bowel value: Type \${month.bowelMode}\`);
  if (month.hasNoBowelMovement) values.push("No bowel movement recorded during month");
  if (month.latestWeight != null) values.push(\`Latest weight: \${formatWeight(month.latestWeight, units)}\`);
  if (month.extraMedCount) values.push(\`Extra medication logs: \${month.extraMedCount}\`);
  if (month.tensCount) values.push(\`TENS sessions: \${month.tensCount}\`);
  if (month.periodLogged) values.push("Period / spotting recorded");
  if (month.foodLogCount) values.push(\`Food logs: \${month.foodLogCount}\`);
  if (month.workoutCount) values.push(\`Workouts: \${month.workoutCount}\`);
  if (month.noteCount) values.push(\`Notes: \${month.noteCount}\`);
  return values.join("; ") || "Recorded data present.";
}

export function buildYearlyHealthDetailPages(months: ReportMonthSummary[], units: UnitPreferences, locale: string): HealthReportDetailRow[][] {
  const rows: HealthReportDetailRow[] = months.map((month) => ({ date: monthLabel(month.monthKey, locale), category: "Monthly summary", detail: monthlyDetail(month, units) }));
  return paginateReportDays(rows, 8);
}
`;

const yearlyTest = String.raw`import { readFileSync } from "node:fs";
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
    const source = [day("2026-01-05", 10), ...Array.from({ length: 10 }, (_, index) => day(\`2026-02-\${String(index + 1).padStart(2, "0")}\`, 0))];
    const months = aggregateReportMonths(source);
    expect(months).toHaveLength(2);
    expect(months.map((month) => month.pain)).toEqual([10, 0]);
    expect(average(months.map((month) => month.pain))).toBe(5);
    expect(average(source.map((item) => item.pain))).toBeCloseTo(10 / 11);
  });

  it("can represent at most 12 reporting units for the one-year preset", () => {
    const source = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2025, 8 + index, 1);
      const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, "0")}-01\`;
      return day(key, index);
    });
    expect(aggregateReportMonths(source)).toHaveLength(12);
  });

  it("wires only the 1-year preset to monthly range and monthly report mode", () => {
    expect(page).toContain('preset === "365" ? twelveCalendarMonthRange(today)');
    expect(page).toContain('yearly={preset === "365"}');
    expect(page).toContain('preset === "365" ? `${longDate(start, locale)} – ${longDate(end, locale)} · 12-month report`');
    expect(page).toContain(': [addDays(today, -(Number(preset) - 1)), today]');
  });

  it("uses monthly pain, frequency, Coverage, timeline and details in yearly mode", () => {
    expect(page).toContain("const months = yearly ? aggregateReportMonths(days");
    expect(page).toContain("<YearlyPainTrend months={months} locale={locale} />");
    expect(page).toContain("Pain by month");
    expect(page).toContain("recordedMonths.length / Math.max(1, months.length)");
    expect(page).toContain("<YearlyTimelineTable months={pageMonths}");
    expect(page).toContain("buildYearlyHealthDetailPages(months, units, locale)");
    expect(yearlyParts).toContain('className="timeline"');
    expect(yearlyParts).toContain('className="chart"');
  });

  it("retains the existing daily 7/30/90 report paths unchanged", () => {
    expect(page).toContain('<HealthReportPainTrend days={days} locale={locale} />');
    expect(page).toContain('<h2>Pain by day <small>daily average of real pain measurements</small></h2>');
    expect(page).toContain('<h2>Symptom frequency <small>(recorded days)</small></h2>');
    expect(page).toContain('<DetailedTimelineTable days={pageDays} data={data} units={units} locale={locale} />');
    expect(page).toContain("const trendPages = paginateReportDays(days, 30);");
  });
});
`;

fs.writeFileSync("src/lib/yearlyHealthReport.ts", yearlyLib);
fs.writeFileSync("src/components/health-report/YearlyHealthReportParts.tsx", yearlyParts);
fs.writeFileSync("src/lib/__tests__/health-report-yearly-monthly.test.ts", yearlyTest);

let page = pageBefore;
page = replaceOrThrow(page,
`import {
  buildHealthDetailPages,
  HealthReportDetailTable,
} from "@/components/health-report/HealthReportDetailParts";`,
`import {
  buildHealthDetailPages,
  HealthReportDetailTable,
} from "@/components/health-report/HealthReportDetailParts";
import {
  buildYearlyHealthDetailPages,
  monthLabel,
  YearlyObservedPatterns,
  YearlyPainTrend,
  YearlyTimelineTable,
} from "@/components/health-report/YearlyHealthReportParts";`,
"yearly component imports");

page = replaceOrThrow(page,
`import { BRISTOL, EMPTY, useBixbo, type BixboData } from "@/lib/storage";`,
`import { BRISTOL, EMPTY, useBixbo, type BixboData } from "@/lib/storage";
import { aggregateReportMonths, twelveCalendarMonthRange } from "@/lib/yearlyHealthReport";`,
"yearly helper import");

const newReportDocument = String.raw`function ReportDocument({ days, data, range, locale, units, yearly = false }: { days: ReportDaySummary[]; data: BixboData; range: string; locale: string; units: UnitPreferences; yearly?: boolean }) {
  const loggedDays = days.filter((day) => hasMeaningfulReportDay(day) || hasMedicationActivity(day.key, data) || Boolean(reportPeriodLevel(day.key, day.log, data.cycle)));
  const months = yearly ? aggregateReportMonths(days, new Set(loggedDays.map((day) => day.key))) : [];
  const recordedMonths = months.filter((month) => month.recorded);
  const painValues = yearly ? months.map((month) => month.pain) : days.map((day) => day.pain);
  const headacheEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.headacheIntensity).filter((value): value is number => value != null && Number.isFinite(value)));
  const hotFlashEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.hotFlashes).filter((value): value is number => value != null && Number.isFinite(value)));
  const nauseaEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.nauseaSeverity).filter((value): value is number => value != null && Number.isFinite(value)));
  const tetanyEpisodes = days.flatMap((day) => (day.log.tetany ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const panicEpisodes = days.flatMap((day) => (day.log.panic ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const headacheOverviewValues = yearly ? months.map((month) => month.headache) : headacheEpisodes;
  const hotFlashOverviewValues = yearly ? months.map((month) => month.hotFlashes) : hotFlashEpisodes;
  const nauseaOverviewValues = yearly ? months.map((month) => month.nausea) : nauseaEpisodes;
  const tetanyOverviewValues = yearly ? months.map((month) => month.tetany) : tetanyEpisodes;
  const panicOverviewValues = yearly ? months.map((month) => month.panic) : panicEpisodes;
  const sleepValues = days.map((day) => day.sleep).filter((value): value is number => value != null);
  const sleepOverviewValues = yearly ? months.map((month) => month.sleep) : sleepValues;
  const bowelTypes = days.flatMap((day) => day.bowelTypes);
  const bowelLogs = days.reduce((total, day) => total + day.bowelTypes.length + day.noBowelMovementCount, 0);
  const noMovement = days.reduce((total, day) => total + day.noBowelMovementCount, 0);
  const reportBowelTypes = yearly ? months.map((month) => month.bowelMode).filter((value): value is number => value != null) : bowelTypes;
  const reportNoMovement = yearly ? months.filter((month) => month.hasNoBowelMovement).length : noMovement;
  const commonBowel = mode(reportBowelTypes);
  const commonBowelLabel = commonBowel == null ? "—" : commonBowel === 0 ? "Type 0" : \`Type \${commonBowel}\`;

  const weightPoints = days.flatMap((day) => {
    const entries = day.log.weightEntries ?? [];
    if (entries.length) return entries.map((entry) => ({ key: day.key, time: entry.time, value: entry.value }));
    return day.log.weight != null ? [{ key: day.key, time: "", value: day.log.weight }] : [];
  }).filter((point) => Number.isFinite(point.value));
  const latestWeight = weightPoints.at(-1)?.value;

  const symptomFrequency = [
    { label: "Pain", count: days.filter((day) => day.pain != null).length },
    { label: "Headache", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.headache || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0)).length },
    { label: "Hot flashes", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)).length },
    { label: "Tetany", count: days.filter((day) => (day.log.tetany?.length ?? 0) > 0).length },
    { label: "Panic attack", count: days.filter((day) => (day.log.panic?.length ?? 0) > 0).length },
    { label: "Nausea", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.nausea || entry.nauseaSeverity != null || (entry.nauseaTypes?.length ?? 0) > 0)).length },
  ];
  const yearlySymptomFrequency = [
    { label: "Pain", count: months.filter((month) => month.hasPain).length },
    { label: "Headache", count: months.filter((month) => month.hasHeadache).length },
    { label: "Hot flashes", count: months.filter((month) => month.hasHotFlashes).length },
    { label: "Tetany", count: months.filter((month) => month.hasTetany).length },
    { label: "Panic attack", count: months.filter((month) => month.hasPanic).length },
    { label: "Nausea", count: months.filter((month) => month.hasNausea).length },
  ];
  const symptomFrequencyDenominator = loggedDays.length;
  const yearlySymptomFrequencyDenominator = recordedMonths.length;

  const detailPages = yearly ? buildYearlyHealthDetailPages(months, units, locale) : buildHealthDetailPages(days, data, units, locale);
  const timelinePages = packTimelineDays([...loggedDays].reverse());
  const yearlyTimelinePages = paginateReportDays([...months].reverse(), 8);
  const timelinePageCount = Math.max(1, yearly ? yearlyTimelinePages.length : timelinePages.length);
  const trendPages = paginateReportDays(days, 30);
  const trendPageCount = yearly ? 1 : Math.max(1, trendPages.length);
  const medicationPage = 2 + trendPageCount;
  const timelineStartPage = medicationPage + 1;
  const detailStartPage = timelineStartPage + timelinePageCount;

  const scheduled = data.meds.filter((med) => !med.asNeeded);
  const asNeeded = data.meds.filter((med) => med.asNeeded);
  const medLogItems = data.medLogItems ?? {};
  const dateKeys = days.map((day) => day.key);
  const extraCounts = new Map<string, { label: string; count: number }>();
  days.forEach((day) => (day.log.extraMeds ?? []).forEach((entry) => {
    const key = entry.name.trim().toLocaleLowerCase();
    const previous = extraCounts.get(key);
    extraCounts.set(key, { label: previous?.label ?? entry.name, count: (previous?.count ?? 0) + 1 });
  }));
  const knownPrnNames = new Set(asNeeded.map((med) => med.name.trim().toLocaleLowerCase()));

  return <div className="hrDoc">
    <Sheet number={1} title="Health Report" subtitle={range}>
      <div className="meta"><span>{yearly ? \`\${recordedMonths.length}/\${months.length} months with recorded data\` : \`\${loggedDays.length}/\${days.length} days with recorded data\`}</span><span>Generated {new Date().toLocaleDateString(locale)}</span></div>
      <h2>At a glance <small>audited calculations</small></h2>
      <div className="metrics ten">
        <Metric label="Pain" value={\`\${compactNumber(average(painValues))}/10\`} note={yearly ? \`monthly avg · range \${compactNumber(minValue(painValues))}–\${compactNumber(maxValue(painValues))}\` : \`daily avg · range \${compactNumber(minValue(painValues))}–\${compactNumber(maxValue(painValues))}\`} />
        <Metric label="Headache" value={\`\${compactNumber(average(headacheOverviewValues))}/10\`} note={yearly ? \`monthly avg · \${headacheEpisodes.length} recorded intensities · max \${compactNumber(maxValue(headacheEpisodes))}\` : \`\${headacheEpisodes.length} recorded intensities · max \${compactNumber(maxValue(headacheEpisodes))}\`} />
        <Metric label="Hot flashes" value={\`\${compactNumber(average(hotFlashOverviewValues))}/5\`} note={yearly ? \`monthly avg · \${hotFlashEpisodes.length} recorded intensities · max \${compactNumber(maxValue(hotFlashEpisodes))}\` : \`\${hotFlashEpisodes.length} recorded intensities · max \${compactNumber(maxValue(hotFlashEpisodes))}\`} />
        <Metric label="Nausea" value={\`\${compactNumber(average(nauseaOverviewValues))}/10\`} note={yearly ? \`monthly avg · \${nauseaEpisodes.length} recorded intensities · max \${compactNumber(maxValue(nauseaEpisodes))}\` : \`\${nauseaEpisodes.length} recorded intensities · max \${compactNumber(maxValue(nauseaEpisodes))}\`} />
        <Metric label="Tetany" value={\`\${compactNumber(average(tetanyOverviewValues))}/5\`} note={yearly ? \`monthly avg · \${tetanyEpisodes.length} episodes · max \${compactNumber(maxValue(tetanyEpisodes))}\` : \`\${tetanyEpisodes.length} episodes · max \${compactNumber(maxValue(tetanyEpisodes))}\`} />
        <Metric label="Panic" value={\`\${compactNumber(average(panicOverviewValues))}/10\`} note={yearly ? \`monthly avg · \${panicEpisodes.length} episodes · max \${compactNumber(maxValue(panicEpisodes))}\` : \`\${panicEpisodes.length} episodes · max \${compactNumber(maxValue(panicEpisodes))}\`} />
        <Metric label="Sleep" value={sleepOverviewValues.some((value) => value != null) ? \`\${compactNumber(average(sleepOverviewValues))} h\` : "—"} note={yearly ? \`\${months.filter((month) => month.sleep != null).length} months with hours recorded\` : \`\${sleepValues.length} days with hours recorded\`} />
        <Metric label="Bowel" value={commonBowelLabel} note={yearly ? \`\${months.filter((month) => month.bowelMode != null).length} months with bowel records · \${reportNoMovement} months with no movement\` : \`\${bowelLogs} bowel logs · \${noMovement} no movement\`} />
        <Metric label="Latest weight" value={latestWeight != null ? formatWeight(latestWeight, units) : "—"} note={\`\${weightPoints.length} measurements in range\`} />
        {yearly ? <Metric label="Coverage" value={\`\${Math.round((recordedMonths.length / Math.max(1, months.length)) * 100)}%\`} note={\`\${recordedMonths.length} of \${months.length} months\`} /> : <Metric label="Coverage" value={\`\${Math.round((loggedDays.length / Math.max(1, days.length)) * 100)}%\`} note={\`\${loggedDays.length} of \${days.length} days\`} />}
      </div>
      <div className="overviewGrid">
        <div>
          <h2>Symptom timeline <small>(intensity heatmap)</small></h2>
          <HealthReportHeatmap days={days} locale={locale} data={data} />
          <HealthReportHeatLegend />
          {yearly ? <><h2>Pain trend <small>(0–10) · monthly average</small></h2><YearlyPainTrend months={months} locale={locale} /></> : <><h2>Pain trend <small>(0–10) · daily average</small></h2><HealthReportPainTrend days={days} locale={locale} /></>}
        </div>
        <div>
          {yearly ? <>
            <h2>Symptom frequency <small>(recorded months)</small></h2>
            <div className="bars">{yearlySymptomFrequency.map((item) => {
              const pct = percentage(item.count, yearlySymptomFrequencyDenominator);
              return <div key={item.label}><span>{item.label}</span><i><b style={{ width: \`\${Math.max(item.count ? 2 : 0, pct)}%\` }} /></i><strong>{item.count} ({pct}%)</strong></div>;
            })}</div>
            <YearlyObservedPatterns months={months} recordedMonthCount={yearlySymptomFrequencyDenominator} />
            <div className="coverage"><b>Data coverage</b><p>{months.length - recordedMonths.length} of {months.length} months have no meaningful health log. No record is not treated as symptom-free. Symptom-frequency percentages use recorded months as denominator.</p></div>
          </> : <>
            <h2>Symptom frequency <small>(recorded days)</small></h2>
            <div className="bars">{symptomFrequency.map((item) => {
              const pct = percentage(item.count, symptomFrequencyDenominator);
              return <div key={item.label}><span>{item.label}</span><i><b style={{ width: \`\${Math.max(item.count ? 2 : 0, pct)}%\` }} /></i><strong>{item.count} ({pct}%)</strong></div>;
            })}</div>
            <HealthReportObservedPatterns days={days} recordedDayCount={symptomFrequencyDenominator} />
            <div className="coverage"><b>Data coverage</b><p>{days.length - loggedDays.length} of {days.length} days have no meaningful health log. No record is not treated as symptom-free.</p></div>
          </>}
        </div>
      </div>
      <p className="subnote">{yearly ? "Yearly health values are summarized by calendar month and each month has equal weight. Panic and nausea use 1–10 scales; tetany and hot flashes use 1–5. Empty months mean no recorded intensity, not zero." : "Pain averages exclude symptom-only follow-ups. Panic and nausea use their current 1–10 scales; tetany and hot flashes use 1–5. Empty cells mean no recorded intensity, not zero."}</p>
    </Sheet>

    {yearly ? <Sheet number={2} title="Trends" subtitle={range}>
      <h2>Pain by month <small>monthly average of daily pain averages</small></h2>
      <div className="painBars">{months.map((month) => {
        const value = month.pain;
        const width = value == null ? 0 : Math.max(0, Math.min(100, value * 10));
        const color = value == null ? "#eef0e7" : painColor(value);
        return <div key={month.monthKey}><span>{monthLabel(month.monthKey, locale)}</span><i><b style={{ width: \`\${width}%\`, background: color }} /></i><strong>{value == null ? "—" : compactNumber(value)}</strong></div>;
      })}</div>
      <h2>Bowel distribution <small>most common recorded type per month; no-movement shown separately</small></h2>
      <div className="bowelBars">{Array.from({ length: 8 }, (_, type) => {
        const count = reportBowelTypes.filter((value) => value === type).length;
        const label = type === 0 ? "Type 0 — Mystery" : BRISTOL.find((item) => item.n === type)?.label ?? \`Type \${type}\`;
        const maxCount = Math.max(1, ...Array.from({ length: 8 }, (__, current) => reportBowelTypes.filter((value) => value === current).length));
        return <div key={type}><span>{label}</span><i><b style={{ width: \`\${(count / maxCount) * 100}%\` }} /></i><strong>{count}</strong></div>;
      })}</div>
      <div className="miniMetrics one"><Metric label="Months with no bowel movement" value={String(reportNoMovement)} note="Months containing an explicit no-movement record" /></div>
    </Sheet> : trendPages.map((trendDays, trendIndex) => <Sheet key={\`trends-\${trendIndex}\`} number={2 + trendIndex} title="Trends" subtitle={trendPages.length > 1 ? \`\${range} · Part \${trendIndex + 1} of \${trendPages.length}\` : range}>
      <h2>Pain by day <small>daily average of real pain measurements</small></h2>
      <div className="painBars">{trendDays.map((day) => {
        const value = day.pain;
        const width = value == null ? 0 : Math.max(0, Math.min(100, value * 10));
        const color = value == null ? "#eef0e7" : painColor(value);
        return <div key={day.key}><span>{shortDate(day.key, locale)}</span><i><b style={{ width: \`\${width}%\`, background: color }} /></i><strong>{value == null ? "—" : compactNumber(value)}</strong></div>;
      })}</div>
      {trendIndex === 0 ? <>
        <h2>Bowel distribution <small>Type 0 is valid; no-movement is shown separately</small></h2>
        <div className="bowelBars">{Array.from({ length: 8 }, (_, type) => {
          const count = bowelTypes.filter((value) => value === type).length;
          const label = type === 0 ? "Type 0 — Mystery" : BRISTOL.find((item) => item.n === type)?.label ?? \`Type \${type}\`;
          const maxCount = Math.max(1, ...Array.from({ length: 8 }, (__, current) => bowelTypes.filter((value) => value === current).length));
          return <div key={type}><span>{label}</span><i><b style={{ width: \`\${(count / maxCount) * 100}%\` }} /></i><strong>{count}</strong></div>;
        })}</div>
        <div className="miniMetrics one"><Metric label="No bowel movement" value={String(noMovement)} note="Recorded explicitly as no movement" /></div>
      </> : null}
    </Sheet>))}

    <Sheet number={medicationPage} title="Medication" subtitle={range}>
      <h2>Scheduled medication adherence <small>granular grouped-dose logic</small></h2>
      {scheduled.length ? <table className="adherenceTable"><thead><tr><th>Medication</th><th>Schedule</th><th>Taken / expected</th><th>Adherence</th></tr></thead><tbody>{scheduled.map((med) => {
        const trackingStart = firstRecordedScheduledMedicationDate(med, data.medLog, medLogItems);
        const adherenceDates = trackingStart ? dateKeys.filter((date) => date >= trackingStart) : dateKeys;
        const summary = summarizeMedicationAdherence(med, adherenceDates, data.medLog, medLogItems, new Date());
        return <tr key={med.id}><td><b>{med.name}</b>{med.dose ? <small>{med.dose}</small> : null}</td><td>{(med.times ?? []).map((time) => formatClockTime(time, units)).join(", ") || "—"}</td><td>{summary ? \`\${summary.taken} / \${summary.expected}\` : "—"}</td><td>{summary ? \`\${summary.pct}%\` : "—"}<div className="adhBar"><i><span style={{ width: \`\${summary?.pct ?? 0}%\` }} /></i></div></td></tr>;
      })}</tbody></table> : <p className="emptyLine">No scheduled medication configured.</p>}
      <p className="adherenceNote">For grouped medication slots, each selected item is counted separately. Future/not-yet-due doses are not treated as missed. When history exists, adherence starts at the first recorded scheduled-medication date.</p>
      <h2>Extra / PRN uses</h2>
      <table className="prnTable"><thead><tr><th>Medication</th><th>Recorded uses</th><th>Source</th></tr></thead><tbody>
        {asNeeded.map((med) => <tr key={med.id}><td>{med.name}{med.dose ? \` · \${med.dose}\` : ""}</td><td>{countRecordedPrnUses(med, dateKeys, data.dayLogs, data.medLog)}</td><td>PRN checkbox + matching extra-dose logs</td></tr>)}
        {[...extraCounts.entries()].filter(([key]) => !knownPrnNames.has(key)).map(([key, item]) => <tr key={key}><td>{item.label}</td><td>{item.count}</td><td>Extra-dose logs</td></tr>)}
        {!asNeeded.length && !extraCounts.size ? <tr><td colSpan={3}>No PRN / extra medication use recorded in this period.</td></tr> : null}
      </tbody></table>
    </Sheet>

    {yearly ? yearlyTimelinePages.map((pageMonths, pageIndex) => <Sheet key={\`yearly-timeline-\${pageIndex}\`} number={timelineStartPage + pageIndex} title="Detailed timeline" subtitle={\`\${range} · Part \${pageIndex + 1} of \${yearlyTimelinePages.length}\`}><p className="subnote">Monthly summaries only. Newest first.</p><YearlyTimelineTable months={pageMonths} data={data} units={units} locale={locale} /></Sheet>) : timelinePages.length ? timelinePages.map((pageDays, pageIndex) => <Sheet key={\`timeline-\${pageIndex}\`} number={timelineStartPage + pageIndex} title="Detailed timeline" subtitle={\`\${range} · Part \${pageIndex + 1} of \${timelinePages.length}\`}><p className="subnote">Only days with meaningful recorded data are shown. Newest first.</p><DetailedTimelineTable days={pageDays} data={data} units={units} locale={locale} /></Sheet>) : <Sheet number={timelineStartPage} title="Detailed timeline" subtitle={range}><p className="subnote">Only days with meaningful recorded data are shown. Newest first.</p><DetailedTimelineTable days={[]} data={data} units={units} locale={locale} /></Sheet>}

    {detailPages.length ? detailPages.map((pageRows, pageIndex) => <Sheet key={\`details-\${pageIndex}\`} number={detailStartPage + pageIndex} title="Recorded health details" subtitle={\`\${range} · Part \${pageIndex + 1} of \${detailPages.length}\`}><HealthReportDetailTable rows={pageRows} /></Sheet>) : <Sheet number={detailStartPage} title="Recorded health details" subtitle={range}><div className="empty">No health values were recorded in this period.</div></Sheet>}

    <div className="sr-only">{trendPageCount + 1 + timelinePageCount + Math.max(1, detailPages.length)} report pages after the overview</div>
  </div>;
}`;

const reportPattern = /function ReportDocument\([\s\S]*?\n}\n\nexport function HealthReportPageAudited/;
if (!reportPattern.test(page)) throw new Error("Could not locate ReportDocument function");
page = page.replace(reportPattern, `${newReportDocument}\n\nexport function HealthReportPageAudited`);

page = replaceOrThrow(page,
`  const [start, end] = useMemo(() => preset === "custom"
    ? [customStart <= customEnd ? customStart : customEnd, customStart <= customEnd ? customEnd : customStart]
    : [addDays(today, -(Number(preset) - 1)), today], [preset, customStart, customEnd, today]);
  const days = useMemo(() => eachDate(start, end).map((key) => summarizeReportDay(key, view.dayLogs[key] ?? {}, view.dayNotes?.[key])), [start, end, view.dayLogs, view.dayNotes]);
  const range = \`${"${longDate(start, locale)}"} – \${longDate(end, locale)} · \${days.length}-day report\`;
  const report = <ReportDocument days={days} data={view} range={range} locale={locale} units={units} />;`,
`  const [start, end] = useMemo(() => preset === "custom"
    ? [customStart <= customEnd ? customStart : customEnd, customStart <= customEnd ? customEnd : customStart]
    : preset === "365" ? twelveCalendarMonthRange(today)
      : [addDays(today, -(Number(preset) - 1)), today], [preset, customStart, customEnd, today]);
  const days = useMemo(() => eachDate(start, end).map((key) => summarizeReportDay(key, view.dayLogs[key] ?? {}, view.dayNotes?.[key])), [start, end, view.dayLogs, view.dayNotes]);
  const range = preset === "365" ? \`${"${longDate(start, locale)}"} – \${longDate(end, locale)} · 12-month report\` : \`${"${longDate(start, locale)}"} – \${longDate(end, locale)} · \${days.length}-day report\`;
  const report = <ReportDocument days={days} data={view} range={range} locale={locale} units={units} yearly={preset === "365"} />;`,
"yearly preset range");

const cssAfter = page.slice(page.indexOf(cssMarker));
if (cssAfter !== cssBefore) throw new Error("CSS changed; aborting yearly patch");
fs.writeFileSync(pagePath, page);

console.log("Applied yearly monthly PDF patch without modifying CSS.");
