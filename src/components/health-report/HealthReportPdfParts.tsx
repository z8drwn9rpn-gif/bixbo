import type { CSSProperties } from "react";

import { resolveScheduledDose } from "@/lib/domain/meds";
import { average, mode, reportPeriodLevel, type ReportDaySummary } from "@/lib/healthReport";
import { formatClockTime, formatTemperature, formatWeight, type UnitPreferences } from "@/lib/preferences";
import type { BixboData, PeriodLevel } from "@/lib/storage";

type HeatColumn = { key: string; label: string; days: ReportDaySummary[] };

const PAIN_COLORS = [
  "#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B",
  "#F47B16", "#F05A28", "#EF4444", "#DC2626", "#B91C1C",
] as const;

// PDF-safe sRGB equivalents of BIXBO's period semantic tokens. Using fixed
// sRGB here prevents html2canvas from dropping modern OKLCH period colours.
const PERIOD_PDF_COLORS: Record<Exclude<PeriodLevel, "">, string> = {
  spotting: "#C7CFF3",
  light: "#8D9DF5",
  medium: "#5F60E0",
  heavy: "#452CB4",
  "very-heavy": "#320080",
};

const fromIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const compactNumber = (value: number | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(1).replace(/\.0$/, "");
const longDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const shortDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short" });
const painColor = (value: number) => PAIN_COLORS[Math.max(0, Math.min(10, Math.round(value)))];
const percentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;
const humanize = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());

function heatColumns(days: ReportDaySummary[], locale: string): HeatColumn[] {
  if (days.length <= 31) return days.map((day) => ({ key: day.key, label: fromIso(day.key).toLocaleDateString(locale, { day: "numeric" }), days: [day] }));
  const grouped = new Map<string, ReportDaySummary[]>();
  days.forEach((day) => {
    const month = day.key.slice(0, 7);
    grouped.set(month, [...(grouped.get(month) ?? []), day]);
  });
  return [...grouped.entries()].map(([key, values]) => ({ key, label: fromIso(`${key}-01`).toLocaleDateString(locale, { month: "short" }), days: values }));
}

function insightSeverityColor(value: number, max: number): string {
  if (max === 5) {
    const normalized = ((Math.max(1, Math.min(5, value)) - 1) / 4) * 10;
    return painColor(normalized);
  }
  return painColor(Math.max(0, Math.min(10, value)));
}

function strongestPeriodLevel(group: ReportDaySummary[], data: BixboData): Exclude<PeriodLevel, ""> | undefined {
  const order: Exclude<PeriodLevel, "">[] = ["spotting", "light", "medium", "heavy", "very-heavy"];
  let strongest: Exclude<PeriodLevel, ""> | undefined;
  group.forEach((day) => {
    const level = reportPeriodLevel(day.key, day.log, data.cycle);
    if (!level) return;
    if (!strongest || order.indexOf(level) > order.indexOf(strongest)) strongest = level;
  });
  return strongest;
}

export function HealthReportHeatmap({ days, locale, data }: { days: ReportDaySummary[]; locale: string; data: BixboData }) {
  const columns = heatColumns(days, locale);
  const rows = [
    { label: "Pain", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.pain)) },
    { label: "Headache", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.headache)) },
    { label: "Hot flashes", max: 5, value: (group: ReportDaySummary[]) => average(group.map((day) => day.hotFlashes)) },
    { label: "Tetany", max: 5, value: (group: ReportDaySummary[]) => average(group.map((day) => day.tetany)) },
    { label: "Panic", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.panic)) },
    { label: "Nausea", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.nausea)) },
  ];
  return <div className="heat" style={{ "--cells": columns.length } as CSSProperties}>
    <div className="heatRow heatHead"><span />{columns.map((column) => <b key={column.key}>{column.label}</b>)}</div>
    <div className="heatRow"><span>Period / spotting</span>{columns.map((column) => {
      const level = strongestPeriodLevel(column.days, data);
      return <i key={column.key} style={{ background: level ? PERIOD_PDF_COLORS[level] : "#FFFFFF" }} title={level ? `Period / spotting · ${humanize(level)}` : "No data"} />;
    })}</div>
    {rows.map((item) => <div className="heatRow" key={item.label}><span>{item.label}</span>{columns.map((column) => {
      const value = item.value(column.days);
      return <i key={column.key} style={{ background: value == null ? "#FFFFFF" : insightSeverityColor(value, item.max) }} title={value == null ? "No data" : `${compactNumber(value)}/${item.max}`} />;
    })}</div>)}
  </div>;
}

