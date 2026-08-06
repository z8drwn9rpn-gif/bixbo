import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CHART_COLORS } from "@/components/ui/chart";
import { ChartCard, ChartEmpty, CHART_AXIS, CHART_GRID, useDismissTapTooltip } from "@/components/charts";
import { Ico } from "@/components/icons/BixboIcons";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  BRISTOL,
  PAIN_DESCRIPTIONS,
  painColor,
  avgDayPain,
  isIntercourseKind,
  isCycleTrackingHidden,
  type DayLog,
} from "@/lib/storage";

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 30 Jul" style label used across every tap tooltip on this page. */
function fmtTapDay(k: string): string {
  const d = fromKey(k);
  return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT3[d.getMonth()]}`;
}
function fmtTapMonth(monthIndex: number, year: number): string {
  return `${MON_SHORT3[monthIndex]} ${year}`;
}

type InsightTooltipDetails = {
  owner?: string;
  heading: string;
  value: string;
  description?: string;
  color: string;
  summary: string;
};

function InsightFloatingTooltip({
  leftPct,
  details,
  top = 4,
}: {
  leftPct: number;
  details: InsightTooltipDetails;
  top?: number;
}) {
  const tooltipWidth = 138;
  const clampedLeft = Math.max(0, Math.min(100, leftPct));
  const placement = clampedLeft < 24 ? "left" : clampedLeft > 76 ? "right" : "center";

  const positionStyle =
    placement === "left"
      ? { left: "4px", transform: "none" }
      : placement === "right"
        ? { right: "4px", transform: "none" }
        : { left: `${clampedLeft}%`, transform: "translateX(-50%)" };

  const arrowX =
    placement === "left"
      ? Math.max(18, Math.min(120, (clampedLeft / 24) * tooltipWidth))
      : placement === "right"
        ? Math.max(18, Math.min(120, tooltipWidth - ((100 - clampedLeft) / 24) * tooltipWidth))
        : tooltipWidth / 2;

  const headingText = `${details.owner ? `${details.owner} · ` : ""}${details.heading}`;
  const heading = headingText.length > 28 ? `${headingText.slice(0, 27).trimEnd()}…` : headingText;

  const wrapSvgText = (value: string, maxChars: number, maxLines = 2) => {
    const words = value.trim().split(/\s+/);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;

      if (next.length <= maxChars) {
        current = next;
        continue;
      }

      if (current) lines.push(current);
      current = word;

      if (lines.length === maxLines - 1) {
        const remaining = [current, ...words.slice(words.indexOf(word) + 1)].join(" ");
        lines.push(remaining);
        current = "";
        break;
      }
    }

    if (current) lines.push(current);

    const visible = lines.slice(0, maxLines);
    const lastIndex = visible.length - 1;

    if (lastIndex >= 0 && visible[lastIndex].length > maxChars) {
      visible[lastIndex] = `${visible[lastIndex].slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
    }

    return visible;
  };

  const descriptionLines = details.description ? wrapSvgText(details.description, 29, 2) : [];

  const cardHeight = descriptionLines.length > 1 ? 66 : 58;
  const svgHeight = cardHeight + 8;
  const valueFontSize = details.value.length > 22 ? 9.5 : details.value.length > 17 ? 10.5 : 12;

  return (
    <svg
      width={tooltipWidth}
      height={svgHeight}
      viewBox={`0 0 ${tooltipWidth} ${svgHeight}`}
      className="pointer-events-none absolute z-30 overflow-visible"
      style={{
        ...positionStyle,
        top,
        filter: `drop-shadow(0 8px 14px color-mix(in srgb, ${details.color} 18%, transparent))`,
      }}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width={tooltipWidth - 2}
        height={cardHeight - 2}
        rx="9"
        fill="var(--surface)"
        stroke={details.color}
        strokeWidth="1.4"
      />

      <circle cx="11" cy="12" r="3.5" fill={details.color} />

      <text x="19" y="15" fontSize="8.5" fontWeight="600" fill="var(--foreground)">
        {heading}
      </text>

      <text x="10" y="34" fontSize={valueFontSize} fontWeight="700" fill="var(--foreground)">
        {details.value}
      </text>

      {descriptionLines.map((line, index) => (
        <text key={`${line}-${index}`} x="10" y={48 + index * 9} fontSize="8" fill="var(--muted-foreground)">
          {line}
        </text>
      ))}

      <path
        d={`M ${arrowX - 6} ${cardHeight - 1} L ${arrowX} ${cardHeight + 7} L ${arrowX + 6} ${cardHeight - 1} Z`}
        fill="var(--surface)"
        stroke={details.color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <line
        x1={arrowX - 5}
        x2={arrowX + 5}
        y1={cardHeight - 1}
        y2={cardHeight - 1}
        stroke="var(--surface)"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function InsightTooltipSummary({ details, onClose }: { details: InsightTooltipDetails; onClose: () => void }) {
  return (
    <div className="mt-2 rounded-[1.1rem] bg-primary/20 px-2 py-2 text-[10px] text-foreground ring-1 ring-primary/20">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-label="Close selected chart details"
      >
        <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
          {details.owner ? <b>{details.owner}</b> : null}
          {details.owner ? " · " : ""}
          {details.summary}
        </span>

        <span className="shrink-0 text-[8px] text-muted-foreground">Tap to close</span>
      </button>
    </div>
  );
}

/** High-contrast BIXBO palette used by every Insights chart. */
const INSIGHT_COLORS = {
  olive: "#536600",
  oliveLight: "#8EA629",
  green: "#28A85B",
  sage: "#70A65B",
  sageLight: "#A8C96F",
  teal: "#2D9588",
  amber: "#E2A913",
  orange: "#E47B25",
  terracotta: "#D85F4B",
  rose: "#D94F78",
  pinkLight: "#F5A3B7",
  pink: "#E86D8F",
  pinkDeep: "#C93C63",
  plum: "#8756A5",
  muted: "#C9CBA2",
  track: "#D8D9AE",
} as const;

const VIVID_PAIN_CHART_COLORS = [
  "#72C64A",
  "#91CD3A",
  "#B7D12F",
  "#DFD11F",
  "#F3C30D",
  "#F5A20B",
  "#F47B16",
  "#F05C5F",
  "#EC3F74",
  "#DE2557",
  "#C81746",
] as const;

function vividPainChartColor(value: number): string {
  const index = Math.max(0, Math.min(10, Math.round(value)));
  return VIVID_PAIN_CHART_COLORS[index];
}

const TETANY_COLOR = INSIGHT_COLORS.pinkLight;
const PANIC_COLOR = INSIGHT_COLORS.pinkDeep;

const PAIN_ACCENT = INSIGHT_COLORS.rose;
const PAIN_SOFT = "rgba(217, 79, 120, 0.10)";
const PAIN_BORDER = "rgba(217, 79, 120, 0.26)";

const GREEN_ACCENT = INSIGHT_COLORS.olive;
const GREEN_SOFT = "rgba(83, 102, 0, 0.08)";
const GREEN_BORDER = "rgba(83, 102, 0, 0.22)";

const HOT_FLASH_COLORS = [
  INSIGHT_COLORS.muted,
  INSIGHT_COLORS.sageLight,
  INSIGHT_COLORS.green,
  INSIGHT_COLORS.amber,
  INSIGHT_COLORS.orange,
  INSIGHT_COLORS.terracotta,
] as const;

const HOT_FLASH_DESCRIPTIONS: Record<number, string> = {
  1: "Mild warmth",
  2: "Warm flush",
  3: "Sweating",
  4: "Strong wave",
  5: "Drenching",
};

const BRISTOL_MYSTERY_COLOR = "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)";

const SYMPTOM_LOAD_COLORS = [
  INSIGHT_COLORS.muted,
  INSIGHT_COLORS.pinkLight,
  INSIGHT_COLORS.pink,
  INSIGHT_COLORS.rose,
  INSIGHT_COLORS.pinkDeep,
] as const;

function timeBlockOf(time?: string): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  if (Number.isNaN(h)) return null;
  if (h < 6) return 0;
  if (h < 12) return 1;
  if (h < 18) return 2;
  return 3;
}
const TIME_BLOCK_LABELS = ["Night (0–6)", "Morning (6–12)", "Afternoon (12–18)", "Evening (18–24)"];
const TIME_BLOCK_SHORT = ["Night", "Morning", "Afternoon", "Evening"];

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Health of Bixbo — Insights" },
      { name: "description", content: "Weekly, monthly and yearly overview of pain, cycle, sleep and more." },
      { property: "og:title", content: "Health of Bixbo — Insights" },
      { property: "og:description", content: "Weekly, monthly and yearly trends." },
    ],
  }),
  component: InsightsPage,
});

type Period = "W" | "M" | "Y" | "P";

