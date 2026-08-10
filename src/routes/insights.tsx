import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { CHART_COLORS } from "@/components/ui/chart";
import { ChartCard, CHART_GRID, useDismissTapTooltip } from "@/components/charts";
import { Ico } from "@/components/icons/BixboIcons";
import { PatternsContent } from "./patterns";
import { useI18n } from "@/hooks/useI18n";
import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";
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
} from "@/lib/storage";

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 30 Jul" style label used across every tap tooltip on this page. */
function fmtTapDay(k: string): string {
  const d = fromKey(k);
  return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT3[d.getMonth()]}`;
}
function fmtTapMonth(monthIndex: number, year: number): string {
  return `$<TrText value={MON_SHORT3[monthIndex]} /> ${year}`;
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
  connectorSide = "bottom",
}: {
  leftPct: number;
  details: InsightTooltipDetails;
  top?: number;
  connectorSide?: "top" | "bottom";
}) {
  const tooltipWidth = 138;
  const tooltipHeight = 58;
  const connectorHeight = 12;
  const bodyOffsetY = connectorSide === "top" ? connectorHeight : 0;
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
        y1={connectorSide === "top" ? connectorHeight : tooltipHeight}
        y2={connectorSide === "top" ? 0 : tooltipHeight + connectorHeight}
        stroke={details.color}
        strokeWidth="1.25"
      />

      <rect
        x="0"
        y={bodyOffsetY}
        width={tooltipWidth}
        height={tooltipHeight}
        rx="9"
        fill="var(--surface)"
        stroke={details.color}
        strokeWidth="1.4"
      />

      <circle cx="11" cy={bodyOffsetY + 12} r="3.5" fill={details.color} />

      <text x="19" y={bodyOffsetY + 15} fontSize="8.5" fontWeight="600" fill="var(--foreground)">
        {heading}
      </text>

      <text x="10" y={bodyOffsetY + 34} fontSize={valueFontSize} fontWeight="700" fill="var(--foreground)">
        {details.value}
      </text>

      {visibleDescription ? (
        <text x="10" y={bodyOffsetY + 49} fontSize={descriptionFontSize} fill="var(--muted-foreground)">
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
  "#72C64A", // 0 — green
  "#91CD3A", // 1
  "#B7D12F", // 2
  "#DFD11F", // 3
  "#F3C30D", // 4 — yellow
  "#F5A20B", // 5 — amber
  "#F47B16", // 6 — orange
  "#F05A28", // 7 — red-orange
  "#EF4444", // 8 — red
  "#DC2626", // 9 — dark red
  "#B91C1C", // 10 — deepest red
] as const;

function vividPainChartColor(value: number): string {
  const index = Math.max(0, Math.min(10, Math.round(value)));
  return VIVID_PAIN_CHART_COLORS[index];
}

const TETANY_COLOR = INSIGHT_COLORS.pinkLight;
const PANIC_COLOR = INSIGHT_COLORS.pinkDeep;

const PAIN_ACCENT = "#DC2626";

const GREEN_SOFT = "rgba(83, 102, 0, 0.08)";
const GREEN_BORDER = "rgba(83, 102, 0, 0.22)";

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


function TrText({ value }: { value: unknown }) {
  const { t, language } = useI18n();
  const raw = String(value ?? "");
  const exact = t(raw);
  if (exact !== raw) return <>{exact}</>;
  if (language !== "sk") return <>{raw}</>;

  let out = raw;
  const exactSk: Record<string, string> = {
    Before: "Pred",
    During: "Počas",
    After: "Po",
    "Very-Heavy": "Veľmi silná",
    "Very heavy": "Veľmi silná",
    Heavy: "Silná",
    Medium: "Stredná",
    Light: "Slabá",
    Spotting: "Špinenie",
    "Overall improvement": "Celkové zlepšenie",
    "Overall worsening": "Celkové zhoršenie",
    "No clear change": "Bez jasnej zmeny",
    "High caffeine (≥200 mg)": "Vysoký príjem kofeínu (≥200 mg)",
    "Tetany episode": "Tetánická epizóda",
    "Hot flash": "Nával tepla",
    "Low energy": "Nízka energia",
    Headache: "Bolesť hlavy",
    "Daily adherence": "Denné dodržiavanie",
    doses: "dávok",
    "logged days": "zaznamenaných dní",
  };
  if (exactSk[out]) return <>{exactSk[out]}</>;

  out = out
    .replace(/^Panic attacks:/, "Panické záchvaty:")
    .replace(/^Medication adherence:/, "Dodržiavanie liekov:")
    .replace(/^Workouts:/, "Cvičenia:")
    .replace(/^Pain: improved/, "Bolesť: zlepšenie")
    .replace(/^Pain: worsened/, "Bolesť: zhoršenie")
    .replace(/^(\d+) logged days$/, "$1 zaznamenaných dní")
    .replace(/^Based on (\d+) logged days in (.+)$/i, "Na základe $1 zaznamenaných dní v $2")
    .replace(/^Based on (\d+) days before and (\d+) days after$/i, "Na základe $1 dní pred a $2 dní po")
    .replace(/^(\d+) before · (\d+) after$/, "$1 pred · $2 po")
    .replace(/^0× in this month$/, "0× v tomto mesiaci")
    .replace(/^(\d+)× in this month$/, "$1× v tomto mesiaci")
    .replace(/^The outcome was (.+) percentage points more common on days with this trigger\.$/, "Výsledok bol o $1 percentuálnych bodov častejší v dňoch s týmto spúšťačom.")
    .replace(/^Based on (\d+) days with and (\d+) days without the trigger\.$/, "Na základe $1 dní so spúšťačom a $2 dní bez spúšťača.")
    .replace(/^Correlations show associations in your logs\. They do not prove that one factor caused another\.$/, "Korelácie ukazujú súvislosti v tvojich záznamoch. Nedokazujú, že jeden faktor spôsobil druhý.")
    .replace(/^This shows an association in your logs, not proof that the selected trigger caused the outcome\.$/, "Toto ukazuje súvislosť v tvojich záznamoch, nie dôkaz, že vybraný spúšťač spôsobil výsledok.")
    .replace(/^Compare how often an outcome occurred on days with and without a possible trigger\.$/, "Porovnaj, ako často sa výsledok objavil v dňoch s možným spúšťačom a bez neho.")
    .replace(/^Automatically ranked associations calculated only from your own logs\.$/, "Automaticky zoradené súvislosti vypočítané iba z tvojich vlastných záznamov.");

  if (out.includes(" → ")) {
    const [a, b] = out.split(" → ");
    return <>{t(a)} → {t(b)}</>;
  }

  return <>{out}</>;
}

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

type Period = "W" | "M" | "Y";
type HeatmapPeriod = "7D" | "30D" | "Y";

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
  if (period === "M") {
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

function scheduledTimeMinutes(time?: string): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Past days count in full. Future days never count.
 * On today, only doses whose scheduled time has already passed count;
 * a dose already marked taken also counts immediately.
 */
function isDoseEligibleNow(dateKey: string, time: string, taken: boolean, now: Date): boolean {
  const today = toKey(now);

  if (dateKey < today) return true;
  if (dateKey > today) return false;
  if (taken) return true;

  const scheduledMinutes = scheduledTimeMinutes(time);
  if (scheduledMinutes == null) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return scheduledMinutes <= nowMinutes;
}


function InsightPeriodSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: Period;
  onChange: (period: Period) => void;
  ariaLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className="grid h-8 w-[210px] grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60"
      role="group"
      aria-label={ariaLabel}
    >
      {([
        ["W", "Week"],
        ["M", "Month"],
        ["Y", "Year"],
      ] as const).map(([period, label]) => {
        const selected = value === period;

        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            aria-pressed={selected}
            className={`min-w-0 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition ${
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(label)}
          </button>
        );
      })}
    </div>
  );
}