export function HealthReportHeatLegend() {
  const periodGradient = `linear-gradient(90deg, ${PERIOD_PDF_COLORS.spotting}, ${PERIOD_PDF_COLORS.light}, ${PERIOD_PDF_COLORS.medium}, ${PERIOD_PDF_COLORS.heavy}, ${PERIOD_PDF_COLORS["very-heavy"]})`;
  return <div className="heatLegend">
    <span><i style={{ background: "#FFFFFF" }} />No data</span>
    <span><i style={{ background: PAIN_COLORS[2] }} />Mild (1–25%)</span>
    <span><i style={{ background: PAIN_COLORS[5] }} />Moderate (26–50%)</span>
    <span><i style={{ background: PAIN_COLORS[8] }} />Severe (51–75%)</span>
    <span><i style={{ background: PAIN_COLORS[10] }} />Very severe (76–100%)</span>
    <span><i style={{ background: periodGradient }} />Period / spotting</span>
  </div>;
}

function painDayHighlights(days: ReportDaySummary[]) {
  const painDays = days.filter((day) => day.pain != null);
  const mostPainfulDay = painDays.reduce<ReportDaySummary | undefined>((best, day) => {
    if (!best) return day;
    const value = day.pain ?? Number.NEGATIVE_INFINITY;
    const bestValue = best.pain ?? Number.NEGATIVE_INFINITY;
    if (value > bestValue || (value === bestValue && day.key > best.key)) return day;
    return best;
  }, undefined);
  const bestPainFreeDay = [...painDays].reverse().find((day) => day.pain === 0);
  return { mostPainfulDay, bestPainFreeDay };
}