type VitalMeasurement = {
  id: string;
  time: string;
  value: number;
};

type DayLogWithVitalEntries = DayLog & {
  weightEntries?: VitalMeasurement[];
  temperatureEntries?: VitalMeasurement[];
};

function vitalEntriesFor(log: DayLog | undefined, field: "weightEntries" | "temperatureEntries"): VitalMeasurement[] {
  const entries = (log as DayLogWithVitalEntries | undefined)?.[field] ?? [];

  return entries
    .filter(
      (entry): entry is VitalMeasurement =>
        Boolean(entry) && typeof entry === "object" && Number.isFinite(Number((entry as VitalMeasurement).value)),
    )
    .map((entry) => ({
      ...entry,
      value: Number(entry.value),
      time: typeof entry.time === "string" ? entry.time : "",
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Weight chart uses the latest measurement recorded on each day. */
function lastWeightForDay(log?: DayLog): number | undefined {
  const entries = vitalEntriesFor(log, "weightEntries");
  return entries.length ? entries[entries.length - 1].value : log?.weight;
}

/** Temperature chart uses the daily average when several measurements exist. */
function averageTemperatureForDay(log?: DayLog): number | undefined {
  const entries = vitalEntriesFor(log, "temperatureEntries");

  if (!entries.length) return log?.temperature;

  return entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
}

function rangeFor(period: Period, anchor: Date) {
  // Always derive purely from `period` + `anchor` (no mutation of shared objects,
  // no reliance on the previous render's day-of-month). Root cause of the stale
  // month bug: `end` used to be a clone of `anchor` keeping its original
  // day-of-month, so a month view only ever covered days 1..anchor-day-of-month
  // instead of the full month (e.g. viewing July while anchor's date was "1"
  // showed just a single day). Now start/end are computed as true calendar
  // boundaries for the given period.
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);
  if (period === "W") {
    // Monday → Sunday of the week containing `anchor`.
    const dow = (base.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const start = new Date(base);
    start.setDate(base.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startK: toKey(start), endK: toKey(end) };
  }
  if (period === "M" || period === "P") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { startK: toKey(start), endK: toKey(end) };
  }
  const start = new Date(base.getFullYear(), 0, 1);
  const end = new Date(base.getFullYear(), 11, 31);
  return { startK: toKey(start), endK: toKey(end) };
}

function eachDay(startK: string, endK: string): string[] {
  const out: string[] = [];
  let k = startK;
  while (k <= endK) {
    out.push(k);
    k = addDays(k, 1);
  }
  return out;
}

function InsightsPage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [period, setPeriod] = useState<Period>("W");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const cycleTrackingHidden = isCycleTrackingHidden(view);

  useEffect(() => {
    if (cycleTrackingHidden && period === "P") {
      setPeriod("M");
    }
  }, [cycleTrackingHidden, period]);

  const { startK, endK } = useMemo(() => rangeFor(period, anchor), [period, anchor]);
  const days = useMemo(() => eachDay(startK, endK), [startK, endK]);

  const painSeries = days.map((k) => avgDayPain(view.dayLogs[k]));
  const painAvg = (() => {
    const nums = painSeries.filter((n): n is number => n != null);
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  })();

  // ŠukŠuk! — count only actual sex/intercourse entries, not oral/fingering/other touch entries.
  const sexCount = days.reduce(
    (s, k) => s + (view.dayLogs[k]?.sex?.filter((e) => isIntercourseKind(e.kind)).length ?? 0),
    0,
  );

  // Bowel by type
  const bowelCounts = new Array(8).fill(0) as number[];
  days.forEach((k) =>
    view.dayLogs[k]?.bowel?.forEach((b) => {
      const bristol = Number(b.bristol);
      if (Number.isInteger(bristol) && bristol >= 0 && bristol <= 7) {
        bowelCounts[bristol] = (bowelCounts[bristol] ?? 0) + 1;
      }
    }),
  );

  // Weight uses an Apple-style rolling range so previous logged days are visible in Month view.
  const weightDays = useMemo(() => {
    const end = new Date(anchor);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (period === "W") start.setDate(end.getDate() - 6);
    else if (period === "M") start.setDate(end.getDate() - 30);
    else start.setFullYear(end.getFullYear() - 1);
    return eachDay(toKey(start), toKey(end));
  }, [period, anchor]);
  const weightSeries = weightDays.map((k) => lastWeightForDay(view.dayLogs[k]));
  const tempSeries = weightDays.map((k) => averageTemperatureForDay(view.dayLogs[k]));

  // Sleep
  const sleepSeries = days.map((k) => view.dayLogs[k]?.sleepHours);

  // Hot flashes — collect per-day max intensity + distribution across levels 1–5
  const hfSeries = days.map((k) => {
    const vals = (view.dayLogs[k]?.pain ?? []).map((p) => p.hotFlashes).filter((n): n is number => n != null);
    return vals.length ? Math.max(...vals) : undefined;
  });
  const hfCounts = [0, 0, 0, 0, 0, 0] as number[];
  days.forEach((k) =>
    (view.dayLogs[k]?.pain ?? []).forEach((p) => {
      if (p.hotFlashes && p.hotFlashes >= 1 && p.hotFlashes <= 5) hfCounts[p.hotFlashes]++;
    }),
  );
  // Year view aggregates to 12 monthly buckets so the bars stay readable,
  // matching the weight/temperature charts.
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const aggregateMonthly = (keys: string[], series: (number | undefined)[]) => {
    const sums = new Array(12).fill(0) as number[];
    const counts = new Array(12).fill(0) as number[];
    keys.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const mi = Number(k.slice(5, 7)) - 1;
      sums[mi] += v;
      counts[mi]++;
    });
    return sums.map((s, i) => (counts[i] ? s / counts[i] : undefined));
  };
  const hfBars = period === "Y" ? aggregateMonthly(days, hfSeries) : hfSeries;
  const hfTotal = hfCounts.reduce((a, b) => a + b, 0);
  const hfAvg = (() => {
    const s = hfCounts.reduce((sum, c, i) => sum + c * i, 0);
    return hfTotal ? s / hfTotal : null;
  })();
  const hfTop = (() => {
    let bestN = 0,
      bestC = 0;
    for (let i = 1; i <= 5; i++)
      if (hfCounts[i] > bestC) {
        bestC = hfCounts[i];
        bestN = i;
      }
    return bestN;
  })();

  // Cycle summary (last 6 months)
  const cycleSummary = (() => {
    const starts: string[] = [];
    if (view.cycle.lastPeriodStart) starts.push(view.cycle.lastPeriodStart);
    // Detect period starts from dayLogs
    const keys = Object.keys(view.dayLogs).sort();
    let prev = "";
    for (const k of keys) {
      const l = view.dayLogs[k];
      if (!l?.period && !l?.periodInfo?.level) continue;
      const prevIsPeriod = prev && (view.dayLogs[prev]?.period || view.dayLogs[prev]?.periodInfo?.level);
      if (!prevIsPeriod || addDays(prev, 1) !== k) starts.push(k);
      prev = k;
    }
    const uniq = Array.from(new Set(starts)).sort();
    const cycleLens: number[] = [];
    for (let i = 1; i < uniq.length; i++) {
      const d = (new Date(uniq[i]).getTime() - new Date(uniq[i - 1]).getTime()) / 86400000;
      if (d > 10 && d < 60) cycleLens.push(d);
    }
    const avg = cycleLens.length
      ? Math.round(cycleLens.reduce((a, b) => a + b, 0) / cycleLens.length)
      : view.cycle.cycleLength;
    return { avg, count: cycleLens.length, periodLen: view.cycle.periodLength };
  })();

  const goPrev = () =>
    setAnchor((d) => {
      const n = new Date(d);
      if (period === "W") n.setDate(n.getDate() - 7);
      else if (period === "M" || period === "P") {
        n.setDate(1);
        n.setMonth(n.getMonth() - 1);
      } else n.setFullYear(n.getFullYear() - 1);
      return n;
    });
  const goNext = () =>
    setAnchor((d) => {
      const n = new Date(d);
      if (period === "W") n.setDate(n.getDate() + 7);
      else if (period === "M" || period === "P") {
        n.setDate(1);
        n.setMonth(n.getMonth() + 1);
      } else n.setFullYear(n.getFullYear() + 1);
      return n;
    });

  const label =
    period === "Y"
      ? String(anchor.getFullYear())
      : period === "M" || period === "P"
        ? anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : `${startK} → ${endK}`;

  return (
    <AppShell title="Health of Bixbo">
      <div className="space-y-5 px-5 pt-3 pb-[calc(96px+env(safe-area-inset-bottom))]">
        <div
          className={`grid gap-1 rounded-[2rem] bg-primary/20 p-1.5 ring-1 ring-primary/15 ${
            cycleTrackingHidden ? "grid-cols-3" : "grid-cols-4"
          }`}
          role="tablist"
          aria-label="Insights period"
        >
          {((cycleTrackingHidden ? ["W", "M", "Y"] : ["W", "M", "Y", "P"]) as Period[]).map((p) => {
            const active = period === p;

            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(p)}
                className={`min-w-0 rounded-[1.65rem] px-2 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"
                }`}
              >
                {p === "W" ? "Week" : p === "M" ? "Month" : p === "Y" ? "Year" : "Period"}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{label}</span>
          <button
            onClick={goNext}
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!cycleTrackingHidden && period === "P" && (
          <>
            <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Ico e="🫐" size={16} /> Blueberry cycle
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycle length</p>
                  <p className="mt-1 font-serif text-xl">{cycleSummary.avg} days</p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Period length</p>
                  <p className="mt-1 font-serif text-xl">{cycleSummary.periodLen} days</p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Regularity</p>
                  <p className="mt-1 font-serif text-lg">
                    {cycleSummary.count >= 2 ? `Regular (${cycleSummary.avg}-day)` : "Not enough data"}
                  </p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last period</p>
                  <p className="mt-1 font-serif text-base">
                    {view.cycle.lastPeriodStart ?? "—"}
                    {view.cycle.lastPeriodEnd ? ` → ${view.cycle.lastPeriodEnd}` : ""}
                  </p>
                </div>
              </div>
            </section>

            <BirthControlCalendar data={view} anchor={anchor} />

            <section
              className="rounded-3xl p-5 ring-1"
              style={{
                backgroundColor: GREEN_SOFT,
                boxShadow: `inset 0 0 0 1px ${GREEN_BORDER}`,
              }}
            >
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: GREEN_ACCENT }}>
                <Ico e="❤️" size={16} /> ŠukŠuk!
              </p>
              <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">{sexCount === 1 ? "entry" : "entries"} this month</p>
            </section>
          </>
        )}

        {period !== "P" && (
          <>
            <section
              className="rounded-3xl p-5 ring-1"
              style={{
                backgroundColor: GREEN_SOFT,
                boxShadow: `inset 0 0 0 1px ${GREEN_BORDER}`,
              }}
            >
              <p className="text-xs uppercase tracking-wider" style={{ color: PAIN_ACCENT }}>
                Pain scale
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-5xl leading-none">{painAvg != null ? painAvg.toFixed(1) : "–"}</span>
                <span className="text-sm text-muted-foreground">
                  avg · {painSeries.filter((n) => n != null).length}{" "}
                  {painSeries.filter((n) => n != null).length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <PainChart period={period} days={days} series={painSeries} anchor={anchor} />
            </section>

            <section
              className="rounded-3xl p-5 ring-1"
              style={{
                backgroundColor: GREEN_SOFT,
                boxShadow: `inset 0 0 0 1px ${GREEN_BORDER}`,
              }}
            >
              <p className="text-xs uppercase tracking-wider" style={{ color: GREEN_ACCENT }}></p>
              <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
              <Ico e="❤️" size={16} /> ŠukŠuk!
              <p className="mt-2 text-sm text-muted-foreground">
                {sexCount === 1 ? "entry" : "entries"} in this{" "}
                {period === "W" ? "week" : period === "M" ? "month" : "year"}
              </p>
            </section>

            <BristolChart bowelCounts={bowelCounts} />

            <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Hot flashes</p>
              {hfTotal ? (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-4xl leading-none">{hfTotal}</span>
                    <span className="text-sm text-muted-foreground">
                      {hfTotal === 1 ? "episode" : "episodes"} · avg {hfAvg!.toFixed(1)}/5 · most often L{hfTop}
                    </span>
                  </div>
                  <HfBars bars={hfBars} period={period} days={days} anchor={anchor} />
                  {period === "Y" && (
                    <div
                      className="mt-1 grid gap-1 text-center text-[8px] text-muted-foreground"
                      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
                    >
                      {monthLabels.map((l, i) => (
                        <span key={i}>{l}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const c = hfCounts[n];
                      const pct = hfTotal ? (c / hfTotal) * 100 : 0;
                      const color = HOT_FLASH_COLORS[n];
                      return (
                        <div key={n} className="flex items-center gap-2 text-[10px]">
                          <span
                            className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white shrink-0"
                            style={{ background: color }}
                          >
                            {n}
                          </span>
                          <span className="w-16 shrink-0 text-muted-foreground">{HOT_FLASH_DESCRIPTIONS[n]}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="w-6 text-right tabular-nums text-muted-foreground">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No hot flashes logged</p>
              )}
            </section>

            <WeightLineChart period={period} days={weightDays} series={weightSeries} label="Weight" unit="kg" />
            <WeightLineChart period={period} days={weightDays} series={tempSeries} label="Body temperature" unit="°C" />

            <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sleep</p>
              <SleepChart period={period} days={days} series={sleepSeries} anchor={anchor} />
              <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: INSIGHT_COLORS.terracotta }} /> &lt;8h
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: INSIGHT_COLORS.amber }} /> 8h
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: INSIGHT_COLORS.green }} /> &gt;8h
                </span>
              </div>
            </section>

            {period === "Y" && <SymptomLoadHeatmap data={view} anchor={anchor} />}

            <TimeOfDayPatternChart data={view} days={days} period={period} />

            <MedsAdherence data={view} />
          </>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Birth-control (HAK) monthly calendar.
 * 28-day pack: pills #1–#24 active, #25–#28 inactive placebo.
 * Pill number counts continuously from settings.birthControlSince.
 */
function BirthControlCalendar({ data, anchor }: { data: ReturnType<typeof useBixbo>["data"]; anchor: Date }) {
  const { update } = useBixbo();
  const [sel, setSel] = useState<string | null>(null);
  const [pickTime, setPickTime] = useState<string>("");
  const since = data.settings.birthControlSince;
  if (!since || data.settings.gender === "male") return null;

  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );
  // Fall back to a synthetic id (like the "removed medication" history pattern)
  // so taken/missed can still be recorded even without a matching med entry.
  const bcId = bcMed?.id ?? "hak-default";

  const y = anchor.getFullYear(),
    mo = anchor.getMonth();
  const first = new Date(y, mo, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const todayK = toKey(new Date());

  const pillNumber = (k: string) => {
    const diff = Math.round((fromKey(k).getTime() - fromKey(since).getTime()) / 86400000);
    if (diff < 0) return null;
    return (diff % 28) + 1;
  };
  const takenAt = (k: string): string | null => {
    const log = data.medLog[k] ?? {};
    const times = data.medLogTimes?.[k] ?? {};
    const keys = Object.keys(log).filter((key) => log[key] && key !== `${bcId}@missed` && key.startsWith(`${bcId}@`));
    if (!keys.length) return null;
    return times[keys[0]] ?? keys[0].split("@")[1] ?? "";
  };
  const missedAt = (k: string): boolean => !!data.medLog[k]?.[`${bcId}@missed`];

  const cells: (string | null)[] = [
    ...new Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(y, mo, i + 1))),
  ];

  const markTaken = (k: string, time: string) =>
    update((d) => {
      const t = time || new Date().toTimeString().slice(0, 5);
      const day = { ...(d.medLog[k] ?? {}) };
      // Clear any prior taken/missed markers for this pill on this day, then record the new dose.
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
      return { ...d, medLog: { ...d.medLog, [k]: day }, medLogTimes: { ...d.medLogTimes, [k]: dayTimes } };
    });

  const detail = (() => {
    if (!sel) return null;
    const n = pillNumber(sel);
    if (n == null) return `${sel} · before you started`;
    const t = takenAt(sel);
    const missed = missedAt(sel);
    const inactive = n > 24;
    const status = t != null ? `taken at ${t}` : missed ? "marked missed" : "not recorded";
    return `Pill #${n}${inactive ? " (inactive white)" : ""} · ${status}`;
  })();

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Ico e="💊" size={16} /> Birth control
      </p>
      <p className="mt-3 text-center font-serif text-lg">
        {anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((k, i) => {
          if (!k) return <span key={i} />;
          const n = pillNumber(k);
          const t = n == null ? null : takenAt(k);
          const explicitMissed = n != null && missedAt(k);
          const inactive = n != null && n > 24;
          const future = k > todayK;
          const isToday = k === todayK;
          const missed = n != null && !inactive && !t && (explicitMissed || !future);

          let bg = "transparent",
            color = "var(--foreground)",
            ring = "1px solid var(--border)";
          if (n == null || (future && !t && !explicitMissed)) {
            bg = "transparent";
            color = "var(--muted-foreground)";
          } else if (inactive) {
            bg = "var(--tint)";
            color = "var(--muted-foreground)";
            ring = "1px solid var(--border)";
          } else if (t != null) {
            bg = "var(--primary)";
            color = "var(--primary-foreground)";
            ring = "none";
          } else if (missed) {
            ring = `2px solid ${CHART_COLORS.headache}`;
            color = CHART_COLORS.headache;
          }

          return (
            <button
              key={k}
              onClick={() => {
                setSel(sel === k ? null : k);
                setPickTime("");
              }}
              className={`flex aspect-square flex-col items-center justify-center rounded-full text-[13px] leading-none ${sel === k ? "ring-2 ring-primary" : ""}`}
              style={{
                background: bg,
                color,
                border: sel === k ? undefined : ring,
                outline: isToday ? "2.5px solid var(--foreground)" : undefined,
              }}
            >
              <span className="text-[8px] opacity-70">{n != null ? `#${n}` : ""}</span>
              <span className="font-semibold">{Number(k.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> taken
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: CHART_COLORS.headache }} /> missed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-tint ring-1 ring-border" /> inactive (white)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-foreground" /> today
        </span>
      </div>
      <p className="mt-3 rounded-2xl bg-tint p-3 text-xs" role="status" aria-live="polite">
        {detail ?? "Tap a day for details."}
      </p>
      {sel && pillNumber(sel) != null && pillNumber(sel)! <= 24 && (
        <div className="mt-2 rounded-2xl bg-tint p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={pickTime}
              onChange={(e) => setPickTime(e.target.value)}
              className="rounded-lg bg-surface px-2 py-1 text-xs ring-1 ring-border"
            />
            <button
              onClick={() => markTaken(sel, pickTime)}
              className="flex-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Mark taken
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => markMissed(sel)}
              className="flex-1 rounded-xl px-3 py-1.5 text-xs font-medium"
              style={{
                background: "transparent",
                border: `1.5px solid ${CHART_COLORS.headache}`,
                color: CHART_COLORS.headache,
              }}
            >
              Mark missed
            </button>
            {(takenAt(sel) != null || missedAt(sel)) && (
              <button
                onClick={() => clearRecord(sel)}
                className="rounded-xl bg-surface px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
      {!bcMed && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Tip: add your pill in Medications (name it e.g. “Birth control”) so taken doses are detected precisely.
        </p>
      )}
    </section>
  );
}

function MedsAdherence({ data }: { data: ReturnType<typeof useBixbo>["data"] }) {
  const { update } = useBixbo();
  const [range, setRange] = useState<7 | 30>(7);
  const [open, setOpen] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - (range - 1));
  const days: string[] = [];
  for (let i = 0; i < range; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toKey(d));
  }

  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const asNeeded = data.meds.filter((m) => m.asNeeded);

  const toggleDose = (dayKey: string, medKey: string) =>
    update((d) => {
      const day = { ...(d.medLog[dayKey] ?? {}) };
      if (day[medKey]) delete day[medKey];
      else day[medKey] = true;
      return { ...d, medLog: { ...d.medLog, [dayKey]: day } };
    });

  const perDay = days.map((k) => {
    const expected = scheduled.reduce((s, m) => s + m.times.length, 0);
    const missed: { medName: string; time: string; key: string }[] = [];
    const takenList: { medName: string; time: string; key: string }[] = [];
    let taken = 0;
    scheduled.forEach((m) =>
      m.times.forEach((t) => {
        const key = `${m.id}@${t}`;
        if (data.medLog[k]?.[key]) {
          taken++;
          takenList.push({ medName: m.name, time: t, key });
        } else missed.push({ medName: m.name, time: t, key });
      }),
    );
    return { date: k, expected, taken, missed, takenList };
  });
  const totalExpected = perDay.reduce((s, d) => s + d.expected, 0);
  const totalTaken = perDay.reduce((s, d) => s + d.taken, 0);
  const overallPct = totalExpected ? Math.round((totalTaken / totalExpected) * 100) : null;

  const perMed = scheduled
    .flatMap((m) =>
      m.times.map((t) => {
        let taken = 0;
        days.forEach((k) => {
          if (data.medLog[k]?.[`${m.id}@${t}`]) taken++;
        });
        const expected = days.length;
        return {
          id: `${m.id}@${t}`,
          name: m.name,
          dose: m.dose,
          time: t,
          taken,
          expected,
          pct: expected ? Math.round((taken / expected) * 100) : 0,
        };
      }),
    )
    .sort((a, b) => a.pct - b.pct);

  const asNeededCounts = asNeeded.map((m) => {
    let count = 0;
    days.forEach((k) => {
      const log = data.medLog[k] ?? {};
      Object.keys(log).forEach((key) => {
        if (log[key] && (key === `${m.id}@asNeeded` || key.startsWith(`${m.id}@`))) count++;
      });
    });
    return { id: m.id, name: m.name, count };
  });

  // Doses logged for meds that no longer exist in the list — keep history visible.
  const knownIds = new Set(data.meds.map((m) => m.id));
  const removedCounts = (() => {
    const acc: Record<string, number> = {};
    days.forEach((k) => {
      const log = data.medLog[k] ?? {};
      Object.entries(log).forEach(([key, val]) => {
        if (!val) return;
        const id = key.split("@")[0];
        if (knownIds.has(id)) return;
        acc[id] = (acc[id] ?? 0) + 1;
      });
    });
    return Object.entries(acc).map(([id, count]) => ({ id, count, name: data.medNames?.[id] ?? "Removed medication" }));
  })();

  const cellColor = (d: (typeof perDay)[number]) => {
    if (d.expected === 0) return "var(--tint)";
    const r = d.taken / d.expected;
    if (r >= 1) return INSIGHT_COLORS.pinkLight;
    if (r > 0) return INSIGHT_COLORS.pink;
    return INSIGHT_COLORS.pinkDeep;
  };

  const fmt = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (data.meds.length === 0 && removedCounts.length === 0) return null;

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Meds adherence</p>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex gap-2">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-medium ${range === r ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}
              >
                {r}-day
              </button>
            ))}
          </div>

          {totalExpected > 0 ? (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-serif text-5xl leading-none">{overallPct}%</span>
              <span className="text-sm text-muted-foreground">
                {totalTaken}/{totalExpected} doses
              </span>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No scheduled meds in this range.</p>
          )}

          {perDay.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Daily heatmap</p>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${Math.min(range, 15)}, minmax(0, 1fr))` }}
              >
                {perDay.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setExpandedDay(expandedDay === d.date ? null : d.date)}
                    title={`${fmt(d.date)} — ${d.taken}/${d.expected}`}
                    aria-label={`${fmt(d.date)} — ${d.taken}/${d.expected} doses`}
                    className={`aspect-square min-h-7 min-w-7 rounded ${expandedDay === d.date ? "ring-2 ring-primary" : ""}`}
                    style={{ background: cellColor(d) }}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded" style={{ background: INSIGHT_COLORS.pinkLight }} /> full
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded" style={{ background: INSIGHT_COLORS.pink }} /> partial
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded" style={{ background: INSIGHT_COLORS.pinkDeep }} /> none
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-tint" /> n/a
                </span>
              </div>
              {expandedDay &&
                (() => {
                  const d = perDay.find((x) => x.date === expandedDay);
                  if (!d) return null;
                  return (
                    <div className="mt-3 rounded-2xl bg-tint p-3 text-xs" role="status" aria-live="polite">
                      <p className="font-medium">
                        {fmt(d.date)} — {d.taken}/{d.expected} taken
                      </p>
                      {d.takenList.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {d.takenList.map((m) => (
                            <li key={m.key}>
                              <button
                                onClick={() => toggleDose(d.date, m.key)}
                                className="text-left text-green-700 hover:underline"
                                title="Tap to uncheck"
                              >
                                Taken · {m.time} — {m.medName}{" "}
                                <span className="text-[10px] text-muted-foreground">· tap to uncheck</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {d.missed.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          {d.missed.map((m) => (
                            <li key={m.key}>
                              <button
                                onClick={() => toggleDose(d.date, m.key)}
                                className="text-left hover:underline"
                                title="Tap to mark taken"
                              >
                                Missed · {m.time} — {m.medName} <span className="text-[10px]">· tap to mark taken</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : d.expected > 0 ? (
                        <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                          All doses taken <Ico e="💚" size={13} />
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
            </div>
          )}

          {perMed.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Per medication</p>
              <ul className="space-y-2">
                {perMed.map((m) => {
                  const color =
                    m.pct >= 90
                      ? INSIGHT_COLORS.pinkLight
                      : m.pct >= 60
                        ? INSIGHT_COLORS.pink
                        : INSIGHT_COLORS.pinkDeep;
                  return (
                    <li key={m.id} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 truncate">
                        {m.name} <span className="text-muted-foreground">{m.time}</span>
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                        <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: color }} />
                      </div>
                      <span className="w-14 shrink-0 text-right tabular-nums">
                        {m.pct}%{" "}
                        <span className="text-muted-foreground">
                          ({m.taken}/{m.expected})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {asNeededCounts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">As-needed (frequency)</p>
              <ul className="space-y-1 text-xs">
                {asNeededCounts.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">
                      {m.count}× in {range} days
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {removedCounts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Discontinued meds (history)
              </p>
              <ul className="space-y-1 text-xs">
                {removedCounts.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">
                      {m.count} doses in {range} days
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function WeightLineChart({
  period,
  days,
  series,
  label = "Weight",
  unit = "kg",
}: {
  period: Period;
  days: string[];
  series: (number | undefined)[];
  label?: string;
  unit?: string;
}) {
  const [active, setActive] = useState<{ value: number; index: number; date: string } | null>(null);
  useDismissTapTooltip(() => setActive(null));
  // For yearly view, collapse 365 daily samples into 12 monthly averages so labels are readable.
  const aggregated = (() => {
    if (period !== "Y") {
      return days.map((k, i) => ({ value: series[i], date: k }));
    }
    const monthly: { sum: number; n: number; anyDate: string }[] = Array.from({ length: 12 }, () => ({
      sum: 0,
      n: 0,
      anyDate: "",
    }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v;
      monthly[m].n += 1;
      monthly[m].anyDate = k;
    });
    const now = new Date();
    return monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      date: mm.anyDate || toKey(new Date(now.getFullYear(), i, 15)),
    }));
  })();

  const points = aggregated
    .map((p, index) => (p.value == null ? null : { value: p.value, index, date: p.date }))
    .filter((p): p is { value: number; index: number; date: string } => p != null);
  const nums = points.map((p) => p.value);
  const fmtDate = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (!nums.length) {
    return (
      <ChartCard title={label}>
        <ChartEmpty />
      </ChartCard>
    );
  }

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const rawMin = Math.min(...nums);
  const rawMax = Math.max(...nums);
  const span = Math.max(0.6, rawMax - rawMin);
  const yMin = Math.floor((rawMin - span * 0.25) * 2) / 2;
  const yMax = Math.ceil((rawMax + span * 0.25) * 2) / 2;
  const yMid = (yMin + yMax) / 2;

  const width = 320;
  const height = 170;
  const left = 10;
  const right = 38;
  const top = 12;
  const bottom = 30;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const denom = Math.max(1, aggregated.length - 1);
  const xFor = (index: number) => left + (index / denom) * chartW;
  const yFor = (value: number) => top + ((yMax - value) / Math.max(0.1, yMax - yMin)) * chartH;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.index).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(" ");

  const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ticks = aggregated
    .map((p, i) => ({ k: p.date, i, d: fromKey(p.date) }))
    .filter(({ i, d }) => {
      if (period === "W") return true;
      if (period === "M") return i === 0 || i === aggregated.length - 1 || i % 7 === 0;
      // Year: every month (aggregated already has 12 points)
      return true;
    });
  const tickLabel = (k: string) => {
    const d = fromKey(k);
    return period === "Y" ? MON_SHORT[d.getMonth()] : String(d.getDate());
  };
  const dateLabel =
    period === "Y"
      ? `${new Date().getFullYear()} — monthly average`
      : `${fmtDate(days[0])} – ${fmtDate(days[days.length - 1])}`;

  return (
    <ChartCard title={label}>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-serif text-5xl leading-none">{avg.toFixed(1)}</span>
        <span className="pb-1 text-sm font-semibold text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      <div className="relative mt-3 overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-52 w-full touch-pan-y"
          role="img"
          aria-label={`${label} line chart`}
        >
          {[yMax, yMid, yMin].map((y) => (
            <g key={y}>
              <line x1={left} x2={width - right} y1={yFor(y)} y2={yFor(y)} stroke={CHART_GRID} strokeWidth="1" />
              <text x={width - right + 8} y={yFor(y) + 4} fontSize="10" fill={CHART_AXIS}>
                {y.toFixed(y % 1 ? 1 : 0)}
              </text>
            </g>
          ))}
          {ticks.map(({ k, i }) => (
            <g key={k}>
              <line
                x1={xFor(i)}
                x2={xFor(i)}
                y1={top}
                y2={height - bottom}
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="9" fill={CHART_AXIS}>
                {tickLabel(k)}
              </text>
            </g>
          ))}
          <path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {active ? (
            <line
              x1={xFor(active.index)}
              x2={xFor(active.index)}
              y1={top}
              y2={height - bottom}
              stroke="var(--primary)"
              strokeDasharray="3 3"
              strokeWidth="1.25"
              opacity="0.75"
              pointerEvents="none"
            />
          ) : null}

          {points.map((p) => {
            const selected = active?.date === p.date;

            return (
              <g key={p.date}>
                <circle
                  cx={xFor(p.index)}
                  cy={yFor(p.value)}
                  r={selected ? 5 : 3}
                  fill={selected ? "var(--primary)" : "var(--surface)"}
                  stroke="var(--primary)"
                  strokeWidth={selected ? 2.5 : 2}
                  pointerEvents="none"
                />

                <circle
                  cx={xFor(p.index)}
                  cy={yFor(p.value)}
                  r="16"
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${label}, ${fmtTapDay(p.date)}, ${p.value.toFixed(1)} ${unit}`}
                  style={{ cursor: "pointer", outline: "none" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActive((current) => (current?.date === p.date ? null : p));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setActive((current) => (current?.date === p.date ? null : p));
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>

        {active
          ? (() => {
              const heading =
                period === "Y"
                  ? fmtTapMonth(fromKey(active.date).getMonth(), fromKey(active.date).getFullYear())
                  : fmtTapDay(active.date);
              const description = label === "Body temperature" ? "Daily average" : "Latest daily measurement";
              const details: InsightTooltipDetails = {
                owner: "You",
                heading,
                value: `${label} ${active.value.toFixed(1)} ${unit}`,
                description,
                color: "var(--primary)",
                summary: `${heading} · ${label} ${active.value.toFixed(1)} ${unit} · ${description}`,
              };

              return <InsightFloatingTooltip leftPct={(xFor(active.index) / width) * 100} details={details} />;
            })()
          : null}
      </div>

      {active ? (
        (() => {
          const heading =
            period === "Y"
              ? fmtTapMonth(fromKey(active.date).getMonth(), fromKey(active.date).getFullYear())
              : fmtTapDay(active.date);
          const description = label === "Body temperature" ? "Daily average" : "Latest daily measurement";
          const details: InsightTooltipDetails = {
            owner: "You",
            heading,
            value: `${label} ${active.value.toFixed(1)} ${unit}`,
            description,
            color: "var(--primary)",
            summary: `${heading} · ${label} ${active.value.toFixed(1)} ${unit} · ${description}`,
          };

          return <InsightTooltipSummary details={details} onClose={() => setActive(null)} />;
        })()
      ) : (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">Tap a point for exact details.</p>
      )}
    </ChartCard>
  );
}

type InsightBar = {
  value?: number;
  label: string;
  sub?: string;
};

function InsightBarChartFrame({
  bars,
  yLabels,
  yMax,
  colorFor,
  tooltipDetails,
  axisLabel,
  periodLabel,
  emptyMessage,
}: {
  bars: InsightBar[];
  yLabels: number[];
  yMax: number;
  colorFor: (value: number, index: number) => string;
  tooltipDetails: (index: number, value: number) => InsightTooltipDetails;
  axisLabel?: string;
  periodLabel?: string;
  emptyMessage?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));

  const height = 140;
  const allEmpty = bars.every((bar) => bar.value == null);
  const activeDetails =
    active != null && bars[active]?.value != null ? tooltipDetails(active, bars[active].value!) : null;

  return (
    <div className="mt-4">
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
              <div key={value} className="border-t border-dashed" style={{ borderColor: CHART_GRID }} />
            ))}
          </div>

          <div
            className="relative grid items-end gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`,
              height,
            }}
          >
            {bars.map((bar, index) =>
              bar.value != null ? (
                <button
                  key={index}
                  type="button"
                  aria-label={tooltipDetails(index, bar.value).summary}
                  aria-pressed={active === index}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActive((current) => (current === index ? null : index));
                  }}
                  className={`min-w-0 rounded-t transition-[transform,filter] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active === index ? "brightness-105 ring-2 ring-foreground/80" : ""
                  }`}
                  style={{
                    height: `${Math.max(5, (bar.value / yMax) * 100)}%`,
                    background: colorFor(bar.value, index),
                  }}
                />
              ) : (
                <div key={index} className="h-[2px] w-full self-end rounded bg-tint/60" />
              ),
            )}

            {activeDetails && active != null ? (
              <InsightFloatingTooltip
                leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100}
                details={activeDetails}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-1 flex pl-5">
        <div
          className="grid flex-1 gap-[2px] text-center text-[8px] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}
        >
          {bars.map((bar, index) => (
            <div key={index} className="leading-tight">
              <div className="tabular-nums">{bar.label}</div>
              {bar.sub ? <div className="text-[8px] tabular-nums opacity-70">{bar.sub}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {(axisLabel || periodLabel) && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{axisLabel}</span>
          <span>{periodLabel}</span>
        </div>
      )}

      {activeDetails ? (
        <InsightTooltipSummary details={activeDetails} onClose={() => setActive(null)} />
      ) : (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">Tap a bar for exact details.</p>
      )}

      {allEmpty && emptyMessage ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">{emptyMessage}</p>
      ) : null}
    </div>
  );
}

function SleepChart({
  period,
  days,
  series,
  anchor,
}: {
  period: Period;
  days: string[];
  series: (number | undefined)[];
  anchor: Date;
}) {
  // Mirrors PainChart's layout: labelled Y axis on the left, dotted gridlines,
  // and X-axis labels that adapt to the active period.
  type Bar = { value?: number; label: string; sub?: string };
  let bars: Bar[] = [];
  if (period === "Y") {
    const monthly: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v;
      monthly[m].n += 1;
    });
    const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    bars = monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      label: MON[i],
    }));
  } else if (period === "M") {
    bars = days.map((k, i) => {
      const d = fromKey(k).getDate();
      return { value: series[i], label: d % 2 === 1 ? String(d) : "" };
    });
  } else {
    bars = days.map((k, i) => {
      const d = fromKey(k);
      const wd = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
      return { value: series[i], label: wd, sub: String(d.getDate()) };
    });
  }

  const sleepColor = (h?: number) =>
    h == null
      ? "var(--tint)"
      : h < 8
        ? INSIGHT_COLORS.terracotta
        : h === 8
          ? INSIGHT_COLORS.amber
          : INSIGHT_COLORS.green;

  return (
    <InsightBarChartFrame
      bars={bars}
      yLabels={[12, 10, 8, 6, 4, 2, 0]}
      yMax={12}
      colorFor={(value) => sleepColor(value)}
      tooltipDetails={(i, value) => {
        const heading = period === "Y" ? fmtTapMonth(i, anchor.getFullYear()) : fmtTapDay(days[i]);
        const description = value < 8 ? "Below 8 hours" : value === 8 ? "8-hour target" : "Above 8 hours";
        const color = sleepColor(value);

        return {
          owner: "You",
          heading,
          value: `Sleep ${value.toFixed(1)}h`,
          description,
          color,
          summary: `${heading} · Sleep ${value.toFixed(1)}h · ${description}`,
        };
      }}
      axisLabel="Sleep (hours)"
      periodLabel={period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}
      emptyMessage={period === "Y" ? `No sleep entries in ${anchor.getFullYear()}` : undefined}
    />
  );
}