function shiftInsightPeriodAnchor(anchor: Date, period: Period, delta: -1 | 1): Date {
  const next = new Date(anchor);
  next.setHours(0, 0, 0, 0);

  if (period === "W") {
    next.setDate(next.getDate() + delta * 7);
    return next;
  }

  if (period === "M") {
    // Use day 1 before changing month so dates like the 31st can never skip a month.
    next.setDate(1);
    next.setMonth(next.getMonth() + delta);
    return next;
  }

  next.setFullYear(next.getFullYear() + delta);
  return next;
}

function insightPeriodNavigationLabel(period: Period, anchor: Date): string {
  if (period === "Y") return String(anchor.getFullYear());

  if (period === "M") {
    return anchor.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }

  const { startK, endK } = rangeFor("W", anchor);
  const start = fromKey(startK);
  const end = fromKey(endK);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = end.toLocaleDateString("en-GB", { month: "short" });

  if (start.getFullYear() !== end.getFullYear()) {
    return `${startDay} ${startMonth} ${start.getFullYear()} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  }

  if (start.getMonth() !== end.getMonth()) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  }

  return `${startDay}–${endDay} ${endMonth} ${end.getFullYear()}`;
}

function InsightPeriodControl({
  value,
  onChange,
  anchor,
  onShift,
  ariaLabel,
}: {
  value: Period;
  onChange: (period: Period) => void;
  anchor: Date;
  onShift: (delta: -1 | 1) => void;
  ariaLabel: string;
}) {
  const unit = value === "W" ? "week" : value === "M" ? "month" : "year";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <InsightPeriodSelect value={value} onChange={onChange} ariaLabel={ariaLabel} />

      <div className="grid h-8 w-[210px] grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60">
        <button
          type="button"
          onClick={() => onShift(-1)}
          className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground"
          aria-label={`Previous ${unit}`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <span className="min-w-0 whitespace-nowrap px-1 text-center text-[10px] font-semibold tabular-nums text-foreground">
          {insightPeriodNavigationLabel(value, anchor)}
        </span>

        <button
          type="button"
          onClick={() => onShift(1)}
          className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground"
          aria-label={`Next ${unit}`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function InsightsPage() {
  const { t } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [overviewView, setOverviewView] = useState<"insights" | "patterns">("insights");

  // One Insights page. Every chart keeps its own Week / Month / Year range
  // AND its own independent date anchor for previous/next navigation.
  const [painPeriod, setPainPeriod] = useState<Period>("M");
  const [hotFlashPeriod, setHotFlashPeriod] = useState<Period>("M");
  const [bowelPeriod, setBowelPeriod] = useState<Period>("M");
  const [timeOfDayPeriod, setTimeOfDayPeriod] = useState<Period>("M");
  const [medsPeriod, setMedsPeriod] = useState<Period>("M");

  const [painAnchor, setPainAnchor] = useState<Date>(() => new Date());
  const [hotFlashAnchor, setHotFlashAnchor] = useState<Date>(() => new Date());
  const [bowelAnchor, setBowelAnchor] = useState<Date>(() => new Date());
  const [timeOfDayAnchor, setTimeOfDayAnchor] = useState<Date>(() => new Date());
  const [medsAnchor, setMedsAnchor] = useState<Date>(() => new Date());

  const periodDays = useCallback((selectedPeriod: Period, selectedAnchor: Date) => {
    const { startK, endK } = rangeFor(selectedPeriod, selectedAnchor);
    return eachDay(startK, endK);
  }, []);

  const painDays = useMemo(
    () => periodDays(painPeriod, painAnchor),
    [painAnchor, painPeriod, periodDays],
  );
  const hotFlashDays = useMemo(
    () => periodDays(hotFlashPeriod, hotFlashAnchor),
    [hotFlashAnchor, hotFlashPeriod, periodDays],
  );
  const bowelDays = useMemo(
    () => periodDays(bowelPeriod, bowelAnchor),
    [bowelAnchor, bowelPeriod, periodDays],
  );
  const timeOfDayDays = useMemo(
    () => periodDays(timeOfDayPeriod, timeOfDayAnchor),
    [periodDays, timeOfDayAnchor, timeOfDayPeriod],
  );

  const painSeries = useMemo(() => painDays.map((k) => avgDayPain(view.dayLogs[k])), [painDays, view.dayLogs]);
  const painAvg = useMemo(() => {
    const nums = painSeries.filter((n): n is number => n != null);
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [painSeries]);

  // Bowel by Bristol type for the selected local period.
  const bowelCounts = useMemo(() => {
    const counts = new Array(8).fill(0) as number[];
    bowelDays.forEach((k) =>
      view.dayLogs[k]?.bowel?.forEach((b) => {
        const bristol = Number(b.bristol);
        if (Number.isInteger(bristol) && bristol >= 0 && bristol <= 7) {
          counts[bristol] = (counts[bristol] ?? 0) + 1;
        }
      }),
    );
    return counts;
  }, [bowelDays, view.dayLogs]);

  // Hot flashes — same values, scale and colours as before, now with its own local period.
  const hfSeries = useMemo(
    () =>
      hotFlashDays.map((k) => {
        const vals = (view.dayLogs[k]?.pain ?? [])
          .map((p) => p.hotFlashes)
          .filter((n): n is number => n != null);
        return vals.length ? Math.max(...vals) : undefined;
      }),
    [hotFlashDays, view.dayLogs],
  );

  const hfCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0] as number[];
    hotFlashDays.forEach((k) =>
      (view.dayLogs[k]?.pain ?? []).forEach((p) => {
        if (p.hotFlashes && p.hotFlashes >= 1 && p.hotFlashes <= 5) counts[p.hotFlashes]++;
      }),
    );
    return counts;
  }, [hotFlashDays, view.dayLogs]);

  const aggregateMonthly = useCallback((keys: string[], series: (number | undefined)[]) => {
    const sums = new Array(12).fill(0) as number[];
    const counts = new Array(12).fill(0) as number[];
    keys.forEach((k, i) => {
      const value = series[i];
      if (value == null) return;
      const monthIndex = Number(k.slice(5, 7)) - 1;
      sums[monthIndex] += value;
      counts[monthIndex]++;
    });
    return sums.map((sum, index) => (counts[index] ? sum / counts[index] : undefined));
  }, []);

  const hfBars = useMemo(
    () => (hotFlashPeriod === "Y" ? aggregateMonthly(hotFlashDays, hfSeries) : hfSeries),
    [aggregateMonthly, hfSeries, hotFlashDays, hotFlashPeriod],
  );

  const hfTotal = hfCounts.reduce((a, b) => a + b, 0);
  const hfAvg = (() => {
    const sum = hfCounts.reduce((acc, count, index) => acc + count * index, 0);
    return hfTotal ? sum / hfTotal : null;
  })();
  const hfTop = (() => {
    let bestLevel = 0;
    let bestCount = 0;
    for (let level = 1; level <= 5; level++) {
      if (hfCounts[level] > bestCount) {
        bestCount = hfCounts[level];
        bestLevel = level;
      }
    }
    return bestLevel;
  })();

  const shiftHeatmapPeriod = (period: HeatmapPeriod, delta: -1 | 1) =>
    setAnchor((current) => {
      const next = new Date(current);
      next.setHours(0, 0, 0, 0);

      if (period === "Y") {
        next.setFullYear(next.getFullYear() + delta);
        return next;
      }

      if (period === "7D") {
        next.setDate(next.getDate() + delta * 7);
        return next;
      }

      // "30 days" navigates by calendar month, so August -> July -> June,
      // without accidental skipping on dates such as the 31st.
      next.setDate(1);
      next.setMonth(next.getMonth() + delta);
      return next;
    });

  return (
    <AppShell title={t("Health of Bixbo")}>
      <div className="px-5 pt-2 lg:px-0">
        <div className="grid grid-cols-2 rounded-2xl bg-tint p-1 ring-1 ring-border/70 lg:mx-auto lg:w-full lg:max-w-[420px]">
          <button
            type="button"
            onClick={() => setOverviewView("insights")}
            className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              overviewView === "insights"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface/70 hover:text-foreground"
            }`}
            aria-pressed={overviewView === "insights"}
          >
            Insights
          </button>
          <button
            type="button"
            onClick={() => setOverviewView("patterns")}
            className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              overviewView === "patterns"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface/70 hover:text-foreground"
            }`}
            aria-pressed={overviewView === "patterns"}
          >
            Patterns
          </button>
        </div>
      </div>

      {overviewView === "patterns" ? (
        <PatternsContent />
      ) : (
        <div className="space-y-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2">
        <YearHealthHeatmap
          data={view}
          anchor={anchor}
          onShiftPeriod={(period, delta) => shiftHeatmapPeriod(period, delta)}
        />

        <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Pain scale")}</p>
            <InsightPeriodControl
              value={painPeriod}
              onChange={setPainPeriod}
              anchor={painAnchor}
              onShift={(delta) =>
                setPainAnchor((current) => shiftInsightPeriodAnchor(current, painPeriod, delta))
              }
              ariaLabel="Pain scale period"
            />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl leading-none">
              {painAvg != null ? painAvg.toFixed(1) : "–"}
            </span>
            <span className="text-sm text-muted-foreground">
              avg · {painSeries.filter((n) => n != null).length}{" "}
              {painSeries.filter((n) => n != null).length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <PainChart
            key={`pain-${painPeriod}-${toKey(painAnchor)}`}
            period={painPeriod}
            days={painDays}
            series={painSeries}
            anchor={painAnchor}
          />
        </section>

        <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Hot flashes")}</p>
            <InsightPeriodControl
              value={hotFlashPeriod}
              onChange={setHotFlashPeriod}
              anchor={hotFlashAnchor}
              onShift={(delta) =>
                setHotFlashAnchor((current) => shiftInsightPeriodAnchor(current, hotFlashPeriod, delta))
              }
              ariaLabel="Hot flashes period"
            />
          </div>

          {hfTotal ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-4xl leading-none">{hfTotal}</span>
                <span className="text-sm text-muted-foreground">
                  {hfTotal === 1 ? "episode" : "episodes"} · avg {hfAvg!.toFixed(1)}/5 · most often L{hfTop}
                </span>
              </div>

              <HfBars
                key={`hot-flashes-${hotFlashPeriod}-${toKey(hotFlashAnchor)}`}
                bars={hfBars}
                period={hotFlashPeriod}
                days={hotFlashDays}
                anchor={hotFlashAnchor}
              />

              <div className="mt-3 space-y-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const count = hfCounts[n];
                  const pct = hfTotal ? (count / hfTotal) * 100 : 0;
                  const color = HOT_FLASH_COLORS[n];

                  return (
                    <div key={n} className="flex items-center gap-2 text-[10px]">
                      <span
                        className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {n}
                      </span>
                      <span className="w-16 shrink-0 text-muted-foreground">
                        {HOT_FLASH_DESCRIPTIONS[n]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("No hot flashes logged")}</p>
          )}
        </section>

        <BristolChart
          bowelCounts={bowelCounts}
          period={bowelPeriod}
          anchor={bowelAnchor}
          onPeriodChange={setBowelPeriod}
          onPeriodShift={(delta) =>
            setBowelAnchor((current) => shiftInsightPeriodAnchor(current, bowelPeriod, delta))
          }
        />

        <TimeOfDayPatternChart
          data={view}
          days={timeOfDayDays}
          period={timeOfDayPeriod}
          anchor={timeOfDayAnchor}
          onPeriodChange={setTimeOfDayPeriod}
          onPeriodShift={(delta) =>
            setTimeOfDayAnchor((current) => shiftInsightPeriodAnchor(current, timeOfDayPeriod, delta))
          }
        />

        <MedsAdherence
          data={view}
          period={medsPeriod}
          anchor={medsAnchor}
          onPeriodChange={setMedsPeriod}
          onPeriodShift={(delta) =>
            setMedsAnchor((current) => shiftInsightPeriodAnchor(current, medsPeriod, delta))
          }
        />
        </div>
      )}
    </AppShell>
  );
}

function MedsAdherence({
  data,
  period,
  anchor,
  onPeriodChange,
  onPeriodShift,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const { update } = useBixbo();
  const [open, setOpen] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    setExpandedKey(null);
  }, [period, anchor]);

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
      label: `1 Jan – 31 Dec ${base.getFullYear()}`,
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

  const adherenceNow = new Date();

  const perDay = useMemo(
    () =>
      days.map((date) => {
        const missed: { medName: string; time: string; key: string }[] = [];
        const takenList: { medName: string; time: string; key: string }[] = [];
        let expected = 0;
        let taken = 0;

        scheduled.forEach((med) => {
          med.times.forEach((time) => {
            const key = `${med.id}@${time}`;
            const isTaken = !!data.medLog[date]?.[key];

            if (!isDoseEligibleNow(date, time, isTaken, adherenceNow)) return;

            expected += 1;

            if (isTaken) {
              taken += 1;
              takenList.push({ medName: med.name, time, key });
            } else {
              missed.push({ medName: med.name, time, key });
            }
          });
        });

        return {
          date,
          expected,
          taken,
          missed,
          takenList,
          pct: expected ? Math.round((taken / expected) * 100) : null,
        };
      }),
    [
      data.medLog,
      days,
      scheduled,
      adherenceNow.getFullYear(),
      adherenceNow.getMonth(),
      adherenceNow.getDate(),
      adherenceNow.getHours(),
      adherenceNow.getMinutes(),
    ],
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
            let expected = 0;
            let taken = 0;

            days.forEach((date) => {
              const key = `${med.id}@${time}`;
              const isTaken = !!data.medLog[date]?.[key];

              if (!isDoseEligibleNow(date, time, isTaken, adherenceNow)) return;

              expected += 1;
              if (isTaken) taken += 1;
            });

            const pct = expected ? Math.round((taken / expected) * 100) : null;

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
        .filter((entry) => entry.expected > 0)
        .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
    [
      data.medLog,
      days,
      scheduled,
      adherenceNow.getFullYear(),
      adherenceNow.getMonth(),
      adherenceNow.getDate(),
      adherenceNow.getHours(),
      adherenceNow.getMinutes(),
    ],
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
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-start justify-between text-left"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Meds adherence")}</p>
            <p className="mt-1 truncate text-[11px] font-medium text-foreground">
              {range.title} · {range.label}
            </p>
          </div>

          <span className="ml-2 shrink-0 pt-0.5 text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
        </button>

        <InsightPeriodControl
          value={period}
          onChange={onPeriodChange}
          anchor={anchor}
          onShift={onPeriodShift}
          ariaLabel="Meds adherence period"
        />
      </div>

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
            <p className="mt-4 text-sm text-muted-foreground">{t("No scheduled meds in this period.")}</p>
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
                <span key={t(item.label)} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded" style={{ background: item.color }} />
                  {t(item.label)}
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
                                  title={t("Tap to uncheck")}
                                >
                                  Taken · {med.time} — {med.medName}
                                  <span className="text-[10px] text-muted-foreground"> · {t("tap to uncheck")}</span>
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
                                  title={t("Tap to mark taken")}
                                >
                                  Missed · {med.time} — {med.medName}
                                  <span className="text-[10px]"> · {t("tap to mark taken")}</span>
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Best month")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {bestMonth?.label ?? "—"} · {bestMonth?.pct ?? "—"}%
                </p>
              </div>

              <div className="rounded-2xl bg-tint p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Lowest month")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {worstMonth?.label ?? "—"} · {worstMonth?.pct ?? "—"}%
                </p>
              </div>
            </div>
          )}

          {perMed.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("Per medication")}</p>

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
                            width: `${med.pct ?? 0}%`,
                            background: color,
                          }}
                        />
                      </div>

                      <span className="w-14 shrink-0 text-right tabular-nums">
                        {med.pct ?? 0}%
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
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("As-needed (frequency)")}</p>

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
                {t("Discontinued meds (history)")}
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
    <div className="mt-4 rounded-2xl bg-background/55 px-3 py-3 ring-1 ring-border/40">
      <div className="flex gap-1">
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
          className="grid flex-1 gap-[2px] text-center text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}
        >
          {bars.map((bar, index) => (
            <div key={index} className="leading-tight">
              <div className="tabular-nums">{bar.label}</div>
              {bar.sub ? <div className="text-[10px] tabular-nums opacity-70">{bar.sub}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {(axisLabel || periodLabel) && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{axisLabel}</span>
          <span><TrText value={periodLabel} /></span>
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

function BristolChart({
  bowelCounts,
  period,
  anchor,
  onPeriodChange,
  onPeriodShift,
}: {
  bowelCounts: number[];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));

  useEffect(() => {
    setActive(null);
  }, [anchor, period]);
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
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Bowel")}</p>
        <InsightPeriodControl
          value={period}
          onChange={onPeriodChange}
          anchor={anchor}
          onShift={onPeriodShift}
          ariaLabel="Bowel period"
        />
      </div>

      <div className="relative mt-3 flex items-end gap-2">
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
                summary: `${t(item.label)} · ${count} ${count === 1 ? "entry" : "entries"} · ${item.sub}`,
              };

              return <InsightFloatingTooltip leftPct={((active + 0.5) / chartTypes.length) * 100} details={details} />;
            })()
          : null}
      </div>

    </section>
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
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);

  useDismissTapTooltip(() => setActive(null));

  return (
    <div>
      <div
        className="relative grid items-end gap-1 pt-5"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`,
          height: 82,
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