function PainDayHighlights({ days, locale }: { days: ReportDaySummary[]; locale: string }) {
  const { mostPainfulDay, bestPainFreeDay } = painDayHighlights(days);
  const cardStyle: CSSProperties = { border: "1px solid #dde1cf", borderRadius: 7, padding: "6px 8px", minWidth: 0 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 6, fontWeight: 700, textTransform: "uppercase" };
  const valueStyle: CSSProperties = { display: "block", fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 12, marginTop: 2 };
  const noteStyle: CSSProperties = { display: "block", fontSize: 5.8, color: "#707668", lineHeight: 1.2, marginTop: 2 };
  return <div style={{ marginTop: 7 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
      <div style={cardStyle}>
        <span style={labelStyle}>Most painful day</span>
        <strong style={valueStyle}>{mostPainfulDay ? shortDate(mostPainfulDay.key, locale) : "—"}</strong>
        <small style={noteStyle}>{mostPainfulDay?.pain != null ? `${compactNumber(mostPainfulDay.pain)}/10 daily average` : "No pain value recorded"}</small>
      </div>
      <div style={cardStyle}>
        <span style={labelStyle}>Best day without pain</span>
        <strong style={valueStyle}>{bestPainFreeDay ? shortDate(bestPainFreeDay.key, locale) : "—"}</strong>
        <small style={noteStyle}>{bestPainFreeDay ? "Explicit 0/10 pain day" : "No explicit 0/10 pain day recorded"}</small>
      </div>
    </div>
    <p style={{ margin: "5px 0 0", fontSize: 5.8, lineHeight: 1.25, color: "#707668" }}>A pain-free day requires an explicit 0/10 pain value. Missing pain data is never treated as zero.</p>
  </div>;
}

export function HealthReportObservedPatterns({ days }: { days: ReportDaySummary[] }) {
  const headacheDays = days.filter((day) => (day.log.pain ?? []).some((entry) => entry.headache || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0));
  const hotFlashDays = days.filter((day) => (day.log.pain ?? []).some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0));
  const panicDays = days.filter((day) => (day.log.panic?.length ?? 0) > 0);
  const commonBowel = mode(days.flatMap((day) => day.bowelTypes));
  const patterns: string[] = [];
  if (headacheDays.length >= 2) patterns.push(`Headache was recorded on ${headacheDays.length} days; ${headacheDays.filter((day) => day.pain != null).length} overlapped with a recorded pain value.`);
  if (hotFlashDays.length >= 2) patterns.push(`Hot flashes were recorded on ${hotFlashDays.length} days (${percentage(hotFlashDays.length, days.length)}% of range).`);
  if (panicDays.length) patterns.push(`${panicDays.length} panic-attack day${panicDays.length === 1 ? "" : "s"} recorded.`);
  if (commonBowel != null) patterns.push(`Most common recorded bowel value: Type ${commonBowel}.`);
  return <div className="observedPatterns">
    <h2>Observed patterns</h2>
    <div style={{ display: "grid", gap: 3 }}>
      {patterns.length ? patterns.map((pattern, index) => <div key={pattern} style={{ display: "grid", gridTemplateColumns: "17px 1fr", gap: 4, fontSize: 6.2, lineHeight: 1.25 }}><b style={{ color: "#7f8950" }}>{String(index + 1).padStart(2, "0")}</b><span>{pattern}</span></div>) : <p style={{ margin: 0, fontSize: 6.2, lineHeight: 1.25, color: "#707668" }}>No repeated pattern met the report threshold in this range.</p>}
    </div>
  </div>;
}

export function HealthReportPainTrend({ days, locale }: { days: ReportDaySummary[]; locale: string }) {
  const points = days.map((day, index) => day.pain == null ? null : { index, value: day.pain, key: day.key }).filter((item): item is { index: number; value: number; key: string } => item != null);
  if (points.length < 2) return <><div className="emptyTrend">Not enough pain data for a trend.</div><PainDayHighlights days={days} locale={locale} /></>;
  const width = 650;
  const height = 170;
  const left = 34;
  const right = 10;
  const top = 18;
  const bottom = 34;
  const x = (index: number) => left + (index / Math.max(1, days.length - 1)) * (width - left - right);
  const y = (value: number) => height - bottom - (value / 10) * (height - top - bottom);
  const tickEvery = Math.max(1, Math.ceil(days.length / 10));
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
    <svg viewBox={`0 0 ${width} ${height}`} className="chart">
      {[0, 2, 4, 6, 8, 10].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 7} y={y(value) + 3} textAnchor="end">{value}</text></g>)}
      {days.map((day, index) => (index % tickEvery === 0 || index === days.length - 1) ? <text key={day.key} className="xLabel" x={x(index)} y={height - 9} textAnchor="middle">{shortDate(day.key, locale)}</text> : null)}
      {segments.map((items, index) => items.length > 1 ? <polyline key={index} points={items.map((point) => `${x(point.index)},${y(point.value)}`).join(" ")} /> : null)}
      {points.map((point) => <g key={point.key}><circle cx={x(point.index)} cy={y(point.value)} r="3.2" fill={painColor(point.value)} /><text className="pointLabel" x={x(point.index)} y={y(point.value) - 7} textAnchor="middle">{compactNumber(point.value)}</text></g>)}
    </svg>
    <div className="trendLegend"><span><i />Pain daily average</span><span>Missing day = no recorded pain value, not zero</span></div>
    <PainDayHighlights days={days} locale={locale} />
  </>;
}

function timelineFacts(day: ReportDaySummary): string {
  const values: string[] = [];
  if (day.pain != null) values.push(`Pain ${compactNumber(day.pain)}/10`);
  if (day.headache != null) values.push(`Headache ${compactNumber(day.headache)}/10`);
  if (day.hotFlashes != null) values.push(`Hot flashes ${compactNumber(day.hotFlashes)}/5`);
  if (day.tetany != null) values.push(`Tetany ${compactNumber(day.tetany)}/5`);
  if (day.panic != null) values.push(`Panic ${compactNumber(day.panic)}/10`);
  if (day.nausea != null) values.push(`Nausea ${compactNumber(day.nausea)}/10`);
  if (day.bowelTypes.length) values.push(`Bowel ${day.bowelTypes.map((type) => `T${type}`).join(", ")}`);
  if (day.noBowelMovementCount) values.push(`No bowel movement ×${day.noBowelMovementCount}`);
  return values.join(" · ") || "—";
}

