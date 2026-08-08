import { createFileRoute } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  periodLabel,
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

function fmtCoupleTooltipDay(k: string): string {
  return fromKey(k).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
  const tooltipHeight = 58;
  const connectorHeight = 12;
  const clampedLeft = Math.max(0, Math.min(100, leftPct));
  const placement = clampedLeft < 24 ? "left" : clampedLeft > 76 ? "right" : "center";

  const positionStyle =
    placement === "left"
      ? { left: "4px", transform: "none" }
      : placement === "right"
        ? { right: "4px", transform: "none" }
        : { left: `${clampedLeft}%`, transform: "translateX(-50%)" };

  const connectorX =
    placement === "left"
      ? Math.max(12, Math.min(tooltipWidth - 12, (clampedLeft / 24) * tooltipWidth))
      : placement === "right"
        ? Math.max(12, Math.min(tooltipWidth - 12, tooltipWidth - ((100 - clampedLeft) / 24) * tooltipWidth))
        : tooltipWidth / 2;

  const headingText = `${details.owner ? `${details.owner} · ` : ""}${details.heading}`;
  const heading = headingText.length > 29 ? `${headingText.slice(0, 28).trimEnd()}…` : headingText;

  const valueFontSize = details.value.length > 23 ? 8.5 : details.value.length > 18 ? 10 : 12;

  const description = details.description ?? "";
  const descriptionFontSize = description.length > 31 ? 7 : description.length > 27 ? 7.5 : 8;
  const visibleDescription = description.length > 38 ? `${description.slice(0, 37).trimEnd()}…` : description;

  return (
    <svg
      width={tooltipWidth}
      height={tooltipHeight + connectorHeight}
      viewBox={`0 0 ${tooltipWidth} ${tooltipHeight + connectorHeight}`}
      className="pointer-events-none absolute z-30 overflow-visible"
      style={{
        ...positionStyle,
        top,
      }}
      aria-hidden="true"
    >
      <line
        x1={connectorX}
        x2={connectorX}
        y1={tooltipHeight}
        y2={tooltipHeight + connectorHeight}
        stroke={details.color}
        strokeWidth="1.25"
      />

      <rect
        x="0"
        y="0"
        width={tooltipWidth}
        height={tooltipHeight}
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

      {visibleDescription ? (
        <text x="10" y="49" fontSize={descriptionFontSize} fill="var(--muted-foreground)">
          {visibleDescription}
        </text>
      ) : null}
    </svg>
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
  "#8DBF3A",
  "#A8C93A",
  "#C4D63A",
  "#E0D93A",
  "#F0C43A",
  "#F3A83A",
  "#F28A3A",
  "#EF6E42",
  "#E9534F",
  "#D93F55",
  "#C92F5A",
] as const;

function vividPainChartColor(value: number): string {
  const index = Math.max(0, Math.min(10, Math.round(value)));
  return VIVID_PAIN_CHART_COLORS[index];
}

const TETANY_COLOR = CHART_COLORS.tetany;
const PANIC_COLOR = CHART_COLORS.panic;

const PAIN_ACCENT = "#ef4770";
const PAIN_SOFT = "rgba(239, 71, 112, 0.08)";
const PAIN_BORDER = "rgba(239, 71, 112, 0.22)";

const GREEN_ACCENT = "#6f9d16";
const GREEN_SOFT = "rgba(111, 157, 22, 0.08)";
const GREEN_BORDER = "rgba(111, 157, 22, 0.22)";

const HOT_FLASH_COLORS = [
  VIVID_PAIN_CHART_COLORS[0], // unused index 0
  VIVID_PAIN_CHART_COLORS[2], // level 1 — green
  VIVID_PAIN_CHART_COLORS[4], // level 2 — yellow
  VIVID_PAIN_CHART_COLORS[6], // level 3 — orange
  VIVID_PAIN_CHART_COLORS[8], // level 4 — red
  VIVID_PAIN_CHART_COLORS[10], // level 5 — deepest red
] as const;

const HOT_FLASH_DESCRIPTIONS: Record<number, string> = {
  1: "Mild warmth",
  2: "Warm flush",
  3: "Sweating",
  4: "Strong wave",
  5: "Drenching",
};

const BRISTOL_MYSTERY_COLOR = "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)";


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
  // keeping the yearly hot-flash chart readable.
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
          className={`mx-auto grid w-full gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 ${
            cycleTrackingHidden ? "max-w-[340px] grid-cols-3" : "max-w-[390px] grid-cols-4"
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
                className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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

        {!cycleTrackingHidden && period === "P" && (
          <BirthControlCalendar
            data={view}
            anchor={anchor}
            monthLabel={label}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
          />
        )}

        {period !== "P" && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={goPrev}
                className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium">{label}</span>
              <button
                onClick={goNext}
                className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Next period"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

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


            {period === "Y" && <YearHealthHeatmap data={view} anchor={anchor} />}

            <TimeOfDayPatternChart data={view} days={days} period={period} />

            <MedsAdherence data={view} period={period} anchor={anchor} />
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
function BirthControlCalendar({
  data,
  anchor,
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  anchor: Date;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const { update } = useBixbo();
  const [sel, setSel] = useState<string | null>(null);
  const [pickTime, setPickTime] = useState<string>("");
  const [hakMonth, setHakMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));

  useEffect(() => {
    setHakMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  }, [anchor]);

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

  if (data.settings.gender === "male") return null;

  // Drovelis is monophasic: every pink active tablet has the same full dose.
  // 24 pink active tablets + 4 white placebo tablets = one 28-day pack.
  const ACTIVE_DAYS = 24;
  const PACK_DAYS = 28;
  const DROVELIS_ACTIVE_DOSE = "3 mg drospirenone + 14.2 mg estetrol";

  const HAK_PURPLE = "#7A53C8";
  const HAK_PURPLE_DARK = "#5B32AE";
  const HAK_PURPLE_SOFT = "#DCCFF3";
  const HAK_PURPLE_DOT = "#8C67D4";
  const HAK_PINK = "#D95782";
  const HAK_PINK_DARK = "#B92E60";
  const HAK_PINK_SOFT = "#F7CBD9";
  const HAK_GREEN = "#8A962D";
  const HAK_GREEN_DARK = "#596313";
  const HAK_GREEN_SOFT = "#E7E9B8";
  const HAK_TRACK = "#E4E4D3";
  const HAK_CARD_BG = "color-mix(in srgb, var(--background) 94%, #7C8900 6%)";

  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );
  const bcId = bcMed?.id ?? "hak-default";

  const todayK = toKey(new Date());
  const referenceK = toKey(anchor);

  const pillNumber = (k: string) => {
    const diff = Math.round((fromKey(k).getTime() - fromKey(since).getTime()) / 86400000);
    if (diff < 0) return null;
    return (diff % PACK_DAYS) + 1;
  };

  const currentDay = pillNumber(referenceK) ?? 1;
  const currentPackStart = addDays(referenceK, -(currentDay - 1));

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
  const selectedAssumedTaken =
    !!sel &&
    selectedDay != null &&
    selectedDay <= ACTIVE_DAYS &&
    sel >= since &&
    sel < todayK &&
    !selectedMissed &&
    !selectedTaken;

  const placeboStart = addDays(currentPackStart, ACTIVE_DAYS);
  const placeboEnd = addDays(currentPackStart, PACK_DAYS - 1);
  const nextPackStart = addDays(currentPackStart, PACK_DAYS);

  const fmtDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  const fmtFullDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

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
  const hakMonthDays = new Date(hakMonthYear, hakMonthIndex + 1, 0).getDate();
  const hakMonthCellCount = Math.ceil((hakMonthOffset + hakMonthDays) / 7) * 7;
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

  type ProtectionState = "protected" | "backup" | "review" | "starting" | "unknown";

  const activeKeysBefore = (key: string, count: number): string[] => {
    const out: string[] = [];
    let cursor = addDays(key, -1);

    while (out.length < count && cursor >= since) {
      const d = pillNumber(cursor);
      if (d != null && d <= ACTIVE_DAYS) out.unshift(cursor);
      cursor = addDays(cursor, -1);
    }

    return out;
  };

  const activeDaysAfterMissThrough = (missKey: string, key: string): number => {
    let cursor = addDays(missKey, 1);
    let consecutive = 0;

    while (cursor <= key) {
      const d = pillNumber(cursor);
      if (d != null && d <= ACTIVE_DAYS) {
        if (missedAt(cursor)) consecutive = 0;
        else consecutive++;
      }
      cursor = addDays(cursor, 1);
    }

    return consecutive;
  };

  const explicitMissesThrough = (key: string): string[] => {
    // 40 days is enough to carry a late-pack miss across placebo and into the
    // following pack until seven uninterrupted active tablets have elapsed.
    const start = fromKey(key).getTime() - fromKey(since).getTime() > 40 * 86400000 ? addDays(key, -40) : since;
    const misses: string[] = [];
    let cursor = start;

    while (cursor <= key) {
      const d = pillNumber(cursor);
      if (d != null && d <= ACTIVE_DAYS && missedAt(cursor)) misses.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return misses;
  };

  /**
   * Drovelis pregnancy-protection indicator.
   *
   * Important modelling rule: an empty medication log is NOT treated as a missed
   * pill. This calendar is a schedule + exception tracker; only an explicit
   * "missed" record reduces the status. That prevents old, unlogged packs from
   * being shown as falsely "Unknown".
   *
   * Official Drovelis rules represented here:
   * - all 24 pink tablets are the same full dose;
   * - the four placebo days are part of the protected regimen when the preceding
   *   active tablets were taken correctly and the next pack starts on time;
   * - <24 h late does not reduce protection (a normal "taken" record stays green);
   * - days 1-7: an explicit missed active pill triggers backup until seven
   *   uninterrupted active pills have followed;
   * - days 8-17: one missed pill can remain protected when the preceding seven
   *   active pills were correct; repeated/recent misses trigger backup;
   * - days 18-24: special schedule action is required to avoid extending the
   *   hormone-free interval, so the app shows REVIEW rather than a false green.
   */
  const protectionStateFor = (key: string): ProtectionState => {
    const day = pillNumber(key);
    if (day == null) return "unknown";

    const daysFromStart = Math.round((fromKey(key).getTime() - fromKey(since).getTime()) / 86400000);
    const misses = explicitMissesThrough(key);

    // During the first seven calendar days we do not know whether the first pill
    // was started on menstrual day 1 (immediate protection) or days 2-5 (backup
    // needed for seven active pills). An explicit miss is stronger and is handled
    // by the missed-pill rules below.
    if (!misses.length && daysFromStart >= 0 && daysFromStart < 7) return "starting";
    if (!misses.length) return "protected";

    let strongest: ProtectionState = "protected";

    for (const missKey of misses) {
      const missDay = pillNumber(missKey);
      if (missDay == null || missDay > ACTIVE_DAYS) continue;

      const recovered = activeDaysAfterMissThrough(missKey, key) >= 7;
      if (recovered) continue;

      if (missDay <= 7) return "backup";

      if (missDay <= 17) {
        const previousSeven = activeKeysBefore(missKey, 7);
        const previousSevenClear = previousSeven.length === 7 && previousSeven.every((k) => !missedAt(k));

        const missPackStart = addDays(missKey, -(missDay - 1));
        let missesInThisPack = 0;
        let cursor = missPackStart;
        while (cursor <= missKey) {
          const d = pillNumber(cursor);
          if (d != null && d <= ACTIVE_DAYS && missedAt(cursor)) missesInThisPack++;
          cursor = addDays(cursor, 1);
        }

        if (!previousSevenClear || missesInThisPack > 1) return "backup";
        continue;
      }

      // Days 18-24 need a deliberate schedule adjustment (e.g. skipping the
      // placebo phase) to preserve protection. This fixed 28-day calendar cannot
      // safely infer that adjustment, so surface an action/review state.
      strongest = "review";
    }

    return strongest;
  };

  const protectionMeta = (state: ProtectionState) => {
    if (state === "protected") {
      return {
        label: "Pregnancy protection expected",
        short: "Protected",
        color: HAK_GREEN,
        bg: "rgba(220,235,210,.72)",
        text: HAK_GREEN_DARK,
        symbol: "✓",
      };
    }

    if (state === "backup") {
      return {
        label: "Use a condom / avoid unprotected sex",
        short: "Use backup",
        color: "#C94A55",
        bg: "rgba(248,215,218,.72)",
        text: "#8E2832",
        symbol: "!",
      };
    }

    if (state === "review") {
      return {
        label: "HAK schedule action needed",
        short: "Check schedule",
        color: "#D58A22",
        bg: "rgba(251,232,199,.78)",
        text: "#8A5511",
        symbol: "!",
      };
    }

    if (state === "starting") {
      return {
        label: "Start-up protection depends on cycle-day start",
        short: "Start-up",
        color: HAK_PURPLE,
        bg: "rgba(220,207,243,.62)",
        text: HAK_PURPLE_DARK,
        symbol: "i",
      };
    }

    return {
      label: "Outside configured HAK schedule",
      short: "Unknown",
      color: "#9A9A82",
      bg: "rgba(230,230,210,.55)",
      text: "var(--muted-foreground)",
      symbol: "?",
    };
  };

  const missedPillAdvice = (day: number): string => {
    if (day <= 7) {
      return "Take the last missed pink pill as soon as possible and use a condom until 7 uninterrupted active pills have been taken. If unprotected sex happened in the previous 7 days, review pregnancy risk.";
    }
    if (day <= 17) {
      return "Take the last missed pink pill as soon as possible. If this was the only missed pill and the previous 7 active pills were taken correctly, extra contraception is usually not needed; otherwise use backup until 7 uninterrupted active pills.";
    }
    if (day <= ACTIVE_DAYS) {
      return "Late-pack rule: avoid extending the hormone-free interval. Drovelis guidance uses a schedule adjustment such as skipping the 4 placebo tablets and starting the next pack immediately. Review the missed-pill instructions before relying on protection.";
    }
    return "White tablets are placebo. Missing a placebo tablet does not reduce contraceptive protection; discard it so the placebo phase is not accidentally extended.";
  };

  // One mathematical 28-step wheel. Days always run in one uninterrupted
  // sequence: 1 → 2 → … → 24 → 25 → 26 → 27 → 28 → 1.
  // Day 1 starts at the lower-right so placebo 25–28 stays across the bottom,
  // matching the approved visual reference without breaking the number order.
  const WHEEL_STEP = 360 / PACK_DAYS;
  const WHEEL_DAY1_ANGLE = 57;
  const wheelAngleForDay = (day: number) => WHEEL_DAY1_ANGLE - (day - 1) * WHEEL_STEP;

  return (
    <section
      className="rounded-[2rem] p-4 shadow-sm ring-1"
      style={{
        backgroundColor: HAK_CARD_BG,
        boxShadow: `inset 0 0 0 1px ${GREEN_BORDER}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface/65 ring-1 ring-border/50">
            <Ico e="🫐" size={25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-bold text-foreground">Blueberry cycle</h2>
            <p className="text-[11px] text-muted-foreground">Birth control overview</p>
          </div>
        </div>

        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface/35 p-0.5 ring-1 ring-border/35">
          <button
            type="button"
            onClick={onPrevMonth}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[88px] px-1 text-center text-[10px] font-semibold text-foreground/80">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Circular HAK overview — only wheel pills open the dose popup. */}
      <div className="mx-auto mt-5 w-full max-w-[340px]">
        <div className="mb-3 flex justify-center">
          <div
            className="rounded-full px-4 py-2 text-[11px] font-bold ring-1"
            style={{
              backgroundColor: "rgba(229,219,248,.92)",
              color: HAK_PURPLE_DARK,
              borderColor: "rgba(122,83,200,.18)",
            }}
          >
            Active HAK days · 1–24
          </div>
        </div>

        <div className="relative aspect-square w-full">
          <div
            className="absolute inset-[8%] rounded-full"
            style={{
              background: "rgba(255,255,255,.12)",
              boxShadow: "inset 0 0 0 9px rgba(255,255,255,.24)",
            }}
          />
          <div
            className="absolute inset-[18%] rounded-full"
            style={{
              backgroundColor: HAK_CARD_BG,
              boxShadow: "0 0 0 1px rgba(255,255,255,.12)",
            }}
          />

          <div className="pointer-events-none absolute inset-0 z-[1]">
            {Array.from({ length: PACK_DAYS }).map((_, i) => {
              const day = i + 1;
              const angle = (wheelAngleForDay(day) * Math.PI) / 180;
              const radius = 42;
              return (
                <span
                  key={`wheel-track-${i}`}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
                  style={{
                    left: `${50 + Math.cos(angle) * radius}%`,
                    top: `${50 + Math.sin(angle) * radius}%`,
                  }}
                />
              );
            })}
          </div>

          {wheelDays.map((day) => {
            const angle = (wheelAngleForDay(day) * Math.PI) / 180;
            const radius = 42;
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

            let backgroundColor = isPlacebo ? HAK_PINK_SOFT : "#DED2F3";
            let color = isPlacebo ? HAK_PINK_DARK : HAK_PURPLE_DARK;
            let borderColor = isPlacebo ? HAK_PINK : "rgba(122,83,200,.40)";

            // Only a pill explicitly marked taken becomes darker. Historical pills
            // remain soft lavender while still counting as on-schedule for protection.
            if (loggedTaken && !isCurrent) {
              if (isPlacebo) {
                backgroundColor = "#E99AB5";
                color = "#8F234B";
                borderColor = HAK_PINK_DARK;
              } else {
                backgroundColor = "#BDA9E7";
                color = "#4E2B98";
                borderColor = "rgba(91,50,174,.58)";
              }
            }

            if (isCurrent) {
              if (isPlacebo) {
                backgroundColor = loggedTaken ? HAK_PINK_DARK : HAK_PINK_SOFT;
                color = loggedTaken ? "#fff" : HAK_PINK_DARK;
                borderColor = HAK_PINK_DARK;
              } else {
                backgroundColor = HAK_PURPLE_DARK;
                color = "#fff";
                borderColor = HAK_PURPLE_DARK;
              }
            }

            if (missed) {
              borderColor = "#C94A55";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSel(dateKey);
                  setPickTime("");
                }}
                className="absolute z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold shadow-sm transition active:scale-95"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  backgroundColor,
                  color,
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: isCurrent
                    ? `0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px ${isPlacebo ? HAK_PINK : HAK_PURPLE}66`
                    : "0 1px 5px rgba(58,61,30,.08)",
                }}
                aria-label={`HAK day ${day}, ${fmtFullDate(dateKey)}${missed ? ", missed" : takenForStatus ? ", taken on schedule" : ""}`}
              >
                {day}
              </button>
            );
          })}

          <div className="pointer-events-none absolute inset-[25%] z-20 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold text-foreground">Day</p>
            <p
              className="mt-1 font-serif text-[clamp(2rem,9vw,2.8rem)] font-bold leading-none"
              style={{ color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK }}
            >
              {currentDay} / {PACK_DAYS}
            </p>
            <p
              className="mt-2 text-[13px] font-semibold"
              style={{ color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK }}
            >
              {currentDay <= ACTIVE_DAYS ? "Active HAK days" : "Placebo / break"}
            </p>

            <div className="relative mt-3 h-[70px] w-[56px] rotate-[8deg]" aria-hidden="true">
              <div
                className="absolute inset-x-1 bottom-[-6px] h-3 rounded-full opacity-20 blur-[2px]"
                style={{ backgroundColor: "#4E3E6D" }}
              />
              <div
                className="relative grid h-full w-full grid-cols-2 gap-x-2 gap-y-2 rounded-[12px] p-[8px] shadow-lg ring-1"
                style={{
                  background: "linear-gradient(145deg, #F1ECFA 0%, #D7C6EE 48%, #B99BD9 100%)",
                  borderColor: "#B89AD8",
                  boxShadow:
                    "inset 2px 2px 4px rgba(255,255,255,.82), inset -2px -2px 4px rgba(92,55,145,.16), 0 7px 12px rgba(63,48,89,.16)",
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="relative rounded-full"
                    style={{
                      background:
                        i % 2 === 0
                          ? "radial-gradient(circle at 32% 28%, #B9A2E9 0%, #8A68CF 45%, #5B39A8 100%)"
                          : "radial-gradient(circle at 32% 28%, #C4B2EE 0%, #9677D5 45%, #6745B0 100%)",
                      boxShadow:
                        "inset 1px 1px 2px rgba(255,255,255,.75), inset -1px -2px 2px rgba(57,31,103,.28), 0 1px 2px rgba(67,45,105,.28)",
                    }}
                  >
                    <span className="absolute left-[22%] top-[18%] h-[28%] w-[28%] rounded-full bg-white/35" />
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-3 max-w-[165px] text-[10px] leading-snug text-muted-foreground">
              {currentDay <= ACTIVE_DAYS ? "Continue taking your tablet" : "Placebo / break days"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <div
          className="rounded-[1.65rem] px-4 py-3 ring-1"
          style={{
            backgroundColor: "rgba(251,224,233,.58)",
            borderColor: "rgba(129,135,67,.18)",
          }}
        >
          <p className="text-[10px] font-bold" style={{ color: HAK_PINK_DARK }}>Placebo / break</p>
          <p className="mt-0.5 text-[10px] font-semibold" style={{ color: HAK_PINK_DARK }}>
            {ACTIVE_DAYS + 1}–{PACK_DAYS}
          </p>
        </div>

        <div
          className="rounded-[1.65rem] px-4 py-3 text-right ring-1"
          style={{
            backgroundColor: "rgba(231,233,184,.60)",
            borderColor: "rgba(129,135,67,.18)",
          }}
        >
          <p className="text-[10px] font-bold" style={{ color: HAK_GREEN_DARK }}>New cycle</p>
          <p className="mt-0.5 text-[10px] font-semibold" style={{ color: HAK_GREEN_DARK }}>Day 1</p>
        </div>
      </div>

      {/* Keep Current HAK pack exactly in the previous compact timeline style. */}
      <div className="mt-4">
        <h3 className="font-serif text-lg font-bold text-foreground">Current HAK pack</h3>
        <div
          className="mt-3 rounded-[1.75rem] px-4 py-4 ring-1"
          style={{
            backgroundColor: "rgba(255,255,255,.20)",
            borderColor: "rgba(129,135,67,.16)",
          }}
        >
          <div className="grid grid-cols-[1.35fr_1fr_.9fr] items-start gap-2 text-center">
            <div>
              <p className="text-[9px] font-bold leading-tight" style={{ color: HAK_PURPLE_DARK }}>Active HAK days</p>
              <p className="mt-0.5 text-[9px] font-semibold leading-tight" style={{ color: HAK_PURPLE_DARK }}>1–{ACTIVE_DAYS}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold leading-tight" style={{ color: HAK_PINK_DARK }}>Placebo / break</p>
              <p className="mt-0.5 text-[9px] font-semibold leading-tight" style={{ color: HAK_PINK_DARK }}>{ACTIVE_DAYS + 1}–{PACK_DAYS}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold leading-tight" style={{ color: HAK_GREEN_DARK }}>New cycle</p>
              <p className="mt-0.5 text-[9px] font-semibold leading-tight" style={{ color: HAK_GREEN_DARK }}>Day 1</p>
            </div>
          </div>

          <div className="relative mt-4 px-1 pb-8">
            <div
              className="rounded-full px-2 py-2 ring-1"
              style={{
                backgroundColor: "rgba(255,255,255,.30)",
                borderColor: "rgba(129,135,67,.18)",
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

      {/* Calendar is always visible on this page; dates are informational only. */}
      <div className="mt-4 rounded-[1.75rem] bg-surface/25 p-4 ring-1 ring-border/35">
        <h3 className="font-serif text-lg font-bold text-foreground">Calendar preview</h3>

        <div className="mt-3 grid grid-cols-7 gap-y-2 text-center text-[9px] font-semibold text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-2 text-center">
          {hakMonthCells.map((cell) => {
            const packDay = cell.packDay;
            const state: ProtectionState = cell.inMonth && packDay != null ? protectionStateFor(cell.key) : "unknown";
            const isToday = cell.key === todayK;

            let backgroundColor = "rgba(225,225,205,.72)";
            let color = "rgba(70,70,55,.48)";
            let borderColor = "rgba(145,145,120,.18)";

            if (cell.inMonth && packDay != null) {
              if (state === "protected") {
                backgroundColor = HAK_GREEN;
                color = "#fff";
                borderColor = HAK_GREEN_DARK;
              } else if (state === "backup") {
                backgroundColor = "#C94A55";
                color = "#fff";
                borderColor = "#8E2832";
              } else if (state === "review") {
                backgroundColor = "#D58A22";
                color = "#fff";
                borderColor = "#8A5511";
              } else if (state === "starting") {
                backgroundColor = HAK_PURPLE_SOFT;
                color = HAK_PURPLE_DARK;
                borderColor = HAK_PURPLE;
              }
            }

            return (
              <div key={cell.key} className="grid place-items-center">
                <div
                  className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor,
                    color,
                    border: `1.5px solid ${isToday ? HAK_GREEN_DARK : borderColor}`,
                    boxShadow: isToday ? `0 0 0 2px ${HAK_CARD_BG}` : undefined,
                    opacity: cell.inMonth ? 1 : 0.55,
                  }}
                  aria-label={`${fmtFullDate(cell.key)} — ${protectionMeta(state).label}`}
                >
                  {cell.date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HAK_GREEN }} />
            Protected
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#C94A55" }} />
            Use backup
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#D58A22" }} />
            Check schedule
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HAK_PURPLE_SOFT, border: `1px solid ${HAK_PURPLE}` }} />
            Start-up
          </div>
        </div>

        <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
          Drovelis: all 24 pink pills are the same full dose. The 4 white placebo days remain part of the protected regimen when active pills are taken correctly and the next pack starts on time. An empty dose log is treated as not recorded, not as a missed pill; mark a pill “missed” when an actual miss occurs. Calendar dates are informational only and do not open the dose editor.
        </p>
      </div>

      <div className="mt-4">
        <h3 className="font-serif text-lg font-bold text-foreground">Important dates</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl p-3 ring-1"
            style={{ backgroundColor: "rgba(251,224,233,.68)", borderColor: "rgba(217,87,130,.18)" }}
          >
            <div className="flex gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: HAK_PINK_SOFT }}>
                <Ico e="🗓️" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] leading-tight text-muted-foreground">Expected withdrawal bleeding</p>
                <p className="mt-1 text-xs font-bold text-foreground">{fmtDate(placeboStart)} – {fmtDate(placeboEnd)}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">May vary</p>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-3 ring-1"
            style={{ backgroundColor: "rgba(231,233,184,.72)", borderColor: "rgba(138,150,45,.18)" }}
          >
            <div className="flex gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: HAK_GREEN_SOFT }}>
                <Ico e="📅" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] leading-tight" style={{ color: HAK_GREEN_DARK }}>Start of new pack</p>
                <p className="mt-1 text-xs font-bold text-foreground">{fmtDate(nextPackStart)}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">New cycle</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!bcMed && (
        <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
          Add your contraceptive pill in Medications so taken and missed doses can be detected precisely.
        </p>
      )}

      {/* Dose editor popup exists only for clicks on the circular HAK wheel. */}
      {sel && selectedDay != null && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/30 p-4"
              style={{
                paddingTop: "max(1rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
              onClick={() => setSel(null)}
            >
              <div
                className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[1.75rem] bg-background p-4 shadow-2xl ring-1 ring-border"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      HAK day {selectedDay}
                    </p>
                    <h3 className="mt-1 font-serif text-lg font-bold text-foreground">{fmtFullDate(sel)}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSel(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-sm font-bold ring-1 ring-border"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-3 rounded-2xl bg-tint p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedTaken
                      ? `Taken at ${selectedTaken}`
                      : selectedMissed
                        ? "Marked missed"
                        : selectedDay > ACTIVE_DAYS
                          ? "Placebo / break day"
                          : selectedAssumedTaken
                            ? "Taken on schedule"
                            : "Not recorded"}
                  </p>
                </div>

                <div
                  className="mt-3 rounded-2xl p-3 ring-1"
                  style={{
                    backgroundColor: protectionMeta(protectionStateFor(sel)).bg,
                    borderColor: protectionMeta(protectionStateFor(sel)).color,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black"
                      style={{
                        backgroundColor: protectionMeta(protectionStateFor(sel)).color,
                        color: "#fff",
                      }}
                    >
                      {protectionMeta(protectionStateFor(sel)).symbol}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Pregnancy protection
                      </p>
                      <p
                        className="mt-0.5 text-sm font-bold"
                        style={{ color: protectionMeta(protectionStateFor(sel)).text }}
                      >
                        {protectionMeta(protectionStateFor(sel)).label}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-surface/70 p-3 ring-1 ring-border/60">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Drovelis</p>
                  {selectedDay <= ACTIVE_DAYS ? (
                    <>
                      <p className="mt-1 text-sm font-bold text-foreground">Active pill {selectedDay}/24 · full dose</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        {DROVELIS_ACTIVE_DOSE}. Pink pill 24 is not weaker than pink pill 1 — all 24 active tablets contain the same dose.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-bold text-foreground">Placebo {selectedDay - ACTIVE_DAYS}/4 · no hormones</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        Protection continues through the planned 4 placebo days when the preceding active pills were taken correctly and the next pack is started on time.
                      </p>
                    </>
                  )}
                </div>

                {selectedMissed && (
                  <div
                    className="mt-3 rounded-2xl p-3 ring-1"
                    style={{ backgroundColor: "rgba(251,232,199,.58)", borderColor: "rgba(213,138,34,.35)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#8A5511" }}>
                      Missed-pill guidance
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-foreground/80">
                      {missedPillAdvice(selectedDay)}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="time"
                      value={pickTime}
                      onChange={(event) => setPickTime(event.target.value)}
                      className="min-w-0 rounded-xl bg-tint px-3 py-2 text-sm text-foreground ring-1 ring-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        markTaken(sel, pickTime);
                        setSel(null);
                      }}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Mark taken
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        markMissed(sel);
                        setSel(null);
                      }}
                      className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold"
                      style={{ border: "1.5px solid #C94A55", color: "#C94A55" }}
                    >
                      Mark missed
                    </button>

                    {(selectedTaken || selectedMissed) && (
                      <button
                        type="button"
                        onClick={() => {
                          clearRecord(sel);
                          setSel(null);
                        }}
                        className="rounded-xl bg-tint px-3 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {selectedDay > ACTIVE_DAYS && (
                    <p className="text-[9px] leading-relaxed text-muted-foreground">
                      Placebo logging is for routine tracking only. Missing a placebo tablet does not reduce pregnancy protection as long as the next pack is started on time.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="mt-4 w-full rounded-xl bg-tint px-3 py-2.5 text-xs font-semibold text-foreground ring-1 ring-border"
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function MedsAdherence({
  data,
  period,
  anchor,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  period: Exclude<Period, "P">;
  anchor: Date;
}) {
  const { update } = useBixbo();
  const [open, setOpen] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const scheduled = data.meds.filter((med) => !med.asNeeded);
  const asNeeded = data.meds.filter((med) => med.asNeeded);

  const range = useMemo(() => {
    const base = new Date(anchor);
    base.setHours(0, 0, 0, 0);

    if (period === "W") {
      const mondayOffset = (base.getDay() + 6) % 7;
      const start = new Date(base);
      start.setDate(base.getDate() - mondayOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return {
        start,
        end,
        label: `${start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })} – ${end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        title: "Week",
      };
    }

    if (period === "M") {
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);

      return {
        start,
        end,
        label: start.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        }),
        title: "Month",
      };
    }

    const start = new Date(base.getFullYear(), 0, 1);
    const end = new Date(base.getFullYear(), 11, 31);

    return {
      start,
      end,
      label: String(base.getFullYear()),
      title: "Year",
    };
  }, [anchor, period]);

  const days = useMemo(() => {
    const out: string[] = [];
    const cursor = new Date(range.start);

    while (cursor <= range.end) {
      out.push(toKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return out;
  }, [range.end, range.start]);

  const expectedPerDay = scheduled.reduce((sum, med) => sum + med.times.length, 0);

  const perDay = useMemo(
    () =>
      days.map((date) => {
        const missed: { medName: string; time: string; key: string }[] = [];
        const takenList: { medName: string; time: string; key: string }[] = [];
        let taken = 0;

        scheduled.forEach((med) => {
          med.times.forEach((time) => {
            const key = `${med.id}@${time}`;

            if (data.medLog[date]?.[key]) {
              taken += 1;
              takenList.push({ medName: med.name, time, key });
            } else {
              missed.push({ medName: med.name, time, key });
            }
          });
        });

        return {
          date,
          expected: expectedPerDay,
          taken,
          missed,
          takenList,
          pct: expectedPerDay ? Math.round((taken / expectedPerDay) * 100) : null,
        };
      }),
    [data.medLog, days, expectedPerDay, scheduled],
  );

  const totalExpected = perDay.reduce((sum, day) => sum + day.expected, 0);
  const totalTaken = perDay.reduce((sum, day) => sum + day.taken, 0);
  const overallPct = totalExpected ? Math.round((totalTaken / totalExpected) * 100) : null;

  const adherenceColor = (pct: number | null): string => {
    if (pct == null) return INSIGHT_COLORS.oliveLight;
    if (pct >= 90) return "#28A85B";
    if (pct >= 75) return "#F0D33A";
    if (pct >= 40) return "#F7A21C";
    return "#D84343";
  };

  const perMed = useMemo(
    () =>
      scheduled
        .flatMap((med) =>
          med.times.map((time) => {
            let taken = 0;

            days.forEach((date) => {
              if (data.medLog[date]?.[`${med.id}@${time}`]) taken += 1;
            });

            const expected = days.length;
            const pct = expected ? Math.round((taken / expected) * 100) : 0;

            return {
              id: `${med.id}@${time}`,
              name: med.name,
              dose: med.dose,
              time,
              taken,
              expected,
              pct,
            };
          }),
        )
        .sort((a, b) => a.pct - b.pct),
    [data.medLog, days, scheduled],
  );

  const asNeededCounts = useMemo(
    () =>
      asNeeded.map((med) => {
        let count = 0;

        days.forEach((date) => {
          const log = data.medLog[date] ?? {};

          Object.keys(log).forEach((key) => {
            if (log[key] && (key === `${med.id}@asNeeded` || key.startsWith(`${med.id}@`))) {
              count += 1;
            }
          });
        });

        return { id: med.id, name: med.name, count };
      }),
    [asNeeded, data.medLog, days],
  );

  const knownIds = new Set(data.meds.map((med) => med.id));
  const removedCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    days.forEach((date) => {
      const log = data.medLog[date] ?? {};

      Object.entries(log).forEach(([key, value]) => {
        if (!value) return;

        const id = key.split("@")[0];
        if (knownIds.has(id)) return;

        counts[id] = (counts[id] ?? 0) + 1;
      });
    });

    return Object.entries(counts).map(([id, count]) => ({
      id,
      count,
      name: data.medNames?.[id] ?? "Removed medication",
    }));
  }, [data.medLog, data.medNames, days, knownIds]);

  const toggleDose = (dayKey: string, medKey: string) =>
    update((current) => {
      const day = { ...(current.medLog[dayKey] ?? {}) };

      if (day[medKey]) delete day[medKey];
      else day[medKey] = true;

      return {
        ...current,
        medLog: {
          ...current.medLog,
          [dayKey]: day,
        },
      };
    });

  const fmtDay = (date: string) =>
    fromKey(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  const monthly = useMemo(() => {
    if (period !== "Y") return [];

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDays = perDay.filter((day) => fromKey(day.date).getMonth() === monthIndex);
      const expected = monthDays.reduce((sum, day) => sum + day.expected, 0);
      const taken = monthDays.reduce((sum, day) => sum + day.taken, 0);
      const pct = expected ? Math.round((taken / expected) * 100) : null;

      return {
        key: `${range.start.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: MON_SHORT3[monthIndex],
        expected,
        taken,
        pct,
      };
    });
  }, [perDay, period, range.start]);

  const bestMonth =
    period === "Y"
      ? monthly.filter((month) => month.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0]
      : undefined;

  const worstMonth =
    period === "Y"
      ? monthly.filter((month) => month.pct != null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0]
      : undefined;

  if (data.meds.length === 0 && removedCounts.length === 0) return null;

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <div className="text-left">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Meds adherence</p>
          <p className="mt-1 text-[11px] font-medium text-foreground">
            {range.title} · {range.label}
          </p>
        </div>

        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <>
          {totalExpected > 0 ? (
            <div className="mt-4">
              <div className="flex items-end gap-2">
                <span className="font-serif text-5xl leading-none" style={{ color: adherenceColor(overallPct) }}>
                  {overallPct}%
                </span>

                <span className="pb-1 text-sm text-muted-foreground">
                  {totalTaken}/{totalExpected} doses
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-tint">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${overallPct ?? 0}%`,
                    background: adherenceColor(overallPct),
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No scheduled meds in this period.</p>
          )}

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              {period === "Y" ? "Monthly adherence" : "Daily adherence"}
            </p>

            {period === "Y" ? (
              <div className="grid grid-cols-6 gap-2">
                {monthly.map((month) => (
                  <button
                    key={month.key}
                    type="button"
                    onClick={() => setExpandedKey(expandedKey === month.key ? null : month.key)}
                    className={`rounded-xl p-2 text-center ring-1 transition ${
                      expandedKey === month.key ? "ring-primary" : "ring-border/70"
                    }`}
                    style={{ background: adherenceColor(month.pct) }}
                  >
                    <span className="block text-[10px] font-semibold text-black/75">{month.label}</span>
                    <span className="mt-0.5 block text-[10px] font-bold text-black/80">
                      {month.pct == null ? "n/a" : `${month.pct}%`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${period === "W" ? 7 : 7}, minmax(0, 1fr))`,
                }}
              >
                {perDay.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setExpandedKey(expandedKey === day.date ? null : day.date)}
                    title={`${fmtDay(day.date)} — ${day.taken}/${day.expected}`}
                    aria-label={`${fmtDay(day.date)} — ${day.taken}/${day.expected} doses`}
                    className={`aspect-square min-h-7 min-w-0 rounded-lg ring-1 transition ${
                      expandedKey === day.date ? "ring-2 ring-primary" : "ring-border/30"
                    }`}
                    style={{ background: adherenceColor(day.pct) }}
                  />
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {[
                { label: "90–100%", color: "#28A85B" },
                { label: "75–89%", color: "#F0D33A" },
                { label: "40–74%", color: "#F7A21C" },
                { label: "0–39%", color: "#D84343" },
                { label: "n/a", color: INSIGHT_COLORS.oliveLight },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>

            {expandedKey &&
              (period === "Y"
                ? (() => {
                    const month = monthly.find((item) => item.key === expandedKey);
                    if (!month) return null;

                    return (
                      <div className="mt-3 rounded-2xl bg-tint p-3 text-xs">
                        <p className="font-medium">
                          {month.label} {range.start.getFullYear()} · {month.pct == null ? "n/a" : `${month.pct}%`}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {month.taken}/{month.expected} doses taken
                        </p>
                      </div>
                    );
                  })()
                : (() => {
                    const day = perDay.find((item) => item.date === expandedKey);
                    if (!day) return null;

                    return (
                      <div className="mt-3 rounded-2xl bg-tint p-3 text-xs" role="status" aria-live="polite">
                        <p className="font-medium">
                          {fmtDay(day.date)} — {day.taken}/{day.expected} taken
                        </p>

                        {day.takenList.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {day.takenList.map((med) => (
                              <li key={med.key}>
                                <button
                                  type="button"
                                  onClick={() => toggleDose(day.date, med.key)}
                                  className="text-left hover:underline"
                                  style={{ color: "#28A85B" }}
                                  title="Tap to uncheck"
                                >
                                  Taken · {med.time} — {med.medName}
                                  <span className="text-[10px] text-muted-foreground"> · tap to uncheck</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {day.missed.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-muted-foreground">
                            {day.missed.map((med) => (
                              <li key={med.key}>
                                <button
                                  type="button"
                                  onClick={() => toggleDose(day.date, med.key)}
                                  className="text-left hover:underline"
                                  title="Tap to mark taken"
                                >
                                  Missed · {med.time} — {med.medName}
                                  <span className="text-[10px]"> · tap to mark taken</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : day.expected > 0 ? (
                          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                            All doses taken <Ico e="💚" size={13} />
                          </p>
                        ) : null}
                      </div>
                    );
                  })())}
          </div>

          {period === "Y" && (bestMonth || worstMonth) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-tint p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Best month</p>
                <p className="mt-1 text-sm font-semibold">
                  {bestMonth?.label ?? "—"} · {bestMonth?.pct ?? "—"}%
                </p>
              </div>

              <div className="rounded-2xl bg-tint p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Lowest month</p>
                <p className="mt-1 text-sm font-semibold">
                  {worstMonth?.label ?? "—"} · {worstMonth?.pct ?? "—"}%
                </p>
              </div>
            </div>
          )}

          {perMed.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Per medication</p>

              <ul className="space-y-3">
                {perMed.map((med) => {
                  const color = adherenceColor(med.pct);

                  return (
                    <li key={med.id} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 truncate">
                        {med.name}
                        <span className="text-muted-foreground"> {med.time}</span>
                      </span>

                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-tint">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${med.pct}%`,
                            background: color,
                          }}
                        />
                      </div>

                      <span className="w-14 shrink-0 text-right tabular-nums">
                        {med.pct}%
                        <span className="block text-[10px] text-muted-foreground">
                          {med.taken}/{med.expected}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {asNeededCounts.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">As-needed (frequency)</p>

              <ul className="space-y-1 text-xs">
                {asNeededCounts.map((med) => (
                  <li key={med.id} className="flex justify-between gap-3">
                    <span>{med.name}</span>
                    <span className="text-muted-foreground">
                      {med.count}× in this {range.title.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {removedCounts.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Discontinued meds (history)
              </p>

              <ul className="space-y-1 text-xs">
                {removedCounts.map((med) => (
                  <li key={med.id} className="flex justify-between gap-3">
                    <span>{med.name}</span>
                    <span className="text-muted-foreground">
                      {med.count} doses in this {range.title.toLowerCase()}
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

      {allEmpty && emptyMessage ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">{emptyMessage}</p>
      ) : null}
    </div>
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
        const heading = period === "Y" ? fmtTapMonth(i, anchor.getFullYear()) : fmtCoupleTooltipDay(days[i]);
        const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(value)))] ?? "Pain";
        const color = vividPainChartColor(value);

        return {
          owner: "You",
          heading,
          value: `Pain ${value.toFixed(1)}/10`,
          description,
          color,
          summary: `${period === "Y" ? heading : days[i]} · Pain ${value.toFixed(1)}/10 · ${description}`,
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
              const heading =
                period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtCoupleTooltipDay(days[active]);
              const description = HOT_FLASH_DESCRIPTIONS[Math.max(1, Math.min(5, Math.round(value)))] ?? "Hot flash";
              const color = HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))];
              const details: InsightTooltipDetails = {
                owner: "You",
                heading,
                value: `Hot flash ${value.toFixed(1)}/5`,
                description,
                color,
                summary: `${period === "Y" ? heading : days[active]} · Hot flash ${value.toFixed(1)}/5 · ${description}`,
              };

              return (
                <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={details} />
              );
            })()
          : null}
      </div>

    </div>
  );
}

type HeatmapMetric = "pain" | "period" | "bowel" | "panic" | "tetany" | "hotFlashes" | "sleep";

type HeatmapDatum = {
  color: string;
  value: string;
  details: string[];
};

const HEATMAP_OPTIONS: { id: HeatmapMetric; label: string }[] = [
  { id: "pain", label: "Pain" },
  { id: "period", label: "Period" },
  { id: "bowel", label: "Bowel" },
  { id: "panic", label: "Panic episode" },
  { id: "tetany", label: "Tetany episode" },
  { id: "hotFlashes", label: "Hot flashes" },
  { id: "sleep", label: "Sleep" },
];

function heatmapPeriodColor(level?: string | null): string {
  switch (level) {
    case "spotting":
      return "var(--period-spotting)";
    case "light":
      return "var(--period-light)";
    case "medium":
      return "var(--period-medium)";
    case "heavy":
      return "var(--period-heavy)";
    case "very-heavy":
      return "var(--period-veryheavy)";
    default:
      return "var(--period-medium)";
  }
}

function fiveLevelSeverityColor(value: number): string {
  const normalized = ((Math.max(1, Math.min(5, value)) - 1) / 4) * 10;
  return vividPainChartColor(normalized);
}

function sleepHeatmapColor(hours: number): string {
  if (hours < 4) return VIVID_PAIN_CHART_COLORS[10];
  if (hours < 5) return VIVID_PAIN_CHART_COLORS[8];
  if (hours < 6) return VIVID_PAIN_CHART_COLORS[6];
  if (hours < 7) return VIVID_PAIN_CHART_COLORS[4];
  if (hours <= 9) return VIVID_PAIN_CHART_COLORS[0];
  return INSIGHT_COLORS.teal;
}

function YearHealthHeatmap({ data, anchor }: { data: ReturnType<typeof useBixbo>["data"]; anchor: Date }) {
  const [metric, setMetric] = useState<HeatmapMetric>("pain");
  const [active, setActive] = useState<string | null>(null);
  const year = anchor.getFullYear();

  // Do not use the global "tap outside" dismiss hook here. On iOS it fired while
  // the user was scrolling the year grid and made the heatmap feel frozen.
  // The detail card stays open until another cell/metric is chosen or Close is tapped.
  useEffect(() => {
    setActive(null);
  }, [metric, year]);

  const dayNotesFor = useCallback(
    (key: string): string[] =>
      (data.dayNotes[key] ?? [])
        .map((note) => {
          if (typeof note === "string") return note.trim();
          const text = note?.text?.trim();
          if (!text) return "";
          return `${note.time ? `${note.time} · ` : ""}${text}`;
        })
        .filter(Boolean),
    [data.dayNotes],
  );

  const datumFor = useCallback((key: string, selectedMetric: HeatmapMetric): HeatmapDatum | null => {
    const log = data.dayLogs[key];
    if (!log) return null;

    if (selectedMetric === "pain") {
      const entries = (log.pain ?? []).filter((entry) => Number.isFinite(entry.score));
      const value = avgDayPain(log);
      if (value == null || !entries.length) return null;
      return {
        color: vividPainChartColor(value),
        value: `${value.toFixed(1)}/10`,
        details: entries.map((entry) => {
          const pieces = [`${entry.time || "—"} · Pain ${entry.score}/10`];
          if (entry.parts?.length) pieces.push(`Locations: ${entry.parts.join(", ")}`);
          if (entry.quality?.length) pieces.push(`Quality: ${entry.quality.join(", ")}`);
          if (entry.symptoms?.length) pieces.push(`Symptoms: ${entry.symptoms.join(", ")}`);
          if (entry.note?.trim()) pieces.push(`Note: ${entry.note.trim()}`);
          return pieces.join(" · ");
        }),
      };
    }

    if (selectedMetric === "period") {
      const level = log.periodInfo?.level ?? log.period;
      if (!level) return null;
      const info = log.periodInfo;
      const details = ["Logged period flow"];
      if (info?.cramps != null) details.push(`Cramps: ${info.cramps}/10`);
      if (info?.discharge) details.push(`Discharge: ${info.discharge}`);
      if (info?.dischargeNote?.trim()) details.push(`Discharge note: ${info.dischargeNote.trim()}`);
      if (info?.note?.trim()) details.push(`Note: ${info.note.trim()}`);
      return {
        color: heatmapPeriodColor(level),
        value: periodLabel(level) || String(level),
        details,
      };
    }

    if (selectedMetric === "bowel") {
      const entries = (log.bowel ?? []).filter((entry) => {
        const type = Number(entry.bristol);
        return Number.isInteger(type) && type >= 0 && type <= 7;
      });
      if (!entries.length) return null;
      const latest = entries[entries.length - 1];
      const type = Number(latest.bristol);
      const bristol = BRISTOL.find((item) => item.n === type);
      return {
        color: type === 0 ? "#64748B" : bristol?.color ?? INSIGHT_COLORS.sage,
        value: `Type ${type}`,
        details: entries.map((entry) => {
          const parts = [`${entry.time || "—"} · Type ${Number(entry.bristol)}`];
          if (entry.feelings?.length) parts.push(`Feelings: ${entry.feelings.join(", ")}`);
          if (entry.symptoms?.length) parts.push(`Symptoms: ${entry.symptoms.join(", ")}`);
          if (entry.note?.trim()) parts.push(`Note: ${entry.note.trim()}`);
          return parts.join(" · ");
        }),
      };
    }

    if (selectedMetric === "panic") {
      const entries = log.panic ?? [];
      if (!entries.length) return null;
      const highest = Math.max(...entries.map((entry) => entry.intensity));
      return {
        color: vividPainChartColor(highest),
        value: `${highest}/10 highest`,
        details: entries.map((entry) => {
          const parts = [
            `${entry.time || "—"} · ${entry.intensity}/10${entry.minutes != null ? ` · ${entry.minutes} min` : " · ongoing"}`,
          ];
          if (entry.trigger?.trim()) parts.push(`Trigger: ${entry.trigger.trim()}`);
          if (entry.physical?.length) parts.push(`Physical: ${entry.physical.join(", ")}`);
          if (entry.cognitive?.length) parts.push(`Cognitive: ${entry.cognitive.join(", ")}`);
          if (entry.note?.trim()) parts.push(`Note: ${entry.note.trim()}`);
          return parts.join(" · ");
        }),
      };
    }

    if (selectedMetric === "tetany") {
      const entries = log.tetany ?? [];
      if (!entries.length) return null;
      const highest = Math.max(...entries.map((entry) => entry.intensity));
      return {
        color: fiveLevelSeverityColor(highest),
        value: `${highest}/5 highest`,
        details: entries.map((entry) => {
          const parts = [
            `${entry.time || "—"} · ${entry.intensity}/5${entry.minutes != null ? ` · ${entry.minutes} min` : " · ongoing"}`,
          ];
          if (entry.types?.length) parts.push(`Type: ${entry.types.join(", ")}`);
          if (entry.location?.length) parts.push(`Location: ${entry.location.join(", ")}`);
          if (entry.triggers?.length) parts.push(`Triggers: ${entry.triggers.join(", ")}`);
          if (entry.note?.trim()) parts.push(`Note: ${entry.note.trim()}`);
          return parts.join(" · ");
        }),
      };
    }

    if (selectedMetric === "hotFlashes") {
      const entries = (log.pain ?? []).filter(
        (entry) => entry.hotFlashes != null && Number.isFinite(entry.hotFlashes) && entry.hotFlashes > 0,
      );
      if (!entries.length) return null;
      const highest = Math.max(...entries.map((entry) => entry.hotFlashes!));
      return {
        color: fiveLevelSeverityColor(highest),
        value: `${highest}/5 highest`,
        details: entries.map((entry) => {
          const parts = [`${entry.time || "—"} · Hot flashes ${entry.hotFlashes}/5`];
          if (entry.note?.trim()) parts.push(`Note: ${entry.note.trim()}`);
          return parts.join(" · ");
        }),
      };
    }

    const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
    if (hours == null || !Number.isFinite(hours)) return null;
    const details: string[] = [];
    if (log.sleepQuality) {
      details.push(`Quality: ${Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : log.sleepQuality}`);
    }
    if (log.pregnancy?.note?.trim()) details.push(`Pregnancy note: ${log.pregnancy.note.trim()}`);
    if (log.postpartum?.note?.trim()) details.push(`Postpartum note: ${log.postpartum.note.trim()}`);
    if (!details.length) details.push("Sleep duration");
    return {
      color: sleepHeatmapColor(hours),
      value: `${hours.toFixed(1)} h`,
      details,
    };
  }, [data.dayLogs]);

  // Precompute the selected metric once per year/metric. Previously datumFor() was
  // called from every one of the 372 cells on every render, which was noticeably
  // expensive on iPhone when scrolling the Insights page.
  const heatmapData = useMemo<Record<string, HeatmapDatum | null>>(() => {
    const result: Record<string, HeatmapDatum | null> = {};
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const key = toKey(new Date(year, month, day));
        result[key] = datumFor(key, metric);
      }
    }
    return result;
  }, [datumFor, metric, year]);

  const activeDatum = active ? heatmapData[active] ?? null : null;
  const activeMetricLabel = HEATMAP_OPTIONS.find((option) => option.id === metric)?.label ?? "Heatmap";
  const activeDayNotes = active ? dayNotesFor(active) : [];

  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  const legend = (() => {
    if (metric === "period") {
      return [
        ["Spotting", "var(--period-spotting)"],
        ["Light", "var(--period-light)"],
        ["Medium", "var(--period-medium)"],
        ["Heavy", "var(--period-heavy)"],
        ["Very heavy", "var(--period-veryheavy)"],
      ] as const;
    }

    if (metric === "bowel") {
      return [["T0", "#64748B"], ...BRISTOL.map((item) => [`T${item.n}`, item.color] as const)];
    }

    if (metric === "sleep") {
      return [
        ["<4h", VIVID_PAIN_CHART_COLORS[10]],
        ["4–5h", VIVID_PAIN_CHART_COLORS[8]],
        ["5–6h", VIVID_PAIN_CHART_COLORS[6]],
        ["6–7h", VIVID_PAIN_CHART_COLORS[4]],
        ["7–9h", VIVID_PAIN_CHART_COLORS[0]],
        [">9h", INSIGHT_COLORS.teal],
      ] as const;
    }

    return [
      ["Low", vividPainChartColor(1)],
      ["Mild", vividPainChartColor(3)],
      ["Moderate", vividPainChartColor(5)],
      ["High", vividPainChartColor(8)],
      ["Severe", vividPainChartColor(10)],
    ] as const;
  })();

  return (
    <ChartCard title={`Year heatmap — ${year}`}>
      <p className="mt-1 text-xs text-muted-foreground">Choose a metric, then tap a coloured day for its saved details and notes.</p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {HEATMAP_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMetric(option.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
              metric === option.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-tint text-muted-foreground ring-1 ring-border/60"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto overscroll-x-contain pb-2 touch-auto">
        <div
          className="grid w-max items-center gap-1"
          style={{ gridTemplateColumns: "30px repeat(12, 24px)" }}
        >
          <div />
          {MON_SHORT3.map((month) => (
            <div key={month} className="text-center text-[9px] font-semibold text-muted-foreground">
              {month.slice(0, 1)}
            </div>
          ))}

          {Array.from({ length: 31 }, (_, dayIndex) => dayIndex + 1).flatMap((day) => {
            const row: ReactNode[] = [
              <div key={`day-${day}`} className="pr-1 text-right text-[10px] tabular-nums text-muted-foreground">
                {day}
              </div>,
            ];

            for (let month = 0; month < 12; month++) {
              const date = new Date(year, month, day);
              const valid = date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;

              if (!valid) {
                row.push(<div key={`${month}-${day}`} className="h-6 w-6 rounded-[6px] bg-transparent" />);
                continue;
              }

              const key = toKey(date);
              const datum = heatmapData[key] ?? null;
              const isActive = active === key;

              row.push(
                <button
                  key={key}
                  type="button"
                  disabled={!datum}
                  onClick={() => {
                    if (!datum) return;
                    setActive((current) => (current === key ? null : key));
                  }}
                  aria-label={`${fmtTapDay(key)} · ${activeMetricLabel}${datum ? ` · ${datum.value}` : " · no data"}`}
                  aria-pressed={isActive}
                  className={`h-6 w-6 rounded-[6px] transition-transform ${
                    datum ? "touch-auto active:scale-95" : "cursor-default"
                  } ${isActive ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                  style={{ background: datum?.color ?? "var(--tint)" }}
                />,
              );
            }

            return row;
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] bg-tint" /> No data
        </span>
        {legend.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        {active && activeDatum ? "Detail stays open while you scroll. Tap Close when finished." : "Tap a coloured square for details."}
      </p>

      {active && activeDatum ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pb-6 pt-[calc(env(safe-area-inset-top)+5.75rem)]">
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

          <section className="relative z-10 w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-surface shadow-2xl ring-1 ring-border">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p className="font-serif text-xl font-bold text-foreground">{fmtTapDay(active)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{activeMetricLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-base font-semibold text-foreground ring-1 ring-border"
                aria-label="Close heatmap detail"
              >
                ×
              </button>
            </div>

            <div className="max-h-[58dvh] overflow-y-auto overscroll-contain touch-pan-y p-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-tint/70 p-3 ring-1 ring-border/50">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Saved value</span>
                <span
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                  style={{ background: activeDatum.color }}
                >
                  {activeDatum.value}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {activeDatum.details.map((detail, index) => (
                  <div key={index} className="rounded-2xl bg-background/80 px-3 py-2.5 ring-1 ring-border/50">
                    <p className="break-words text-[11px] leading-relaxed text-foreground">{detail}</p>
                  </div>
                ))}

                {activeDayNotes.length ? (
                  <div className="rounded-2xl bg-primary/10 px-3 py-2.5 ring-1 ring-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Day notes</p>
                    {activeDayNotes.map((note, index) => (
                      <p key={index} className="mt-1 break-words text-[11px] leading-relaxed text-foreground">
                        {note}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </ChartCard>
  );
}

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
          {sentence && <p className="mt-3 text-sm text-muted-foreground">{sentence}</p>}
        </>
      )}
    </section>
  );
}