function PainChart({
  period,
  days,
  series,
  anchor,
}: {
  period: Period;
  days: string[];
  series: (number | undefined)[];
  anchor: Date;
}) {
  // Aggregate for year view: 12 monthly averages
  type Bar = { value?: number; label: string; sub?: string };
  let bars: Bar[] = [];
  if (period === "Y") {
    const monthly: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v;
      monthly[m].n += 1;
    });
    const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    bars = monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      label: MON[i],
    }));
  } else if (period === "M") {
    bars = days.map((k, i) => {
      const d = fromKey(k).getDate();
      // Show every other day so labels never collide but daily rating is readable.
      return { value: series[i], label: d % 2 === 1 ? String(d) : "" };
    });
  } else {
    bars = days.map((k, i) => {
      const d = fromKey(k);
      const wd = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
      return { value: series[i], label: wd, sub: String(d.getDate()) };
    });
  }

  return (
    <InsightBarChartFrame
      bars={bars}
      yLabels={[10, 8, 6, 4, 2, 0]}
      yMax={10}
      colorFor={(value) => vividPainChartColor(value)}
      tooltipDetails={(i, value) => {
        const heading = period === "Y" ? fmtTapMonth(i, anchor.getFullYear()) : fmtTapDay(days[i]);
        const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(value)))] ?? "Pain";
        const color = vividPainChartColor(value);

        return {
          owner: "You",
          heading,
          value: `Pain ${value.toFixed(1)}/10`,
          description,
          color,
          summary: `${heading} · Pain ${value.toFixed(1)}/10 · ${description}`,
        };
      }}
      axisLabel="Pain (0–10)"
      periodLabel={period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}
      emptyMessage={period === "Y" ? `No pain entries in ${anchor.getFullYear()}` : undefined}
    />
  );
}

