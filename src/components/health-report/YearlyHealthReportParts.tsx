import type { CSSProperties } from "react";

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