type HeatmapMetric = "pain" | "period" | "bowel" | "panic" | "tetany" | "hotFlashes" | "sleep" | `custom:${string}:${string}`;

type HeatmapDatum = {
  /** CSS background for the heatmap mark. May be a gradient (Bowel Type 0). */
  color: string;
  /** Solid colour used by the SVG popup border/dot. */
  tooltipColor: string;
  /** Compact value used by accessibility labels/legend context. */
  value: string;
  /** Main value text shown inside the small floating popup. */
  popupValue: string;
  /** Short secondary line shown inside the small floating popup. */
  description: string;
  /** Number of source entries represented by the daily value. */
  entryCount: number;
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

function YearHealthHeatmap({
  data,
  anchor,
  onShiftPeriod,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  anchor: Date;
  onShiftPeriod: (period: HeatmapPeriod, delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const availableHeatmapOptions = useMemo(() => {
    const builtins = HEATMAP_OPTIONS
      .filter((option) => isRegistrySurfaceEnabled(data, option.id as RegistryFeatureId, "heatmap"))
      .map((option) => ({ ...option, label: getRegistryFeature(data, option.id as RegistryFeatureId).label }));
    const customs = customLogDefinitions(data).flatMap((log) => {
      if (!log.heatmapFieldId) return [];
      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));
      if (!field) return [];
      return [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }];
    });
    return [...builtins, ...customs];
  }, [data]);
  const [metric, setMetric] = useState<HeatmapMetric>("pain");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (availableHeatmapOptions.some((option) => option.id === metric)) return;
    const fallback = availableHeatmapOptions[0]?.id;
    if (fallback) setMetric(fallback);
  }, [availableHeatmapOptions, metric]);

  // Heatmap always opens on Year, exactly as requested.
  const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>("Y");
  const year = anchor.getFullYear();

  useEffect(() => {
    setActive(null);
  }, [anchor, heatmapPeriod, metric]);

  const datumFor = useCallback(
    (key: string, selectedMetric: HeatmapMetric): HeatmapDatum | null => {
      const log = data.dayLogs[key];
      if (!log) return null;

      if (selectedMetric.startsWith("custom:")) {
        const [, logId, fieldId] = selectedMetric.split(":");
        const definition = customLogDefinitions(data).find((item) => item.id === logId);
        const field = definition?.fields.find((item) => item.id === fieldId);
        const entries = log.customLogs?.[logId] ?? [];
        const values = entries.map((entry) => Number(entry.values[fieldId])).filter((value) => Number.isFinite(value));
        if (!definition || !field || !values.length) return null;
        const value = values.reduce((sum, item) => sum + item, 0) / values.length;
        const min = field.scale?.min ?? Math.min(...values, 0);
        const max = field.scale?.max ?? Math.max(...values, 10);
        const span = Math.max(0.0001, max - min);
        const normalized = Math.max(0, Math.min(10, ((value - min) / span) * 10));
        return { color: vividPainChartColor(normalized), tooltipColor: vividPainChartColor(normalized), value: Number.isInteger(value) ? String(value) : value.toFixed(1), popupValue: `${field.label} · ${Number.isInteger(value) ? value : value.toFixed(1)}`, description: definition.label, entryCount: values.length };
      }

      if (selectedMetric === "pain") {
        const entries = (log.pain ?? []).filter((entry) => Number.isFinite(entry.score));
        if (!entries.length) return null;

        const value = entries.reduce((sum, entry) => sum + Number(entry.score), 0) / entries.length;
        const rounded = Math.max(0, Math.min(10, Math.round(value)));

        return {
          color: vividPainChartColor(value),
          tooltipColor: vividPainChartColor(value),
          value: `${value.toFixed(1)}/10`,
          popupValue: entries.length > 1 ? `Pain avg ${value.toFixed(1)}/10` : `Pain ${value.toFixed(1)}/10`,
          description: PAIN_DESCRIPTIONS[rounded] ?? "Pain",
          entryCount: entries.length,
        };
      }

      if (selectedMetric === "period") {
        const level = log.periodInfo?.level ?? log.period;
        if (!level) return null;

        return {
          color: heatmapPeriodColor(level),
          tooltipColor: heatmapPeriodColor(level),
          value: periodLabel(level) || String(level),
          popupValue: `Period · ${periodLabel(level) || String(level)}`,
          description: "Logged period flow",
          entryCount: 1,
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
        const typeZero = type === 0;

        return {
          color: typeZero ? BRISTOL_MYSTERY_COLOR : bristol?.color ?? INSIGHT_COLORS.sage,
          tooltipColor: typeZero ? "#8B5CF6" : bristol?.color ?? INSIGHT_COLORS.sage,
          value: `Type ${type}`,
          popupValue: `Bowel · Type ${type}`,
          description: typeZero ? "Type 0" : bristol?.sub ?? "Bowel entry",
          entryCount: entries.length,
        };
      }

      if (selectedMetric === "panic") {
        const entries = (log.panic ?? []).filter((entry) => Number.isFinite(entry.intensity));
        if (!entries.length) return null;

        const value = entries.reduce((sum, entry) => sum + Number(entry.intensity), 0) / entries.length;
        const firstTrigger = entries.find((entry) => entry.trigger?.trim())?.trigger?.trim();

        return {
          color: vividPainChartColor(value),
          tooltipColor: vividPainChartColor(value),
          value: `${value.toFixed(1)}/10 avg`,
          popupValue: entries.length > 1 ? `Panic avg ${value.toFixed(1)}/10` : `Panic ${value.toFixed(1)}/10`,
          description: firstTrigger ? `Trigger: ${firstTrigger}` : "Panic episode",
          entryCount: entries.length,
        };
      }

      if (selectedMetric === "tetany") {
        const entries = (log.tetany ?? []).filter((entry) => Number.isFinite(entry.intensity));
        if (!entries.length) return null;

        const value = entries.reduce((sum, entry) => sum + Number(entry.intensity), 0) / entries.length;
        const firstType = entries.find((entry) => entry.types?.length)?.types?.join(", ");

        return {
          color: fiveLevelSeverityColor(value),
          tooltipColor: fiveLevelSeverityColor(value),
          value: `${value.toFixed(1)}/5 avg`,
          popupValue: entries.length > 1 ? `Tetany avg ${value.toFixed(1)}/5` : `Tetany ${value.toFixed(1)}/5`,
          description: firstType ? `Type: ${firstType}` : "Tetany episode",
          entryCount: entries.length,
        };
      }

      if (selectedMetric === "hotFlashes") {
        const entries = (log.pain ?? []).filter(
          (entry) => entry.hotFlashes != null && Number.isFinite(entry.hotFlashes) && entry.hotFlashes > 0,
        );
        if (!entries.length) return null;

        const value = entries.reduce((sum, entry) => sum + Number(entry.hotFlashes), 0) / entries.length;
        const rounded = Math.max(1, Math.min(5, Math.round(value)));

        return {
          color: fiveLevelSeverityColor(value),
          tooltipColor: fiveLevelSeverityColor(value),
          value: `${value.toFixed(1)}/5 avg`,
          popupValue:
            entries.length > 1 ? `Hot flashes avg ${value.toFixed(1)}/5` : `Hot flashes ${value.toFixed(1)}/5`,
          description: HOT_FLASH_DESCRIPTIONS[rounded] ?? "Hot flashes",
          entryCount: entries.length,
        };
      }

      const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;
      if (hours == null || !Number.isFinite(hours)) return null;

      const quality = log.sleepQuality
        ? Array.isArray(log.sleepQuality)
          ? log.sleepQuality.join(", ")
          : String(log.sleepQuality)
        : "";

      return {
        color: sleepHeatmapColor(hours),
        tooltipColor: sleepHeatmapColor(hours),
        value: `${hours.toFixed(1)} h`,
        popupValue: `Sleep ${hours.toFixed(1)} h`,
        description: quality ? `Quality: ${quality}` : "Sleep duration",
        entryCount: 1,
      };
    },
    [data],
  );

  const compactDays = useMemo(() => {
    if (heatmapPeriod === "Y") return [] as string[];

    if (heatmapPeriod === "7D") {
      const { startK, endK } = rangeFor("W", anchor);
      return eachDay(startK, endK);
    }

    const { startK, endK } = rangeFor("M", anchor);
    return eachDay(startK, endK);
  }, [anchor, heatmapPeriod]);

  const heatmapNavigationLabel = useMemo(() => {
    if (heatmapPeriod === "Y") return String(year);

    if (heatmapPeriod === "30D") {
      return anchor.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });
    }

    if (!compactDays.length) return "";

    const start = fromKey(compactDays[0]);
    const end = fromKey(compactDays[compactDays.length - 1]);

    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString("en-GB", { month: "short" });
    const endMonth = end.toLocaleDateString("en-GB", { month: "short" });

    if (start.getFullYear() !== end.getFullYear()) {
      return `${startDay} ${startMonth} ${start.getFullYear()} – ${endDay} ${endMonth} ${end.getFullYear()}`;
    }

    if (start.getMonth() !== end.getMonth()) {
      return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.getFullYear()}`;
    }

    return `${startDay}–${endDay} ${endMonth} ${end.getFullYear()}`;
  }, [anchor, compactDays, heatmapPeriod, year]);

  const heatmapData = useMemo<Record<string, HeatmapDatum | null>>(() => {
    const result: Record<string, HeatmapDatum | null> = {};

    if (heatmapPeriod === "Y") {
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const key = toKey(new Date(year, month, day));
          result[key] = datumFor(key, metric);
        }
      }

      return result;
    }

    compactDays.forEach((key) => {
      result[key] = datumFor(key, metric);
    });

    return result;
  }, [compactDays, datumFor, heatmapPeriod, metric, year]);

  // On a phone, 53 weekly columns cannot be both large enough to read and fit in one row.
  // Split the same full-year heatmap into two stacked half-year strips so every daily dot
  // stays visible while all Jan–Dec data remains on the same Year screen.
  const halfYearGrids = useMemo(() => {
    const makeHalf = (startMonth: number, endMonth: number) => {
      const periodStart = new Date(year, startMonth, 1);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(year, endMonth + 1, 0);
      periodEnd.setHours(0, 0, 0, 0);

      const first = new Date(periodStart);
      first.setDate(first.getDate() - ((first.getDay() + 6) % 7));

      const last = new Date(periodEnd);
      last.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));

      const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const weekCount = Math.round((utcDay(last) - utcDay(first)) / 86400000 / 7) + 1;

      const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
        Array.from({ length: 7 }, (_, weekdayIndex) => {
          const date = new Date(first);
          date.setDate(first.getDate() + weekIndex * 7 + weekdayIndex);
          return date;
        }),
      );

      const months = Array.from({ length: endMonth - startMonth + 1 }, (_, offset) => {
        const monthIndex = startMonth + offset;
        const monthStart = new Date(year, monthIndex, 1);
        const weekIndex = Math.floor((utcDay(monthStart) - utcDay(first)) / 86400000 / 7);
        return { label: MON_SHORT3[monthIndex], weekIndex, monthIndex };
      });

      return { startMonth, endMonth, weeks, months, weekCount };
    };

    return [makeHalf(0, 5), makeHalf(6, 11)];
  }, [year]);

  const activeMetricLabel = availableHeatmapOptions.find((option) => option.id === metric)?.label ?? "Heatmap";
  const activeDatum = active ? heatmapData[active] ?? null : null;

  const activePosition = useMemo(() => {
    if (!active || heatmapPeriod !== "Y") return null;

    for (let halfIndex = 0; halfIndex < halfYearGrids.length; halfIndex++) {
      const half = halfYearGrids[halfIndex];
      for (let weekIndex = 0; weekIndex < half.weeks.length; weekIndex++) {
        const weekdayIndex = half.weeks[weekIndex].findIndex((date) => toKey(date) === active);
        if (weekdayIndex >= 0) return { halfIndex, weekIndex, weekdayIndex };
      }
    }

    return null;
  }, [active, halfYearGrids, heatmapPeriod]);

  const compactActivePosition = useMemo(() => {
    if (!active || heatmapPeriod === "Y") return null;

    const index = compactDays.indexOf(active);
    if (index < 0) return null;

    return {
      index,
      row: Math.floor(index / 7),
      column: index % 7,
    };
  }, [active, compactDays, heatmapPeriod]);

  const compactTooltipLayout = useMemo(() => {
    if (!compactActivePosition) return null;

    const rowHeight = 49;
    const gridTop = 78;
    const selectedCenterY = gridTop + compactActivePosition.row * rowHeight + 22;
    const showBelow = compactActivePosition.row === 0;

    return {
      leftPct: ((compactActivePosition.column + 0.5) / 7) * 100,
      top: showBelow ? selectedCenterY + 5 : Math.max(2, selectedCenterY - 72),
      connectorSide: (showBelow ? "top" : "bottom") as "top" | "bottom",
    };
  }, [compactActivePosition]);

  const activeTooltip = useMemo<InsightTooltipDetails | null>(() => {
    if (!active || !activeDatum) return null;

    const entryText =
      activeDatum.entryCount > 1
        ? `${activeDatum.entryCount} entries`
        : activeDatum.entryCount === 1
          ? "1 entry"
          : "";

    return {
      owner: "You",
      heading: fmtTapDay(active),
      value: activeDatum.popupValue,
      description: [entryText, activeDatum.description].filter(Boolean).join(" · "),
      color: activeDatum.tooltipColor,
      summary: `You · ${fmtTapDay(active)} · ${activeDatum.popupValue}${entryText ? ` · ${entryText}` : ""}`,
    };
  }, [active, activeDatum]);

  const activeTooltipLayout = useMemo(() => {
    if (!activePosition) return null;

    const rowStep = 25;
    const gridTop = 24;
    const dotCenterOffset = 5.5;
    const tooltipTotalHeight = 70;
    const connectorGap = 5;
    const selectedCenterY = gridTop + dotCenterOffset + activePosition.weekdayIndex * rowStep;
    const showBelow = activePosition.weekdayIndex <= 2;

    return {
      top: showBelow
        ? selectedCenterY + connectorGap
        : Math.max(0, selectedCenterY - tooltipTotalHeight - connectorGap),
      connectorSide: (showBelow ? "top" : "bottom") as "top" | "bottom",
    };
  }, [activePosition]);

  const legend = (() => {
    if (metric.startsWith("custom:")) {
      return [["Low", vividPainChartColor(0)], ["Mild", vividPainChartColor(2.5)], ["Moderate", vividPainChartColor(5)], ["High", vividPainChartColor(7.5)], ["Severe", vividPainChartColor(10)]] as const;
    }
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
      return [["T0", BRISTOL_MYSTERY_COLOR], ...BRISTOL.filter((item) => item.n !== 0).map((item) => [`T${item.n}`, item.color] as const)];
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
    <ChartCard title={t("Heatmap")}>
      <div className="-mt-6 mb-1 flex flex-col items-end gap-1">
        <div
          className="grid h-8 w-[210px] grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60"
          role="group"
          aria-label={t("Heatmap period")}
        >
          {([
            ["7D", "Week"],
            ["30D", "Month"],
            ["Y", "Year"],
          ] as const).map(([value, label]) => {
            const selected = heatmapPeriod === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setHeatmapPeriod(value)}
                aria-pressed={selected}
                className={`min-w-0 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(label)}
              </button>
            );
          })}
        </div>

        <div className="grid h-8 w-[210px] grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60">
          <button
            type="button"
            onClick={() => onShiftPeriod(heatmapPeriod, -1)}
            className="grid h-7 w-7 place-self-center place-items-center rounded-lg transition hover:bg-tint"
            aria-label={`Previous ${heatmapPeriod === "Y" ? "year" : heatmapPeriod === "7D" ? "week" : "month"}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-0 whitespace-nowrap px-1 text-center text-[10px] font-semibold tabular-nums">
            {heatmapNavigationLabel}
          </span>
          <button
            type="button"
            onClick={() => onShiftPeriod(heatmapPeriod, 1)}
            className="grid h-7 w-7 place-self-center place-items-center rounded-lg transition hover:bg-tint"
            aria-label={`Next ${heatmapPeriod === "Y" ? "year" : heatmapPeriod === "7D" ? "week" : "month"}`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground"><TrText value="Choose a metric, then tap a coloured day for its saved average/details." /></p>

      <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
        {availableHeatmapOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMetric(option.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              metric === option.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-tint text-muted-foreground ring-1 ring-border/60"
            }`}
          >
            {t(option.label)}
          </button>
        ))}
      </div>

      <div className="mt-3 -mx-3 rounded-[1.5rem] bg-background/55 px-2.5 py-3 ring-1 ring-border/60 sm:mx-0 sm:p-3">
        {heatmapPeriod === "Y" ? (
          <div className="space-y-6">
            {halfYearGrids.map((half, halfIndex) => {
            const boundaryWeeks = new Set(
              half.months.map(({ weekIndex }) => weekIndex).filter((weekIndex) => weekIndex > 0),
            );
            const hasActive = activePosition?.halfIndex === halfIndex;

            return (
              <div key={`${half.startMonth}-${half.endMonth}`} className="relative min-w-0 overflow-visible">
                {hasActive && activeTooltip && activePosition && activeTooltipLayout ? (
                  <InsightFloatingTooltip
                    leftPct={10 + ((activePosition.weekIndex + 0.5) / Math.max(1, half.weekCount)) * 88}
                    details={activeTooltip}
                    top={activeTooltipLayout.top}
                    connectorSide={activeTooltipLayout.connectorSide}
                  />
                ) : null}

                <div className="flex gap-2">
                  <div className="w-[28px] shrink-0 pt-[24px]">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
                      <div
                        key={weekday}
                        className="flex h-[25px] items-center text-[10px] font-medium text-muted-foreground"
                      >
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="relative mb-1.5 h-[18px]" aria-hidden="true">
                      {half.months.map(({ label, weekIndex }) => (
                        <span
                          key={label}
                          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-foreground/80"
                          style={{ left: `${((weekIndex + 0.5) / Math.max(1, half.weekCount)) * 100}%` }}
                        ><TrText value={label} /></span>
                      ))}
                    </div>

                    <div
                      className="grid w-full"
                      style={{
                        gridTemplateColumns: `repeat(${half.weekCount}, 10px)`,
                        columnGap: "1px",
                        justifyContent: "space-between",
                      }}
                    >
                      {half.weeks.map((week, weekIndex) => {
                        const isMonthBoundary = boundaryWeeks.has(weekIndex);

                        return (
                          <div key={weekIndex} className="relative grid shrink-0 grid-rows-7 gap-y-[14px]">
                            {isMonthBoundary ? (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -left-[2px] inset-y-[-3px] w-px rounded-full bg-primary/30"
                              />
                            ) : null}

                            {week.map((date) => {
                              const inHalf =
                                date.getFullYear() === year &&
                                date.getMonth() >= half.startMonth &&
                                date.getMonth() <= half.endMonth;

                              if (!inHalf) {
                                return (
                                  <span
                                    key={date.toISOString()}
                                    className="h-[11px] w-[11px] -translate-x-[0.5px] rounded-full bg-transparent"
                                  />
                                );
                              }

                              const key = toKey(date);
                              const datum = heatmapData[key] ?? null;
                              const isActive = active === key;

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={!datum}
                                  onClick={(event) => {
                                    if (!datum) return;
                                    event.stopPropagation();
                                    setActive((current) => (current === key ? null : key));
                                  }}
                                  aria-label={`${fmtTapDay(key)} · ${activeMetricLabel}${
                                    datum ? ` · ${datum.value}` : " · no data"
                                  }`}
                                  aria-pressed={isActive}
                                  className={`h-[11px] w-[11px] -translate-x-[0.5px] rounded-full transition-transform ${
                                    datum ? "touch-manipulation active:scale-125" : "cursor-default"
                                  } ${isActive ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                                  style={{ background: datum?.color ?? "var(--tint)" }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="relative min-h-[158px] pt-[78px]">
            {activeTooltip && compactTooltipLayout ? (
              <InsightFloatingTooltip
                leftPct={compactTooltipLayout.leftPct}
                details={activeTooltip}
                top={compactTooltipLayout.top}
                connectorSide={compactTooltipLayout.connectorSide}
              />
            ) : null}

            <div className="grid grid-cols-7 gap-x-2 gap-y-3">
              {compactDays.map((key) => {
                const date = fromKey(key);
                const datum = heatmapData[key] ?? null;
                const isActive = active === key;

                return (
                  <div key={key} className="flex min-w-0 flex-col items-center">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {date.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
                      {date.getDate()}
                    </span>

                    <button
                      type="button"
                      disabled={!datum}
                      onClick={(event) => {
                        if (!datum) return;
                        event.stopPropagation();
                        setActive((current) => (current === key ? null : key));
                      }}
                      aria-label={`${fmtTapDay(key)} · ${activeMetricLabel}${
                        datum ? ` · ${datum.value}` : " · no data"
                      }`}
                      aria-pressed={isActive}
                      className={`mt-1 h-[14px] w-[14px] rounded-full transition-transform ${
                        datum ? "touch-manipulation active:scale-125" : "cursor-default"
                      } ${isActive ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                      style={{ background: datum?.color ?? "var(--tint)" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-tint" />
            {t("No data")}
          </span>

          {legend.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full" style={{ background: color }} /><TrText value={label} /></span>
          ))}
        </div>

        {activeTooltip ? (
          <button
            type="button"
            onClick={() => setActive(null)}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary/15 px-3 py-2.5 text-left ring-1 ring-primary/10"
          >
            <span className="min-w-0 truncate text-[10px] font-medium text-foreground">
              {activeTooltip.summary}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{t("Tap to close")}</span>
          </button>
        ) : (
          <p className="mt-2.5 text-center text-[10px] text-muted-foreground">
            Tap any coloured day for details.
          </p>
        )}
      </div>
    </ChartCard>
  );
}


function TimeOfDayPatternChart({
  data,
  days,
  period,
  anchor,
  onPeriodChange,
  onPeriodShift,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  days: string[];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t, language } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  useDismissTapTooltip(() => setActive(null));

  useEffect(() => {
    setActive(null);
  }, [anchor, period]);

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
    const tetanyTop = topOf(tetanyBlocks, tetanyTotal);
    const panicTop = topOf(panicBlocks, panicTotal);
    const blockName = (i: number) => t(TIME_BLOCK_SHORT[i]);
    const blockHours = (i: number) => TIME_BLOCK_LABELS[i].split(" ")[1];
    if (language === "sk") {
      if (tetanyTop && panicTop) {
        return `Tetánia sa najčastejšie vyskytuje v časti dňa ${blockName(tetanyTop.i).toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct} % prípadov), zatiaľ čo panické záchvaty vrcholia v časti dňa ${blockName(panicTop.i).toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct} % prípadov).`;
      }
      if (tetanyTop) return `Tetánia sa najčastejšie vyskytuje v časti dňa ${blockName(tetanyTop.i).toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct} % prípadov).`;
      if (panicTop) return `Panické záchvaty sa najčastejšie vyskytujú v časti dňa ${blockName(panicTop.i).toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct} % prípadov).`;
    }
    if (tetanyTop && panicTop) {
      return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[tetanyTop.i].toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct}% of cases), while panic attacks peak in the ${TIME_BLOCK_SHORT[panicTop.i].toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct}% of cases).`;
    }
    if (tetanyTop) return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[tetanyTop.i].toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct}% of cases).`;
    if (panicTop) return `Panic attacks occur most often in the ${TIME_BLOCK_SHORT[panicTop.i].toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct}% of cases).`;
    return null;
  })();

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Time of Day Pattern")}</p>
        <InsightPeriodControl
          value={period}
          onChange={onPeriodChange}
          anchor={anchor}
          onShift={onPeriodShift}
          ariaLabel="Time of day pattern period"
        />
      </div>

      {!tetanyTotal && !panicTotal ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("Not enough data yet")}</p>
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
            className="relative mt-4 grid grid-cols-4 items-end gap-3"
            style={{ height: 110 }}
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
          <div className="mt-1 grid grid-cols-4 gap-3 text-center text-[10px] text-muted-foreground">
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
