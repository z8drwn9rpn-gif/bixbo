import { createFileRoute, Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboIcons";

import {
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
} from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Calendar & daily overview" },
      {
        name: "description",
        content: "Track pain, panic attacks, cycle, meds, food and more — all on one calm calendar.",
      },
      { property: "og:title", content: "BIXBO — Calendar & daily overview" },
      { property: "og:description", content: "Track pain, panic attacks, cycle, meds, food and more." },
    ],
  }),
  component: HomePage,
});


type VitalTrendMetric = "sleep" | "temperature" | "weight";
type VitalTrendPeriod = "W" | "M" | "Y";

type VitalTrendPoint = {
  key: string;
  label: string;
  heading: string;
  value?: number;
  details: string[];
};

function averageNumbers(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function daysBetweenInclusive(start: Date, end: Date): string[] {
  const out: string[] = [];
  let key = toKey(start);
  const endKey = toKey(end);
  while (key <= endKey) {
    out.push(key);
    key = addDays(key, 1);
  }
  return out;
}

function trendDayHeading(key: string): string {
  return fromKey(key).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dailyVitalTrendValue(metric: VitalTrendMetric, log?: import("@/lib/storage").DayLog): number | undefined {
  if (!log) return undefined;
  if (metric === "sleep") return log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
  if (metric === "temperature") return averageDayTemperature(log);
  return latestDayWeight(log);
}

function dailyVitalDetails(metric: VitalTrendMetric, key: string, data: BixboData): string[] {
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

function monthlyVitalRecords(metric: VitalTrendMetric, start: Date, end: Date, data: BixboData) {
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

function trendRange(period: VitalTrendPeriod, anchor: Date) {
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

function shiftTrendAnchor(anchor: Date, period: VitalTrendPeriod, delta: -1 | 1): Date {
  const next = new Date(anchor);
  if (period === "W") next.setDate(next.getDate() + delta * 7);
  if (period === "M") {
    next.setDate(1);
    next.setMonth(next.getMonth() + delta);
  }
  if (period === "Y") next.setFullYear(next.getFullYear() + delta);
  return next;
}

function vitalTrendTitle(metric: VitalTrendMetric): string {
  if (metric === "sleep") return "Sleep";
  if (metric === "temperature") return "Body temperature";
  return "Weight";
}

function vitalTrendUnit(metric: VitalTrendMetric): string {
  if (metric === "sleep") return "h";
  if (metric === "temperature") return "°C";
  return "kg";
}

function sleepTrendColor(hours: number): string {
  if (hours < 8) return "#EF4444";
  if (Math.abs(hours - 8) < 0.05) return "#F3C30D";
  return "#72C64A";
}

function SleepTrendBars({
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

function VitalTrendPopup({
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
          heading: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
          value: averageNumbers(records.values),
          details: records.details,
        };
      });
    }

    const { start, end } = trendRange(period, anchor);
    return daysBetweenInclusive(start, end).map((key) => {
      const d = fromKey(key);
      return {
        key,
        label: period === "W" ? d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2) : String(d.getDate()),
        heading: trendDayHeading(key),
        value: dailyVitalTrendValue(metric, data.dayLogs[key]),
        details: dailyVitalDetails(metric, key, data),
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
        ? anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

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

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-7">
      <button
        type="button"
        aria-label={`Close ${vitalTrendTitle(metric)} graph`}
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[1.65rem] bg-background shadow-2xl ring-1 ring-border">
        <div className="flex items-start justify-between gap-2 border-b border-border/70 px-4 pb-3 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trend</p>
            <h2 className="mt-0.5 font-serif text-lg font-bold text-foreground">{vitalTrendTitle(metric)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-tint text-xs font-bold text-foreground ring-1 ring-border"
            aria-label="Close"
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
                {value === "W" ? "Week" : value === "M" ? "Month" : "Year"}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAnchor((current) => shiftTrendAnchor(current, period, -1))}
              className="grid h-8 w-8 place-items-center rounded-full bg-tint ring-1 ring-border"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-center text-xs font-semibold text-foreground">{rangeLabel}</p>
            <button
              type="button"
              onClick={() => setAnchor((current) => shiftTrendAnchor(current, period, 1))}
              className="grid h-8 w-8 place-items-center rounded-full bg-tint ring-1 ring-border"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-2xl bg-tint/70 p-2 ring-1 ring-border/50">
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
                  <div className="mt-2 rounded-2xl bg-surface/80 p-3 ring-1 ring-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground">{active.heading}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {period === "Y" ? "Monthly average from saved entries" : "Saved entry"}
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
                        <p className="text-[10px] text-muted-foreground">No underlying saved entry found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">Tap a point or bar to see the exact saved entry.</p>
                )}
              </>
            ) : (
              <div className="grid min-h-32 place-items-center text-center text-xs text-muted-foreground">
                No {vitalTrendTitle(metric).toLowerCase()} data in this period.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HomePage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const maleMode = String(view.settings.gender ?? "").trim().toLowerCase() === "male";

  /*
   * Dátum vytvárame až v prehliadači.
   * Server aj prvý klientsky render preto dostanú rovnaký obsah
   * a nevznikne hydration mismatch.
   */
  const [monthAnchor, setMonthAnchor] = useState<Date | null>(null);
  const [selected, setSelected] = useState("");

  const [hakOpen, setHakOpen] = useState(false);
  const [hakAnchor, setHakAnchor] = useState<Date | null>(null);

  const [logOpen, setLogOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"today" | "month">("today");
  const [summaryMonthAnchor, setSummaryMonthAnchor] = useState<Date | null>(null);
  const [vitalTrendOpen, setVitalTrendOpen] = useState<VitalTrendMetric | null>(null);
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();
  const [editEntry, setEditEntry] = useState<unknown>(undefined);

  const openEdit = (cat: string, entry: unknown) => {
    setQuickCat(cat);
    setEditEntry(entry);
    setEditPain(undefined);
    setLogOpen(true);
  };

  /*
   * Inicializácia dátumu musí byť v effecte, pretože new Date()
   * na serveri a v prehliadači môže vytvoriť odlišný render.
   */
  useEffect(() => {
    setMonthAnchor(new Date());
    setSelected(todayKey());
  }, []);

  // Male mode must never expose the HAK tracker. If gender is changed while
  // the HAK detail is open, close it immediately as well.
  useEffect(() => {
    if (maleMode) {
      setHakOpen(false);
      setHakAnchor(null);
    }
  }, [maleMode]);

  // Listen for "open log" from bottom nav
  useEffect(() => {
    const h = () => {
      setQuickCat(undefined);
      setEditPain(undefined);
      setEditEntry(undefined);
      setLogOpen(true);
    };

    window.addEventListener("bixbo:open-log", h);

    return () => {
      window.removeEventListener("bixbo:open-log", h);
    };
  }, []);

  /*
   * Tento return musí byť až po všetkých useEffect/useState hookoch.
   * Hooky nesmú byť pod podmieneným returnom.
   */
  if (!monthAnchor || !selected) {
    return <div className="h-[360px]" />;
  }

  const moveCalendarMonth = (delta: number) => {
    const currentSelected = fromKey(selected);
    const selectedDayOfMonth = currentSelected.getDate();

    const targetMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + delta, 1);
    const lastDayOfTargetMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
    ).getDate();
    const targetDay = Math.min(selectedDayOfMonth, lastDayOfTargetMonth);
    const nextSelected = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), targetDay);

    setMonthAnchor(targetMonth);
    setSelected(toKey(nextSelected));
  };

  const goToPrevMonth = () => moveCalendarMonth(-1);
  const goToNextMonth = () => moveCalendarMonth(1);

  const pregnancyActive = isPregnancyActive(view);
  const postpartumActive = isPostpartumActive(view);
  const cycleTrackingHidden = isCycleTrackingHidden(view);

  const pregnancyToday = view.dayLogs[todayKey()]?.pregnancy;
  const latestPregnancyBP =
    pregnancyToday?.bloodPressure?.[Math.max(0, (pregnancyToday.bloodPressure?.length ?? 1) - 1)];

  const totalPregnancyKicks = (pregnancyToday?.kicks ?? []).reduce((sum, session) => sum + (session.count ?? 0), 0);

  const pregnancySummaryItems = [
    pregnancyToday?.weightKg != null ? { icon: "⚖️", label: `${pregnancyToday.weightKg} kg` } : null,
    (pregnancyToday?.symptoms?.length ?? 0) > 0
      ? { icon: "🤢", label: `${pregnancyToday!.symptoms!.length} symptoms` }
      : null,
    (pregnancyToday?.kicks?.length ?? 0) > 0
      ? {
          icon: "👣",
          label: totalPregnancyKicks > 0 ? `${totalPregnancyKicks} kicks` : `${pregnancyToday!.kicks!.length} sessions`,
        }
      : null,
    latestPregnancyBP ? { icon: "❤️", label: `${latestPregnancyBP.systolic}/${latestPregnancyBP.diastolic}` } : null,
    (pregnancyToday?.waterMl ?? 0) > 0 ? { icon: "💧", label: `${pregnancyToday!.waterMl} ml` } : null,
  ].filter((item): item is { icon: string; label: string } => item != null);

  const todayDateKey = todayKey();
  const todayLog = view.dayLogs[todayDateKey];
  const todayPain = avgDayPain(todayLog);
  const todayScheduled = view.meds
    .filter((med) => !med.asNeeded)
    .flatMap((med) => med.times.map((time) => `${med.id}@${time}`));
  const todayMedsTaken = todayScheduled.filter((key) => view.medLog[todayDateKey]?.[key]).length;

  return (
    <AppShell
      big
      title={
        <div className="flex flex-col leading-tight">
          <span>BIXBO</span>

          <span className="text-xs font-normal text-muted-foreground">
            Hi, {view.settings.userName?.trim() || "there"} <Ico e="❤️" size={12} />
          </span>
        </div>
      }
      right={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSummaryMode("today");
              setSummaryMonthAnchor(new Date());
              setTodayOpen(true);
            }}
            className="flex min-w-[82px] flex-col items-end justify-center rounded-2xl px-2 py-1 transition hover:bg-tint"
            aria-label="Open today's summary"
          >
            <span className="text-[10px] font-semibold leading-none text-muted-foreground">Today</span>
            <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">
              <Ico name="flame" size={14} /> {todayPain != null ? todayPain.toFixed(1) : "—"}
              <span className="text-muted-foreground">·</span>
              <PillIcon size={14} /> {todayMedsTaken}/{todayScheduled.length}
            </span>
          </button>

          <Link
            to="/profile"
            className="flex min-w-[52px] flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-primary transition hover:bg-tint"
            aria-label="Health"
            title="Health"
          >
            <HeartIcon size={24} />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">Health</span>
          </Link>
        </div>
      }
    >
      <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-[1500px] lg:grid-cols-[minmax(0,2.35fr)_minmax(300px,0.95fr)] lg:items-start lg:gap-6 lg:px-0 xl:grid-cols-[minmax(0,2.5fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 lg:flex lg:flex-col">
      <div className="px-5 pt-0.5 lg:order-1 lg:px-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h2 className="font-serif text-xl font-bold" suppressHydrationWarning>
            {hydrated ? monthLabel(monthAnchor) : ""}
          </h2>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-0.5 lg:order-1 lg:overflow-hidden lg:rounded-[1.75rem]" style={{ "--period-medium": "#7467D8" } as any}>
        {hydrated ? (
          <MonthCalendar
            month={monthAnchor}
            data={view}
            selected={selected}
            onSelect={setSelected}
            onSwipeMonth={(delta) => {
              moveCalendarMonth(delta);
            }}
          />
        ) : (
          <div className="h-[360px]" />
        )}
      </div>

      {!maleMode && (
        <div className="lg:order-4">
        <BirthControlSummaryCard
          data={view}
          dateKey={selected}
          onOpen={() => {
            setHakAnchor(fromKey(selected));
            setHakOpen(true);
          }}
        />
        </div>
      )}

      {(() => {
        if (!pregnancyActive) return null;

        const prog = pregnancyProgress(view.pregnancy);

        return (
          <Link
            to={"/pregnancy" as never}
            className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface lg:order-6 lg:mx-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/60">
                  <Ico name="pregnancy" size={24} />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Pregnancy
                  </p>

                  <p className="mt-0.5 font-serif text-lg font-semibold text-foreground">
                    {prog ? `Week ${prog.week} + ${prog.dayOfWeek}` : "Pregnancy mode"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {prog
                      ? `Trimester ${prog.trimester}${prog.daysLeft != null ? ` · ${Math.max(0, prog.daysLeft)} days to go` : ""}`
                      : "Tap to set your due date"}
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-xs font-semibold text-primary">Open</span>
            </div>

            {pregnancySummaryItems.length > 0 ? (
              <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">
                {pregnancySummaryItems.slice(0, 4).map((item, index) => (
                  <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 && <span className="text-border">•</span>}
                    <Ico e={item.icon} size={15} />
                    <span className="truncate text-[11px] font-medium tabular-nums text-foreground">{item.label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40">
                <Ico name="pregnancy" size={15} />
                <span>Nothing logged today</span>
              </div>
            )}
          </Link>
        );
      })()}

      {postpartumActive &&
        (() => {
          const progress = postpartumProgress(view.postpartum);
          const todayPostpartum = view.dayLogs[todayKey()]?.postpartum;
          const feedingCount =
            (todayPostpartum?.breastfeeding?.length ?? 0) +
            (todayPostpartum?.pumping?.length ?? 0) +
            (todayPostpartum?.bottle?.length ?? 0);

          const postpartumSummaryItems = [
            (todayPostpartum?.symptoms?.length ?? 0) > 0
              ? { icon: "warning", label: `${todayPostpartum!.symptoms!.length} symptoms` }
              : null,
            todayPostpartum?.bleeding && todayPostpartum.bleeding !== "none"
              ? { icon: "period", label: todayPostpartum.bleeding }
              : null,
            feedingCount > 0
              ? { icon: "bottle", label: `${feedingCount} feeding${feedingCount === 1 ? "" : "s"}` }
              : null,
            todayPostpartum?.sleepHours != null
              ? { icon: "sleep", label: `${todayPostpartum.sleepHours} h sleep` }
              : null,
            (todayPostpartum?.mood?.length ?? 0) > 0 ? { icon: "mood", label: todayPostpartum!.mood![0] } : null,
          ].filter((item): item is { icon: string; label: string } => item != null);

          return (
            <Link
              to={"/postpartum" as never}
              className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20 lg:order-6 lg:mx-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/50">
                    <Ico name="baby" size={30} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {progress ? `Week ${progress.week} + ${progress.dayOfWeek} postpartum` : "Postpartum mode"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {progress ? `${progress.days} days since birth` : "Add the birth date to calculate progress"}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-xs font-semibold text-primary">Open</span>
              </div>

              {postpartumSummaryItems.length > 0 ? (
                <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">
                  {postpartumSummaryItems.slice(0, 4).map((item, index) => (
                    <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
                      {index > 0 && <span className="text-border">•</span>}
                      <Ico name={item.icon as never} size={15} />
                      <span className="truncate text-[11px] font-medium capitalize tabular-nums text-foreground">
                        {item.label}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40">
                  <Ico name="baby" size={15} />
                  <span>Nothing logged today</span>
                </div>
              )}
            </Link>
          );
        })()}

      {!cycleTrackingHidden &&
        (() => {
          const p = nextPredictedPeriod(view.cycle);

          if (!p) return null;

          const fmt = (k: string) =>
            fromKey(k).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });

          return (
            <div
              className="mx-5 mt-3 rounded-full px-4 py-2 text-center text-xs ring-1 lg:order-3 lg:mx-0"
              style={{
                background: "color-mix(in srgb, #5F7033 14%, transparent)",
                color: "#5F7033",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, #5F7033 34%, transparent)",
              }}
            >
              Next period predicted:{" "}
              <span className="font-semibold">
                {fmt(p.start)} – {fmt(p.end)}
              </span>
            </div>
          );
        })()}

      {/* Top vitals row */}
      <div className="mt-4 grid grid-cols-5 gap-2 px-5 lg:order-5 lg:grid-cols-4 lg:px-0">
        <div className="col-span-2 lg:col-span-1">
          <MedsProgress data={view} />
        </div>

        <VitalTile
          emoji="😴"
          label="Sleep"
          value={view.dayLogs[selected]?.sleepHours != null ? String(view.dayLogs[selected]!.sleepHours) : "—"}
          onClick={() => setVitalTrendOpen("sleep")}
        />

        <VitalTile
          emoji="🌡️"
          label="Temp"
          value={view.dayLogs[selected]?.temperature != null ? String(view.dayLogs[selected]!.temperature) : "—"}
          onClick={() => setVitalTrendOpen("temperature")}
        />

        <VitalTile
          emoji="⚖️"
          label="Weight"
          value={view.dayLogs[selected]?.weight != null ? String(view.dayLogs[selected]!.weight) : "—"}
          onClick={() => setVitalTrendOpen("weight")}
        />
      </div>

      {/* Quick log */}
      <div className="px-5 lg:order-2 lg:mt-4 lg:px-0 [&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
        <QuickTags
          data={view}
          update={update}
          onLongPress={(cat: string) => {
            const map: Record<string, string | undefined> = {
              pain: "pain",
              tetany: "tetany",
              panic: "panic",
              sex: "sex",
              food: "food",
              period: "period",
              meds: "meds",
              workout: "workout",
              bowel: "bowel",
              thermo: "heat",
              headache: "pain",
              hotFlashes: "pain",
              sleep: "temp",
            };

            const target = map[cat];

            if (!target) return;

            setQuickCat(target);
            setEditPain(undefined);
            setEditEntry(undefined);
            setLogOpen(true);
          }}
        />
      </div>

        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-surface/35 lg:p-4 lg:ring-1 lg:ring-border/50 xl:p-5">
      <div className="mt-4 flex items-center justify-between px-5 lg:mt-0 lg:px-0">
        <h2 className="font-serif text-xl font-bold">
          {selected === todayKey()
            ? "Today"
            : fromKey(selected).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
        </h2>

        <ShareDayButton date={selected} view={view} />
      </div>

      <DayPreview
        date={selected}
        data={view}
        update={update}
        onEditPain={(p) => {
          setEditPain(p);
          setEditEntry(undefined);
          setQuickCat("pain");
          setLogOpen(true);
        }}
        onEdit={openEdit}
      />
        </aside>
      </div>


      {vitalTrendOpen && (
        <VitalTrendPopup
          metric={vitalTrendOpen}
          data={view}
          anchorKey={selected}
          onClose={() => setVitalTrendOpen(null)}
        />
      )}

      {todayOpen &&
        (() => {
          const todayTetany = todayLog?.tetany?.length ?? 0;
          const todayPanic = todayLog?.panic?.length ?? 0;
          const todayBowelEntries = todayLog?.bowel ?? [];
          const noteValue = view.dayNotes[todayDateKey]?.[0];
          const noteText =
            typeof noteValue === "string"
              ? noteValue
              : noteValue && typeof noteValue === "object" && "text" in noteValue
                ? String(noteValue.text)
                : "";

          const todayRows = [
            {
              key: "pain",
              icon: <FlameIcon size={22} />,
              label: "Pain",
              value: todayPain != null ? `${todayPain.toFixed(1)} / 10` : "No pain logged",
            },
            {
              key: "meds",
              icon: <PillIcon size={22} />,
              label: "Medication",
              value: `${todayMedsTaken} of ${todayScheduled.length} taken`,
            },
            {
              key: "sleep",
              icon: <ClockIcon size={22} />,
              label: "Sleep",
              value: todayLog?.sleepHours != null ? `${todayLog.sleepHours} h` : "Not logged",
            },
            {
              key: "tetany",
              icon: <Ico e="⭐️" size={22} />,
              label: "Tetany episode",
              value: todayTetany ? `${todayTetany} episode${todayTetany === 1 ? "" : "s"}` : "None",
            },
            {
              key: "panic",
              icon: <Ico e="✨" size={22} />,
              label: "Panic episode",
              value: todayPanic ? `${todayPanic}` : "None",
            },
            {
              key: "bowel",
              icon: <PoopIcon size={22} />,
              label: "Bowel",
              value: todayBowelEntries.length
                ? `${todayBowelEntries.length} entr${todayBowelEntries.length === 1 ? "y" : "ies"}`
                : "None",
            },
            {
              key: "hotFlashes",
              icon: <Ico e="🥵" size={22} />,
              label: "Hot flashes",
              value: (() => {
                const entries = todayLog?.pain?.filter((entry) => (entry.hotFlashes ?? 0) > 0) ?? [];
                return entries.length ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}` : "None";
              })(),
            },
            {
              key: "headache",
              icon: <Ico e="🤕" size={22} />,
              label: "Headache",
              value: (() => {
                const entries =
                  todayLog?.pain?.filter(
                    (entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0,
                  ) ?? [];
                return entries.length ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}` : "None";
              })(),
            },
          ];

          const activeMonth = summaryMonthAnchor ?? fromKey(todayDateKey);
          const monthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
          const monthEnd = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
          const monthKeys = daysBetweenInclusive(monthStart, monthEnd);
          const monthLogs = monthKeys.map((key) => ({ key, log: view.dayLogs[key] })).filter((item) => !!item.log);
          const loggedDays = monthLogs.length;

          const monthPainValues = monthLogs
            .map(({ log }) => avgDayPain(log))
            .filter((value): value is number => value != null && Number.isFinite(value));
          const monthPainAvg = averageNumbers(monthPainValues);

          const monthTetany = monthLogs.reduce((sum, { log }) => sum + (log?.tetany?.length ?? 0), 0);
          const monthPanic = monthLogs.reduce((sum, { log }) => sum + (log?.panic?.length ?? 0), 0);

          const monthBowelCount = monthLogs.reduce((sum, { log }) => sum + (log?.bowel?.length ?? 0), 0);

          const monthHotFlashDays = monthLogs.filter(({ log }) =>
            (log?.pain ?? []).some((entry) => (entry.hotFlashes ?? 0) > 0),
          ).length;

          const monthHeadacheDays = monthLogs.filter(({ log }) =>
            (log?.pain ?? []).some(
              (entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0,
            ),
          ).length;

          const periodDays = monthLogs
            .filter(({ log }) => !!(log?.periodInfo?.level ?? log?.period))
            .map(({ key, log }) => ({ key, level: log?.periodInfo?.level ?? log?.period }));

          const periodStart = periodDays[0]?.key;
          const periodEnd = periodDays[periodDays.length - 1]?.key;
          const monthPeriodLabel =
            periodStart && periodEnd
              ? `${fromKey(periodStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${
                  periodEnd !== periodStart
                    ? ` – ${fromKey(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                    : ""
                } · ${periodDays.length} day${periodDays.length === 1 ? "" : "s"}`
              : "Not logged";

          const monthSex = monthLogs.reduce(
            (sum, { log }) => sum + (log?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0),
            0,
          );

          const monthSleepValues = monthLogs
            .map(({ log }) => log?.sleepHours ?? log?.pregnancy?.sleepHours ?? log?.postpartum?.sleepHours)
            .filter((value): value is number => value != null && Number.isFinite(value));
          const monthSleepAvg = averageNumbers(monthSleepValues);

          const summaryNow = new Date();
          const summaryTodayKey = toKey(summaryNow);
          const summaryNowMinutes = summaryNow.getHours() * 60 + summaryNow.getMinutes();

          let monthScheduledTotal = 0;
          let monthMedsTaken = 0;

          monthKeys.forEach((dateKey) => {
            todayScheduled.forEach((medKey) => {
              const atIndex = medKey.lastIndexOf("@");
              const time = atIndex >= 0 ? medKey.slice(atIndex + 1) : "";
              const isTaken = !!view.medLog[dateKey]?.[medKey];

              // Never count future dates.
              if (dateKey > summaryTodayKey) return;

              // Today counts only doses whose scheduled time already passed,
              // unless the dose was already marked taken.
              if (dateKey === summaryTodayKey && !isTaken) {
                const match = /^(\d{1,2}):(\d{2})/.exec(time);
                if (!match) return;

                const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);
                if (scheduledMinutes > summaryNowMinutes) return;
              }

              monthScheduledTotal += 1;
              if (isTaken) monthMedsTaken += 1;
            });
          });

          const monthMedsPct =
            monthScheduledTotal > 0 ? Math.round((monthMedsTaken / monthScheduledTotal) * 100) : undefined;

          const monthRows = [
            {
              key: "pain",
              icon: <FlameIcon size={22} />,
              label: "Pain",
              value: monthPainAvg != null ? `${monthPainAvg.toFixed(1)} / 10 avg` : "No pain logged",
            },
            {
              key: "meds",
              icon: <PillIcon size={22} />,
              label: "Medication",
              value: monthMedsPct != null ? `${monthMedsPct}% taken` : "No schedule",
            },
            {
              key: "sleep",
              icon: <ClockIcon size={22} />,
              label: "Sleep",
              value: monthSleepAvg != null ? `${monthSleepAvg.toFixed(1)} h avg` : "Not logged",
            },
            {
              key: "tetany",
              icon: <Ico e="⭐️" size={22} />,
              label: "Tetany",
              value: `${monthTetany} episode${monthTetany === 1 ? "" : "s"}`,
            },
            {
              key: "panic",
              icon: <Ico e="✨" size={22} />,
              label: "Panic",
              value: `${monthPanic} episode${monthPanic === 1 ? "" : "s"}`,
            },
            {
              key: "bowel",
              icon: <PoopIcon size={22} />,
              label: "Bowel",
              value: monthBowelCount
                ? `${monthBowelCount} entr${monthBowelCount === 1 ? "y" : "ies"}`
                : "None",
            },
            {
              key: "sex",
              icon: <HeartIcon size={22} />,
              label: "ŠukŠuk",
              value: `${monthSex}× this month`,
            },
            {
              key: "hotFlashes",
              icon: <Ico e="🥵" size={22} />,
              label: "Hot flashes",
              value: monthHotFlashDays
                ? `${monthHotFlashDays} day${monthHotFlashDays === 1 ? "" : "s"}`
                : "None",
            },
            {
              key: "headache",
              icon: <Ico e="🤕" size={22} />,
              label: "Headache",
              value: monthHeadacheDays
                ? `${monthHeadacheDays} day${monthHeadacheDays === 1 ? "" : "s"}`
                : "None",
            },
            {
              key: "period",
              icon: <Ico e="🩸" size={22} />,
              label: "Period",
              value: monthPeriodLabel,
            },
          ];

          const rows = summaryMode === "today" ? todayRows : monthRows;

          const shiftSummaryMonth = (delta: -1 | 1) => {
            setSummaryMonthAnchor((current) => {
              const base = current ?? fromKey(todayDateKey);
              return new Date(base.getFullYear(), base.getMonth() + delta, 1);
            });
          };

          return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center px-7">
              <button
                type="button"
                aria-label="Close summary"
                className="absolute inset-0 bg-black/35"
                onClick={() => setTodayOpen(false)}
              />

              <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[1.65rem] bg-background shadow-2xl ring-1 ring-border">
                <div className="border-b border-border/70 px-4 pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex rounded-xl bg-tint p-0.5 ring-1 ring-border/50">
                        <button
                          type="button"
                          onClick={() => setSummaryMode("today")}
                          className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${
                            summaryMode === "today"
                              ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground"
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSummaryMode("month");
                            setSummaryMonthAnchor((current) => current ?? fromKey(todayDateKey));
                          }}
                          className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${
                            summaryMode === "month"
                              ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground"
                          }`}
                        >
                          Month
                        </button>
                      </div>

                      {summaryMode === "today" ? (
                        <h2 className="mt-2 font-serif text-lg font-bold text-foreground">
                          {fromKey(todayDateKey).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h2>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => shiftSummaryMonth(-1)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
                            aria-label="Previous month"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          <div className="min-w-0 flex-1 text-center">
                            <h2 className="font-serif text-lg font-bold text-foreground">
                              {activeMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                            </h2>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {loggedDays} / {monthKeys.length} days logged
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => shiftSummaryMonth(1)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
                            aria-label="Next month"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setTodayOpen(false)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-xs font-bold text-foreground ring-1 ring-border"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="max-h-[48dvh] overflow-y-auto overscroll-contain touch-pan-y p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {rows.map((row) => (
                      <div key={row.key} className="min-w-0 rounded-2xl bg-tint px-2.5 py-2.5 ring-1 ring-border/50">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center">{row.icon}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-medium text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-foreground">
                              {row.value}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {summaryMode === "today" && noteText && (
                    <div className="mt-2 flex items-start gap-2 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/50">
                      <span className="grid h-8 w-8 shrink-0 place-items-center">
                        <NoteIcon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-medium text-muted-foreground">Note</span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-foreground">{noteText}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/70 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (summaryMode === "today") {
                        setSelected(todayDateKey);
                        setMonthAnchor(fromKey(todayDateKey));
                      } else {
                        const key = toKey(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1));
                        setSelected(key);
                        setMonthAnchor(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1));
                      }
                      setTodayOpen(false);
                    }}
                    className="min-h-10 w-full rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    {summaryMode === "today" ? "Open today on calendar" : "Open month on calendar"}
                  </button>
                </div>
              </section>
            </div>
          );
        })()}

      {!maleMode && hakOpen && hakAnchor && (
        <BirthControlOverlay
          data={view}
          anchor={hakAnchor}
          onAnchorChange={setHakAnchor}
          onClose={() => setHakOpen(false)}
        />
      )}

      <LogSheet
        open={logOpen}
        onOpenChange={(open) => {
          setLogOpen(open);

          if (!open) {
            setQuickCat(undefined);
            setEditPain(undefined);
            setEditEntry(undefined);
          }
        }}
        date={selected}
        data={view}
        update={update}
        initial={quickCat as never}
        initialPain={editPain}
        editEntry={editEntry}
      />
    </AppShell>
  );
}


function BirthControlSummaryCard({
  data,
  dateKey,
  onOpen,
}: {
  data: BixboData;
  dateKey: string;
  onOpen: () => void;
}) {
  if (!dateKey || String(data.settings.gender ?? "").trim().toLowerCase() === "male") return null;

  const DROVELIS_START = "2026-04-22";
  const ACTIVE_DAYS = 24;
  const PACK_DAYS = 28;
  const since = data.settings.birthControlSince || DROVELIS_START;
  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );

  // Do not show the card before HAK started unless a HAK medication is configured.
  if (dateKey < since && !bcMed) return null;

  const diff = Math.round((fromKey(dateKey).getTime() - fromKey(since).getTime()) / 86400000);
  if (diff < 0) return null;

  const packDay = (diff % PACK_DAYS) + 1;
  const isPlacebo = packDay > ACTIVE_DAYS;
  const bcId = bcMed?.id ?? "hak-default";
  const log = data.medLog[dateKey] ?? {};
  const times = data.medLogTimes?.[dateKey] ?? {};
  const takenKey = Object.keys(log).find(
    (key) => log[key] && key !== `${bcId}@missed` && key.startsWith(`${bcId}@`),
  );
  const takenTime = takenKey ? times[takenKey] ?? takenKey.split("@")[1] ?? "" : "";
  const missed = !!log[`${bcId}@missed`];

  const HAK_PURPLE = "#7A53C8";
  const HAK_PURPLE_DARK = "#5B32AE";
  const HAK_PINK = "#D95782";
  const HAK_PINK_DARK = "#B92E60";
  const HAK_PINK_SOFT = "#F7CBD9";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-5 mt-2 block w-[calc(100%-2.5rem)] rounded-2xl bg-surface px-3 py-2.5 text-left shadow-sm ring-1 ring-border transition active:scale-[0.99]"
      aria-label={`Open birth control overview. HAK day ${packDay} of ${PACK_DAYS}`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Ico e="💊" size={20} />
        </span>

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="truncate font-serif text-base font-bold text-foreground">Birth control</p>
            <span className="text-[10px] text-muted-foreground">Drovelis</span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Day
              </span>
              <span className="font-serif text-lg font-bold leading-none text-primary">
                {packDay}/{PACK_DAYS}
              </span>
            </div>

            <span className="h-5 w-px bg-border/70" />

            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {isPlacebo ? "Placebo" : "Active"}
              </span>
              <span className="text-xs font-bold text-primary">
                {isPlacebo ? `${packDay - ACTIVE_DAYS}/4` : `${packDay}/24`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-primary"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 16%, white)",
              boxShadow: "inset 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent)",
            }}
          >
            {packDay}
          </span>
          <span className="text-lg leading-none text-primary">›</span>
        </div>
      </div>
    </button>
  );
}

function BirthControlOverlay({
  data,
  anchor: _anchor,
  onAnchorChange: _onAnchorChange,
  onClose,
}: {
  data: BixboData;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Always open HAK detail at the very top so the title/back button are visible.
    overlayRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const mainRef = useRef<HTMLElement | null>(null);
  const fitRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  // HAK follows the same BIXBO SOFT OLIVE DARK palette defined at the end of styles.css.
  // Light mode keeps the existing Moss Green palette exactly as before.
  const hakDarkMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const hakTheme = hakDarkMode
    ? {
        background: "#4B5133",
        foreground: "#F5F4E8",
        surface: "#5A6040",
        surfaceElevated: "#666D49",
        surfaceSunken: "#41472D",
        tint: "#626944",
        card: "#5A6040",
        cardForeground: "#F5F4E8",
        popover: "#626844",
        popoverForeground: "#F5F4E8",
        primary: "#B6C28E",
        primaryForeground: "#30351F",
        secondary: "#686F49",
        secondaryForeground: "#F4F2E5",
        muted: "#626847",
        mutedForeground: "#D5D7C2",
        accent: "#77805A",
        accentForeground: "#F8F7EC",
        border: "#777D58",
        input: "#777D58",
        ring: "#C0CD98",
        chartGrid: "#6C7350",
        chartAxis: "#DDDCCB",
        chartTooltipBg: "#555B3B",
        chartTooltipFg: "#F7F5E9",
      }
    : {
        background: "#98A86A",
        foreground: "#18200F",
        surface: "#B0BC89",
        surfaceElevated: "#BEC8A0",
        surfaceSunken: "#88975D",
        tint: "#A7B47B",
        card: "#B0BC89",
        cardForeground: "#18200F",
        popover: "#C3CCAA",
        popoverForeground: "#18200F",
        primary: "#5F7033",
        primaryForeground: "#FFFDF3",
        secondary: "#A9B57E",
        secondaryForeground: "#202814",
        muted: "#AAB77E",
        mutedForeground: "#475234",
        accent: "#97A969",
        accentForeground: "#1F2812",
        border: "#7D8D54",
        input: "#7D8D54",
        ring: "#5F7033",
        chartGrid: "#95A56A",
        chartAxis: "#37412B",
        chartTooltipBg: "#D0D8BC",
        chartTooltipFg: "#18200F",
      };

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previousOverflow = body.style.overflow;

    // Save the complete inline background state. BIXBO's global light theme uses
    // a green background gradient, so changing only backgroundColor is not enough:
    // the old green background-image can remain visible in the iOS safe-area/status bar.
    const previousBodyBackground = body.style.getPropertyValue("background");
    const previousBodyBackgroundPriority = body.style.getPropertyPriority("background");
    const previousHtmlBackground = html.style.getPropertyValue("background");
    const previousHtmlBackgroundPriority = html.style.getPropertyPriority("background");
    const previousBodyThemeBackground = body.style.getPropertyValue("--background");
    const previousBodyThemeBackgroundPriority = body.style.getPropertyPriority("--background");
    const previousHtmlThemeBackground = html.style.getPropertyValue("--background");
    const previousHtmlThemeBackgroundPriority = html.style.getPropertyPriority("--background");

    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const createdThemeMeta = !themeMeta;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    const previousThemeColor = themeMeta.content;

    body.style.overflow = "hidden";

    // Force the full document canvas — including the iOS safe area — to the same
    // lavender as Birth Control. Using the background shorthand also removes the
    // global olive gradient while this overlay is open.
    body.style.setProperty("--background", hakTheme.background, "important");
    html.style.setProperty("--background", hakTheme.background, "important");
    body.style.setProperty("background", hakTheme.background, "important");
    html.style.setProperty("background", hakTheme.background, "important");
    themeMeta.content = hakTheme.background;

    return () => {
      body.style.overflow = previousOverflow;

      if (previousBodyBackground) {
        body.style.setProperty("background", previousBodyBackground, previousBodyBackgroundPriority);
      } else {
        body.style.removeProperty("background");
      }
      if (previousHtmlBackground) {
        html.style.setProperty("background", previousHtmlBackground, previousHtmlBackgroundPriority);
      } else {
        html.style.removeProperty("background");
      }

      if (previousBodyThemeBackground) {
        body.style.setProperty("--background", previousBodyThemeBackground, previousBodyThemeBackgroundPriority);
      } else {
        body.style.removeProperty("--background");
      }
      if (previousHtmlThemeBackground) {
        html.style.setProperty("--background", previousHtmlThemeBackground, previousHtmlThemeBackgroundPriority);
      } else {
        html.style.removeProperty("--background");
      }

      if (createdThemeMeta) {
        themeMeta?.remove();
      } else if (themeMeta) {
        themeMeta.content = previousThemeColor;
      }
    };
  }, []);

  useLayoutEffect(() => {
    // HAK now scrolls naturally at full 1:1 size on both mobile and desktop.
    // Do not shrink the calendar / Current HAK pack / ŠukŠuk composition to fit.
    setFitScale(1);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[900] flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={{
        ...({
          "--background": hakTheme.background,
          "--foreground": hakTheme.foreground,
          "--surface": hakTheme.surface,
          "--surface-elevated": hakTheme.surfaceElevated,
          "--surface-sunken": hakTheme.surfaceSunken,
          "--tint": hakTheme.tint,
          "--card": hakTheme.card,
          "--card-foreground": hakTheme.cardForeground,
          "--popover": hakTheme.popover,
          "--popover-foreground": hakTheme.popoverForeground,
          "--primary": hakTheme.primary,
          "--primary-foreground": hakTheme.primaryForeground,
          "--secondary": hakTheme.secondary,
          "--secondary-foreground": hakTheme.secondaryForeground,
          "--muted": hakTheme.muted,
          "--muted-foreground": hakTheme.mutedForeground,
          "--accent": hakTheme.accent,
          "--accent-foreground": hakTheme.accentForeground,
          "--border": hakTheme.border,
          "--input": hakTheme.input,
          "--ring": hakTheme.ring,
          "--chart-grid": hakTheme.chartGrid,
          "--chart-axis": hakTheme.chartAxis,
          "--chart-tooltip-bg": hakTheme.chartTooltipBg,
          "--chart-tooltip-fg": hakTheme.chartTooltipFg,
        } as CSSProperties),
        background: hakTheme.background,
        backgroundColor: hakTheme.background,
      }}
    >
      {/* Explicit iOS safe-area backdrop. The document background is also forced
          purple above, so no olive strip can bleed through behind the status bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[905] bg-[#98A86A]"
        style={{
          height: "max(env(safe-area-inset-top), 1px)",
          backgroundColor: hakTheme.background,
        }}
      />

      <div className="relative z-[910] shrink-0 border-b border-border/70 bg-background px-4 pb-2 pt-[max(.65rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
            aria-label="Back to calendar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-2 text-center">
            <h1 className="whitespace-nowrap font-serif text-[1.2rem] font-bold leading-tight text-foreground">
              Birth control overview
            </h1>
            <p className="mt-1 text-[10px] leading-none text-muted-foreground">Drovelis</p>
          </div>

          <span className="h-10 w-10 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <main
        ref={mainRef}
        className="mx-auto min-h-0 w-full max-w-[42rem] flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 lg:max-w-[1180px] lg:px-6 lg:pb-24"
      >
        <div
          ref={fitRef}
          className="mx-auto w-full"
          style={{
            transform: `scale(${fitScale})`,
            transformOrigin: "top center",
          }}
        >
          <BirthControlCalendar data={data} darkMode={hakDarkMode} />
        </div>
      </main>
    </div>,
    document.body,
  );
}

function BirthControlCalendar({
  data,
  darkMode,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  darkMode: boolean;
}) {
  const { update } = useBixbo();
  const [sel, setSel] = useState<string | null>(null);

  // The month selector controls only the calendar inside the ring.
  // It never changes the one current 28-day HAK pack shown by the ring.
  const [hakMonth, setHakMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Personal Drovelis schedule. Keep Settings as the source of truth when present,
  // with the confirmed start date as a safe fallback for this build.
  const DROVELIS_START = "2026-04-22";
  const since = data.settings.birthControlSince || DROVELIS_START;

  useEffect(() => {
    if (!sel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sel]);

  if (String(data.settings.gender ?? "").trim().toLowerCase() === "male") return null;

  // Drovelis is monophasic: every pink active tablet has the same full dose.
  // 24 pink active tablets + 4 white placebo tablets = one 28-day pack.
  const ACTIVE_DAYS = 24;
  const PACK_DAYS = 28;

  const HAK_PURPLE = darkMode ? "#AFC17A" : "#647A32";
  const HAK_PURPLE_DARK = darkMode ? "#D9E3BA" : "#455A20";
  const HAK_PURPLE_SOFT = darkMode ? "#626944" : "#C5D1A0";
  const HAK_PURPLE_DOT = darkMode ? "#A4B76D" : "#607A2D";
  const HAK_PINK = darkMode ? "#E36F98" : "#D95782";
  const HAK_PINK_DARK = darkMode ? "#F09AB8" : "#B92E60";
  const HAK_PINK_SOFT = darkMode ? "#684653" : "#F7CBD9";
  const HAK_GREEN = darkMode ? "#A9C76F" : "#7FA33B";
  const HAK_GREEN_DARK = darkMode ? "#D4DFAA" : "#526B24";
  const HAK_GREEN_SOFT = darkMode ? "#59653C" : "#D8E4B8";
  const HAK_TRACK = darkMode ? "#747A5B" : "#E3E4C9";
  const HAK_CARD_BG = darkMode
    ? "color-mix(in srgb, var(--surface) 88%, #77805A 12%)"
    : "color-mix(in srgb, var(--background) 90%, #536A27 10%)";

  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );
  const bcId = bcMed?.id ?? "hak-default";

  const todayK = toKey(new Date());

  const pillNumber = (k: string) => {
    const diff = Math.round((fromKey(k).getTime() - fromKey(since).getTime()) / 86400000);
    if (diff < 0) return null;
    return (diff % PACK_DAYS) + 1;
  };

  // One fixed 28-day HAK wheel: always the pack that contains TODAY.
  // Calendar months (28/29/30/31 days) must never move or redefine this wheel.
  const currentDay = pillNumber(todayK) ?? 1;
  const currentPackStart = addDays(todayK, -(currentDay - 1));

  const dateForPackDay = (day: number) => addDays(currentPackStart, day - 1);

  const takenAt = (k: string): string | null => {
    const log = data.medLog[k] ?? {};
    const times = data.medLogTimes?.[k] ?? {};
    const keys = Object.keys(log).filter(
      (key) => log[key] && key !== `${bcId}@missed` && key.startsWith(`${bcId}@`),
    );
    if (!keys.length) return null;
    return times[keys[0]] ?? keys[0].split("@")[1] ?? "";
  };

  const missedAt = (k: string): boolean => !!data.medLog[k]?.[`${bcId}@missed`];

  const markTaken = (k: string, time: string) =>
    update((d) => {
      const t = time || new Date().toTimeString().slice(0, 5);
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });
      day[`${bcId}@${t}`] = true;

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });
      dayTimes[`${bcId}@${t}`] = t;

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
        medNames: bcMed ? d.medNames : { ...d.medNames, [bcId]: "Birth control" },
      };
    });

  const markMissed = (k: string) =>
    update((d) => {
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });
      day[`${bcId}@missed`] = true;

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
        medNames: bcMed ? d.medNames : { ...d.medNames, [bcId]: "Birth control" },
      };
    });

  const clearRecord = (k: string) =>
    update((d) => {
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
      };
    });

  const selectedDay = sel ? pillNumber(sel) : null;
  const selectedTaken = sel ? takenAt(sel) : null;
  const selectedMissed = sel ? missedAt(sel) : false;
  const selectedIsPlacebo = selectedDay != null && selectedDay > ACTIVE_DAYS;
  const popupAccent = selectedIsPlacebo ? HAK_PINK_DARK : HAK_PURPLE_DARK;
  const popupSoft = selectedIsPlacebo
    ? darkMode ? "#5C3F4B" : "#F9DDE7"
    : darkMode ? "#555B3B" : "#D6DEBC";



  const fmtFullDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const fmtShortDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  const currentPackEnd = addDays(currentPackStart, PACK_DAYS - 1);
  const currentPlaceboStart = addDays(currentPackStart, ACTIVE_DAYS);
  const currentPlaceboEnd = addDays(currentPackStart, PACK_DAYS - 1);
  const protectionStart = addDays(since, 3);
  const protectionActive = todayK >= protectionStart;

  const wheelDays = Array.from({ length: PACK_DAYS }, (_, i) => i + 1);

  // 24 purple dots, a subtle separator, 4 pink dots, a second separator,
  // then one green dot for the next pack. This matches the detailed reference.
  const timelineItems: Array<{
    kind: "active" | "placebo" | "separator" | "next";
    day?: number;
  }> = [
    ...Array.from({ length: ACTIVE_DAYS }, (_, i) => ({ kind: "active" as const, day: i + 1 })),
    { kind: "separator" as const },
    ...Array.from({ length: PACK_DAYS - ACTIVE_DAYS }, (_, i) => ({
      kind: "placebo" as const,
      day: ACTIVE_DAYS + i + 1,
    })),
    { kind: "separator" as const },
    { kind: "next" as const, day: 1 },
  ];

  const timelineCurrentIndex =
    currentDay <= ACTIVE_DAYS
      ? currentDay - 1
      : ACTIVE_DAYS + 1 + (currentDay - ACTIVE_DAYS - 1);

  const timelineMarkerLeft = Math.max(
    6,
    Math.min(88, ((timelineCurrentIndex + 0.5) / timelineItems.length) * 100),
  );

  const hakMonthYear = hakMonth.getFullYear();
  const hakMonthIndex = hakMonth.getMonth();
  const hakMonthOffset = (new Date(hakMonthYear, hakMonthIndex, 1).getDay() + 6) % 7;
  const hakMonthCellCount = 42;
  const hakMonthCells = Array.from({ length: hakMonthCellCount }, (_, index) => {
    const dayNumber = index - hakMonthOffset + 1;
    const date = new Date(hakMonthYear, hakMonthIndex, dayNumber);
    const key = toKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === hakMonthIndex,
      packDay: pillNumber(key),
    };
  });

  const hakMonthLabel = hakMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const moveHakCalendarMonth = (delta: number) => {
    setHakMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  // TRUE mathematical 28-day ring.
  // Every adjacent bubble is the next pill number:
  // 1 → 2 → … → 24 → 25 → 26 → 27 → 28 → back to 1.
  // Rotation keeps placebo 25–28 across the bottom of the wheel.
  const WHEEL_STEP = 360 / PACK_DAYS;
  const WHEEL_DAY1_ANGLE = 57;
  const wheelAngleForDay = (day: number) =>
    WHEEL_DAY1_ANGLE - (day - 1) * WHEEL_STEP;

  return (
    <section className="flex min-h-0 flex-col">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface/65 ring-1 ring-border/50">
            <Ico e="🫐" size={25} />
          </span>
          <div className="min-w-0">
            <h2 className="whitespace-nowrap font-serif text-xl font-bold text-foreground">Blueberry cycle</h2>
            <p className="whitespace-nowrap text-[11px] text-muted-foreground">Birth control overview</p>
          </div>
        </div>

        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface/30 p-0.5 ring-1 ring-border/40">
          <button
            type="button"
            onClick={() => moveHakCalendarMonth(-1)}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label="Previous calendar month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="min-w-[88px] px-1 text-center text-[10px] font-semibold text-foreground">
            {hakMonthLabel}
          </span>

          <button
            type="button"
            onClick={() => moveHakCalendarMonth(1)}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label="Next calendar month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Circular HAK overview — only wheel pills open the dose popup. */}
      <div className="relative left-1/2 mt-1 w-[calc(100%+2rem)] max-w-[390px] -translate-x-1/2 shrink-0">
        <div className="relative aspect-square w-full">
          <div
            className="absolute inset-[5.5%] rounded-full"
            style={{
              background: darkMode ? "rgba(102,109,73,.28)" : "rgba(255,255,255,.12)",
              boxShadow: darkMode
                ? "inset 0 0 0 9px rgba(119,125,88,.34)"
                : "inset 0 0 0 9px rgba(255,255,255,.24)",
            }}
          />
          <div
            className="absolute inset-[16.5%] rounded-full"
            style={{
              backgroundColor: HAK_CARD_BG,
              boxShadow: "0 0 0 1px rgba(255,255,255,.12)",
            }}
          />

          <div className="pointer-events-none absolute inset-0 z-[1]">
            {Array.from({ length: PACK_DAYS }).map((_, i) => {
              const day = i + 1;
              const angle = (wheelAngleForDay(day) * Math.PI) / 180;
              const radius = 44.5;
              return (
                <span
                  key={`wheel-track-${i}`}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
                  style={{
                    left: `${50 + Math.cos(angle) * radius}%`,
                    top: `${50 + Math.sin(angle) * radius}%`,
                    backgroundColor: darkMode ? "rgba(245,244,232,.42)" : "rgba(255,255,255,.70)",
                  }}
                />
              );
            })}
          </div>

          {wheelDays.map((day) => {
            const angle = (wheelAngleForDay(day) * Math.PI) / 180;
            const radius = 44.5;
            const left = 50 + Math.cos(angle) * radius;
            const top = 50 + Math.sin(angle) * radius;
            const dateKey = dateForPackDay(day);
            const loggedTaken = !!takenAt(dateKey);
            const missed = missedAt(dateKey);
            const isCurrent = day === currentDay;
            const isPlacebo = day > ACTIVE_DAYS;

            // The user confirmed continuous on-time Drovelis use from `since`.
            // Therefore historical active pills are visually treated as taken
            // unless that exact date was explicitly marked missed. This prevents
            // old packs from showing pale/empty circles only because dose logging
            // was added to the app later.
            const assumedHistoricalTaken =
              !isPlacebo && dateKey >= since && dateKey < todayK && !missed;
            const takenForStatus = loggedTaken || assumedHistoricalTaken;

            // Soft 3D pill bubbles.
            // Keep the wheel math/layout untouched; only color-state treatment changes.
            // Active HAK: lighter moss when not taken, darker moss when taken.
            // Placebo/break: pale pink when not taken, darker pink when taken.
            let bubbleBackground = isPlacebo
              ? darkMode
                ? "radial-gradient(circle at 30% 24%, #F5D7E2 0%, #E9A8BE 42%, #D97B9D 78%, #C65D84 100%)"
                : "radial-gradient(circle at 30% 24%, #FFF8FB 0%, #F7D9E6 42%, #EDB7CA 78%, #E39AB6 100%)"
              : darkMode
                ? "radial-gradient(circle at 30% 24%, #DDE5C4 0%, #BAC88C 42%, #96AA64 78%, #7A8F4D 100%)"
                : "radial-gradient(circle at 30% 24%, #F4F8E8 0%, #D8E4B8 42%, #B2C67A 78%, #8EA750 100%)";
            let color = isPlacebo
              ? darkMode ? "#7F2748" : HAK_PINK_DARK
              : darkMode ? "#30351F" : HAK_GREEN_DARK;
            let bubbleBorder = darkMode ? "rgba(245,244,232,.56)" : "rgba(255,255,255,.8)";
            let bubbleShadow = isPlacebo
              ? darkMode
                ? "inset 1.5px 1.5px 3px rgba(255,255,255,.55), inset -1.5px -2px 3px rgba(96,35,59,.22), 0 2px 8px rgba(31,34,20,.30), 0 0 0 1px rgba(240,154,184,.22)"
                : "inset 1.5px 1.5px 3px rgba(255,255,255,.95), inset -1.5px -2px 3px rgba(180,82,118,.12), 0 2px 7px rgba(173,85,117,.16), 0 0 0 1px rgba(217,87,130,.18)"
              : darkMode
                ? "inset 1.5px 1.5px 3px rgba(255,255,255,.48), inset -1.5px -2px 3px rgba(48,53,31,.28), 0 2px 8px rgba(31,34,20,.30), 0 0 0 1px rgba(182,194,142,.24)"
                : "inset 1.5px 1.5px 3px rgba(255,255,255,.92), inset -1.5px -2px 3px rgba(82,107,36,.14), 0 2px 7px rgba(68,92,29,.16), 0 0 0 1px rgba(95,112,51,.20)";

            if (takenForStatus && !isCurrent) {
              if (isPlacebo) {
                bubbleBackground = darkMode
                  ? "radial-gradient(circle at 30% 24%, #E992B0 0%, #D9658D 42%, #C14573 78%, #A93460 100%)"
                  : "radial-gradient(circle at 30% 24%, #FFDDE9 0%, #F6AEC6 42%, #E977A0 78%, #D95782 100%)";
                color = "#FFF7FB";
                bubbleBorder = "rgba(255,255,255,.72)";
                bubbleShadow =
                  "inset 1.5px 1.5px 3px rgba(255,255,255,.65), inset -1.5px -2px 3px rgba(135,39,77,.20), 0 2px 8px rgba(154,58,95,.22), 0 0 0 1px rgba(185,46,96,.28)";
              } else {
                bubbleBackground = darkMode
                  ? "radial-gradient(circle at 30% 24%, #AFC17A 0%, #849B52 42%, #667E3B 78%, #4F642D 100%)"
                  : "radial-gradient(circle at 30% 24%, #DDE7C3 0%, #A7B878 42%, #7C914B 78%, #5A6C31 100%)";
                color = "#FFFDF3";
                bubbleBorder = "rgba(255,255,255,.72)";
                bubbleShadow =
                  "inset 1.5px 1.5px 3px rgba(255,255,255,.72), inset -1.5px -2px 3px rgba(61,75,31,.18), 0 2px 8px rgba(54,68,30,.20), 0 0 0 1px rgba(79,96,40,.28)";
              }
            }

            if (isCurrent) {
              if (isPlacebo) {
                bubbleBackground = takenForStatus
                  ? darkMode
                    ? "radial-gradient(circle at 30% 24%, #E992B0 0%, #D45F88 46%, #B93C68 100%)"
                    : "radial-gradient(circle at 30% 24%, #FFD7E5 0%, #F4A5BE 46%, #E46F99 100%)"
                  : darkMode
                    ? "radial-gradient(circle at 30% 24%, #F5D7E2 0%, #E8A8BD 46%, #D77A9B 100%)"
                    : "radial-gradient(circle at 30% 24%, #FFF7FB 0%, #F6D8E6 46%, #E9B7CA 100%)";
                color = takenForStatus ? "#FFF7FB" : darkMode ? "#7F2748" : HAK_PINK_DARK;
                bubbleBorder = "rgba(255,255,255,.88)";
                bubbleShadow =
                  `inset 1.5px 1.5px 3px rgba(255,255,255,.78), inset -1.5px -2px 3px rgba(145,57,91,.16), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(217,87,130,.30), 0 3px 10px rgba(154,58,95,.18)`;
              } else {
                bubbleBackground = takenForStatus
                  ? darkMode
                    ? "radial-gradient(circle at 30% 24%, #AFC17A 0%, #80984E 48%, #53682F 100%)"
                    : "radial-gradient(circle at 30% 24%, #B8C988 0%, #7F9650 48%, #52652D 100%)"
                  : darkMode
                    ? "radial-gradient(circle at 30% 24%, #DCE5C1 0%, #B8C789 46%, #91A75E 100%)"
                    : "radial-gradient(circle at 30% 24%, #F2F7E2 0%, #D6E2B3 46%, #AFC573 100%)";
                color = takenForStatus ? "#fff" : darkMode ? "#30351F" : HAK_GREEN_DARK;
                bubbleBorder = "rgba(255,255,255,.88)";
                bubbleShadow = takenForStatus
                  ? `inset 1.5px 1.5px 3px rgba(255,255,255,.42), inset -1.5px -2px 3px rgba(49,62,27,.22), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(95,112,51,.30), 0 3px 10px rgba(52,65,30,.22)`
                  : `inset 1.5px 1.5px 3px rgba(255,255,255,.88), inset -1.5px -2px 3px rgba(88,111,39,.14), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(127,163,59,.22), 0 3px 10px rgba(79,101,34,.14)`;
              }
            }

            if (missed) {
              bubbleBorder = "#C94A55";
              bubbleShadow =
                "inset 1.5px 1.5px 3px rgba(255,255,255,.75), 0 0 0 2px rgba(201,74,85,.22), 0 2px 8px rgba(120,55,61,.16)";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSel(dateKey);
                }}
                className="absolute z-10 grid h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold transition active:scale-95"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  background: bubbleBackground,
                  color,
                  border: `1px solid ${bubbleBorder}`,
                  boxShadow: bubbleShadow,
                  textShadow: isCurrent
                    ? "0 1px 1px rgba(50,30,80,.12)"
                    : "0 1px 0 rgba(255,255,255,.45)",
                }}
                aria-label={`HAK day ${day}, ${fmtFullDate(dateKey)}${missed ? ", missed" : takenForStatus ? ", taken on schedule" : ""}`}
              >
                {day}
              </button>
            );
          })}

          {/* Current day status — kept clear of the top pill bubbles. */}
          <div className="pointer-events-none absolute left-[25%] right-[25%] top-[20%] z-20 text-center">
            <p className="text-[10px] font-semibold leading-none text-foreground">Day</p>
            <p
              className="mt-0.5 font-serif text-[clamp(1.85rem,7.5vw,2.45rem)] font-bold leading-none"
              style={{ color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK }}
            >
              {currentDay} / {PACK_DAYS}
            </p>

            {currentDay > ACTIVE_DAYS && (
              <p
                className="mt-1 text-[10px] font-semibold leading-none"
                style={{ color: HAK_PINK_DARK }}
              >
                Placebo / break
              </p>
            )}
          </div>

          {/* Calendar — actual date stays large; HAK pill number stays as small Pxx. */}
          <div className="pointer-events-none absolute left-[16.5%] right-[16.5%] top-[34.5%] z-20 text-center">
            <p className="text-[14px] font-bold leading-none text-foreground">
              {hakMonthLabel}
            </p>

            <div className="mt-1.5 grid grid-cols-7 text-center text-[10px] font-semibold leading-none text-foreground/75">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-x-[2px] gap-y-[1px]">
              {hakMonthCells.map((cell) => {
                if (!cell.inMonth) {
                  return <span key={cell.key} className="h-[20px]" aria-hidden="true" />;
                }

                const packDay = cell.packDay;
                const loggedTaken = !!takenAt(cell.key);
                const missed = missedAt(cell.key);
                const isToday = cell.key === todayK;
                const isPlacebo = packDay != null && packDay > ACTIVE_DAYS;
                const isNewPack = packDay === 1;

                const chipBg =
                  packDay == null
                    ? "transparent"
                    : isPlacebo
                      ? darkMode ? "rgba(227,111,152,.72)" : "rgba(239,154,184,.72)"
                      : isNewPack
                        ? darkMode ? "rgba(169,199,111,.68)" : "rgba(176,185,81,.72)"
                        : darkMode ? "rgba(175,193,122,.68)" : "rgba(101,119,58,.76)";

                const chipColor =
                  packDay == null
                    ? "transparent"
                    : isPlacebo
                      ? HAK_PINK_DARK
                      : isNewPack
                        ? HAK_GREEN_DARK
                        : HAK_PURPLE_DARK;

                return (
                  <span
                    key={cell.key}
                    className="flex h-[20px] min-w-0 flex-col items-center justify-start"
                    aria-label={
                      packDay == null
                        ? fmtFullDate(cell.key)
                        : `${fmtFullDate(cell.key)}, HAK day ${packDay}${loggedTaken ? ", taken" : missed ? ", missed" : ""}`
                    }
                  >
                    <span
                      className="grid h-[10px] min-w-[16px] place-items-center rounded-full px-[1px] text-[10px] font-bold leading-none tabular-nums"
                      style={{
                        color: "var(--foreground)",
                        boxShadow: isToday ? (darkMode ? "0 0 0 1px rgba(221,220,203,.75)" : "0 0 0 1px rgba(65,76,18,.68)") : undefined,
                      }}
                    >
                      {cell.date.getDate()}
                    </span>

                    {packDay != null && (
                      <span
                        className="mt-[1px] max-w-[30px] truncate rounded-[3px] px-[2px] py-[1px] text-[5.7px] font-bold leading-none tabular-nums"
                        style={{
                          backgroundColor: chipBg,
                          color: chipColor,
                        }}
                      >
                        P{packDay}{loggedTaken ? " ✓" : missed ? " ×" : ""}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Keep Current HAK pack exactly in the previous compact timeline style. */}
      <div className="mt-4">
        <h3 className="font-serif text-lg font-bold text-foreground">Current HAK pack</h3>
        <div
          className="mt-3 rounded-[1.75rem] px-4 py-4 ring-1"
          style={{
            backgroundColor: darkMode ? "rgba(90,96,64,.72)" : "rgba(255,255,255,.20)",
            borderColor: darkMode ? "rgba(119,125,88,.82)" : "rgba(95,112,51,.22)",
          }}
        >
          <div className="grid grid-cols-[1.35fr_1fr_.9fr] items-start gap-2 text-center">
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_PURPLE_DARK }}>Active HAK days</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_PURPLE_DARK }}>1–{ACTIVE_DAYS}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_PINK_DARK }}>Placebo / break</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_PINK_DARK }}>{ACTIVE_DAYS + 1}–{PACK_DAYS}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_GREEN_DARK }}>New cycle</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_GREEN_DARK }}>Day 1</p>
            </div>
          </div>

          <div className="relative mt-4 px-1 pb-8">
            <div
              className="rounded-full px-2 py-2 ring-1"
              style={{
                backgroundColor: darkMode ? "rgba(65,71,45,.76)" : "rgba(255,255,255,.30)",
                borderColor: darkMode ? "rgba(119,125,88,.78)" : "rgba(95,112,51,.22)",
              }}
            >
              <div
                className="grid items-center gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${timelineItems.length}, minmax(0, 1fr))` }}
              >
                {timelineItems.map((item, index) => {
                  const isCurrent = index === timelineCurrentIndex;
                  const itemColor =
                    item.kind === "active"
                      ? HAK_PURPLE_DOT
                      : item.kind === "placebo"
                        ? HAK_PINK
                        : item.kind === "next"
                          ? HAK_GREEN
                          : HAK_TRACK;

                  return (
                    <span
                      key={`${item.kind}-${index}`}
                      className="mx-auto block aspect-square w-full max-w-[10px] rounded-full"
                      style={{
                        backgroundColor: itemColor,
                        boxShadow: isCurrent
                          ? `0 0 0 3px ${HAK_CARD_BG}, 0 0 0 5px ${
                              item.kind === "placebo" ? HAK_PINK_DARK : HAK_PURPLE_DARK
                            }`
                          : item.kind === "next"
                            ? `0 0 0 2px ${HAK_GREEN_SOFT}`
                            : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div
              className="absolute bottom-[22px] h-4 w-px"
              style={{
                left: `${timelineMarkerLeft}%`,
                backgroundColor: currentDay <= ACTIVE_DAYS ? HAK_PURPLE : HAK_PINK,
              }}
            />
            <p
              className="absolute bottom-0 whitespace-nowrap text-[11px] font-bold"
              style={{
                left: `${timelineMarkerLeft}%`,
                transform: "translateX(-50%)",
                color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK,
              }}
            >
              Day {currentDay} / {PACK_DAYS}
            </p>
          </div>
        </div>
      </div>

        </div>
        <div className="min-w-0 lg:pt-12">
      <div
        className="mt-3 rounded-[1.5rem] px-2 py-2 ring-1 lg:mt-0"
        style={{
          backgroundColor: darkMode ? "rgba(90,96,64,.70)" : "rgba(255,255,255,.24)",
          borderColor: darkMode ? "rgba(119,125,88,.76)" : "rgba(95,112,51,.18)",
        }}
      >
        <div
          className="grid grid-cols-4 overflow-hidden rounded-[1.1rem] bg-white/25"
          style={{ backgroundColor: darkMode ? "rgba(65,71,45,.62)" : undefined }}
        >
          <div className="px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-pink-100/80 text-[13px]"><Ico e="🫐" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">Menstruation</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS - ACTIVE_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPlaceboStart)} – {fmtShortDate(currentPlaceboEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-[13px] text-primary"><Ico e="🩸" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">Cycle</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPackStart)} – {fmtShortDate(currentPackEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-[13px] text-primary"><Ico e="💊" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">Taking HAK</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPackStart)} – {fmtShortDate(currentPackEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-lime-100/80 text-[13px]"><Ico e="🛡️" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">Protection</p>
            <p className="text-[11px] font-bold" style={{ color: HAK_GREEN_DARK }}>
              {protectionActive ? "Active" : "Waiting"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">From {fmtShortDate(protectionStart)}</p>
          </div>
        </div>
      </div>

      {/* ŠukŠuk Insights summary — added inside the HAK calendar only. */}
      <SukSukPeriodChart data={data} anchorKey={todayKey()} darkMode={darkMode} />
        </div>
      </div>

      {/* Compact dose editor — only circular HAK wheel pills open this popup. */}
      {sel && selectedDay != null && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-5"
              style={{
                paddingTop: "max(1rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
              onClick={() => setSel(null)}
            >
              <div
                className="w-full max-w-[300px] rounded-[1.55rem] p-4 shadow-2xl ring-1"
                style={{
                  backgroundColor: popupSoft,
                  borderColor: popupAccent,
                  boxShadow: `0 18px 45px color-mix(in srgb, ${popupAccent} 22%, transparent)`,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: popupAccent }}
                    >
                      HAK day {selectedDay}
                    </p>
                    <h3 className="mt-1 font-serif text-[1.05rem] font-bold leading-tight text-foreground">
                      {fmtFullDate(sel)}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSel(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ring-1"
                    style={{
                      backgroundColor: darkMode ? "rgba(102,109,73,.72)" : "rgba(255,255,255,.42)",
                      borderColor: `color-mix(in srgb, ${popupAccent} 35%, transparent)`,
                      color: popupAccent,
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {selectedTaken ? (
                  <div
                    className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                    style={{
                      backgroundColor: darkMode ? "rgba(102,109,73,.62)" : "rgba(255,255,255,.38)",
                      border: `1.5px solid ${popupAccent}`,
                      color: popupAccent,
                    }}
                    aria-label="Tablet already taken"
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: popupAccent }}
                    >
                      ✓
                    </span>
                    Taken
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          markTaken(sel, "");
                          setSel(null);
                        }}
                        className="min-h-11 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: popupAccent }}
                      >
                        Mark taken
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          markMissed(sel);
                          setSel(null);
                        }}
                        className="min-h-11 rounded-xl bg-white/35 px-3 py-2.5 text-xs font-bold"
                        style={{
                          border: `1.5px solid ${popupAccent}`,
                          color: popupAccent,
                        }}
                      >
                        Mark missed
                      </button>
                    </div>

                    {selectedMissed && (
                      <button
                        type="button"
                        onClick={() => {
                          clearRecord(sel);
                          setSel(null);
                        }}
                        className="mt-2 min-h-9 w-full rounded-xl bg-white/30 px-3 py-2 text-[10px] font-semibold"
                        style={{
                          border: `1px solid color-mix(in srgb, ${popupAccent} 32%, transparent)`,
                          color: popupAccent,
                        }}
                      >
                        Clear missed status
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

    </section>
  );
}


function VitalTile({
  emoji,
  label,
  value,
  onClick,
}: {
  emoji: string;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface p-2 ring-1 ring-border hover:bg-tint"
    >
      <Ico e={emoji} size={16} />
      <span className="font-serif text-base font-bold leading-tight">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

function MedsProgress({ data }: { data: BixboData }) {
  const k = todayKey();
  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const total = scheduled.reduce((s, m) => s + m.times.length, 0);
  const taken = scheduled.reduce((s, m) => s + m.times.filter((t) => data.medLog[k]?.[`${m.id}@${t}`]).length, 0);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">
      <div>
        <p className="text-xs text-muted-foreground">Meds today</p>
        <p className="font-serif text-lg font-bold">
          {taken}/{total || 0}
        </p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
        <PillIcon size={20} />
      </div>
    </div>
  );
}

/* ------------------- Day preview ------------------- */

type SukSukRange = {
  label: "Week" | "Month" | "Year";
  start: Date;
  end: Date;
  count: number;
};

function startOfSelectedWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function countIntercourseBetween(data: BixboData, start: Date, end: Date): number {
  return daysBetweenInclusive(start, end).reduce(
    (total, key) =>
      total +
      (data.dayLogs[key]?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0),
    0,
  );
}

function SukSukPeriodChart({
  data,
  anchorKey,
  darkMode,
}: {
  data: BixboData;
  anchorKey: string;
  darkMode: boolean;
}) {
  const HAK_PURPLE = darkMode ? "#B6C28E" : "#647A32";
  const HAK_PURPLE_DARK = darkMode ? "#D9E3BA" : "#455A20";
  const HAK_PURPLE_SOFT = darkMode ? "#626944" : "#C5D1A0";
  const HAK_CARD_BG = darkMode
    ? "color-mix(in srgb, var(--surface) 90%, #77805A 10%)"
    : "color-mix(in srgb, var(--background) 90%, #536A27 10%)";

  const anchor = useMemo(() => {
    const date = fromKey(anchorKey);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [anchorKey]);

  // Week / Month / Year can each be browsed independently.
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  const selectedWeekAnchor = useMemo(() => {
    const date = new Date(anchor);
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  }, [anchor, weekOffset]);

  const selectedMonthAnchor = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1),
    [anchor, monthOffset],
  );

  const selectedYear = anchor.getFullYear() + yearOffset;

  const week = useMemo(() => {
    const start = startOfSelectedWeek(selectedWeekAnchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const previousStart = new Date(start);
    previousStart.setDate(start.getDate() - 7);
    const previousEnd = new Date(end);
    previousEnd.setDate(end.getDate() - 7);

    const daily = daysBetweenInclusive(start, end).map((key, index) => ({
      label: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][index],
      count: data.dayLogs[key]?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0,
    }));

    return {
      start,
      end,
      count: daily.reduce((sum, item) => sum + item.count, 0),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars: daily,
    };
  }, [selectedWeekAnchor, data]);

  const month = useMemo(() => {
    const year = selectedMonthAnchor.getFullYear();
    const monthIndex = selectedMonthAnchor.getMonth();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);

    const previousStart = new Date(year, monthIndex - 1, 1);
    const previousEnd = new Date(year, monthIndex, 0);

    const daysInMonth = end.getDate();
    const bars = [
      [1, Math.min(7, daysInMonth)],
      [8, Math.min(14, daysInMonth)],
      [15, Math.min(21, daysInMonth)],
      [22, Math.min(28, daysInMonth)],
      [29, daysInMonth],
    ]
      .filter(([bucketStart]) => bucketStart <= daysInMonth)
      .map(([bucketStart, bucketEnd]) => {
        const bucketStartDate = new Date(year, monthIndex, bucketStart);
        const bucketEndDate = new Date(year, monthIndex, bucketEnd);

        return {
          label: bucketStart === 29 ? "29+" : `${bucketStart}–${bucketEnd}`,
          count: countIntercourseBetween(data, bucketStartDate, bucketEndDate),
        };
      });

    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [selectedMonthAnchor, data]);

  const year = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);

    const previousStart = new Date(selectedYear - 1, 0, 1);
    const previousEnd = new Date(selectedYear - 1, 11, 31);

    const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const bars = monthLabels.map((label, monthIndex) => {
      const monthStart = new Date(selectedYear, monthIndex, 1);
      const monthEnd = new Date(selectedYear, monthIndex + 1, 0);

      return {
        label,
        count: countIntercourseBetween(data, monthStart, monthEnd),
      };
    });

    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [selectedYear, data]);

  const comparison = (current: number, previous: number, label: string) => {
    const diff = current - previous;
    const symbol = diff > 0 ? "↑" : diff < 0 ? "↓" : "—";
    const value = diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff}`;

    return (
      <p className="mt-2 flex h-4 items-center justify-center gap-1 whitespace-nowrap text-center text-[10px] leading-none text-muted-foreground">
        vs last {label}{" "}
        <span
          className="font-bold"
          style={{ color: diff === 0 ? "var(--muted-foreground)" : HAK_PURPLE_DARK }}
        >
          {symbol}{value}
        </span>
      </p>
    );
  };

  const MiniBars = ({
    items,
    dense = false,
  }: {
    items: { label: string; count: number }[];
    dense?: boolean;
  }) => {
    const max = Math.max(1, ...items.map((item) => item.count));

    return (
      <div
        className="mt-3 grid h-[96px] items-end gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => {
          const height = item.count > 0 ? Math.max(7, Math.round((item.count / max) * 68)) : 1;

          return (
            <div key={`${item.label}-${index}`} className="flex min-w-0 flex-col items-center justify-end">
              <span
                className={`${dense ? "text-[6px]" : "text-[10px]"} mb-1 h-3 tabular-nums font-medium text-foreground/80`}
                title={`${item.label}: ${item.count}`}
                aria-label={`${item.label}: ${item.count}`}
              >
                {dense ? (item.count > 0 ? "•" : "") : item.count}
              </span>
              <div className="flex h-[68px] w-full items-end justify-center border-b border-border/65">
                <span
                  className={`${dense ? "w-[64%]" : "w-[84%]"} rounded-t-[4px]`}
                  style={{
                    height: `${height}px`,
                    background:
                      item.count > 0
                        ? `linear-gradient(180deg, ${HAK_PURPLE} 0%, ${HAK_PURPLE_DARK} 100%)`
                        : HAK_PURPLE_SOFT,
                    opacity: item.count > 0 ? 1 : 0.35,
                  }}
                />
              </div>
              <span
                className={`${dense ? "text-[6px]" : "text-[10px]"} mt-1.5 truncate font-medium text-muted-foreground`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section
      className="mt-4 rounded-3xl p-4 pb-5 ring-1 ring-border"
      style={{ backgroundColor: HAK_CARD_BG }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1"
          style={{
            backgroundColor: HAK_PURPLE_SOFT,
            color: HAK_PURPLE_DARK,
            borderColor: `${HAK_PURPLE}33`,
          }}
        >
          <Ico e="❤️" size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-semibold leading-none text-foreground">ŠukŠuk!</h2>
        </div>
      </div>

      <div className="mt-3 border-t border-border/55 pt-3">
        <div className="grid grid-cols-3 divide-x divide-border/55">
          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">Week</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setWeekOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Previous week"
                title="Previous week"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="min-w-0 truncate rounded-md px-0.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Back to current week"
                title={weekOffset === 0 ? "Current week" : "Back to current week"}
              >
                {week.start.toLocaleDateString("en-GB", { day: "numeric" })}–{week.end.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Next week"
                title="Next week"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {week.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">times</span>
            </p>
            {comparison(week.count, week.previousCount, "week")}
            <MiniBars items={week.bars} />
          </div>

          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">Month</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setMonthOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Previous month"
                title="Previous month"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setMonthOffset(0)}
                className="min-w-0 truncate rounded-md px-0.5 py-0.5 text-center text-[10px] text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Back to current month"
                title={monthOffset === 0 ? "Current month" : "Back to current month"}
              >
                {selectedMonthAnchor.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </button>

              <button
                type="button"
                onClick={() => setMonthOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Next month"
                title="Next month"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {month.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">times</span>
            </p>
            {comparison(month.count, month.previousCount, "month")}
            <MiniBars items={month.bars} />
          </div>

          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">Year</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setYearOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Previous year"
                title="Previous year"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setYearOffset(0)}
                className="min-w-0 rounded-md px-1 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Back to current year"
                title={yearOffset === 0 ? "Current year" : "Back to current year"}
              >
                {selectedYear}
              </button>

              <button
                type="button"
                onClick={() => setYearOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label="Next year"
                title="Next year"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {year.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">times</span>
            </p>
            {comparison(year.count, year.previousCount, "year")}
            <MiniBars items={year.bars} dense />
          </div>
        </div>
      </div>
    </section>
  );
}

function DayPreview({
  date,
  data,
  update,
  onEditPain,
  onEdit,
}: {
  date: string;
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onEditPain?: (p: import("@/lib/storage").PainEntry) => void;
  onEdit?: (cat: string, entry: unknown) => void;
}) {
  const log = data.dayLogs[date];
  const rawNotes = data.dayNotes[date] ?? [];
  const notes: { text: string; time?: string }[] = (rawNotes as (string | { text: string; time?: string })[]).map(
    (n) => (typeof n === "string" ? { text: n } : n),
  );
  const todos = data.todos[date] ?? [];
  const events = data.events.filter((e) => date >= e.startDate && date <= e.endDate);
  const tasks = data.tasks.filter((t) => date >= t.startDate && date <= t.endDate);

  const k = todayKey();
  const isToday = date === k;
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const meds = data.meds;
  const scheduled = data.meds
    .filter((m) => !m.asNeeded)
    .flatMap((m) =>
      m.times.map((t) => ({ key: `${m.id}@${t}`, med: m, time: t, taken: !!data.medLog[date]?.[`${m.id}@${t}`] })),
    );
  const takenList = scheduled.filter((x) => x.taken);
  const missedList = scheduled.filter((x) => !x.taken && (date < k || (date === k && x.time < nowHHMM)));
  const extraMeds = log?.extraMeds ?? [];
  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return "Spotting";
      case "light":
        return "Light";
      case "medium":
        return "Medium";
      case "heavy":
        return "Heavy";
      case "very-heavy":
        return "Very heavy";
      default:
        return "";
    }
  };

  const anything =
    !!(
      log &&
      (log.pain?.length ||
        log.tetany?.length ||
        log.panic?.length ||
        log.period ||
        log.periodInfo?.level ||
        log.food?.length ||
        log.bowel?.length ||
        log.sex?.length ||
        log.heat?.length ||
        log.workout?.length ||
        log.temperature != null ||
        log.weight != null ||
        log.sleepHours != null ||
        extraMeds.length)
    ) ||
    notes.length ||
    todos.length ||
    events.length ||
    tasks.length ||
    takenList.length ||
    missedList.length;

  if (!anything)
    return (
      <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Nothing logged {isToday ? "today" : "this day"} yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap the <span className="font-bold">+ Log</span> button below.
        </p>
      </div>
    );

  const markMissedTaken = (medKey: string) =>
    update((d) => ({
      ...d,
      medLog: { ...d.medLog, [date]: { ...(d.medLog[date] ?? {}), [medKey]: true } },
      medLogTimes: {
        ...(d.medLogTimes ?? {}),
        [date]: {
          ...(d.medLogTimes?.[date] ?? {}),
          [medKey]: (() => {
            const n = new Date();
            return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
          })(),
        },
      },
    }));

  return (
    <div className="space-y-3 px-5 pt-3 pb-32">
      {(takenList.length > 0 || extraMeds.length > 0 || missedList.length > 0) && (
        <Card title="Meds" icon="💊">
          <ul className="space-y-1 text-sm">
            {takenList.map((x) => {
              const actual = data.medLogTimes?.[date]?.[x.key];
              const shifted = actual && actual !== x.time;
              return (
                <li key={x.key}>
                  <button
                    onClick={() =>
                      update((d) => {
                        const day = { ...(d.medLog[date] ?? {}) };
                        delete day[x.key];
                        const times = { ...(d.medLogTimes?.[date] ?? {}) };
                        delete times[x.key];
                        return {
                          ...d,
                          medLog: { ...d.medLog, [date]: day },
                          medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times },
                        };
                      })
                    }
                    className="text-left text-green-700 hover:underline"
                    title="Tap to uncheck"
                  >
                    Taken · {actual ?? x.time} — {x.med.name}
                    {x.med.dose ? ` (${x.med.dose})` : ""}
                    {shifted && <span className="text-[10px] text-muted-foreground"> · scheduled {x.time}</span>}
                    <span className="text-[10px] text-muted-foreground"> · tap to uncheck</span>
                  </button>
                </li>
              );
            })}
            {missedList.map((x) => (
              <li key={x.key} className="flex items-start gap-2">
                <button
                  onClick={() => markMissedTaken(x.key)}
                  className="flex-1 text-left text-destructive/90"
                  title="Tap to mark taken"
                >
                  Missed · {x.time} — {x.med.name}
                  {x.med.dose ? ` (${x.med.dose})` : ""}{" "}
                  <span className="text-[10px] text-muted-foreground">· missed (tap if taken)</span>
                </button>
              </li>
            ))}
            {extraMeds.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("meds", e)} className="flex-1 text-left">
                  • {e.time} — {e.name}
                  {e.dose ? ` (${e.dose})` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </button>
                <button
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((x) => x.id !== e.id),
                        },
                      },
                    }))
                  }
                  aria-label="Delete"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(log?.pain?.length && (
        <Card title="Pain" icon="🔥">
          <ul className="space-y-2">
            {log.pain.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <button
                  onClick={() => onEditPain?.(p)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: painColor(p.score) }}
                  aria-label="Edit pain entry"
                >
                  {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
                </button>
                <button onClick={() => onEditPain?.(p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}
                  </p>
                  {p.parts.length > 0 && <p className="text-sm">{p.parts.join(", ")}</p>}
                  {p.quality.length > 0 && <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p>}
                  {p.symptoms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {p.symptoms.join(", ")}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}
                  {p.pressureTypes?.length || p.pressureIntensity != null ? (
                    <p className="text-xs text-muted-foreground">
                      Pressure: {p.pressureTypes?.join(", ")}
                      {p.pressureIntensity != null
                        ? `${p.pressureTypes?.length ? " " : ""}${p.pressureIntensity}/10`
                        : ""}
                    </p>
                  ) : null}
                  {p.nausea || p.nauseaTypes?.length || p.nauseaSeverity != null ? (
                    <p className="text-xs text-muted-foreground">
                      Nausea: {p.nauseaTypes?.join(", ")}
                      {p.nauseaSeverity != null ? `${p.nauseaTypes?.length ? " " : ""}${p.nauseaSeverity}/10` : ""}
                      {p.nauseaOngoing ? " · ongoing" : p.nauseaMinutes != null ? ` · ${p.nauseaMinutes} min` : ""}
                      {p.nauseaTriggers?.length ? ` · triggers: ${p.nauseaTriggers.join(", ")}` : ""}
                      {p.nauseaSymptoms?.length ? ` · symptoms: ${p.nauseaSymptoms.join(", ")}` : ""}
                      {p.nauseaHelped?.length ? ` · relieved by: ${p.nauseaHelped.join(", ")}` : ""}
                    </p>
                  ) : null}
                  {p.hotFlashes != null && (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🥵" size={13} /> Hot flashes intensity {p.hotFlashes}/5
                    </p>
                  )}
                  {p.headacheTypes?.length ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🤕" size={13} /> Headache: {p.headacheTypes.join(", ")}
                      {p.headacheIntensity != null ? ` · ${p.headacheIntensity}/10` : ""}
                    </p>
                  ) : p.headacheIntensity != null ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🤕" size={13} /> Headache intensity {p.headacheIntensity}/10
                    </p>
                  ) : null}
                  {p.headacheMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Headache med: {p.headacheMed}
                      {p.headacheMedTime ? ` at ${p.headacheMedTime}` : ""}
                    </p>
                  ) : null}
                  {p.pcosSymptoms?.length ? (
                    <p className="text-xs text-muted-foreground">PCOS: {p.pcosSymptoms.join(", ")}</p>
                  ) : null}
                  {p.mood?.length ? (
                    <p className="text-xs text-muted-foreground">
                      Mood: <IcoText text={p.mood.join(", ")} size={13} />
                    </p>
                  ) : null}
                  {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
                  {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          pain: (d.dayLogs[date]?.pain ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      )) ||
        null}

      {log?.panic?.length ? (
        <Card title="Panic episode" icon="🫯">
          <ul className="space-y-2">
            {log.panic.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("panic", p)} className="flex-1 text-left">
                  <p className="text-sm font-medium">
                    {p.time} · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}
                  </p>
                  {p.trigger && <p className="text-xs text-muted-foreground">Trigger: {p.trigger}</p>}
                  {p.physical.length > 0 && <p className="text-xs">Physical: {p.physical.join(", ")}</p>}
                  {p.cognitive.length > 0 && <p className="text-xs">Cognitive: {p.cognitive.join(", ")}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    Hyperventilation: {p.hyperventilation}
                    {p.tetanyPresent ? " · tetany present" : ""}
                  </p>
                  {p.helped.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">Helped: {p.helped.join(", ")}</p>
                  )}
                  {p.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Rescue: {p.rescueMed}
                    </p>
                  ) : null}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.tetany?.length ? (
        <Card title="Tetany episode" icon="⚡">
          <ul className="space-y-2 text-sm">
            {log.tetany.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("tetany", t)} className="flex-1 text-left">
                  <p>
                    {t.time} · {t.types.join(", ") || "Tetany"} · {t.intensity}/5 ·{" "}
                    {t.minutes == null ? "ongoing" : `${t.minutes}min`}
                    {t.triggers.length ? ` — ${t.triggers.join(", ")}` : ""}
                  </p>
                  {t.location?.length ? (
                    <p className="text-xs text-muted-foreground">Location: {t.location.join(", ")}</p>
                  ) : null}
                  {t.helped?.length ? (
                    <p className="text-xs text-muted-foreground">Helped: {t.helped.join(", ")}</p>
                  ) : null}
                  {t.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Rescue: {t.rescueMed}
                    </p>
                  ) : null}
                  {t.note && <p className="mt-1 text-sm whitespace-pre-line">"{t.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== t.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!cycleTrackingHidden &&
        !!(
          log?.period ||
          log?.periodInfo?.level ||
          log?.periodInfo?.discharge ||
          log?.periodInfo?.dischargeNote ||
          log?.periodInfo?.cramps != null ||
          log?.periodInfo?.note
        ) && (
          <Card title="Blueberry" icon="🫐">
            <button onClick={() => onEdit?.("period", undefined)} className="w-full text-left">
              {(log?.periodInfo?.level || log?.period) && (
                <p className="text-sm">Flow: {flowLabel(log?.periodInfo?.level ?? log?.period)}</p>
              )}
              {log?.periodInfo?.cramps != null && (
                <p className="text-xs" style={{ color: painColor(log.periodInfo.cramps) }}>
                  Cramp pain:{" "}
                  <span className="font-semibold">
                    {Number.isInteger(log.periodInfo.cramps) ? log.periodInfo.cramps : log.periodInfo.cramps.toFixed(1)}
                    /10
                  </span>{" "}
                  — {PAIN_DESCRIPTIONS[Math.round(log.periodInfo.cramps)]}
                </p>
              )}
              {log?.periodInfo?.discharge && (
                <p className="text-xs text-muted-foreground">
                  Discharge: {log.periodInfo.discharge}
                  {log.periodInfo.dischargeNote ? ` — ${log.periodInfo.dischargeNote}` : ""}
                </p>
              )}
              {log?.periodInfo?.note && <p className="mt-1 text-sm whitespace-pre-line">"{log.periodInfo.note}"</p>}
              <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
            </button>
          </Card>
        )}

      {log?.sex?.length ? (
        <Card title="ŠukŠuk!" icon="❤️">
          <ul className="space-y-1 text-sm">
            {log.sex.map((s: SexEntry) => (
              <li key={s.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("sex", s)} className="flex-1 text-left">
                  {s.time} · {String(s.kind).replace(/_/g, " ")}
                  {asArr(s.feelingAfter).length ? (
                    <>
                      {" "}
                      · <IcoText text={asArr(s.feelingAfter).join(", ")} size={13} />
                    </>
                  ) : (
                    ""
                  )}
                  {s.painful && s.painful !== "no" ? ` · painful ${s.painful}` : ""}
                  {s.note ? ` — ${s.note}` : ""}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== s.id) },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.heat?.length ? (
        <Card title="Heat / Cold / TENS" icon="♨️">
          <ul className="space-y-1 text-sm">
            {log.heat.map((h) => (
              <li key={h.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("heat", h)} className="flex-1 text-left">
                  <Ico e={h.kind === "heat" ? "♨️" : h.kind === "cold" ? "🧊" : "⭐"} size={14} /> {h.start} ·{" "}
                  {h.ongoing ? "ongoing" : `${h.minutes ?? 0} min`}
                  {h.note ? ` — ${h.note}` : ""}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          heat: (d.dayLogs[date]?.heat ?? []).filter((x) => x.id !== h.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.food?.length ? (
        <Card title="Food" icon="🍽️">
          <ul className="space-y-1 text-sm">
            {log.food.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("food", f)} className="flex-1 text-left">
                  <div>
                    {f.time} · <IcoText text={f.what || (f.histamineFlare ? "(histamine flare)" : "—")} size={14} />
                    {f.highHistamine ? " · high histamine" : ""}
                    {f.hydrationMl != null ? ` · ${f.hydrationMl}ml` : ""}
                    {f.caffeineMg != null ? ` · ${f.caffeineMg}mg` : ""}
                    {f.alcoholDrinks != null ? ` · ${f.alcoholDrinks}` : ""}
                  </div>
                  {f.feelings.length ? (
                    <div className="text-xs text-muted-foreground">
                      Feel: <IcoText text={f.feelings.join(", ")} size={13} />
                    </div>
                  ) : null}
                  {f.symptomsAfter?.length ? (
                    <div className="text-xs text-muted-foreground">
                      After: <IcoText text={f.symptomsAfter.join(", ")} size={13} />
                    </div>
                  ) : null}
                  {f.histamineFlare ? (
                    <div className="text-xs text-destructive">
                      <Ico e="🔥" size={13} /> Histamine flare
                      {f.histamineSymptoms?.length ? `: ${f.histamineSymptoms.join(", ")}` : ""}
                    </div>
                  ) : null}
                  {f.after ? <div className="mt-1 text-sm whitespace-pre-line">"{f.after}"</div> : null}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          food: (d.dayLogs[date]?.food ?? []).filter((x) => x.id !== f.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.bowel?.length ? (
        <Card title="Bowel" icon="💩">
          <ul className="space-y-1 text-sm">
            {log.bowel.map((b: BowelEntry) => {
              const bristol = b.bristol >= 0 ? BRISTOL.find((x) => x.n === b.bristol) : null;
              const label = bristol
                ? `Type ${bristol.n} — ${bristol.sub}`
                : b.bristol === 0
                  ? "Type 0 — Mystery"
                  : "No bowel movement";
              return (
                <li key={b.id} className="flex items-start gap-2">
                  <button onClick={() => onEdit?.("bowel", b)} className="flex-1 text-left">
                    {b.time} · <IcoText text={label} size={14} />
                    {b.feelings?.length ? (
                      <>
                        {" "}
                        · <IcoText text={b.feelings.join(", ")} size={13} />
                      </>
                    ) : (
                      ""
                    )}
                    {b.symptoms?.length ? (
                      <>
                        {" "}
                        · <IcoText text={b.symptoms.join(", ")} size={13} />
                      </>
                    ) : (
                      ""
                    )}
                    {b.note ? ` — ${b.note}` : ""}
                  </button>
                  <DeleteBtn
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        dayLogs: {
                          ...d.dayLogs,
                          [date]: {
                            ...d.dayLogs[date],
                            bowel: (d.dayLogs[date]?.bowel ?? []).filter((x) => x.id !== b.id),
                          },
                        },
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {log?.workout?.length ? (
        <Card title="Workout" icon="👟">
          <ul className="space-y-1 text-sm">
            {log.workout.map((w) => (
              <li key={w.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("workout", w)} className="flex-1 text-left">
                  <span className="font-medium">
                    {w.time} · <IcoText text={w.kind} size={14} /> · {w.minutes} min
                  </span>
                  {(w.distanceKm != null || w.elevationM != null || w.rpe != null || w.magnesiumBefore) && (
                    <span className="block text-xs text-muted-foreground">
                      {[
                        w.distanceKm != null ? `${w.distanceKm} km` : null,
                        w.elevationM != null ? `↑ ${w.elevationM} m` : null,
                        w.rpe != null ? `RPE ${w.rpe}/10` : null,
                        w.magnesiumBefore ? "Mg before" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  {w.exercises?.length ? (
                    <span className="block text-xs text-muted-foreground">
                      {w.exercises
                        .map(
                          (ex) =>
                            `${ex.name || "Exercise"}${ex.sets ? ` ${ex.sets}×${ex.reps ?? "?"}` : ""}${ex.weightKg ? ` @ ${ex.weightKg} kg` : ""}`,
                        )
                        .join(" · ")}
                    </span>
                  ) : null}
                  {w.weightKg != null && (
                    <span className="block text-xs text-muted-foreground">Weight after: {w.weightKg} kg</span>
                  )}
                  {w.triggeredSymptom && (
                    <span className="block text-xs text-muted-foreground">
                      <Ico e="⚠️" size={13} /> Triggered: {w.triggeredSymptom.label ?? w.triggeredSymptom.type}
                    </span>
                  )}
                  {asArr(w.feeling).length ? (
                    <span className="block text-xs text-muted-foreground">
                      <IcoText text={asArr(w.feeling).join(", ")} size={13} />
                    </span>
                  ) : null}
                  {w.note ? (
                    <span className="block whitespace-pre-line text-xs text-muted-foreground">{w.note}</span>
                  ) : null}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          workout: (d.dayLogs[date]?.workout ?? []).filter((x) => x.id !== w.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (
        <Card title="Temp / Sleep / Weight" icon="🌡️">
          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">
            {log?.temperature != null && <p className="text-sm">Temperature: {log.temperature}°C</p>}
            {log?.weight != null && <p className="text-sm">Weight: {log.weight} kg</p>}
            {log?.sleepHours != null && (
              <p className="text-sm">
                Sleep: {log.sleepHours} h <IcoText text={asArr(log.sleepQuality).join(", ")} size={14} />
              </p>
            )}
            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && (
              <p className="text-sm">
                Sleep quality: <IcoText text={asArr(log.sleepQuality).join(", ")} size={14} />
              </p>
            )}
            <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
          </button>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card title="Tasks" icon="✅">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))
                  }
                />
                <button
                  onClick={() => onEdit?.("task", t)}
                  className={`flex-1 text-left ${t.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {t.title}
                  {t.time ? ` · ${t.time}${t.timeEnd ? `–${t.timeEnd}` : ""}` : ""}
                  {t.note ? ` — ${t.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {events.length > 0 && (
        <Card title="Events" icon="📅">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                <button onClick={() => onEdit?.("event", e)} className="flex-1 text-left">
                  {e.title}
                  {e.time ? ` · ${e.time}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}
                  {e.startDate !== e.endDate ? ` (${e.startDate}→${e.endDate})` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {notes.length > 0 && (
        <Card title="Notes" icon="📝">
          <ul className="space-y-1 text-sm">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-1">
                  {n.time ? `${n.time} · ` : ""}
                  {n.text}
                </span>
                <button
                  onClick={() =>
                    update((d) => {
                      const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
                      const next = list.filter((_, j) => j !== i);
                      return { ...d, dayNotes: { ...d.dayNotes, [date]: next as { text: string; time?: string }[] } };
                    })
                  }
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="mb-2 flex items-center gap-2">
        <Ico e={icon} size={22} />
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const stripEmoji = (value: string) =>
  value.replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\p{Emoji_Modifier}]+\s*/u, "").trim();

function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return "Spotting";
      case "light":
        return "Light";
      case "medium":
        return "Medium";
      case "heavy":
        return "Heavy";
      case "very-heavy":
        return "Very heavy";
      default:
        return "";
    }
  };

  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const dateLabel = fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines: string[] = [`BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((s, p) => s + p.score, 0) / log.pain.length;
      lines.push(`Pain — avg ${avg.toFixed(1)}/10 · ${log.pain.length} entr${log.pain.length === 1 ? "y" : "ies"}`);
      for (const p of log.pain) {
        const bits = [`${p.time}`, `${p.score}/10 (${PAIN_DESCRIPTIONS[Math.round(p.score)]})`];
        if (p.parts.length) bits.push(p.parts.join(", "));
        if (p.quality.length) bits.push(`[${p.quality.join(", ")}]`);
        lines.push(`  • ${bits.join(" · ")}`);
        if (p.note) lines.push(`    "${p.note}"`);
      }
      lines.push("");
    }
    if (log.panic?.length) {
      lines.push(`Panic episode — ${log.panic.length}`);
      for (const p of log.panic)
        lines.push(
          `  • ${p.time} · ${p.intensity}/10 · ${p.minutes == null ? "ongoing" : `${p.minutes}min`}${p.trigger ? ` — ${p.trigger}` : ""}`,
        );
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`Tetany episode — ${log.tetany.length}`);
      for (const t of log.tetany)
        lines.push(
          `  • ${t.time} · ${t.types.join(", ")} · ${t.intensity}/5 · ${t.minutes == null ? "ongoing" : `${t.minutes}min`}`,
        );
      lines.push("");
    }
    if (log.periodInfo?.level || log.period) lines.push(`Period: ${flowLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null)
      lines.push(`Sleep: ${log.sleepHours}h ${asArr(log.sleepQuality).map(stripEmoji).join(", ")}`);
    if (log.temperature != null) lines.push(`Temperature: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`Weight: ${log.weight}kg`);
    if (log.food?.length) lines.push(`Food: ${log.food.length} entries`);
    if (log.workout?.length)
      lines.push(`Workout: ${log.workout.map((w) => `${stripEmoji(w.kind)} ${w.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO");
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: `How I feel · ${dateLabel}`, text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch {
      alert(text);
    }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> Share day
    </Button>
  );
}