function BristolChart({ bowelCounts }: { bowelCounts: number[] }) {
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  const max = Math.max(1, ...bowelCounts);
  const chartTypes = [
    {
      n: 0,
      label: "Type 0 — Mystery",
      sub: "Unknown / mixed",
      color: BRISTOL_MYSTERY_COLOR,
      shape: "mystery",
    },
    ...BRISTOL,
  ];
  return (
    <ChartCard title="Bowel — Bristol distribution">
      <div className={`relative mt-3 flex items-end gap-2 transition-[padding] ${active != null ? "pt-20" : ""}`}>
        {chartTypes.map((b) => {
          const count = bowelCounts[b.n] ?? 0;
          const selected = active === b.n;

          return (
            <div key={b.n} className="relative flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end">
                <button
                  type="button"
                  aria-label={`${b.label}. ${count} ${count === 1 ? "entry" : "entries"}. ${b.sub}`}
                  aria-pressed={selected}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActive((current) => (current === b.n ? null : b.n));
                  }}
                  className={`w-full rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected ? "ring-2 ring-foreground/70" : ""
                  }`}
                  style={{
                    height: `${Math.max(5, (count / max) * 100)}%`,
                    background: b.color,
                  }}
                />
              </div>

              <span className="text-[10px] text-muted-foreground">T{b.n}</span>
              <span className="text-[10px]">{count}</span>
            </div>
          );
        })}

        {active != null
          ? (() => {
              const item = chartTypes.find((type) => type.n === active);
              const count = bowelCounts[active] ?? 0;

              if (!item) return null;

              const details: InsightTooltipDetails = {
                owner: "You",
                heading: item.label,
                value: `${count} ${count === 1 ? "entry" : "entries"}`,
                description: item.sub,
                color: item.n === 0 ? "#8b5cf6" : item.color,
                summary: `${item.label} · ${count} ${count === 1 ? "entry" : "entries"} · ${item.sub}`,
              };

              return <InsightFloatingTooltip leftPct={((active + 0.5) / chartTypes.length) * 100} details={details} />;
            })()
          : null}
      </div>

      {active != null ? (
        (() => {
          const item = chartTypes.find((type) => type.n === active);
          const count = bowelCounts[active] ?? 0;

          if (!item) return null;

          const details: InsightTooltipDetails = {
            owner: "You",
            heading: item.label,
            value: `${count} ${count === 1 ? "entry" : "entries"}`,
            description: item.sub,
            color: item.n === 0 ? "#8b5cf6" : item.color,
            summary: `${item.label} · ${count} ${count === 1 ? "entry" : "entries"} · ${item.sub}`,
          };

          return <InsightTooltipSummary details={details} onClose={() => setActive(null)} />;
        })()
      ) : (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">Tap a type for exact details.</p>
      )}
    </ChartCard>
  );
}

