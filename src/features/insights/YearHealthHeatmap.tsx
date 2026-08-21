import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons/BixboExtraIcons";
import { ChartCard } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_REGISTRY, customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, registryAdminHeatmapFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";
import { BRISTOL, PAIN_DESCRIPTIONS, fromKey, periodLabel, toKey, useBixbo } from "@/lib/storage";
import {
  BRISTOL_MYSTERY_COLOR,
  HOT_FLASH_DESCRIPTIONS,
  INSIGHT_COLORS,
  InsightFloatingTooltip,
  MON_SHORT3,
  TrText,
  VIVID_PAIN_CHART_COLORS,
  eachDay,
  fmtTapDay,
  rangeFor,
  strictAdminNumericValue,
  vividPainChartColor,
  type HeatmapPeriod,
  type InsightTooltipDetails,
} from "./shared";

type HeatmapMetric = "pain" | "mental" | "period" | "bowel" | "panic" | "tetany" | "hotFlashes" | "sleep" | "sex" | `custom:${string}:${string}` | `admin:${RegistryFeatureId}:${string}`;
type HeatmapDatum = { color: string; tooltipColor: string; value: string; popupValue: string; description: string; entryCount: number };
const HEATMAP_OPTIONS: { id: HeatmapMetric; label: string }[] = [
  { id: "pain", label: "Pain" }, { id: "mental", label: "Mental distress" }, { id: "period", label: "Period" }, { id: "bowel", label: "Bowel" },
  { id: "panic", label: "Panic episode" }, { id: "tetany", label: "Tetany episode" }, { id: "hotFlashes", label: "Hot flashes" },
  { id: "sleep", label: "Sleep" }, { id: "sex", label: "ŠukŠuk!" },
];
const MENTAL_DISTRESS_DESCRIPTIONS = [
  "None", "Very mild", "Mild", "Uncomfortable", "Moderate", "Distressing", "Strong", "Severe", "Very severe", "Extreme", "Worst possible",
] as const;

function heatmapPeriodColor(level?: string | null): string {
  switch (level) {
    case "spotting": return "var(--period-spotting)";
    case "light": return "var(--period-light)";
    case "medium": return "var(--period-medium)";
    case "heavy": return "var(--period-heavy)";
    case "very-heavy": return "var(--period-veryheavy)";
    default: return "var(--period-medium)";
  }
}
function fiveLevelSeverityColor(value: number): string { return vividPainChartColor(((Math.max(1, Math.min(5, value)) - 1) / 4) * 10); }
function sleepHeatmapColor(hours: number): string {
  if (hours < 4) return VIVID_PAIN_CHART_COLORS[10];
  if (hours < 5) return VIVID_PAIN_CHART_COLORS[8];
  if (hours < 6) return VIVID_PAIN_CHART_COLORS[6];
  if (hours < 7) return VIVID_PAIN_CHART_COLORS[4];
  if (hours <= 9) return VIVID_PAIN_CHART_COLORS[0];
  return INSIGHT_COLORS.teal;
}

