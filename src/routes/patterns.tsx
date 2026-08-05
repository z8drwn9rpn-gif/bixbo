import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Brain,
  Dumbbell,
  Flame,
  HeartPulse,
  ChevronDown,
  Moon,
  Pill,
  Scale,
  Sparkles,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { EMPTY, addDays, avgDayPain, todayKey, useBixbo, type DayLog } from "@/lib/storage";
import {
  avg,
  dayBowelSymptoms,
  dayEnergy,
  dayHeadacheIntensity,
  dayHotFlash,
  dayPanicIntensity,
  dayPressureIntensity,
  dayTetanyIntensity,
  daysOfMonth,
  historicCycles,
  negativeMoodCount,
  phaseAvg,
  phaseDays,
  phaseFlowMode,
  thisAndLastMonthPrefixes,
} from "@/lib/patterns";

export const Route = createFileRoute("/patterns")({
  head: () => ({
    meta: [
      {
        title: "Health of Bixbo — Bixbo Patterns",
      },
      {
        name: "description",
        content: "Compare cycle phases, monthly health changes, treatments and possible symptom triggers.",
      },
      {
        property: "og:title",
        content: "Health of Bixbo — Bixbo Patterns",
      },
      {
        property: "og:description",
        content: "Cycle, monthly, treatment and trigger comparisons.",
      },
    ],
  }),
  component: PatternsPage,
});

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MetricColor =
  | "rose"
  | "green"
  | "purple"
  | "blue"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "cyan"
  | "pink"
  | "slate";

type PhaseBar = {
  label: string;
  value: number | null;
};

type ComparisonMetricProps = {
  title: string;
  subtitle?: string;
  previous: number | null;
  current: number | null;
  max?: number;
  decimals?: number;
  unit?: string;
  color: MetricColor;
  higherIsWorse?: boolean;
  neutralTrend?: boolean;
  icon?: ReactNode;
  previousLabel?: string;
  currentLabel?: string;
};

type TreatmentMetric = {
  before: number | null;
  after: number | null;
};

type SelectOption = {
  id: string;
  label: string;
};

type PatternTab = "cycle" | "monthly" | "treatment" | "triggers";

const PATTERN_TABS: Array<{ id: PatternTab; label: string }> = [
  { id: "cycle", label: "Cycle" },
  { id: "monthly", label: "Monthly" },
  { id: "treatment", label: "Treatment" },
  { id: "triggers", label: "Triggers" },
];

/* -------------------------------------------------------------------------- */
/* Colours                                                                    */
/* -------------------------------------------------------------------------- */

const METRIC_COLORS: Record<
  MetricColor,
  {
    solid: string;
    soft: string;
    text: string;
    border: string;
  }
> = {
  rose: {
    solid: "#ef4770",
    soft: "rgba(239,71,112,0.10)",
    text: "#df315d",
    border: "rgba(239,71,112,0.24)",
  },
  green: {
    solid: "#6f9d16",
    soft: "rgba(111,157,22,0.10)",
    text: "#5f8911",
    border: "rgba(111,157,22,0.24)",
  },
  purple: {
    solid: CHART_COLORS.panic,
    soft: CHART_TINTS.panic,
    text: CHART_COLORS.panic,
    border: "rgba(139, 92, 246, 0.24)",
  },
  blue: {
    solid: CHART_COLORS.tetany,
    soft: CHART_TINTS.tetany,
    text: CHART_COLORS.tetany,
    border: "rgba(59, 130, 246, 0.24)",
  },
  orange: {
    solid: CHART_COLORS.hotFlash,
    soft: CHART_TINTS.hotFlash,
    text: CHART_COLORS.hotFlash,
    border: "rgba(249, 115, 22, 0.24)",
  },
  amber: {
    solid: CHART_COLORS.histamine,
    soft: CHART_TINTS.histamine,
    text: CHART_COLORS.histamine,
    border: "rgba(245, 158, 11, 0.24)",
  },
  emerald: {
    solid: CHART_COLORS.medication,
    soft: CHART_TINTS.medication,
    text: CHART_COLORS.medication,
    border: "rgba(16, 185, 129, 0.24)",
  },
  teal: {
    solid: CHART_COLORS.workout,
    soft: CHART_TINTS.workout,
    text: CHART_COLORS.workout,
    border: "rgba(34, 197, 94, 0.24)",
  },
  cyan: {
    solid: CHART_COLORS.headache,
    soft: CHART_TINTS.headache,
    text: CHART_COLORS.headache,
    border: "rgba(239, 68, 68, 0.24)",
  },
  pink: {
    solid: CHART_COLORS.pcos,
    soft: CHART_TINTS.pcos,
    text: CHART_COLORS.pcos,
    border: "rgba(192, 38, 211, 0.24)",
  },
  slate: {
    solid: CHART_COLORS.weight,
    soft: CHART_TINTS.weight,
    text: CHART_COLORS.weight,
    border: "rgba(100, 116, 139, 0.24)",
  },
};

const PHASE_COLORS = [
  {
    label: "Before",
    solid: CHART_COLORS.panic,
    soft: CHART_TINTS.panic,
  },
  {
    label: "During",
    solid: CHART_COLORS.period,
    soft: CHART_TINTS.period,
  },
  {
    label: "After",
    solid: CHART_COLORS.workout,
    soft: CHART_TINTS.workout,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-surface p-5 ring-1 ring-border">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>

        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>

      {children}
    </section>
  );
}