function HfBars({
  bars,
  period,
  days,
  anchor,
}: {
  bars: (number | undefined)[];
  period: Period;
  days: string[];
  anchor: Date;
}) {
  const [active, setActive] = useState<number | null>(null);

  useDismissTapTooltip(() => setActive(null));

  return (
    <div>
      <div
        className={`relative grid items-end gap-1 transition-[padding,height] ${active != null ? "pt-20" : "pt-5"}`}
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`,
          height: active != null ? 146 : 82,
        }}
      >
        {bars.map((value, index) =>
          value != null ? (
            <button
              key={index}
              type="button"
              aria-label={
                period === "Y"
                  ? `${fmtTapMonth(index, anchor.getFullYear())}. Hot flash average ${value.toFixed(1)} out of 5`
                  : `${fmtTapDay(days[index])}. Hot flash ${value.toFixed(1)} out of 5`
              }
              aria-pressed={active === index}
              onClick={(event) => {
                event.stopPropagation();
                setActive((current) => (current === index ? null : index));
              }}
              className={`w-full rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active === index ? "ring-2 ring-foreground/70" : ""
              }`}
              style={{
                height: `${Math.max(10, (value / 5) * 100)}%`,
                background: HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))],
              }}
            />
          ) : (
            <div key={index} className="h-1 w-full self-end rounded bg-tint" />
          ),
        )}

        {active != null && bars[active] != null
          ? (() => {
              const value = bars[active]!;
              const heading = period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtTapDay(days[active]);
              const description = HOT_FLASH_DESCRIPTIONS[Math.max(1, Math.min(5, Math.round(value)))] ?? "Hot flash";
              const color = HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))];
              const details: InsightTooltipDetails = {
                owner: "You",
                heading,
                value: `Hot flash ${value.toFixed(1)}/5`,
                description,
                color,
                summary: `${heading} · Hot flash ${value.toFixed(1)}/5 · ${description}`,
              };

              return (
                <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={details} />
              );
            })()
          : null}
      </div>

      {active != null && bars[active] != null ? (
        (() => {
          const value = bars[active]!;
          const heading = period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtTapDay(days[active]);
          const description = HOT_FLASH_DESCRIPTIONS[Math.max(1, Math.min(5, Math.round(value)))] ?? "Hot flash";
          const color = HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))];
          const details: InsightTooltipDetails = {
            owner: "You",
            heading,
            value: `Hot flash ${value.toFixed(1)}/5`,
            description,
            color,
            summary: `${heading} · Hot flash ${value.toFixed(1)}/5 · ${description}`,
          };

          return <InsightTooltipSummary details={details} onClose={() => setActive(null)} />;
        })()
      ) : (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">Tap a bar for exact details.</p>
      )}
    </div>
  );
}

/** GitHub-contributions-style yearly heatmap of daily "symptom load" (avg pain + symptom entry counts). */
function SymptomLoadHeatmap({ data, anchor }: { data: ReturnType<typeof useBixbo>["data"]; anchor: Date }) {
  const [active, setActive] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const notesFor = (k: string): { text: string; time?: string }[] => {
    const raw = data.dayNotes[k] ?? [];

    return raw
      .map((note) => {
        if (typeof note === "string") return { text: note };
        return {
          text: note.text,
          time: typeof note.time === "string" ? note.time : undefined,
        };
      })
      .filter((note) => Boolean(note.text?.trim()));
  };

  const activeNotes = active ? notesFor(active) : [];

  useDismissTapTooltip(() => setActive(null));

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [active]);

  const year = anchor.getFullYear();

  const dayInfo = useMemo(() => {
    const start = new Date(year, 0, 1);
    const dow = (start.getDay() + 6) % 7; // Mon=0
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - dow);
    const cells: { key: string | null; inYear: boolean }[] = [];

    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const inYear = d.getFullYear() === year;
      cells.push({ key: inYear ? toKey(d) : null, inYear });
    }

    return cells;
  }, [year]);

  const summaryFor = (k: string) => {
    const log = data.dayLogs[k];
    if (!log) return null;

    const pain = avgDayPain(log);
    const tetany = log.tetany?.length ?? 0;
    const panic = log.panic?.length ?? 0;
    const hf = log.pain?.filter((p) => p.hotFlashes != null).length ?? 0;
    const headache = log.pain?.filter((p) => p.headache).length ?? 0;
    const nausea = log.pain?.filter((p) => p.nausea).length ?? 0;
    const bowel = log.bowel?.length ?? 0;
    const bowelTypes = Array.from(
      new Set(
        (log.bowel ?? [])
          .map((entry) => Number(entry.bristol))
          .filter((value) => Number.isInteger(value) && value >= 0 && value <= 7),
      ),
    );
    const sleep = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
    const weight = lastWeightForDay(log);
    const temperature = averageTemperatureForDay(log);
    const mood = log.mood?.map((entry) => entry.value).join(", ") ?? "";
    const energy = log.energy?.map((entry) => entry.value).join(", ") ?? "";
    const period = log.periodInfo?.level ?? log.period;
    const extraMeds = log.extraMeds?.length ?? 0;

    const symptomCount = tetany + panic + hf + headache + nausea + bowel;
    const load = (pain ?? 0) + symptomCount * 1.5;

    return {
      pain,
      tetany,
      panic,
      hf,
      headache,
      nausea,
      bowel,
      bowelTypes,
      sleep,
      weight,
      temperature,
      mood,
      energy,
      period,
      extraMeds,
      symptomCount,
      load,
    };
  };

  const maxLoad = useMemo(() => {
    let max = 0;

    dayInfo.forEach((cell) => {
      if (!cell.key) return;
      const summary = summaryFor(cell.key);
      if (summary && summary.load > max) max = summary.load;
    });

    return Math.max(1, max);
  }, [dayInfo, data.dayLogs]);

  const colorFor = (load: number) => {
    if (load <= 0) return "var(--tint)";

    const t = Math.min(1, load / maxLoad);
    const index = Math.min(SYMPTOM_LOAD_COLORS.length - 1, Math.floor(t * SYMPTOM_LOAD_COLORS.length));

    return SYMPTOM_LOAD_COLORS[index];
  };

  const activeSummary = active ? summaryFor(active) : null;

  return (
    <ChartCard title={`Symptom Load — ${year}`}>
      <p className="mt-1 text-xs text-muted-foreground">Tap any day to see every saved detail and the complete note.</p>

      <div className="mt-3 overflow-x-auto overscroll-x-contain">
        <div
          className="grid w-max grid-flow-col gap-[3px]"
          style={{
            gridTemplateRows: "repeat(7, 14px)",
            gridAutoColumns: "14px",
          }}
        >
          {dayInfo.map((cell, index) => {
            if (!cell.key) {
              return <div key={`empty-${index}`} className="h-3.5 w-3.5" />;
            }

            const summary = summaryFor(cell.key);
            const load = summary?.load ?? 0;
            const isActive = active === cell.key;

            return (
              <button
                key={cell.key}
                type="button"
                aria-label={`${fmtTapDay(cell.key)} symptom load`}
                aria-pressed={isActive}
                onClick={(event) => {
                  event.stopPropagation();
                  setActive((current) => (current === cell.key ? null : cell.key));
                }}
                className={`h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-110 focus-visible:z-10 ${
                  isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                }`}
                style={{ background: colorFor(load) }}
              />
            );
          })}
        </div>
      </div>

      {active ? (
        <div
          ref={detailRef}
          className="mt-4 mb-6 min-w-0 max-w-full scroll-mt-24 scroll-mb-[calc(132px+env(safe-area-inset-bottom))] overflow-visible rounded-3xl bg-primary/20 p-4 text-xs ring-1 ring-primary/25"
          onClick={(event) => event.stopPropagation()}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{fmtTapDay(active)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{active}</p>
            </div>

            <button
              type="button"
              onClick={() => setActive(null)}
              className="shrink-0 rounded-full bg-surface px-3 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border"
            >
              Close
            </button>
          </div>

          {activeSummary ? (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-surface/60 p-3 text-[10px] ring-1 ring-border/50">
              <p>
                <span className="text-muted-foreground">Pain:</span>{" "}
                <b>{activeSummary.pain != null ? `${activeSummary.pain.toFixed(1)}/10` : "—"}</b>
              </p>

              {activeSummary.sleep != null ? (
                <p>
                  <span className="text-muted-foreground">Sleep:</span> <b>{activeSummary.sleep.toFixed(1)}h</b>
                </p>
              ) : null}

              {activeSummary.bowel > 0 ? (
                <p>
                  <span className="text-muted-foreground">Bowel:</span>{" "}
                  <b>
                    {activeSummary.bowel}×
                    {activeSummary.bowelTypes.length ? ` · T${activeSummary.bowelTypes.join(", T")}` : ""}
                  </b>
                </p>
              ) : null}

              {activeSummary.tetany > 0 ? (
                <p>
                  <span className="text-muted-foreground">Tetany:</span> <b>{activeSummary.tetany}×</b>
                </p>
              ) : null}

              {activeSummary.panic > 0 ? (
                <p>
                  <span className="text-muted-foreground">Panic:</span> <b>{activeSummary.panic}×</b>
                </p>
              ) : null}

              {activeSummary.hf > 0 ? (
                <p>
                  <span className="text-muted-foreground">Hot flashes:</span> <b>{activeSummary.hf}×</b>
                </p>
              ) : null}

              {activeSummary.headache > 0 ? (
                <p>
                  <span className="text-muted-foreground">Headache:</span> <b>{activeSummary.headache}×</b>
                </p>
              ) : null}

              {activeSummary.nausea > 0 ? (
                <p>
                  <span className="text-muted-foreground">Nausea:</span> <b>{activeSummary.nausea}×</b>
                </p>
              ) : null}

              {activeSummary.weight != null ? (
                <p>
                  <span className="text-muted-foreground">Weight:</span> <b>{activeSummary.weight.toFixed(1)} kg</b>
                </p>
              ) : null}

              {activeSummary.temperature != null ? (
                <p>
                  <span className="text-muted-foreground">Temperature:</span>{" "}
                  <b>{activeSummary.temperature.toFixed(1)} °C</b>
                </p>
              ) : null}

              {activeSummary.mood ? (
                <p className="col-span-2">
                  <span className="text-muted-foreground">Mood:</span>{" "}
                  <b className="capitalize">{activeSummary.mood}</b>
                </p>
              ) : null}

              {activeSummary.energy ? (
                <p className="col-span-2">
                  <span className="text-muted-foreground">Energy:</span>{" "}
                  <b className="capitalize">{activeSummary.energy}</b>
                </p>
              ) : null}

              {activeSummary.period ? (
                <p className="col-span-2">
                  <span className="text-muted-foreground">Period flow:</span>{" "}
                  <b className="capitalize">{String(activeSummary.period).replace("-", " ")}</b>
                </p>
              ) : null}

              {activeSummary.extraMeds > 0 ? (
                <p className="col-span-2">
                  <span className="text-muted-foreground">Extra medication:</span> <b>{activeSummary.extraMeds}×</b>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No symptom entries saved for this day.</p>
          )}

          <div className="mt-3 min-w-0 border-t border-border/70 pt-3">
            <p className="font-semibold text-foreground">Notes</p>

            {activeNotes.length > 0 ? (
              <div className="mt-2 space-y-2">
                {activeNotes.map((note, index) => (
                  <article
                    key={`${active}-${index}`}
                    className="min-w-0 max-w-full overflow-visible rounded-2xl bg-surface/70 p-3 ring-1 ring-border/50"
                  >
                    {note.time ? (
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground">{note.time}</p>
                    ) : null}

                    <p className="max-w-full whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {note.text}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">No notes for this day.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-[10px] text-muted-foreground">Tap a square for full details.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span>No symptoms</span>

        <span className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={t}
              className="h-3.5 w-3.5 rounded-[3px]"
              style={{
                background:
                  t === 0
                    ? "var(--tint)"
                    : SYMPTOM_LOAD_COLORS[
                        Math.min(SYMPTOM_LOAD_COLORS.length - 1, Math.ceil(t * SYMPTOM_LOAD_COLORS.length) - 1)
                      ],
              }}
            />
          ))}
        </span>

        <span>High load</span>
      </div>
    </ChartCard>
  );
}

/** Combined Tetany & Panic time-of-day pattern chart. */
function TimeOfDayPatternChart({
  data,
  days,
  period,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  days: string[];
  period: Period;
}) {
  const [active, setActive] = useState<string | null>(null);
  useDismissTapTooltip(() => setActive(null));

  const tetanyBlocks = [0, 0, 0, 0];
  const panicBlocks = [0, 0, 0, 0];
  days.forEach((k) => {
    data.dayLogs[k]?.tetany?.forEach((t) => {
      const b = timeBlockOf(t.time);
      if (b != null) tetanyBlocks[b]++;
    });
    data.dayLogs[k]?.panic?.forEach((p) => {
      const b = timeBlockOf(p.time);
      if (b != null) panicBlocks[b]++;
    });
  });
  const tetanyTotal = tetanyBlocks.reduce((a, b) => a + b, 0);
  const panicTotal = panicBlocks.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...tetanyBlocks, ...panicBlocks);

  const sentence = (() => {
    if (!tetanyTotal && !panicTotal) return null;
    const topOf = (blocks: number[], total: number) => {
      if (!total) return null;
      let best = 0;
      for (let i = 1; i < 4; i++) if (blocks[i] > blocks[best]) best = i;
      return { i: best, pct: Math.round((blocks[best] / total) * 100) };
    };
    const t = topOf(tetanyBlocks, tetanyTotal);
    const p = topOf(panicBlocks, panicTotal);
    if (t && p) {
      return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[t.i].toLowerCase()} (${TIME_BLOCK_LABELS[t.i].split(" ")[1]}, ${t.pct}% of cases), while panic attacks peak in the ${TIME_BLOCK_SHORT[p.i].toLowerCase()} (${TIME_BLOCK_LABELS[p.i].split(" ")[1]}, ${p.pct}% of cases).`;
    }
    if (t)
      return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[t.i].toLowerCase()} (${TIME_BLOCK_LABELS[t.i].split(" ")[1]}, ${t.pct}% of cases).`;
    if (p)
      return `Panic attacks occur most often in the ${TIME_BLOCK_SHORT[p.i].toLowerCase()} (${TIME_BLOCK_LABELS[p.i].split(" ")[1]}, ${p.pct}% of cases).`;
    return null;
  })();

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Time of Day Pattern</p>
      {!tetanyTotal && !panicTotal ? (
        <p className="mt-2 text-sm text-muted-foreground">Not enough data yet</p>
      ) : (
        <>
          <div className="mt-2 flex gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TETANY_COLOR }} /> Tetany ({tetanyTotal})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PANIC_COLOR }} /> Panic ({panicTotal})
            </span>
          </div>
          <div
            className={`relative mt-4 grid grid-cols-4 items-end gap-3 transition-[padding,height] ${
              active ? "pt-20" : ""
            }`}
            style={{ height: active ? 168 : 110 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex h-full items-end justify-center gap-1">
                <div className="flex flex-col items-center justify-end" style={{ height: "100%" }}>
                  {tetanyBlocks[i] > 0 && (
                    <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{tetanyBlocks[i]}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`${TIME_BLOCK_LABELS[i]}. Tetany ${tetanyBlocks[i]} times`}
                    aria-pressed={active === `t${i}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActive((current) => (current === `t${i}` ? null : `t${i}`));
                    }}
                    className={`w-4 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active === `t${i}` ? "ring-2 ring-foreground/70" : ""
                    }`}
                    style={{
                      height: `${Math.max(4, (tetanyBlocks[i] / max) * 100)}%`,
                      background: TETANY_COLOR,
                    }}
                  />
                </div>
                <div className="flex flex-col items-center justify-end" style={{ height: "100%" }}>
                  {panicBlocks[i] > 0 && (
                    <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{panicBlocks[i]}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`${TIME_BLOCK_LABELS[i]}. Panic ${panicBlocks[i]} times`}
                    aria-pressed={active === `p${i}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActive((current) => (current === `p${i}` ? null : `p${i}`));
                    }}
                    className={`w-4 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active === `p${i}` ? "ring-2 ring-foreground/70" : ""
                    }`}
                    style={{
                      height: `${Math.max(4, (panicBlocks[i] / max) * 100)}%`,
                      background: PANIC_COLOR,
                    }}
                  />
                </div>
              </div>
            ))}
            {active &&
              (() => {
                const isTetany = active[0] === "t";
                const i = Number(active.slice(1));
                const count = isTetany ? tetanyBlocks[i] : panicBlocks[i];
                const total = isTetany ? tetanyTotal : panicTotal;
                const percentage = total ? Math.round((count / total) * 100) : 0;
                const color = isTetany ? TETANY_COLOR : PANIC_COLOR;
                const details: InsightTooltipDetails = {
                  owner: "You",
                  heading: TIME_BLOCK_LABELS[i],
                  value: `${isTetany ? "Tetany" : "Panic"} ${count}×`,
                  description: `${percentage}% of entries in the selected period`,
                  color,
                  summary: `${TIME_BLOCK_LABELS[i]} · ${isTetany ? "Tetany" : "Panic"} ${count}× · ${percentage}%`,
                };

                return <InsightFloatingTooltip leftPct={(i + 0.5) * 25} details={details} />;
              })()}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-3 text-center text-[8px] text-muted-foreground">
            {TIME_BLOCK_SHORT.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          {active ? (
            (() => {
              const isTetany = active[0] === "t";
              const i = Number(active.slice(1));
              const count = isTetany ? tetanyBlocks[i] : panicBlocks[i];
              const total = isTetany ? tetanyTotal : panicTotal;
              const percentage = total ? Math.round((count / total) * 100) : 0;
              const color = isTetany ? TETANY_COLOR : PANIC_COLOR;
              const details: InsightTooltipDetails = {
                owner: "You",
                heading: TIME_BLOCK_LABELS[i],
                value: `${isTetany ? "Tetany" : "Panic"} ${count}×`,
                description: `${percentage}% of entries in the selected period`,
                color,
                summary: `${TIME_BLOCK_LABELS[i]} · ${isTetany ? "Tetany" : "Panic"} ${count}× · ${percentage}%`,
              };

              return <InsightTooltipSummary details={details} onClose={() => setActive(null)} />;
            })()
          ) : (
            <p className="mt-1 text-center text-[10px] text-muted-foreground">Tap a bar for exact details.</p>
          )}
          {sentence && <p className="mt-3 text-sm text-muted-foreground">{sentence}</p>}
        </>
      )}
    </section>
  );
}