export function YearHealthHeatmap({ data, anchor, onShiftPeriod }: {
  data: ReturnType<typeof useBixbo>["data"];
  anchor: Date;
  onShiftPeriod: (period: HeatmapPeriod, delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const availableHeatmapOptions = useMemo(() => {
    const builtins = HEATMAP_OPTIONS.filter((option) => option.id === "mental" || isRegistrySurfaceEnabled(data, option.id as RegistryFeatureId, "heatmap"))
      .map((option) => option.id === "mental" ? option : ({ ...option, label: getRegistryFeature(data, option.id as RegistryFeatureId).label }));
    const customs = customLogDefinitions(data).flatMap((log) => {
      if (!log.heatmapFieldId) return [];
      if (log.heatmapFieldId === "__count__") return [{ id: `custom:${log.id}:__count__` as HeatmapMetric, label: log.label }];
      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));
      return field ? [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }] : [];
    });
    const adminFields = BIXBO_REGISTRY.flatMap((featureBase) => {
      const feature = getRegistryFeature(data, featureBase.id);
      return registryAdminHeatmapFieldsForFeature(data, featureBase.id).map((field) => ({ id: `admin:${featureBase.id}:${field.id}` as HeatmapMetric, label: `${feature.label} · ${field.label}` }));
    });
    return [...builtins, ...adminFields, ...customs];
  }, [data]);

  const [metric, setMetric] = useState<HeatmapMetric>("pain");
  const [active, setActive] = useState<string | null>(null);
  const [yearTooltipAnchor, setYearTooltipAnchor] = useState<{ halfIndex: number; leftPct: number; top: number; connectorSide: "top" | "bottom" } | null>(null);
  const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>("Y");
  const year = anchor.getFullYear();

  useEffect(() => {
    if (availableHeatmapOptions.some((option) => option.id === metric)) return;
    const fallback = availableHeatmapOptions[0]?.id;
    if (fallback) setMetric(fallback);
  }, [availableHeatmapOptions, metric]);
  useEffect(() => { setActive(null); setYearTooltipAnchor(null); }, [anchor, heatmapPeriod, metric]);

  const datumFor = useCallback((key: string, selectedMetric: HeatmapMetric): HeatmapDatum | null => {
    const log = data.dayLogs[key];
    if (!log) return null;
    if (selectedMetric.startsWith("admin:")) {
      const [, rawFeatureId, fieldId] = selectedMetric.split(":");
      const featureId = rawFeatureId as RegistryFeatureId;
      const feature = getRegistryFeature(data, featureId);
      const field = registryAdminHeatmapFieldsForFeature(data, featureId).find((item) => item.id === fieldId);
      const values = (log.adminFields?.[featureId] ?? []).map((entry) => strictAdminNumericValue(entry.values[fieldId])).filter(Number.isFinite);
      if (!field || !values.length) return null;
      const value = values.reduce((sum, item) => sum + item, 0) / values.length;
      const min = field.scale?.min ?? 0; const max = field.scale?.max ?? Math.max(10, ...values); const span = Math.max(0.0001, max - min);
      const normalized = Math.max(0, Math.min(10, ((value - min) / span) * 10));
      const shownValue = Number.isInteger(value) ? String(value) : value.toFixed(1);
      return { color: vividPainChartColor(normalized), tooltipColor: vividPainChartColor(normalized), value: shownValue, popupValue: `${field.label} · ${shownValue}`, description: feature.label, entryCount: values.length };
    }
    if (selectedMetric.startsWith("custom:")) {
      const [, logId, fieldId] = selectedMetric.split(":");
      const definition = customLogDefinitions(data).find((item) => item.id === logId);
      const entries = log.customLogs?.[logId] ?? [];
      if (!definition || !entries.length) return null;
      if (fieldId === "__count__") return { color: definition.color, tooltipColor: definition.color, value: `${entries.length}×`, popupValue: `${definition.label} · ${entries.length}×`, description: entries.length === 1 ? "1 entry" : `${entries.length} entries`, entryCount: entries.length };
      const field = definition.fields.find((item) => item.id === fieldId);
      const values = entries.map((entry) => strictAdminNumericValue(entry.values[fieldId])).filter(Number.isFinite);
      if (!field || !values.length) return null;
      const value = values.reduce((sum, item) => sum + item, 0) / values.length;
      const min = field.scale?.min ?? Math.min(...values, 0); const max = field.scale?.max ?? Math.max(...values, 10); const span = Math.max(0.0001, max - min);
      const normalized = Math.max(0, Math.min(10, ((value - min) / span) * 10));
      return { color: vividPainChartColor(normalized), tooltipColor: vividPainChartColor(normalized), value: Number.isInteger(value) ? String(value) : value.toFixed(1), popupValue: `${field.label} · ${Number.isInteger(value) ? value : value.toFixed(1)}`, description: definition.label, entryCount: values.length };
    }
    if (selectedMetric === "pain") {
      const entries = (log.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update" && Number.isFinite(entry.score)); if (!entries.length) return null;
      const value = entries.reduce((sum, entry) => sum + Number(entry.score), 0) / entries.length; const rounded = Math.max(0, Math.min(10, Math.round(value)));
      return { color: vividPainChartColor(value), tooltipColor: vividPainChartColor(value), value: `${value.toFixed(1)}/10`, popupValue: entries.length > 1 ? `Pain avg ${value.toFixed(1)}/10` : `Pain ${value.toFixed(1)}/10`, description: PAIN_DESCRIPTIONS[rounded] ?? "Pain", entryCount: entries.length };
    }
    if (selectedMetric === "mental") {
      const entries = ((log as typeof log & { mentalWellbeing?: Array<{ distress: number }> }).mentalWellbeing ?? [])
        .filter((entry) => Number.isFinite(entry.distress) && entry.distress >= 0 && entry.distress <= 10);
      if (!entries.length) return null;
      const value = entries.reduce((sum, entry) => sum + Number(entry.distress), 0) / entries.length;
      const rounded = Math.max(0, Math.min(10, Math.round(value)));
      return {
        color: vividPainChartColor(value),
        tooltipColor: vividPainChartColor(value),
        value: `${value.toFixed(1)}/10`,
        popupValue: entries.length > 1 ? `Mental distress avg ${value.toFixed(1)}/10` : `Mental distress ${value.toFixed(1)}/10`,
        description: MENTAL_DISTRESS_DESCRIPTIONS[rounded] ?? "Mental distress",
        entryCount: entries.length,
      };
    }
    if (selectedMetric === "period") {
      const level = log.periodInfo?.level ?? log.period; if (!level) return null;
      return { color: heatmapPeriodColor(level), tooltipColor: heatmapPeriodColor(level), value: periodLabel(level) || String(level), popupValue: `Period · ${periodLabel(level) || String(level)}`, description: "Logged period flow", entryCount: 1 };
    }
    if (selectedMetric === "bowel") {
      const entries = (log.bowel ?? []).filter((entry) => { const type = Number(entry.bristol); return Number.isInteger(type) && type >= 0 && type <= 7; }); if (!entries.length) return null;
      const type = Number(entries[entries.length - 1].bristol); const bristol = BRISTOL.find((item) => item.n === type); const typeZero = type === 0;
      return { color: typeZero ? BRISTOL_MYSTERY_COLOR : bristol?.color ?? INSIGHT_COLORS.sage, tooltipColor: typeZero ? "#8B5CF6" : bristol?.color ?? INSIGHT_COLORS.sage, value: `Type ${type}`, popupValue: `Bowel · Type ${type}`, description: typeZero ? "Type 0" : bristol?.sub ?? "Bowel entry", entryCount: entries.length };
    }
    if (selectedMetric === "panic") {
      const entries = (log.panic ?? []).filter((entry) => Number.isFinite(entry.intensity)); if (!entries.length) return null;
      const value = entries.reduce((sum, entry) => sum + Number(entry.intensity), 0) / entries.length; const trigger = entries.find((entry) => entry.trigger?.trim())?.trigger?.trim();
      return { color: vividPainChartColor(value), tooltipColor: vividPainChartColor(value), value: `${value.toFixed(1)}/10 avg`, popupValue: entries.length > 1 ? `Panic avg ${value.toFixed(1)}/10` : `Panic ${value.toFixed(1)}/10`, description: trigger ? `Trigger: ${trigger}` : "Panic episode", entryCount: entries.length };
    }
    if (selectedMetric === "tetany") {
      const entries = (log.tetany ?? []).filter((entry) => Number.isFinite(entry.intensity)); if (!entries.length) return null;
      const value = entries.reduce((sum, entry) => sum + Number(entry.intensity), 0) / entries.length; const firstType = entries.find((entry) => entry.types?.length)?.types?.join(", ");
      return { color: fiveLevelSeverityColor(value), tooltipColor: fiveLevelSeverityColor(value), value: `${value.toFixed(1)}/5 avg`, popupValue: entries.length > 1 ? `Tetany avg ${value.toFixed(1)}/5` : `Tetany ${value.toFixed(1)}/5`, description: firstType ? `Type: ${firstType}` : "Tetany episode", entryCount: entries.length };
    }
    if (selectedMetric === "hotFlashes") {
      const entries = (log.pain ?? []).filter((entry) => entry.hotFlashes != null && Number.isFinite(entry.hotFlashes) && entry.hotFlashes > 0); if (!entries.length) return null;
      const value = entries.reduce((sum, entry) => sum + Number(entry.hotFlashes), 0) / entries.length; const rounded = Math.max(1, Math.min(5, Math.round(value)));
      return { color: fiveLevelSeverityColor(value), tooltipColor: fiveLevelSeverityColor(value), value: `${value.toFixed(1)}/5 avg`, popupValue: entries.length > 1 ? `Hot flashes avg ${value.toFixed(1)}/5` : `Hot flashes ${value.toFixed(1)}/5`, description: HOT_FLASH_DESCRIPTIONS[rounded] ?? "Hot flashes", entryCount: entries.length };
    }
    if (selectedMetric === "sex") {
      const entries = log.sex ?? []; if (!entries.length) return null; const feature = getRegistryFeature(data, "sex"); const latest = entries[entries.length - 1];
      const kindLabels: Record<string, string> = { sex: "Sex", fingering: "Fingering", suck_dick: "Oral — giving", oral: "Oral", other: "Other", sex_with_condom: "Sex with condom", sex_without_condom: "Sex without condom", oral_giving: "Oral — giving", oral_receiving: "Oral — receiving" };
      return { color: feature.color, tooltipColor: feature.color, value: `${entries.length}×`, popupValue: feature.label, description: `Latest: ${kindLabels[latest.kind] ?? String(latest.kind)}`, entryCount: entries.length };
    }
    const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours; if (hours == null || !Number.isFinite(hours)) return null;
    const quality = log.sleepQuality ? Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : String(log.sleepQuality) : "";
    return { color: sleepHeatmapColor(hours), tooltipColor: sleepHeatmapColor(hours), value: `${hours.toFixed(1)} h`, popupValue: `Sleep ${hours.toFixed(1)} h`, description: quality ? `Quality: ${quality}` : "Sleep duration", entryCount: 1 };
  }, [data]);

  const compactDays = useMemo(() => heatmapPeriod === "Y" ? [] : (() => { const { startK, endK } = rangeFor(heatmapPeriod === "7D" ? "W" : "M", anchor); return eachDay(startK, endK); })(), [anchor, heatmapPeriod]);
  const heatmapNavigationLabel = useMemo(() => {
    if (heatmapPeriod === "Y") return String(year);
    if (heatmapPeriod === "30D") return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (!compactDays.length) return "";
    const start = fromKey(compactDays[0]); const end = fromKey(compactDays[compactDays.length - 1]);
    const sm = start.toLocaleDateString("en-GB", { month: "short" }); const em = end.toLocaleDateString("en-GB", { month: "short" });
    if (start.getFullYear() !== end.getFullYear()) return `${start.getDate()} ${sm} ${start.getFullYear()} – ${end.getDate()} ${em} ${end.getFullYear()}`;
    if (start.getMonth() !== end.getMonth()) return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${end.getFullYear()}`;
    return `${start.getDate()}–${end.getDate()} ${em} ${end.getFullYear()}`;
  }, [anchor, compactDays, heatmapPeriod, year]);

  const heatmapData = useMemo<Record<string, HeatmapDatum | null>>(() => {
    const result: Record<string, HeatmapDatum | null> = {};
    if (heatmapPeriod === "Y") { for (let month = 0; month < 12; month++) for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) { const key = toKey(new Date(year, month, day)); result[key] = datumFor(key, metric); } }
    else compactDays.forEach((key) => { result[key] = datumFor(key, metric); });
    return result;
  }, [compactDays, datumFor, heatmapPeriod, metric, year]);

  const halfYearGrids = useMemo(() => {
    const makeHalf = (startMonth: number, endMonth: number) => {
      const periodStart = new Date(year, startMonth, 1); periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(year, endMonth + 1, 0); periodEnd.setHours(0, 0, 0, 0);
      const first = new Date(periodStart); first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
      const last = new Date(periodEnd); last.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));
      const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const weekCount = Math.round((utcDay(last) - utcDay(first)) / 86400000 / 7) + 1;
      const weeks = Array.from({ length: weekCount }, (_, weekIndex) => Array.from({ length: 7 }, (_, weekdayIndex) => { const date = new Date(first); date.setDate(first.getDate() + weekIndex * 7 + weekdayIndex); return date; }));
      const months = Array.from({ length: endMonth - startMonth + 1 }, (_, offset) => { const monthIndex = startMonth + offset; const monthStart = new Date(year, monthIndex, 1); return { label: MON_SHORT3[monthIndex], weekIndex: Math.floor((utcDay(monthStart) - utcDay(first)) / 86400000 / 7), monthIndex }; });
      return { startMonth, endMonth, weeks, months, weekCount };
    };
    return [makeHalf(0, 5), makeHalf(6, 11)];
  }, [year]);

  const activeMetricLabel = availableHeatmapOptions.find((option) => option.id === metric)?.label ?? "Heatmap";
  const activeDatum = active ? heatmapData[active] ?? null : null;
  const activePosition = useMemo(() => {
    if (!active || heatmapPeriod !== "Y") return null;
    const activeDate = fromKey(active);
    for (let halfIndex = 0; halfIndex < halfYearGrids.length; halfIndex++) {
      const half = halfYearGrids[halfIndex];
      if (activeDate.getMonth() < half.startMonth || activeDate.getMonth() > half.endMonth) continue;
      for (let weekIndex = 0; weekIndex < half.weeks.length; weekIndex++) { const weekdayIndex = half.weeks[weekIndex].findIndex((date) => toKey(date) === active); if (weekdayIndex >= 0) return { halfIndex, weekIndex, weekdayIndex }; }
    }
    return null;
  }, [active, halfYearGrids, heatmapPeriod]);
  const compactActivePosition = useMemo(() => !active || heatmapPeriod === "Y" ? null : (() => { const index = compactDays.indexOf(active); return index < 0 ? null : { index, row: Math.floor(index / 7), column: index % 7 }; })(), [active, compactDays, heatmapPeriod]);
  const compactTooltipLayout = useMemo(() => !compactActivePosition ? null : (() => { const selectedCenterY = 78 + compactActivePosition.row * 49 + 22; const showBelow = compactActivePosition.row === 0; return { leftPct: ((compactActivePosition.column + 0.5) / 7) * 100, top: showBelow ? selectedCenterY + 5 : Math.max(2, selectedCenterY - 72), connectorSide: (showBelow ? "top" : "bottom") as "top" | "bottom" }; })(), [compactActivePosition]);
  const activeTooltip = useMemo<InsightTooltipDetails | null>(() => {
    if (!active || !activeDatum) return null;
    const entryText = activeDatum.entryCount > 1 ? `${activeDatum.entryCount} entries` : activeDatum.entryCount === 1 ? "1 entry" : "";
    return { owner: "You", heading: fmtTapDay(active), value: activeDatum.popupValue, description: [entryText, activeDatum.description].filter(Boolean).join(" · "), color: activeDatum.tooltipColor, summary: `You · ${fmtTapDay(active)} · ${activeDatum.popupValue}${entryText ? ` · ${entryText}` : ""}` };
  }, [active, activeDatum]);
  const activeTooltipLayout = useMemo(() => !activePosition ? null : (() => { const selectedCenterY = 24 + 5.5 + activePosition.weekdayIndex * 25; const showBelow = activePosition.weekdayIndex <= 2; return { top: showBelow ? selectedCenterY + 5 : Math.max(0, selectedCenterY - 75), connectorSide: (showBelow ? "top" : "bottom") as "top" | "bottom" }; })(), [activePosition]);

  const legend = (() => {
    if (metric.startsWith("custom:")) return [["Low", vividPainChartColor(0)], ["Mild", vividPainChartColor(2.5)], ["Moderate", vividPainChartColor(5)], ["High", vividPainChartColor(7.5)], ["Severe", vividPainChartColor(10)]] as const;
    if (metric === "period") return [["Spotting", "var(--period-spotting)"], ["Light", "var(--period-light)"], ["Medium", "var(--period-medium)"], ["Heavy", "var(--period-heavy)"], ["Very heavy", "var(--period-veryheavy)"]] as const;
    if (metric === "bowel") return [["T0", BRISTOL_MYSTERY_COLOR], ...BRISTOL.filter((item) => item.n !== 0).map((item) => [`T${item.n}`, item.color] as const)];
    if (metric === "sex") { const feature = getRegistryFeature(data, "sex"); return [[feature.label, feature.color]] as const; }
    if (metric === "sleep") return [["<4h", VIVID_PAIN_CHART_COLORS[10]], ["4–5h", VIVID_PAIN_CHART_COLORS[8]], ["5–6h", VIVID_PAIN_CHART_COLORS[6]], ["6–7h", VIVID_PAIN_CHART_COLORS[4]], ["7–9h", VIVID_PAIN_CHART_COLORS[0]], [">9h", INSIGHT_COLORS.teal]] as const;
    return [["Low", vividPainChartColor(1)], ["Mild", vividPainChartColor(3)], ["Moderate", vividPainChartColor(5)], ["High", vividPainChartColor(8)], ["Severe", vividPainChartColor(10)]] as const;
  })();

  return <ChartCard title={t("Heatmap")}>
    <div className="-mt-6 mb-1 flex flex-col items-end gap-1">
      <div className="grid h-8 w-full grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60 sm:w-[210px]" role="group" aria-label={t("Heatmap period")}>
        {([["7D", "Week"], ["30D", "Month"], ["Y", "Year"]] as const).map(([value, label]) => { const selected = heatmapPeriod === value; return <button key={value} type="button" onClick={() => setHeatmapPeriod(value)} aria-pressed={selected} className={`min-w-0 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition ${selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t(label)}</button>; })}
      </div>
      <div className="grid h-8 w-full grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60 sm:w-[210px]">
        <button type="button" onClick={() => onShiftPeriod(heatmapPeriod, -1)} className="grid h-7 w-7 place-self-center place-items-center rounded-lg transition hover:bg-tint" aria-label={`Previous ${heatmapPeriod === "Y" ? "year" : heatmapPeriod === "7D" ? "week" : "month"}`}><ChevronLeft className="h-3.5 w-3.5" /></button>
        <span className="min-w-0 whitespace-nowrap px-1 text-center text-[10px] font-semibold tabular-nums">{heatmapNavigationLabel}</span>
        <button type="button" onClick={() => onShiftPeriod(heatmapPeriod, 1)} className="grid h-7 w-7 place-self-center place-items-center rounded-lg transition hover:bg-tint" aria-label={`Next ${heatmapPeriod === "Y" ? "year" : heatmapPeriod === "7D" ? "week" : "month"}`}><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
    <p className="mt-1 text-xs text-muted-foreground"><TrText value="Choose a metric, then tap a coloured day for its saved average/details." /></p>
    <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">{availableHeatmapOptions.map((option) => <button key={option.id} type="button" onClick={() => setMetric(option.id)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${metric === option.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-tint text-muted-foreground ring-1 ring-border/60"}`}>{t(option.label)}</button>)}</div>
    <div className="mt-3 -mx-3 rounded-[1.5rem] bg-background/55 px-2.5 py-3 ring-1 ring-border/60 sm:mx-0 sm:p-3">
      {heatmapPeriod === "Y" ? <div className="space-y-6">{halfYearGrids.map((half, halfIndex) => {
        const boundaryWeeks = new Set(half.months.map(({ weekIndex }) => weekIndex).filter((weekIndex) => weekIndex > 0)); const hasActive = activePosition?.halfIndex === halfIndex;
        return <div key={`${half.startMonth}-${half.endMonth}`} data-bixbo-heatmap-half={halfIndex} className="relative min-w-0 overflow-visible">
          {hasActive && activeTooltip && activePosition && activeTooltipLayout ? <InsightFloatingTooltip leftPct={yearTooltipAnchor?.halfIndex === halfIndex ? Math.max(2, Math.min(98, yearTooltipAnchor.leftPct)) : 10 + ((activePosition.weekIndex + 0.5) / Math.max(1, half.weekCount)) * 88} details={activeTooltip} top={yearTooltipAnchor?.halfIndex === halfIndex ? yearTooltipAnchor.top : activeTooltipLayout.top} connectorSide={yearTooltipAnchor?.halfIndex === halfIndex ? yearTooltipAnchor.connectorSide : activeTooltipLayout.connectorSide} /> : null}
          <div className="flex gap-2"><div className="w-[28px] shrink-0 pt-[24px]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <div key={weekday} className="flex h-[25px] items-center text-[10px] font-medium text-muted-foreground">{weekday}</div>)}</div>
          <div className="min-w-0 flex-1"><div className="relative mb-1.5 h-[18px]" aria-hidden="true">{half.months.map(({ label, weekIndex }) => <span key={label} className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-foreground/80" style={{ left: `${((weekIndex + 0.5) / Math.max(1, half.weekCount)) * 100}%` }}><TrText value={label} /></span>)}</div>
          <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${half.weekCount}, 10px)`, columnGap: "1px", justifyContent: "space-between" }}>
            {half.weeks.map((week, weekIndex) => <div key={weekIndex} className="relative grid shrink-0 grid-rows-7 gap-y-[14px]">{boundaryWeeks.has(weekIndex) ? <span aria-hidden="true" className="pointer-events-none absolute -left-[2px] inset-y-[-3px] w-px rounded-full bg-primary/30" /> : null}{week.map((date) => {
              const inHalf = date.getFullYear() === year && date.getMonth() >= half.startMonth && date.getMonth() <= half.endMonth;
              if (!inHalf) return <span key={date.toISOString()} className="h-[11px] w-[11px] -translate-x-[0.5px] rounded-full bg-transparent" />;
              const key = toKey(date); const datum = heatmapData[key] ?? null; const isActive = active === key;
              return <button key={key} type="button" disabled={!datum} onClick={(event) => {
                if (!datum) return; event.stopPropagation(); if (active === key) { setActive(null); setYearTooltipAnchor(null); return; }
                const halfElement = event.currentTarget.closest<HTMLElement>("[data-bixbo-heatmap-half]");
                if (halfElement) { const halfRect = halfElement.getBoundingClientRect(); const dotRect = event.currentTarget.getBoundingClientRect(); const centerX = dotRect.left - halfRect.left + dotRect.width / 2; const centerY = dotRect.top - halfRect.top + dotRect.height / 2; const showBelow = centerY < 92; setYearTooltipAnchor({ halfIndex, leftPct: Math.max(0, Math.min(100, (centerX / Math.max(1, halfRect.width)) * 100)), top: showBelow ? centerY + 5 : Math.max(0, centerY - 75), connectorSide: showBelow ? "top" : "bottom" }); }
                setActive(key);
              }} aria-label={`${fmtTapDay(key)} · ${activeMetricLabel}${datum ? ` · ${datum.value}` : " · no data"}`} aria-pressed={isActive} className={`h-[11px] w-[11px] -translate-x-[0.5px] rounded-full transition-transform ${datum ? "touch-manipulation active:scale-125" : "cursor-default"} ${isActive ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`} style={{ background: datum?.color ?? "var(--tint)" }} />;
            })}</div>)}
          </div></div></div>
        </div>;
      })}</div> : <div className="relative min-h-[158px] pt-[78px]">
        {activeTooltip && compactTooltipLayout ? <InsightFloatingTooltip leftPct={compactTooltipLayout.leftPct} details={activeTooltip} top={compactTooltipLayout.top} connectorSide={compactTooltipLayout.connectorSide} /> : null}
        <div className="grid grid-cols-7 gap-x-2 gap-y-3">{compactDays.map((key) => { const date = fromKey(key); const datum = heatmapData[key] ?? null; const isActive = active === key; return <div key={key} className="flex min-w-0 flex-col items-center"><span className="text-[10px] font-medium text-muted-foreground">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span><span className="mt-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">{date.getDate()}</span><button type="button" disabled={!datum} onClick={(event) => { if (!datum) return; event.stopPropagation(); setActive((current) => current === key ? null : key); }} aria-label={`${fmtTapDay(key)} · ${activeMetricLabel}${datum ? ` · ${datum.value}` : " · no data"}`} aria-pressed={isActive} className={`mt-1 h-[14px] w-[14px] rounded-full transition-transform ${datum ? "touch-manipulation active:scale-125" : "cursor-default"} ${isActive ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`} style={{ background: datum?.color ?? "var(--tint)" }} /></div>; })}</div>
      </div>}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-tint" />{t("No data")}</span>{legend.map(([label, color]) => <span key={label} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: color }} /><TrText value={label} /></span>)}</div>
      {activeTooltip ? <button type="button" onClick={() => setActive(null)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary/15 px-3 py-2.5 text-left ring-1 ring-primary/10"><span className="min-w-0 truncate text-[10px] font-medium text-foreground">{activeTooltip.summary}</span><span className="shrink-0 text-[10px] text-muted-foreground">{t("Tap to close")}</span></button> : <p className="mt-2.5 text-center text-[10px] text-muted-foreground">Tap any coloured day for details.</p>}
    </div>
  </ChartCard>;
}