function Empty({ text = "Not enough data yet" }: { text?: string }) {
  return (
    <div className="mt-3 rounded-2xl bg-tint px-4 py-5 text-center ring-1 ring-border/40">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
function formatMetricValue(value: number | null, decimals: number, unit: string) {
  if (value == null || !Number.isFinite(value)) return "—";

  return `${value.toFixed(decimals)}${unit}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function phaseLabelByValue(bars: PhaseBar[], mode: "highest" | "lowest" = "highest") {
  const available = bars.filter(
    (bar): bar is PhaseBar & { value: number } => bar.value != null && Number.isFinite(bar.value),
  );

  if (available.length === 0) return "—";

  return available.reduce((selected, current) => {
    if (mode === "lowest") return current.value < selected.value ? current : selected;
    return current.value > selected.value ? current : selected;
  }).label;
}

/* -------------------------------------------------------------------------- */
/* Cycle phase chart                                                          */
/* -------------------------------------------------------------------------- */

function PhaseBarChart({
  title,
  description,
  bars,
  max,
  unit = "",
  decimals = 1,
}: {
  title: string;
  description?: string;
  bars: PhaseBar[];
  max: number;
  unit?: string;
  decimals?: number;
}) {
  const hasData = bars.some((bar) => bar.value != null);

  return (
    <div className="rounded-3xl bg-tint p-4 ring-1 ring-border/50">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>

      {!hasData ? (
        <p className="mt-4 text-sm text-muted-foreground">Not enough cycle data</p>
      ) : (
        <div className="mt-4 rounded-2xl bg-background/55 px-3 py-4 ring-1 ring-border/35">
          <div className="flex h-24 items-end gap-3">
            {bars.map((bar, index) => {
              const color = PHASE_COLORS[index] ?? PHASE_COLORS[0];
              const percentage = bar.value == null ? 0 : clampPercent((Math.max(0, bar.value) / max) * 100);
              const miniBars = [0.72, 0.84, 0.94, 1, 0.9, 0.78];

              return (
                <div key={`${title}-${bar.label}`} className="flex min-w-0 flex-1 flex-col items-center">
                  <span className="mb-2 text-xs font-bold tabular-nums text-foreground">
                    {formatMetricValue(bar.value, decimals, unit)}
                  </span>

                  <div className="flex h-14 w-full items-end justify-center gap-1 border-b border-border/50 pb-1">
                    {miniBars.map((factor, miniIndex) => (
                      <span
                        key={miniIndex}
                        className="w-1.5 rounded-full transition-[height] duration-500"
                        style={{
                          height: bar.value == null ? "3px" : `${Math.max(6, percentage * factor * 0.55)}px`,
                          backgroundColor: color.solid,
                          opacity: 0.62 + miniIndex * 0.065,
                        }}
                      />
                    ))}
                  </div>

                  <span className="mt-2 text-[10px] font-medium text-muted-foreground">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Monthly and treatment comparison                                           */
/* -------------------------------------------------------------------------- */

function ComparisonMetric({
  title,
  subtitle,
  previous,
  current,
  max,
  decimals = 1,
  unit = "",
  color,
  higherIsWorse = true,
  neutralTrend = false,
  icon,
  previousLabel = "Last month",
  currentLabel = "This month",
}: ComparisonMetricProps) {
  const palette = METRIC_COLORS[color];
  const hasAnyData = previous != null || current != null;

  const values = [previous, current].filter((value): value is number => value != null && Number.isFinite(value));

  const calculatedMax = max ?? Math.max(1, ...values.map((value) => Math.abs(value)));

  const previousPercentage = previous == null ? 0 : clampPercent((Math.max(0, previous) / calculatedMax) * 100);

  const currentPercentage = current == null ? 0 : clampPercent((Math.max(0, current) / calculatedMax) * 100);

  const delta = previous != null && current != null ? current - previous : null;

  const isUnchanged = delta === 0;

  const improved = delta == null || isUnchanged || neutralTrend ? null : higherIsWorse ? delta < 0 : delta > 0;

  const trendText =
    delta == null
      ? "Comparison unavailable"
      : isUnchanged
        ? "No change"
        : neutralTrend
          ? "Changed"
          : improved
            ? "Improved"
            : "Worsened";

  const trendColor =
    delta == null || isUnchanged || neutralTrend
      ? "var(--muted-foreground)"
      : improved
        ? CHART_COLORS.workout
        : CHART_COLORS.headache;

  const absoluteDelta = delta == null ? null : Math.abs(delta);

  return (
    <article className="rounded-3xl bg-tint p-4 ring-1 ring-border/60">
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
            style={{
              backgroundColor: "var(--surface)",
              color: palette.text,
              boxShadow: `inset 0 0 0 1px ${palette.border}`,
            }}
          >
            {icon}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold" style={{ color: palette.text }}>
            {title}
          </h3>

          {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>

        {delta != null && (
          <div className="flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>
            {isUnchanged || neutralTrend ? null : improved ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}

            {absoluteDelta != null && !isUnchanged && formatMetricValue(absoluteDelta, decimals, unit)}
          </div>
        )}
      </div>

      {!hasAnyData ? (
        <div className="mt-4 rounded-2xl bg-surface/75 px-4 py-5 text-center ring-1 ring-border/40">
          <p className="text-sm text-muted-foreground">Not enough data yet</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <MetricColumn
              label={previousLabel}
              value={previous}
              percentage={previousPercentage}
              decimals={decimals}
              unit={unit}
              color={palette.solid}
              muted
            />

            <MetricColumn
              label={currentLabel}
              value={current}
              percentage={currentPercentage}
              decimals={decimals}
              unit={unit}
              color={palette.solid}
            />
          </div>

          <div
            className="mt-4 rounded-2xl bg-surface/75 px-3 py-2 text-center text-xs font-semibold ring-1 ring-border/40"
            style={{ color: trendColor }}
          >
            {trendText}
            {delta != null && !isUnchanged ? ` by ${formatMetricValue(Math.abs(delta), decimals, unit)}` : ""}
          </div>
        </>
      )}
    </article>
  );
}

function MetricColumn({
  label,
  value,
  percentage,
  decimals,
  unit,
  color,
  muted = false,
}: {
  label: string;
  value: number | null;
  percentage: number;
  decimals: number;
  unit: string;
  color: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatMetricValue(value, decimals, unit)}</p>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface/75 ring-1 ring-border/40">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: value == null ? "0%" : `${Math.max(percentage, value === 0 ? 0 : 4)}%`,
            backgroundColor: color,
            opacity: muted ? 0.45 : 1,
          }}
        />
      </div>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

type ConfidenceLevel = "Low" | "Medium" | "High";

type SummaryItem = {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
};

function ConfidenceBadge({ level, detail }: { level: ConfidenceLevel; detail: string }) {
  const classes =
    level === "High"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : level === "Medium"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-4 py-3 ring-1 ring-border/40">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{level}</span>
    </div>
  );
}

function SummaryPanel({
  title,
  items,
  confidence,
}: {
  title: string;
  items: SummaryItem[];
  confidence?: { level: ConfidenceLevel; detail: string };
}) {
  return (
    <div className="mt-5 rounded-3xl bg-background p-4 ring-1 ring-border">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const valueClass =
            item.tone === "good"
              ? "text-emerald-700 dark:text-emerald-300"
              : item.tone === "bad"
                ? "text-rose-600 dark:text-rose-300"
                : "text-foreground";
          return (
            <div
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={`text-right font-semibold ${valueClass}`}>{item.value}</span>
            </div>
          );
        })}
      </div>
      {confidence && <ConfidenceBadge level={confidence.level} detail={confidence.detail} />}
    </div>
  );
}

function PatternTabs({ active, onChange }: { active: PatternTab; onChange: (tab: PatternTab) => void }) {
  return (
    <div className="sticky top-[45px] z-20 -mx-5 border-y border-border/50 bg-background/90 px-5 py-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-tint p-1 ring-1 ring-border/50">
        {PATTERN_TABS.map((tab) => {
          const selected = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={selected}
              className={`min-w-0 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-3xl bg-surface ring-1 ring-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border/50 p-3">{children}</div>}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function PatternsPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const dayLogs = view.dayLogs;
  const [activeTab, setActiveTab] = useState<PatternTab>("cycle");

  const cycles = useMemo(() => historicCycles(view), [view]);
  const phaseBuckets = useMemo(() => phaseDays(cycles), [cycles]);

  /* ------------------------------------------------------------------------ */
  /* Cycle phase calculations                                                 */
  /* ------------------------------------------------------------------------ */

  const painPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, (log) => avgDayPain(log) ?? null),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, (log) => avgDayPain(log) ?? null),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, (log) => avgDayPain(log) ?? null),
    },
  ];

  const moodPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, negativeMoodCount),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, negativeMoodCount),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, negativeMoodCount),
    },
  ];

  const energyPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayEnergy),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayEnergy),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayEnergy),
    },
  ];

  const hotFlashPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayHotFlash),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayHotFlash),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayHotFlash),
    },
  ];

  const pressurePhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayPressureIntensity),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayPressureIntensity),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayPressureIntensity),
    },
  ];

  const bowelPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayBowelSymptoms),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayBowelSymptoms),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayBowelSymptoms),
    },
  ];

  const commonFlow = phaseFlowMode(phaseBuckets.during, dayLogs);
  const highestPainPhase = phaseLabelByValue(painPhaseBars);
  const bestEnergyPhase = phaseLabelByValue(energyPhaseBars);
  const worstMoodPhase = phaseLabelByValue(moodPhaseBars);
  const mostHotFlashPhase = phaseLabelByValue(hotFlashPhaseBars);

  /* ------------------------------------------------------------------------ */
  /* Monthly calculations                                                     */
  /* ------------------------------------------------------------------------ */

  const [currentMonthPrefix, previousMonthPrefix] = thisAndLastMonthPrefixes();

  const currentMonthDays = daysOfMonth(currentMonthPrefix).filter((day) => day <= todayKey());

  const elapsedDayCount = currentMonthDays.length;

  const previousMonthDays = daysOfMonth(previousMonthPrefix).slice(0, elapsedDayCount);

  function countAndAverage(
    days: string[],
    countFn: (log: DayLog) => number,
    intensityFn: (log: DayLog) => number | null,
  ) {
    let count = 0;
    const intensities: number[] = [];

    days.forEach((day) => {
      const log = dayLogs[day];

      if (!log) return;

      count += countFn(log);

      const intensity = intensityFn(log);

      if (intensity != null && Number.isFinite(intensity)) {
        intensities.push(intensity);
      }
    });

    return {
      count,
      intensity: avg(intensities),
    };
  }

  const panicCurrent = countAndAverage(currentMonthDays, (log) => log.panic?.length ?? 0, dayPanicIntensity);

  const panicPrevious = countAndAverage(previousMonthDays, (log) => log.panic?.length ?? 0, dayPanicIntensity);

  const tetanyCurrent = countAndAverage(currentMonthDays, (log) => log.tetany?.length ?? 0, dayTetanyIntensity);

  const tetanyPrevious = countAndAverage(previousMonthDays, (log) => log.tetany?.length ?? 0, dayTetanyIntensity);

  const hotFlashCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn).length,
    dayHotFlash,
  );

  const hotFlashPrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn).length,
    dayHotFlash,
  );

  const headacheCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.headache).length,
    dayHeadacheIntensity,
  );

  const headachePrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.headache).length,
    dayHeadacheIntensity,
  );
  const pressureCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.pressureIntensity != null).length,
    dayPressureIntensity,
  );

  const pressurePrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.pressureIntensity != null).length,
    dayPressureIntensity,
  );
  const sleepAverage = (days: string[]) =>
    avg(days.map((day) => dayLogs[day]?.sleepHours).filter((value): value is number => value != null));

  const weightAverage = (days: string[]) =>
    avg(days.map((day) => dayLogs[day]?.weight).filter((value): value is number => value != null));

  const medicationAdherence = (days: string[]) => {
    const scheduledMeds = view.meds.filter((med) => !med.asNeeded);

    let expected = 0;
    let taken = 0;

    days.forEach((day) => {
      scheduledMeds.forEach((med) => {
        med.times.forEach((time) => {
          expected += 1;

          if (view.medLog[day]?.[`${med.id}@${time}`]) {
            taken += 1;
          }
        });
      });
    });

    return expected > 0 ? (taken / expected) * 100 : null;
  };

  const workoutStats = (days: string[]) => {
    let count = 0;
    let minutes = 0;

    days.forEach((day) => {
      (dayLogs[day]?.workout ?? []).forEach((workout) => {
        count += 1;
        minutes += workout.minutes || 0;
      });
    });

    return {
      count,
      minutes,
    };
  };

  const workoutCurrent = workoutStats(currentMonthDays);
  const workoutPrevious = workoutStats(previousMonthDays);

  const pcosFrequency = (days: string[]) =>
    days.reduce(
      (total, day) =>
        total +
        (dayLogs[day]?.pain ?? []).reduce((dayTotal, painEntry) => dayTotal + (painEntry.pcosSymptoms?.length ?? 0), 0),
      0,
    );

  const histamineFrequency = (days: string[]) =>
    days.reduce(
      (total, day) => total + (dayLogs[day]?.food ?? []).filter((foodEntry) => foodEntry.histamineFlare).length,
      0,
    );

  const sleepCurrent = sleepAverage(currentMonthDays);
  const sleepPrevious = sleepAverage(previousMonthDays);

  const weightCurrent = weightAverage(currentMonthDays);
  const weightPrevious = weightAverage(previousMonthDays);

  const medicationCurrent = medicationAdherence(currentMonthDays);

  const medicationPrevious = medicationAdherence(previousMonthDays);

  const pcosCurrent = pcosFrequency(currentMonthDays);
  const pcosPrevious = pcosFrequency(previousMonthDays);

  const histamineCurrent = histamineFrequency(currentMonthDays);

  const histaminePrevious = histamineFrequency(previousMonthDays);

  const monthlyLoggedDays = currentMonthDays.filter((day) => Boolean(dayLogs[day])).length;
  const monthlyConfidence: ConfidenceLevel =
    monthlyLoggedDays >= 21 ? "High" : monthlyLoggedDays >= 7 ? "Medium" : "Low";

  const monthlyChanges = (() => {
    const entries = [
      {
        label: "Panic attacks",
        previous: panicPrevious.count,
        current: panicCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Tetany episodes",
        previous: tetanyPrevious.count,
        current: tetanyCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Hot flashes",
        previous: hotFlashPrevious.count,
        current: hotFlashCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Headaches",
        previous: headachePrevious.count,
        current: headacheCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Pressure entries",
        previous: pressurePrevious.count,
        current: pressureCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Medication adherence",
        previous: medicationPrevious,
        current: medicationCurrent,
        higherIsWorse: false,
        unit: "%",
      },
      {
        label: "Workouts",
        previous: workoutPrevious.count,
        current: workoutCurrent.count,
        higherIsWorse: false,
        unit: "",
      },
      {
        label: "Workout time",
        previous: workoutPrevious.minutes,
        current: workoutCurrent.minutes,
        higherIsWorse: false,
        unit: " min",
      },
      { label: "PCOS symptoms", previous: pcosPrevious, current: pcosCurrent, higherIsWorse: true, unit: "" },
      {
        label: "Histamine flares",
        previous: histaminePrevious,
        current: histamineCurrent,
        higherIsWorse: true,
        unit: "",
      },
    ].filter((entry) => entry.previous != null && entry.current != null);

    return entries.map((entry) => {
      const delta = Number(entry.current) - Number(entry.previous);
      const score = entry.higherIsWorse ? -delta : delta;
      return { ...entry, delta, score };
    });
  })();

  const mostImproved = [...monthlyChanges].sort((a, b) => b.score - a.score)[0] ?? null;
  const mostWorsened = [...monthlyChanges].sort((a, b) => a.score - b.score)[0] ?? null;
  const mostStable = [...monthlyChanges].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0] ?? null;

  const formatChange = (entry: (typeof monthlyChanges)[number] | null) => {
    if (!entry) return "Not enough data";
    const sign = entry.delta > 0 ? "+" : "";
    return `${entry.label}: ${sign}${entry.delta.toFixed(entry.unit === "%" ? 0 : 1)}${entry.unit}`;
  };

  /* ------------------------------------------------------------------------ */
  /* Treatment comparison                                                     */
  /* ------------------------------------------------------------------------ */

  const [treatmentDate, setTreatmentDate] = useState("");

  const treatmentWindow = (before: boolean) => {
    if (!treatmentDate) return [] as string[];

    const days: string[] = [];

    for (let index = 1; index <= 28; index += 1) {
      days.push(before ? addDays(treatmentDate, -index) : addDays(treatmentDate, index - 1));
    }

    return days;
  };

  const treatmentBeforeDays = treatmentWindow(true);
  const treatmentAfterDays = treatmentWindow(false);

  const treatmentMetric = (metricFn: (log: DayLog) => number | null): TreatmentMetric => ({
    before: avg(
      treatmentBeforeDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
    after: avg(
      treatmentAfterDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
  });

  const treatmentPain = treatmentMetric((log) => avgDayPain(log) ?? null);

  const treatmentTetany = treatmentMetric(dayTetanyIntensity);

  const treatmentPanic = treatmentMetric(dayPanicIntensity);

  const treatmentMood = treatmentMetric((log) => negativeMoodCount(log));

  const treatmentChanges = [
    { label: "Pain", metric: treatmentPain },
    { label: "Tetany intensity", metric: treatmentTetany },
    { label: "Panic intensity", metric: treatmentPanic },
    { label: "Negative mood", metric: treatmentMood },
  ]
    .filter((entry) => entry.metric.before != null && entry.metric.after != null)
    .map((entry) => ({ ...entry, delta: Number(entry.metric.after) - Number(entry.metric.before) }));

  const treatmentImprovedCount = treatmentChanges.filter((entry) => entry.delta < 0).length;
  const treatmentWorsenedCount = treatmentChanges.filter((entry) => entry.delta > 0).length;
  const treatmentOverall =
    treatmentChanges.length === 0
      ? "Not enough data"
      : treatmentImprovedCount > treatmentWorsenedCount
        ? "Overall improvement"
        : treatmentWorsenedCount > treatmentImprovedCount
          ? "Overall worsening"
          : "Mixed or unchanged";

  const treatmentLoggedDays = [...treatmentBeforeDays, ...treatmentAfterDays].filter((day) =>
    Boolean(dayLogs[day]),
  ).length;
  const treatmentConfidence: ConfidenceLevel =
    treatmentLoggedDays >= 42 ? "High" : treatmentLoggedDays >= 14 ? "Medium" : "Low";

  /* ------------------------------------------------------------------------ */
  /* Trigger comparison                                                       */
  /* ------------------------------------------------------------------------ */

  const triggerOptions: SelectOption[] = [
    {
      id: "highCaffeine",
      label: "High caffeine (≥200 mg)",
    },
    {
      id: "anyCaffeine",
      label: "Any caffeine",
    },
    {
      id: "alcohol",
      label: "Alcohol",
    },
    {
      id: "workout",
      label: "Any workout",
    },
    {
      id: "longWorkout",
      label: "Long workout (≥45 min)",
    },
    {
      id: "poorSleep",
      label: "Poor sleep (<6 h)",
    },
    {
      id: "oversleep",
      label: "Long sleep (>9 h)",
    },
    {
      id: "highHistamine",
      label: "High-histamine food",
    },
    {
      id: "histamineFlare",
      label: "Histamine flare",
    },
    {
      id: "period",
      label: "Period day",
    },
    {
      id: "heavyPeriod",
      label: "Heavy period",
    },
    {
      id: "panic",
      label: "Panic attack",
    },
    {
      id: "tetany",
      label: "Tetany episode",
    },
    {
      id: "headache",
      label: "Headache",
    },
    {
      id: "hotFlash",
      label: "Hot flash",
    },
    {
      id: "medicationMissed",
      label: "Scheduled medication missed",
    },
    ...view.custom.foodQuickAdd.map((food) => ({
      id: `food:${food}`,
      label: `Ate "${food}"`,
    })),
  ];

  const outcomeOptions: SelectOption[] = [
    {
      id: "tetany",
      label: "Tetany episode",
    },
    {
      id: "panic",
      label: "Panic attack",
    },
    {
      id: "pain3",
      label: "Pain ≥3",
    },
    {
      id: "pain5",
      label: "Pain ≥5",
    },
    {
      id: "pain7",
      label: "Pain ≥7",
    },
    {
      id: "hotFlash",
      label: "Hot flash",
    },
    {
      id: "headache",
      label: "Headache",
    },
    {
      id: "lowEnergy",
      label: "Low energy",
    },
    {
      id: "negativeMood",
      label: "Negative mood",
    },
    {
      id: "bowelSymptoms",
      label: "Bowel symptoms",
    },
    {
      id: "poorSleep",
      label: "Poor sleep",
    },
    {
      id: "histamineFlare",
      label: "Histamine flare",
    },
    {
      id: "pcosSymptoms",
      label: "PCOS symptoms",
    },
  ];

  const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]?.id ?? "");

  const [selectedOutcome, setSelectedOutcome] = useState(outcomeOptions[0]?.id ?? "");

  const hasScheduledMedicationMissed = (day: string): boolean => {
    const scheduledMeds = view.meds.filter((med) => !med.asNeeded);

    if (scheduledMeds.length === 0) return false;

    return scheduledMeds.some((med) => med.times.some((time) => !view.medLog[day]?.[`${med.id}@${time}`]));
  };

  const hasTrigger = (day: string, log: DayLog | undefined, trigger: string): boolean => {
    if (!log) return false;

    if (trigger === "highCaffeine") {
      return (log.food ?? []).some((food) => (food.caffeineMg ?? 0) >= 200);
    }

    if (trigger === "anyCaffeine") {
      return (log.food ?? []).some((food) => (food.caffeineMg ?? 0) > 0);
    }

    if (trigger === "alcohol") {
      return (log.food ?? []).some((food) => (food.alcoholDrinks ?? 0) > 0);
    }

    if (trigger === "workout") {
      return (log.workout?.length ?? 0) > 0;
    }

    if (trigger === "longWorkout") {
      return (log.workout ?? []).some((workout) => (workout.minutes ?? 0) >= 45);
    }

    if (trigger === "poorSleep") {
      return log.sleepHours != null && log.sleepHours < 6;
    }

    if (trigger === "oversleep") {
      return log.sleepHours != null && log.sleepHours > 9;
    }

    if (trigger === "highHistamine") {
      return (log.food ?? []).some((food) => food.highHistamine);
    }

    if (trigger === "histamineFlare") {
      return (log.food ?? []).some((food) => food.histamineFlare);
    }

    if (trigger === "period") {
      return (
        log.period === "spotting" ||
        log.period === "light" ||
        log.period === "medium" ||
        log.period === "heavy" ||
        log.period === "very-heavy"
      );
    }

    if (trigger === "heavyPeriod") {
      return log.period === "heavy" || log.period === "very-heavy";
    }

    if (trigger === "panic") {
      return (log.panic?.length ?? 0) > 0;
    }

    if (trigger === "tetany") {
      return (log.tetany?.length ?? 0) > 0;
    }

    if (trigger === "headache") {
      return (log.pain ?? []).some((painEntry) => painEntry.headache);
    }

    if (trigger === "hotFlash") {
      return (log.pain ?? []).some((painEntry) => painEntry.hotFlashesOn);
    }

    if (trigger === "medicationMissed") {
      return hasScheduledMedicationMissed(day);
    }

    if (trigger.startsWith("food:")) {
      const foodName = trigger.slice(5);

      return (log.food ?? []).some((food) => food.what === foodName);
    }

    return false;
  };

  const hasOutcome = (log: DayLog | undefined, outcome: string): boolean => {
    if (!log) return false;

    if (outcome === "tetany") {
      return (log.tetany?.length ?? 0) > 0;
    }

    if (outcome === "panic") {
      return (log.panic?.length ?? 0) > 0;
    }

    if (outcome === "pain3") {
      return (avgDayPain(log) ?? 0) >= 3;
    }

    if (outcome === "pain5") {
      return (avgDayPain(log) ?? 0) >= 5;
    }

    if (outcome === "pain7") {
      return (avgDayPain(log) ?? 0) >= 7;
    }

    if (outcome === "hotFlash") {
      return (log.pain ?? []).some((painEntry) => painEntry.hotFlashesOn);
    }

    if (outcome === "headache") {
      return (log.pain ?? []).some((painEntry) => painEntry.headache);
    }

    if (outcome === "lowEnergy") {
      const energy = dayEnergy(log);
      return energy != null && energy <= 2;
    }

    if (outcome === "negativeMood") {
      return negativeMoodCount(log) > 0;
    }

    if (outcome === "bowelSymptoms") {
      return dayBowelSymptoms(log) > 0;
    }

    if (outcome === "poorSleep") {
      return log.sleepHours != null && log.sleepHours < 6;
    }

    if (outcome === "histamineFlare") {
      return (log.food ?? []).some((food) => food.histamineFlare);
    }

    if (outcome === "pcosSymptoms") {
      return (log.pain ?? []).some((painEntry) => (painEntry.pcosSymptoms?.length ?? 0) > 0);
    }

    return false;
  };

  const allLoggedDays = useMemo(() => Object.keys(dayLogs).sort(), [dayLogs]);

  const daysWithTrigger = allLoggedDays.filter((day) => hasTrigger(day, dayLogs[day], selectedTrigger));

  const daysWithoutTrigger = allLoggedDays.filter((day) => !hasTrigger(day, dayLogs[day], selectedTrigger));

  const percentWithTrigger =
    daysWithTrigger.length > 0
      ? (daysWithTrigger.filter((day) => hasOutcome(dayLogs[day], selectedOutcome)).length / daysWithTrigger.length) *
        100
      : null;

  const percentWithoutTrigger =
    daysWithoutTrigger.length > 0
      ? (daysWithoutTrigger.filter((day) => hasOutcome(dayLogs[day], selectedOutcome)).length /
          daysWithoutTrigger.length) *
        100
      : null;

  const selectedTriggerLabel = triggerOptions.find((option) => option.id === selectedTrigger)?.label ?? selectedTrigger;

  const selectedOutcomeLabel = outcomeOptions.find((option) => option.id === selectedOutcome)?.label ?? selectedOutcome;

  const triggerDifference =
    percentWithTrigger != null && percentWithoutTrigger != null ? percentWithTrigger - percentWithoutTrigger : null;

  const triggerConfidence: ConfidenceLevel =
    daysWithTrigger.length >= 15 && daysWithoutTrigger.length >= 15
      ? "High"
      : daysWithTrigger.length >= 5 && daysWithoutTrigger.length >= 5
        ? "Medium"
        : "Low";

  const strongestAssociations = (() => {
    const results: Array<{
      trigger: string;
      outcome: string;
      difference: number;
      withCount: number;
      withoutCount: number;
    }> = [];

    triggerOptions.forEach((trigger) => {
      const withDays = allLoggedDays.filter((day) => hasTrigger(day, dayLogs[day], trigger.id));
      const withoutDays = allLoggedDays.filter((day) => !hasTrigger(day, dayLogs[day], trigger.id));
      if (withDays.length < 3 || withoutDays.length < 3) return;

      outcomeOptions.forEach((outcome) => {
        const withRate =
          (withDays.filter((day) => hasOutcome(dayLogs[day], outcome.id)).length / withDays.length) * 100;
        const withoutRate =
          (withoutDays.filter((day) => hasOutcome(dayLogs[day], outcome.id)).length / withoutDays.length) * 100;
        const difference = withRate - withoutRate;
        if (Math.abs(difference) < 10) return;
        results.push({
          trigger: trigger.label,
          outcome: outcome.label,
          difference,
          withCount: withDays.length,
          withoutCount: withoutDays.length,
        });
      });
    });

    return results.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 3);
  })();

  const saveTriggerCombination = () => {
    const alreadySaved = (view.settings.savedTriggers ?? []).some(
      (saved) => saved.a === selectedTrigger && saved.b === selectedOutcome,
    );

    if (alreadySaved) return;

    update((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        savedTriggers: [
          ...(draft.settings.savedTriggers ?? []),
          {
            id: `${Date.now()}`,
            a: selectedTrigger,
            b: selectedOutcome,
          },
        ],
      },
    }));
  };

  const removeTriggerCombination = (id: string) => {
    update((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        savedTriggers: (draft.settings.savedTriggers ?? []).filter((saved) => saved.id !== id),
      },
    }));
  };

  return (
    <AppShell title="Bixbo Patterns">
      <div className="space-y-4 px-5 pb-24 pt-2">
        <PatternTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "cycle" && (
          <div className="space-y-4">
            {/* ------------------------------------------------------------------ */}
            {/* Cycle phase                                                        */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              title="Pain & flow"
              subtitle="Average pain and menstrual flow by cycle phase"
              defaultOpen={true}
            >
              <Card
                title="Cycle phase — pain & flow"
                description="See how your symptoms usually change before, during and after your period."
              >
                <div className="mt-4">
                  <PhaseBarChart
                    title="Average pain"
                    description="Average daily pain intensity in each cycle phase."
                    bars={painPhaseBars}
                    max={10}
                    unit="/10"
                  />
                </div>

                {cycles.length > 0 ? (
                  <div className="mt-3 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Most common period flow</p>

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Based on {cycles.length} historic cycle
                          {cycles.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold capitalize text-rose-600 dark:text-rose-400">
                        {commonFlow || "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Empty text="Log more periods to see your cycle pattern." />
                )}
                <div className="mt-5 rounded-3xl bg-background p-4 ring-1 ring-border">
                  <h3 className="text-sm font-semibold text-foreground">Cycle Summary</h3>

                  <div className="mt-4 space-y-3">
                    <SummaryRow label="Highest pain" value={highestPainPhase} />

                    <SummaryRow label="Best energy" value={bestEnergyPhase} />

                    <SummaryRow label="Most negative mood" value={worstMoodPhase} />

                    <SummaryRow label="Most hot flashes" value={mostHotFlashPhase} />

                    <SummaryRow label="Most common flow" value={commonFlow || "—"} />
                  </div>
                </div>
              </Card>
            </CollapsibleSection>

            <CollapsibleSection
              title="Body changes"
              subtitle="Mood, energy, hot flashes, pressure and bowel symptoms"
              defaultOpen={false}
            >
              <Card
                title="Cycle phase — other"
                description="Mood, energy, hot flashes and bowel symptoms grouped by cycle phase."
              >
                <div className="mt-4 space-y-4">
                  <PhaseBarChart
                    title="Negative mood"
                    description="Average number of negative mood tags logged per day."
                    bars={moodPhaseBars}
                    max={3}
                    decimals={1}
                  />

                  <PhaseBarChart
                    title="Energy"
                    description="Average body-battery or energy score."
                    bars={energyPhaseBars}
                    max={5}
                    unit="/5"
                  />

                  <PhaseBarChart
                    title="Hot flashes"
                    description="Average hot-flash intensity."
                    bars={hotFlashPhaseBars}
                    max={5}
                    unit="/5"
                  />

                  <PhaseBarChart
                    title="Pressure intensity"
                    description="Average logged pressure intensity in each cycle phase."
                    bars={pressurePhaseBars}
                    max={10}
                    unit="/10"
                  />

                  <PhaseBarChart
                    title="Bowel symptoms"
                    description="Average number of bowel symptoms logged per day."
                    bars={bowelPhaseBars}
                    max={3}
                    decimals={1}
                  />
                </div>
              </Card>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="space-y-4">
            {/* ------------------------------------------------------------------ */}
            {/* Monthly comparison — panic and tetany                              */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              title="Panic & tetany"
              subtitle="Monthly frequency and intensity comparison"
              defaultOpen={true}
            >
              <Card
                title="Monthly comparison — panic & tetany"
                description="This month is compared with the same number of days from last month."
              >
                <div className="mt-4 space-y-3">
                  <ComparisonMetric
                    title="Panic attacks"
                    subtitle="Number of logged panic attacks"
                    previous={panicPrevious.count}
                    current={panicCurrent.count}
                    decimals={0}
                    unit=""
                    color="purple"
                    higherIsWorse
                    icon={<Sparkles className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Panic intensity"
                    subtitle="Average intensity of logged panic attacks"
                    previous={panicPrevious.intensity}
                    current={panicCurrent.intensity}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="purple"
                    higherIsWorse
                    icon={<Brain className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Tetany episodes"
                    subtitle="Number of logged tetany episodes"
                    previous={tetanyPrevious.count}
                    current={tetanyCurrent.count}
                    decimals={0}
                    unit=""
                    color="blue"
                    higherIsWorse
                    icon={<Activity className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Tetany intensity"
                    subtitle="Average intensity of logged tetany episodes"
                    previous={tetanyPrevious.intensity}
                    current={tetanyCurrent.intensity}
                    max={5}
                    decimals={1}
                    unit="/5"
                    color="blue"
                    higherIsWorse
                    icon={<Waves className="h-5 w-5" />}
                  />
                </div>
              </Card>
            </CollapsibleSection>

            {/* ------------------------------------------------------------------ */}
            {/* Monthly comparison — other                                         */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              title="Symptoms, lifestyle & hormones"
              subtitle="Other monthly health measurements"
              defaultOpen={false}
            >
              <Card
                title="Monthly comparison — other"
                description="Compare symptoms, routines and health measurements month by month."
              >
                <div className="mt-4 space-y-3">
                  <ComparisonMetric
                    title="Hot flashes"
                    subtitle="Number of logged hot flashes"
                    previous={hotFlashPrevious.count}
                    current={hotFlashCurrent.count}
                    decimals={0}
                    color="orange"
                    higherIsWorse
                    icon={<Flame className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Hot-flash intensity"
                    subtitle="Average intensity of logged hot flashes"
                    previous={hotFlashPrevious.intensity}
                    current={hotFlashCurrent.intensity}
                    max={5}
                    decimals={1}
                    unit="/5"
                    color="orange"
                    higherIsWorse
                    icon={<ThermometerSun className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Headaches"
                    subtitle="Number of logged headaches"
                    previous={headachePrevious.count}
                    current={headacheCurrent.count}
                    decimals={0}
                    color="cyan"
                    higherIsWorse
                    icon={<Brain className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Headache intensity"
                    subtitle="Average headache intensity"
                    previous={headachePrevious.intensity}
                    current={headacheCurrent.intensity}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="cyan"
                    higherIsWorse
                    icon={<HeartPulse className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Pressure entries"
                    subtitle="Number of pain logs containing pressure"
                    previous={pressurePrevious.count}
                    current={pressureCurrent.count}
                    decimals={0}
                    color="rose"
                    higherIsWorse
                    icon={<Waves className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Pressure intensity"
                    subtitle="Average intensity of logged pressure"
                    previous={pressurePrevious.intensity}
                    current={pressureCurrent.intensity}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="rose"
                    higherIsWorse
                    icon={<Activity className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Average sleep"
                    subtitle="Average number of logged sleep hours"
                    previous={sleepPrevious}
                    current={sleepCurrent}
                    max={12}
                    decimals={1}
                    unit="h"
                    color="blue"
                    neutralTrend
                    icon={<Moon className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Average weight"
                    subtitle="Average logged body weight"
                    previous={weightPrevious}
                    current={weightCurrent}
                    decimals={1}
                    unit="kg"
                    color="slate"
                    neutralTrend
                    icon={<Scale className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Medication adherence"
                    subtitle="Percentage of scheduled doses marked as taken"
                    previous={medicationPrevious}
                    current={medicationCurrent}
                    max={100}
                    decimals={0}
                    unit="%"
                    color="emerald"
                    higherIsWorse={false}
                    icon={<Pill className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Workouts"
                    subtitle="Number of logged workout sessions"
                    previous={workoutPrevious.count}
                    current={workoutCurrent.count}
                    decimals={0}
                    color="teal"
                    higherIsWorse={false}
                    icon={<Dumbbell className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Workout time"
                    subtitle="Total logged workout minutes"
                    previous={workoutPrevious.minutes}
                    current={workoutCurrent.minutes}
                    decimals={0}
                    unit=" min"
                    color="teal"
                    higherIsWorse={false}
                    icon={<Activity className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="PCOS symptoms"
                    subtitle="Total number of logged PCOS symptom tags"
                    previous={pcosPrevious}
                    current={pcosCurrent}
                    decimals={0}
                    color="pink"
                    higherIsWorse
                    icon={<HeartPulse className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Histamine flares"
                    subtitle="Number of food entries marked as a histamine flare"
                    previous={histaminePrevious}
                    current={histamineCurrent}
                    decimals={0}
                    color="amber"
                    higherIsWorse
                    icon={<Flame className="h-5 w-5" />}
                  />
                </div>

                <SummaryPanel
                  title="Monthly Summary"
                  items={[
                    {
                      label: "Most improved",
                      value: formatChange(mostImproved),
                      tone: mostImproved && mostImproved.score > 0 ? "good" : "neutral",
                    },
                    {
                      label: "Needs attention",
                      value: formatChange(mostWorsened),
                      tone: mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral",
                    },
                    { label: "Most stable", value: formatChange(mostStable), tone: "neutral" },
                  ]}
                  confidence={{
                    level: monthlyConfidence,
                    detail: `Based on ${monthlyLoggedDays} logged day${monthlyLoggedDays === 1 ? "" : "s"} this month`,
                  }}
                />
              </Card>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === "treatment" && (
          <div className="space-y-4">
            {/* ------------------------------------------------------------------ */}
            {/* Treatment comparison                                               */}
            {/* ------------------------------------------------------------------ */}

            <Card
              title="Treatment comparison"
              description="Compare the four weeks before treatment with the first four weeks after its start."
            >
              <label className="mt-4 block">
                <span className="text-xs font-medium text-muted-foreground">Treatment start date</span>

                {view.meds.length > 0 && (
                  <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
                    Current medicines: {view.meds.map((med) => med.name).join(", ")}
                  </span>
                )}

                <input
                  type="date"
                  value={treatmentDate}
                  onChange={(event) => setTreatmentDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl bg-tint px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-primary"
                />
              </label>

              {!treatmentDate ? (
                <Empty text="Choose a treatment start date to compare the two periods." />
              ) : (
                <div className="mt-4 space-y-3">
                  <ComparisonMetric
                    title="Pain"
                    subtitle="Average pain · 4 weeks before vs 4 weeks after"
                    previous={treatmentPain.before}
                    current={treatmentPain.after}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="rose"
                    higherIsWorse
                    previousLabel="Before"
                    currentLabel="After"
                    icon={<HeartPulse className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Tetany intensity"
                    subtitle="Average tetany intensity before and after treatment"
                    previous={treatmentTetany.before}
                    current={treatmentTetany.after}
                    max={5}
                    decimals={1}
                    unit="/5"
                    color="blue"
                    higherIsWorse
                    previousLabel="Before"
                    currentLabel="After"
                    icon={<Activity className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Panic intensity"
                    subtitle="Average panic intensity before and after treatment"
                    previous={treatmentPanic.before}
                    current={treatmentPanic.after}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="purple"
                    higherIsWorse
                    previousLabel="Before"
                    currentLabel="After"
                    icon={<Sparkles className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Negative mood"
                    subtitle="Average negative mood tags per day"
                    previous={treatmentMood.before}
                    current={treatmentMood.after}
                    max={3}
                    decimals={1}
                    color="amber"
                    higherIsWorse
                    previousLabel="Before"
                    currentLabel="After"
                    icon={<Brain className="h-5 w-5" />}
                  />

                  <SummaryPanel
                    title="Treatment Summary"
                    items={[
                      {
                        label: "Improved metrics",
                        value: `${treatmentImprovedCount}`,
                        tone: treatmentImprovedCount > 0 ? "good" : "neutral",
                      },
                      {
                        label: "Worsened metrics",
                        value: `${treatmentWorsenedCount}`,
                        tone: treatmentWorsenedCount > 0 ? "bad" : "neutral",
                      },
                      {
                        label: "Overall",
                        value: treatmentOverall,
                        tone: treatmentOverall.includes("improvement")
                          ? "good"
                          : treatmentOverall.includes("worsening")
                            ? "bad"
                            : "neutral",
                      },
                    ]}
                    confidence={{
                      level: treatmentConfidence,
                      detail: `Based on ${treatmentLoggedDays} logged days across both periods`,
                    }}
                  />

                  <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
                    Treatment marker: {treatmentDate}. The comparison uses up to 28 days on each side of this date.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "triggers" && (
          <div className="space-y-4">
            {/* ------------------------------------------------------------------ */}
            {/* Trigger comparison                                                 */}
            {/* ------------------------------------------------------------------ */}
            <Card
              title="Trigger comparison"
              description="Compare how often an outcome occurred on days with and without a possible trigger."
            >
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Possible trigger
                  </span>

                  <select
                    value={selectedTrigger}
                    onChange={(event) => setSelectedTrigger(event.target.value)}
                    className="mt-1.5 w-full rounded-2xl bg-tint px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-primary"
                  >
                    {triggerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Compare with outcome
                  </span>

                  <select
                    value={selectedOutcome}
                    onChange={(event) => setSelectedOutcome(event.target.value)}
                    className="mt-1.5 w-full rounded-2xl bg-tint px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-primary"
                  >
                    {outcomeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <TriggerResult
                  label="With trigger"
                  detail={`${daysWithTrigger.length} logged day${daysWithTrigger.length === 1 ? "" : "s"}`}
                  percentage={percentWithTrigger}
                  color={CHART_COLORS.panic}
                />

                <TriggerResult
                  label="Without trigger"
                  detail={`${daysWithoutTrigger.length} logged day${daysWithoutTrigger.length === 1 ? "" : "s"}`}
                  percentage={percentWithoutTrigger}
                  color={CHART_COLORS.workout}
                />
              </div>

              {percentWithTrigger == null && percentWithoutTrigger == null ? (
                <Empty text="There is not enough matching data for this comparison." />
              ) : (
                <div className="mt-4 rounded-2xl bg-tint p-4 ring-1 ring-border/40">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedOutcomeLabel}</span> occurred on{" "}
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {percentWithTrigger != null ? `${percentWithTrigger.toFixed(0)}%` : "—"}
                    </span>{" "}
                    of days with{" "}
                    <span className="font-semibold text-foreground">{selectedTriggerLabel.toLowerCase()}</span>,
                    compared with{" "}
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {percentWithoutTrigger != null ? `${percentWithoutTrigger.toFixed(0)}%` : "—"}
                    </span>{" "}
                    of days without it.
                  </p>

                  {triggerDifference != null && (
                    <div
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/60 px-3 py-2 text-xs font-semibold"
                      style={{
                        color:
                          triggerDifference > 0
                            ? CHART_COLORS.headache
                            : triggerDifference < 0
                              ? CHART_COLORS.workout
                              : "var(--muted-foreground)",
                      }}
                    >
                      {triggerDifference > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : triggerDifference < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : null}

                      {triggerDifference === 0
                        ? "No measured difference"
                        : `${Math.abs(triggerDifference).toFixed(0)} percentage points ${
                            triggerDifference > 0 ? "higher" : "lower"
                          } with the trigger`}
                    </div>
                  )}

                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                    This shows an association in your logs, not proof that the selected trigger caused the outcome.
                  </p>
                </div>
              )}

              <SummaryPanel
                title="Trigger Summary"
                items={[
                  {
                    label: "Selected association",
                    value:
                      triggerDifference == null
                        ? "Not enough data"
                        : triggerDifference === 0
                          ? "No measured difference"
                          : `${Math.abs(triggerDifference).toFixed(0)} pp ${triggerDifference > 0 ? "higher" : "lower"} with trigger`,
                    tone:
                      triggerDifference != null && triggerDifference > 0
                        ? "bad"
                        : triggerDifference != null && triggerDifference < 0
                          ? "good"
                          : "neutral",
                  },
                  { label: "Days with trigger", value: `${daysWithTrigger.length}` },
                  { label: "Days without trigger", value: `${daysWithoutTrigger.length}` },
                ]}
                confidence={{
                  level: triggerConfidence,
                  detail: "Confidence depends on the number of days in both groups",
                }}
              />

              {strongestAssociations.length > 0 && (
                <div className="mt-5 rounded-3xl bg-background p-4 ring-1 ring-border">
                  <h3 className="text-sm font-semibold text-foreground">Strongest Associations</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Calculated from your logs only. These are associations, not proof of causation.
                  </p>
                  <div className="mt-4 space-y-3">
                    {strongestAssociations.map((association) => (
                      <div
                        key={`${association.trigger}-${association.outcome}`}
                        className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                      >
                        <p className="text-sm font-semibold text-foreground">{association.trigger}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">→ {association.outcome}</p>
                        <p
                          className={`mt-2 text-sm font-bold ${association.difference > 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
                        >
                          {Math.abs(association.difference).toFixed(0)} percentage points{" "}
                          {association.difference > 0 ? "higher" : "lower"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={saveTriggerCombination}
                disabled={!selectedTrigger || !selectedOutcome}
                className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ★ Save this comparison
              </button>

              {(view.settings.savedTriggers ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Saved comparisons
                  </p>

                  <div className="mt-2 space-y-2">
                    {(view.settings.savedTriggers ?? []).map((saved) => {
                      const savedTriggerLabel =
                        triggerOptions.find((option) => option.id === saved.a)?.label ?? saved.a;

                      const savedOutcomeLabel =
                        outcomeOptions.find((option) => option.id === saved.b)?.label ?? saved.b;

                      return (
                        <div
                          key={saved.id}
                          className="flex items-center gap-3 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              setSelectedTrigger(saved.a);
                              setSelectedOutcome(saved.b);
                            }}
                          >
                            <p className="truncate text-xs font-semibold text-foreground">{savedTriggerLabel}</p>

                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">→ {savedOutcomeLabel}</p>
                          </button>

                          <button
                            type="button"
                            aria-label="Remove saved comparison"
                            onClick={() => removeTriggerCombination(saved.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm text-muted-foreground transition hover:bg-background hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>{" "}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Trigger result card                                                        */
/* -------------------------------------------------------------------------- */

function TriggerResult({
  label,
  detail,
  percentage,
  color,
}: {
  label: string;
  detail: string;
  percentage: number | null;
  color: string;
}) {
  const safePercentage = percentage == null ? 0 : clampPercent(percentage);

  return (
    <div className="rounded-3xl bg-tint p-4 text-center">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>

      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {percentage != null ? `${percentage.toFixed(0)}%` : "—"}
      </p>

      <div className="mx-auto mt-3 flex h-24 w-12 items-end overflow-hidden rounded-2xl bg-background/70">
        <div
          className="w-full rounded-2xl transition-[height] duration-500 ease-out"
          style={{
            height: percentage == null ? "0%" : `${Math.max(safePercentage, percentage === 0 ? 0 : 5)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