function timelineTakenMeds(day: ReportDaySummary, data: BixboData, units: UnitPreferences): string {
  const taken: string[] = [];
  data.meds.filter((med) => !med.asNeeded).forEach((med) => {
    (med.times ?? []).forEach((scheduledTime) => {
      const state = resolveScheduledDose(med, day.key, scheduledTime, data.medLog, data.medLogItems ?? {}, new Date());
      if (!state.selectedItems.length) return;
      taken.push(`${med.name}${med.dose ? ` ${med.dose}` : ""} · ${formatClockTime(data.medLogTimes?.[day.key]?.[state.key] ?? scheduledTime, units)}`);
    });
  });
  return taken.join(" · ") || "—";
}

function timelineExtraMeds(day: ReportDaySummary, data: BixboData, units: UnitPreferences): string {
  const values = (day.log.extraMeds ?? []).map((entry) => `${entry.name}${entry.dose ? ` ${entry.dose}` : ""}${entry.time ? ` · ${formatClockTime(entry.time, units)}` : ""}`);
  data.meds.filter((med) => med.asNeeded).forEach((med) => {
    const key = `${med.id}@asneeded`;
    if (data.medLog[day.key]?.[key]) values.push(`${med.name}${med.dose ? ` ${med.dose}` : ""}${data.medLogTimes?.[day.key]?.[key] ? ` · ${formatClockTime(data.medLogTimes[day.key][key], units)}` : ""}`);
  });
  return values.join(" · ") || "—";
}

function timelineTens(day: ReportDaySummary, units: UnitPreferences): string {
  const values = (day.log.heat ?? []).filter((entry) => entry.kind === "tens").map((entry) => {
    const duration = entry.ongoing ? "ongoing" : `${entry.minutes} min`;
    return `${formatClockTime(entry.start, units)} · ${duration}`;
  });
  return values.join(" · ") || "—";
}

function timelineContext(day: ReportDaySummary, data: BixboData, units: UnitPreferences): string {
  const values: string[] = [];
  const period = reportPeriodLevel(day.key, day.log, data.cycle);
  if (period) values.push(`Period: ${humanize(period)}`);
  if (day.log.food?.length) values.push(`Food: ${day.log.food.map((entry) => entry.what).filter(Boolean).slice(0, 3).join(", ")}`);
  if (day.log.workout?.length) values.push(`Workout: ${day.log.workout.map((entry) => entry.kind).filter(Boolean).slice(0, 3).join(", ")}`);
  if (day.log.sleepHours != null) values.push(`Sleep: ${day.log.sleepHours} h`);
  const latestWeight = day.log.weightEntries?.at(-1)?.value ?? day.log.weight;
  if (latestWeight != null) values.push(`Weight: ${formatWeight(latestWeight, units)}`);
  const latestTemp = day.log.temperatureEntries?.at(-1)?.value ?? day.log.temperature;
  if (latestTemp != null) values.push(`Temp: ${formatTemperature(latestTemp, units)}`);
  if (day.log.mood?.length) values.push(`Mood: ${day.log.mood.map((entry) => entry.value).join(", ")}`);
  if (day.log.energy?.length) values.push(`Energy: ${day.log.energy.map((entry) => entry.value).join(", ")}`);
  if (day.log.histamine?.some((entry) => entry.flare)) values.push("Histamine flare");
  if (day.notes.length) values.push(`Notes: ${day.notes.join(" | ")}`);
  return values.join(" · ") || "—";
}

export function packTimelineDays(days: ReportDaySummary[]): ReportDaySummary[][] {
  const pages: ReportDaySummary[][] = [];
  for (let index = 0; index < days.length; index += 10) pages.push(days.slice(index, index + 10));
  return pages;
}

export function DetailedTimelineTable({ days, data, units, locale }: { days: ReportDaySummary[]; data: BixboData; units: UnitPreferences; locale: string }) {
  return <table className="timeline"><thead><tr><th>Date</th><th>Pain & symptoms</th><th>Taken meds</th><th>Extra meds / PRN</th><th>TENS</th><th>Context / notes</th></tr></thead><tbody>{days.length ? days.map((day) => <tr key={day.key}><td><b>{longDate(day.key, locale)}</b></td><td>{timelineFacts(day)}</td><td>{timelineTakenMeds(day, data, units)}</td><td>{timelineExtraMeds(day, data, units)}</td><td>{timelineTens(day, units)}</td><td>{timelineContext(day, data, units)}</td></tr>) : <tr><td colSpan={6}>No meaningful daily records in this range.</td></tr>}</tbody></table>;
}
