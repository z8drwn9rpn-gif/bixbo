import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboExtraIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboExtraIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";


export type VitalTrendMetric = "sleep" | "temperature" | "weight";
export type VitalTrendPeriod = "W" | "M" | "Y";

export type VitalTrendPoint = {
  key: string;
  label: string;
  heading: string;
  value?: number;
  details: string[];
  /** Number of actual saved records represented by this plotted point. */
  recordCount: number;
};

export function averageNumbers(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function daysBetweenInclusive(start: Date, end: Date): string[] {
  const out: string[] = [];
  let key = toKey(start);
  const endKey = toKey(end);
  while (key <= endKey) {
    out.push(key);
    key = addDays(key, 1);
  }
  return out;
}

export function trendDayHeading(key: string): string {
  return fromKey(key).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dailyVitalTrendValue(metric: VitalTrendMetric, log?: import("@/lib/storage").DayLog): number | undefined {
  if (!log) return undefined;
  if (metric === "sleep") return log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
  if (metric === "temperature") return averageDayTemperature(log);
  return latestDayWeight(log);
}

export function dailyVitalDetails(metric: VitalTrendMetric, key: string, data: BixboData): string[] {
  const log = data.dayLogs[key];
  if (!log) return [];

  if (metric === "sleep") {
    const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
    if (hours == null || !Number.isFinite(hours)) return [];
    const details = [`Sleep ${hours.toFixed(1)} h`];
    if (log.sleepQuality) {
      details.push(`Quality: ${Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : log.sleepQuality}`);
    }
    return details;
  }

  const entries = metric === "temperature" ? log.temperatureEntries ?? [] : log.weightEntries ?? [];
  const unit = metric === "temperature" ? "°C" : "kg";
  if (entries.length) {
    return entries
      .filter((entry) => Number.isFinite(Number(entry.value)))
      .map((entry) => `${entry.time || "—"} · ${Number(entry.value).toFixed(1)} ${unit}`);
  }

  const legacy = metric === "temperature" ? log.temperature : log.weight;
  return legacy != null && Number.isFinite(legacy) ? [`Saved value · ${legacy.toFixed(1)} ${unit}`] : [];
}

export function dailyVitalRecordCount(metric: VitalTrendMetric, key: string, data: BixboData): number {
  const log = data.dayLogs[key];
  if (!log) return 0;

  if (metric === "sleep") {
    const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
    return hours != null && Number.isFinite(hours) ? 1 : 0;
  }

  const entries = metric === "temperature" ? log.temperatureEntries ?? [] : log.weightEntries ?? [];
  const validEntries = entries.filter((entry) => Number.isFinite(Number(entry.value)));
  if (validEntries.length) return validEntries.length;

  const legacy = metric === "temperature" ? log.temperature : log.weight;
  return legacy != null && Number.isFinite(legacy) ? 1 : 0;
}

export function monthlyVitalRecords(metric: VitalTrendMetric, start: Date, end: Date, data: BixboData) {
  const values: number[] = [];
  const details: string[] = [];
  const unit = vitalTrendUnit(metric);

  daysBetweenInclusive(start, end).forEach((key) => {
    const log = data.dayLogs[key];
    if (!log) return;
    const shortDate = fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    if (metric === "sleep") {
      const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
      if (hours == null || !Number.isFinite(hours)) return;
      values.push(hours);
      const quality = log.sleepQuality
        ? ` · ${Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : log.sleepQuality}`
        : "";
      details.push(`${shortDate} · ${hours.toFixed(1)} ${unit}${quality}`);
      return;
    }

    const entries = metric === "temperature" ? log.temperatureEntries ?? [] : log.weightEntries ?? [];
    const validEntries = entries.filter((entry) => Number.isFinite(Number(entry.value)));
    if (validEntries.length) {
      validEntries.forEach((entry) => {
        const value = Number(entry.value);
        values.push(value);
        details.push(`${shortDate} · ${entry.time || "—"} · ${value.toFixed(1)} ${unit}`);
      });
      return;
    }

    const legacy = metric === "temperature" ? log.temperature : log.weight;
    if (legacy != null && Number.isFinite(legacy)) {
      values.push(legacy);
      details.push(`${shortDate} · ${legacy.toFixed(1)} ${unit}`);
    }
  });

  return { values, details };
}

export function trendRange(period: VitalTrendPeriod, anchor: Date) {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  if (period === "W") {
    const mondayOffset = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  if (period === "M") {
    return {
      start: new Date(base.getFullYear(), base.getMonth(), 1),
      end: new Date(base.getFullYear(), base.getMonth() + 1, 0),
    };
  }

  return {
    start: new Date(base.getFullYear(), 0, 1),
    end: new Date(base.getFullYear(), 11, 31),
  };
}

export function shiftTrendAnchor(anchor: Date, period: VitalTrendPeriod, delta: -1 | 1): Date {
  const next = new Date(anchor);
  if (period === "W") next.setDate(next.getDate() + delta * 7);
  if (period === "M") {
    next.setDate(1);
    next.setMonth(next.getMonth() + delta);
  }
  if (period === "Y") next.setFullYear(next.getFullYear() + delta);
  return next;
}

export function vitalTrendTitle(metric: VitalTrendMetric): string {
  if (metric === "sleep") return "Sleep";
  if (metric === "temperature") return "Body temperature";
  return "Weight";
}

export function vitalTrendUnit(metric: VitalTrendMetric): string {
  if (metric === "sleep") return "h";
  if (metric === "temperature") return "°C";
  return "kg";
}

export function sleepTrendColor(hours: number): string {
  if (hours < 8) return "#EF4444";
  if (Math.abs(hours - 8) < 0.05) return "#F3C30D";
  return "#72C64A";
}

export function VitalTrendTooltip({
  point,
  unit,
  leftPct,
  topPx,
  annual,
}: {
  point: VitalTrendPoint;
  unit: string;
  leftPct: number;
  topPx: number;
  annual: boolean;
}) {
  if (point.value == null) return null;

  const clamped = Math.max(0, Math.min(100, leftPct));
  const position =
    clamped < 18
      ? { left: "6px", transform: "none" }
      : clamped > 82
        ? { right: "6px", transform: "none" }
        : { left: `${clamped}%`, transform: "translateX(-50%)" };

  return (
    <div
      className="pointer-events-none absolute z-30 w-[128px] rounded-xl bg-surface px-2.5 py-2 text-left shadow-lg ring-1 ring-primary/35"
      style={{ ...position, top: Math.max(4, topPx) }}
      data-bixbo-vital-tooltip
    >
      <p className="truncate text-[9px] font-semibold text-muted-foreground">{point.heading}</p>
      <p className="mt-0.5 text-[12px] font-bold tabular-nums text-foreground">
        {annual ? "Avg " : ""}{point.value.toFixed(1)} {unit}
      </p>
      {annual ? (
        <p className="mt-0.5 text-[8px] text-muted-foreground">{point.recordCount} saved {point.recordCount === 1 ? "entry" : "entries"}</p>
      ) : null}
    </div>
  );
}

export function SleepTrendBars({
  points,
  activeIndex,
  onSelect,
}: {
  points: VitalTrendPoint[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const yLabels = [12, 10, 8, 6, 4, 2, 0];
  const height = 132;

  return (
    <div className="pt-1">
      <div className="flex gap-1.5">
        <div className="flex flex-col items-end pr-1" style={{ height }}>
          <div className="flex h-full flex-col justify-between text-[10px] font-medium text-muted-foreground">
            {yLabels.map((value) => (
              <span key={value} className="leading-none tabular-nums">
                {value}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {yLabels.map((value) => (
              <div key={value} className="border-t border-dashed border-border/70" />
            ))}
          </div>

          <div
            className="relative grid items-end gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, points.length)}, minmax(0, 1fr))`, height }}
          >
            {points.map((point, index) =>
              point.value != null ? (
                <button
                  key={point.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(index);
                  }}
                  aria-label={`${point.heading} · Sleep ${point.value.toFixed(1)} h`}
                  className={`min-w-0 rounded-t transition active:scale-[0.98] ${
                    activeIndex === index ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""
                  }`}
                  style={{
                    height: `${Math.max(5, (Math.min(12, point.value) / 12) * 100)}%`,
                    background: sleepTrendColor(point.value),
                  }}
                />
              ) : (
                <div key={point.key} className="h-[2px] w-full self-end rounded bg-border/60" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 flex pl-5">
        <div
          className="grid flex-1 gap-[2px] text-center text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, points.length)}, minmax(0, 1fr))` }}
        >
          {points.map((point) => (
            <span key={point.key} className="truncate">
              {point.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> &lt;8h</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#F3C30D]" /> 8h</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#72C64A]" /> &gt;8h</span>
      </div>
    </div>
  );
}

export function VitalTrendPopup({
  metric,
  data,
  anchorKey,
  onClose,
}: {
  metric: VitalTrendMetric;
  data: BixboData;
  anchorKey: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<VitalTrendPeriod>("W");
  const [anchor, setAnchor] = useState(() => fromKey(anchorKey));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { t, language } = useI18n();

  // Lock the page behind the modal. iOS Safari/PWA can otherwise try to scroll
  // both the Home page and the popup at the same time, which feels like a freeze.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setAnchor(fromKey(anchorKey));
  }, [anchorKey, metric]);

  const points = useMemo<VitalTrendPoint[]>(() => {
    if (period === "Y") {
      const year = anchor.getFullYear();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      return months.map((label, monthIndex) => {
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0);
        const records = monthlyVitalRecords(metric, start, end, data);
        return {
          key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
          label,
          heading: start.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" }),
          value: averageNumbers(records.values),
          details: records.details,
          recordCount: records.values.length,
        };
      });
    }

    const { start, end } = trendRange(period, anchor);
    return daysBetweenInclusive(start, end).map((key) => {
      const d = fromKey(key);
      return {
        key,
        label: period === "W" ? d.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "short" }).slice(0, 2) : String(d.getDate()),
        heading: trendDayHeading(key),
        value: dailyVitalTrendValue(metric, data.dayLogs[key]),
        details: dailyVitalDetails(metric, key, data),
        recordCount: dailyVitalRecordCount(metric, key, data),
      };
    });
  }, [anchor, data.dayLogs, metric, period]);

  useEffect(() => {
    // Keep the graph cheap to open: details are rendered only after the user taps a point/bar.
    setActiveIndex(null);
  }, [points]);

  const values = points.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value));
  const unit = vitalTrendUnit(metric);
  const { start, end } = trendRange(period, anchor);
  const rangeLabel =
    period === "Y"
      ? String(anchor.getFullYear())
      : period === "M"
        ? anchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })
        : `${start.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}`;

  const chartWidth = 278;
  const chartHeight = 132;
  const left = 10;
  const right = 34;
  const top = 12;
  const bottom = 24;
  const chartW = chartWidth - left - right;
  const chartH = chartHeight - top - bottom;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const basePad = metric === "temperature" ? 0.3 : metric === "weight" ? 0.6 : 1;
  const span = Math.max(basePad, rawMax - rawMin);
  const yMin = rawMin - span * 0.25;
  const yMax = rawMax + span * 0.25;
  const denom = Math.max(1, points.length - 1);
  const xFor = (index: number) => left + (index / denom) * chartW;
  const yFor = (value: number) => top + ((yMax - value) / Math.max(0.001, yMax - yMin)) * chartH;
  const path = points
    .map((point, index) => (point.value == null ? null : { x: xFor(index), y: yFor(point.value), index }))
    .filter((point): point is { x: number; y: number; index: number } => point != null)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  const visibleLabelIndexes = new Set<number>();
  if (period === "W") points.forEach((_, index) => visibleLabelIndexes.add(index));
  if (period === "M")
    points.forEach((_, index) => {
      if (index === 0 || index === points.length - 1 || index % 5 === 0) visibleLabelIndexes.add(index);
    });
  if (period === "Y") points.forEach((_, index) => visibleLabelIndexes.add(index));

  const active = activeIndex != null ? points[activeIndex] : undefined;
  const showDetailPanel = Boolean(active?.value != null && (period === "Y" || active.recordCount > 1));
  const tooltipLeftPct = activeIndex == null
    ? 50
    : points.length <= 1
      ? 50
      : metric === "sleep"
        ? ((activeIndex + 0.5) / Math.max(1, points.length)) * 100
        : (xFor(activeIndex) / chartWidth) * 100;
  const tooltipTopPx = active?.value == null
    ? 4
    : metric === "sleep"
      ? Math.max(4, 118 - (Math.min(12, active.value) / 12) * 96 - 56)
      : Math.max(4, yFor(active.value) - 62);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-7">
      <button
        type="button"
        aria-label={`${t("Close")} ${t(vitalTrendTitle(metric))} ${t("graph")}`}
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[1.65rem] bg-background shadow-2xl ring-1 ring-border">
        <div className="flex items-start justify-between gap-2 border-b border-border/70 px-4 pb-3 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Trend")}</p>
            <h2 className="mt-0.5 font-serif text-lg font-bold text-foreground">{t(vitalTrendTitle(metric))}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-tint text-xs font-bold text-foreground ring-1 ring-border"
            aria-label={t("Close")}
          >
            ×
          </button>
        </div>

        <div className="max-h-[48dvh] overflow-y-auto overscroll-contain touch-pan-y p-3">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-tint p-1 ring-1 ring-border/50">
            {(["W", "M", "Y"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-xl px-2 py-1.5 text-[11px] font-semibold transition ${
                  period === value ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"
                }`}
              >
                {value === "W" ? t("Week") : value === "M" ? t("Month") : t("Year")}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAnchor((current) => shiftTrendAnchor(current, period, -1))}
              className="grid h-8 w-8 place-items-center rounded-full bg-tint ring-1 ring-border"
              aria-label={t("Previous period")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-center text-xs font-semibold text-foreground">{rangeLabel}</p>
            <button
              type="button"
              onClick={() => setAnchor((current) => shiftTrendAnchor(current, period, 1))}
              className="grid h-8 w-8 place-items-center rounded-full bg-tint ring-1 ring-border"
              aria-label={t("Next period")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-3 rounded-2xl bg-tint/70 p-2 ring-1 ring-border/50">
            {values.length ? (
              <>
                {metric === "sleep" ? (
                  <SleepTrendBars
                    points={points}
                    activeIndex={activeIndex}
                    onSelect={(index) => setActiveIndex((current) => (current === index ? null : index))}
                  />
                ) : (
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full overflow-visible" role="img">
                    {[0, 0.5, 1].map((fraction) => {
                      const y = top + fraction * chartH;
                      const value = yMax - fraction * (yMax - yMin);
                      return (
                        <g key={fraction}>
                          <line x1={left} x2={left + chartW} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
                          <text x={chartWidth - 2} y={y + 3} textAnchor="end" fontSize="8" fill="var(--muted-foreground)">
                            {value.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                    {path ? <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
                    {points.map((point, index) => {
                      if (point.value == null) return null;
                      const activePoint = activeIndex === index;
                      return (
                        <g key={point.key}>
                          <circle
                            cx={xFor(index)}
                            cy={yFor(point.value)}
                            r={activePoint ? 4.5 : 3.2}
                            fill="var(--surface)"
                            stroke="var(--primary)"
                            strokeWidth={activePoint ? 2.5 : 1.8}
                            pointerEvents="none"
                          />
                          <circle
                            cx={xFor(index)}
                            cy={yFor(point.value)}
                            r="13"
                            fill="transparent"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveIndex((current) => (current === index ? null : index));
                            }}
                          />
                        </g>
                      );
                    })}
                    {points.map((point, index) =>
                      visibleLabelIndexes.has(index) ? (
                        <text
                          key={`label-${point.key}`}
                          x={xFor(index)}
                          y={chartHeight - 5}
                          textAnchor="middle"
                          fontSize={period === "Y" ? "6.5" : "7.5"}
                          fill="var(--muted-foreground)"
                        >
                          {point.label}
                        </text>
                      ) : null,
                    )}
                  </svg>
                )}

                {active?.value != null ? (
                  <VitalTrendTooltip
                    point={active}
                    unit={unit}
                    leftPct={tooltipLeftPct}
                    topPx={tooltipTopPx}
                    annual={period === "Y"}
                  />
                ) : null}

                {showDetailPanel && active?.value != null ? (
                  <div className="mt-2 rounded-2xl bg-surface/80 p-3 ring-1 ring-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground">{active.heading}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {period === "Y" ? `${t("Calculated average from")} ${active.recordCount} ${t("saved entries")}` : t("Saved entries")}
                        </p>
                      </div>
                      <b className="shrink-0 tabular-nums text-sm text-foreground">
                        {active.value.toFixed(1)} {unit}
                      </b>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {active.details.length ? (
                        active.details.map((detail, index) => (
                          <p key={index} className="rounded-xl bg-background/80 px-2.5 py-2 text-[10px] leading-snug text-foreground ring-1 ring-border/40">
                            {detail}
                          </p>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground">{t("No underlying saved entry found.")}</p>
                      )}
                    </div>
                  </div>
                ) : active?.value == null ? (
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Tap a point or bar to see the exact saved entry.")}</p>
                ) : null}
              </>
            ) : (
              <div className="grid min-h-32 place-items-center text-center text-xs text-muted-foreground">
                {t("No data in this period for")} {t(vitalTrendTitle(metric)).toLowerCase()}.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

