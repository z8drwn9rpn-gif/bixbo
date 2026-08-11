import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Archive,
  Brain,
  CalendarDays,
  Dumbbell,
  Flame,
  HeartPulse,
  ChevronDown,
  Moon,
  Pill,
  RotateCcw,
  Scale,
  Sparkles,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
  Trash2,
  Waves,
} from "@/components/icons/BixboIcons";

import { AppShell } from "@/components/AppShell";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature } from "@/lib/appRegistry";
import { layoutOrder } from "@/lib/layoutRegistry";
import {
  EMPTY,
  addDays,
  avgDayPain,
  isCycleTrackingHidden,
  todayKey,
  useBixbo,
  type DayLog,
  type PatternTreatmentKind,
  type PatternTreatmentResult,
  type ArchivedPatternTreatment,
} from "@/lib/storage";
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

type VitalEntry = {
  id?: string;
  time?: string;
  value: number;
};

type DayLogWithVitals = DayLog & {
  weightEntries?: VitalEntry[];
};

function latestWeightForDay(log: DayLog | undefined): number | null {
  if (!log) return null;
  const entries = ((log as DayLogWithVitals).weightEntries ?? [])
    .filter((entry) => entry && Number.isFinite(Number(entry.value)))
    .map((entry) => ({ ...entry, value: Number(entry.value), time: entry.time ?? "" }))
    .sort((a, b) => a.time.localeCompare(b.time));

  if (entries.length > 0) return entries[entries.length - 1].value;
  return log.weight != null && Number.isFinite(Number(log.weight)) ? Number(log.weight) : null;
}

type PatternTab = "cycle" | "monthly" | "treatment" | "triggers";
type AnalysisRange = 7 | 30 | 90;
type TreatmentKind = PatternTreatmentKind;
type TreatmentResult = PatternTreatmentResult;
type ArchivedTreatment = ArchivedPatternTreatment;

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

function Card({ title, description, children, layoutOrderValue }: { title: string; description?: string; children: ReactNode; layoutOrderValue?: number }) {
  const { t } = useI18n();
  return (
    <section style={{ order: layoutOrderValue }} className="overflow-hidden rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</h2>

        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(description)}</p>}
      </div>

      {children}
    </section>
  );
}

function Empty({ text = "Log at least 7 days to unlock this analysis." }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 rounded-2xl bg-tint px-4 py-5 text-center ring-1 ring-border/40">
      <p className="text-sm font-medium text-foreground">{t("More data needed")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(text)}</p>
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

function percentageChange(previous: number | null, current: number | null): number | null {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatSignedPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
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
  const { t } = useI18n();
  const hasData = bars.some((bar) => bar.value != null);

  return (
    <div className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div>
        <p className="text-sm font-semibold text-foreground">{t(title)}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t(description)}</p>}
      </div>

      {!hasData ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("Log at least one complete menstrual cycle to unlock this analysis.")}
        </p>
      ) : (
        <div className="mt-3 rounded-2xl bg-background/55 px-3 py-3 ring-1 ring-border/40">
          <div className="flex h-24 items-end gap-3">
            {bars.map((bar, index) => {
              const color = PHASE_COLORS[index] ?? PHASE_COLORS[0];
              const percentage = bar.value == null ? 0 : clampPercent((Math.max(0, bar.value) / max) * 100);
              const miniBars = [0.72, 0.84, 0.94, 1, 0.9, 0.78];

              return (
                <div key={`${title}-${t(bar.label)}`} className="flex min-w-0 flex-1 flex-col items-center">
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

                  <span className="mt-2 text-[10px] font-medium text-muted-foreground">{t(bar.label)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function monthLabelFromPrefix(prefix: string, language: "en" | "sk"): string {
  const match = /^(\d{4})-(\d{2})$/.exec(prefix);
  if (!match) return prefix;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
    month: "long",
    year: "numeric",
  });
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
  previousLabel,
  currentLabel,
}: ComparisonMetricProps) {
  const { t, language } = useI18n();
  const palette = METRIC_COLORS[color];
  const [defaultCurrentPrefix, defaultPreviousPrefix] = thisAndLastMonthPrefixes();
  const resolvedPreviousLabel = previousLabel ?? monthLabelFromPrefix(defaultPreviousPrefix, language);
  const resolvedCurrentLabel = currentLabel ?? monthLabelFromPrefix(defaultCurrentPrefix, language);
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
  const relativeChange = percentageChange(previous, current);

  return (
    <article className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
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
            {t(title)}
          </h3>

          {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t(subtitle)}</p>}
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
        <div className="mt-3 rounded-xl bg-surface/75 px-3 py-3.5 text-center ring-1 ring-border/40">
          <p className="text-xs font-medium text-foreground">{t("No comparison yet")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Log this metric in both periods to compare it.")}</p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricColumn
              label={resolvedPreviousLabel}
              value={previous}
              percentage={previousPercentage}
              decimals={decimals}
              unit={unit}
              color={palette.solid}
              muted
            />

            <MetricColumn
              label={resolvedCurrentLabel}
              value={current}
              percentage={currentPercentage}
              decimals={decimals}
              unit={unit}
              color={palette.solid}
            />
          </div>

          <div
            className="mt-3 rounded-xl bg-surface/75 px-3 py-2 text-center text-xs font-semibold ring-1 ring-border/40"
            style={{ color: trendColor }}
          >
            {t(trendText)}
            {delta != null && !isUnchanged ? ` ${t("by")} ${formatMetricValue(Math.abs(delta), decimals, unit)}` : ""}
            {relativeChange != null && !isUnchanged ? ` (${formatSignedPercent(relativeChange)})` : ""}
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
  const { t } = useI18n();
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{t(label)}</p>

      <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
        {formatMetricValue(value, decimals, unit)}
      </p>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface/75 ring-1 ring-border/40">
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
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
      <span className="text-sm text-muted-foreground">{t(label)}</span>

      <span className="font-semibold text-foreground"><TrText value={value} /></span>
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
  const { t } = useI18n();
  const classes =
    level === "High"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : level === "Medium"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-background/60 px-4 py-3 ring-1 ring-border/40">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Confidence")}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t(detail)}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{t(level)}</span>
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
  const { t } = useI18n();
  return (
    <div className="mt-4 rounded-3xl bg-background p-4 ring-1 ring-border">
      <h3 className="text-sm font-semibold text-foreground">{t(title)}</h3>
      <div className="mt-3 space-y-2.5">
        {items.map((item) => {
          const valueClass =
            item.tone === "good"
              ? "text-emerald-700 dark:text-emerald-300"
              : item.tone === "bad"
                ? "text-rose-600 dark:text-rose-300"
                : "text-foreground";
          return (
            <div
              key={`${title}-${t(item.label)}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
            >
              <span className="text-sm text-muted-foreground">{t(item.label)}</span>
              <span className={`text-right font-semibold ${valueClass}`}>{t(String(item.value))}</span>
            </div>
          );
        })}
      </div>
      {confidence && <ConfidenceBadge level={confidence.level} detail={confidence.detail} />}
    </div>
  );
}

function PatternTabs({
  active,
  onChange,
  hideCycle,
}: {
  active: PatternTab;
  onChange: (tab: PatternTab) => void;
  hideCycle: boolean;
}) {
  const { t } = useI18n();
  const tabs = hideCycle ? PATTERN_TABS.filter((tab) => tab.id !== "cycle") : PATTERN_TABS;

  return (
    <div
      className="mx-auto grid w-full max-w-[340px] gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label={t("Pattern sections")}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"
            }`}
          >
            {t(tab.label)}
          </button>
        );
      })}
    </div>
  );
}

function AnalysisRangeSelector({
  value,
  onChange,
}: {
  value: AnalysisRange;
  onChange: (value: AnalysisRange) => void;
}) {
  const { t } = useI18n();
  const options: Array<{ value: AnalysisRange; label: string }> = [
    { value: 7, label: "7 days" },
    { value: 30, label: "30 days" },
    { value: 90, label: "90 days" },
  ];

  return (
    <div
      className="mx-auto grid w-full max-w-[340px] grid-cols-3 gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm"
      role="tablist"
      aria-label={t("Patterns analysis period")}
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"
            }`}
          >
            {t(option.label)}
          </button>
        );
      })}
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  layoutOrderValue,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  layoutOrderValue?: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ order: layoutOrderValue }} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t(title)}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{t(subtitle)}</p>}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border/50 p-3 [&>section]:rounded-2xl [&>section]:bg-transparent [&>section]:p-1 [&>section]:ring-0">
          {children}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function PatternsContent() {
  const { t, language } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const dayLogs = view.dayLogs;
  const cycleTrackingHidden = isCycleTrackingHidden(view);
  const [activeTab, setActiveTab] = useState<PatternTab>(cycleTrackingHidden ? "monthly" : "cycle");
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(30);

  useEffect(() => {
    if (cycleTrackingHidden && activeTab === "cycle") {
      setActiveTab("monthly");
    }
  }, [activeTab, cycleTrackingHidden]);

  const cycles = useMemo(() => (cycleTrackingHidden ? [] : historicCycles(view)), [cycleTrackingHidden, view]);
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

  const adminCycleMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminCycleFieldsForFeature(view, featureBase.id).map((field) => {
      const metricFn = (log: DayLog) => {
        const values = (log.adminFields?.[featureBase.id] ?? []).map((entry) => Number(entry.values[field.id])).filter((value) => Number.isFinite(value));
        return avg(values);
      };
      return { id: `${featureBase.id}:${field.id}`, title: `${feature.label} · ${field.label}`, bars: [
        { label: "Before", value: phaseAvg(phaseBuckets.before, dayLogs, metricFn) },
        { label: "During", value: phaseAvg(phaseBuckets.during, dayLogs, metricFn) },
        { label: "After", value: phaseAvg(phaseBuckets.after, dayLogs, metricFn) },
      ] as PhaseBar[], max: field.kind === "scale" ? field.scale?.max : undefined, unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "" };
    });
  });

  const commonFlow = phaseFlowMode(phaseBuckets.during, dayLogs);
  const highestPainPhase = phaseLabelByValue(painPhaseBars);
  const bestEnergyPhase = phaseLabelByValue(energyPhaseBars);
  const worstMoodPhase = phaseLabelByValue(moodPhaseBars);
  const mostHotFlashPhase = phaseLabelByValue(hotFlashPhaseBars);

  /* ------------------------------------------------------------------------ */
  /* Monthly calculations                                                     */
  /* ------------------------------------------------------------------------ */

  const [currentMonthPrefix, previousMonthPrefix] = thisAndLastMonthPrefixes();
  const currentMonthLabel = monthLabelFromPrefix(currentMonthPrefix, language);
  const previousMonthLabel = monthLabelFromPrefix(previousMonthPrefix, language);
  const monthlyComparisonLabel = `${currentMonthLabel} vs ${previousMonthLabel}`;

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
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0).length,
    dayHotFlash,
  );

  const hotFlashPrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0).length,
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
    avg(days.map((day) => latestWeightForDay(dayLogs[day])).filter((value): value is number => value != null));

  const adminMonthlyMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminMonthlyFieldsForFeature(view, featureBase.id).map((field) => {
      const averageForDays = (days: string[]) => {
        const values = days.flatMap((day) =>
          (dayLogs[day]?.adminFields?.[featureBase.id] ?? [])
            .map((entry) => Number(entry.values[field.id]))
            .filter((value) => Number.isFinite(value)),
        );
        return avg(values);
      };
      return {
        id: `${featureBase.id}:${field.id}`,
        title: `${feature.label} · ${field.label}`,
        previous: averageForDays(previousMonthDays),
        current: averageForDays(currentMonthDays),
        max: field.kind === "scale" ? field.scale?.max : undefined,
        unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "",
      };
    });
  });

  const medicationAdherence = (days: string[]) => {
    const scheduledMeds = view.meds.filter((med) => !med.asNeeded);
    const comparisonNow = new Date();
    const cutoffMinutes = comparisonNow.getHours() * 60 + comparisonNow.getMinutes();
    const lastComparableDay = days[days.length - 1];

    let expected = 0;
    let taken = 0;

    days.forEach((day) => {
      scheduledMeds.forEach((med) => {
        med.times.forEach((time) => {
          const key = `${med.id}@${time}`;
          const isTaken = !!view.medLog[day]?.[key];

          if (day === lastComparableDay && !isTaken) {
            const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
            if (!match) return;

            const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);
            if (scheduledMinutes > cutoffMinutes) return;
          }

          expected += 1;
          if (isTaken) taken += 1;
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

  // Treatment data is part of BixboData so it is protected by the same
  // local snapshot, JSON backup, cloud sync and merge logic as health logs.
  const legacyTreatmentMigrationChecked = useRef(false);
  const activeTreatment = view.patterns?.activeTreatment;
  const archivedTreatments = view.patterns?.treatmentArchive ?? [];
  const treatmentDate = activeTreatment?.date ?? "";
  const treatmentName = activeTreatment?.name ?? "";
  const treatmentKind: TreatmentKind = activeTreatment?.kind ?? "medication";
  const treatmentResult: TreatmentResult = activeTreatment?.result ?? "pain";
  const treatmentNotes = activeTreatment?.notes ?? "";
  const customTreatment = activeTreatment?.custom ?? false;

  const patchActiveTreatment = (patch: Partial<NonNullable<typeof activeTreatment>>) => {
    update((d) => {
      const current = d.patterns?.activeTreatment ?? {
        date: "",
        name: "",
        kind: "medication" as TreatmentKind,
        result: "pain" as TreatmentResult,
        notes: "",
        custom: false,
      };
      return {
        ...d,
        patterns: {
          ...(d.patterns ?? { treatmentArchive: [] }),
          activeTreatment: { ...current, ...patch },
          treatmentArchive: d.patterns?.treatmentArchive ?? [],
        },
      };
    });
  };

  const setTreatmentDate = (value: string) => patchActiveTreatment({ date: value });
  const setTreatmentName = (value: string) => patchActiveTreatment({ name: value });
  const setTreatmentKind = (value: TreatmentKind) => patchActiveTreatment({ kind: value });
  const setTreatmentResult = (value: TreatmentResult) => patchActiveTreatment({ result: value });
  const setTreatmentNotes = (value: string) => patchActiveTreatment({ notes: value });
  const setCustomTreatment = (value: boolean) => patchActiveTreatment({ custom: value });

  // One-time non-destructive bridge from older localStorage-only Treatments.
  // The migration marker prevents an intentionally deleted treatment from
  // being resurrected from an old emergency copy on a later reload.
  useEffect(() => {
    if (!hydrated || legacyTreatmentMigrationChecked.current || typeof window === "undefined") return;
    legacyTreatmentMigrationChecked.current = true;

    const migrationKey = "bixbo:patterns:treatment:migrated-to-main-data";
    if (window.localStorage.getItem(migrationKey) === "1") return;

    const parseObject = (raw: string | null): Record<string, unknown> | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    const parseArray = (raw: string | null): ArchivedTreatment[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ArchivedTreatment[]) : [];
      } catch {
        return [];
      }
    };

    const legacyActive =
      parseObject(window.localStorage.getItem("bixbo:patterns:treatment")) ??
      parseObject(window.localStorage.getItem("bixbo:patterns:treatment:backup"));
    const legacyArchivePrimary = parseArray(window.localStorage.getItem("bixbo:patterns:treatment-archive"));
    const legacyArchiveBackup = parseArray(window.localStorage.getItem("bixbo:patterns:treatment-archive:backup"));
    const legacyArchive = legacyArchivePrimary.length ? legacyArchivePrimary : legacyArchiveBackup;

    if (legacyActive || legacyArchive.length) {
      update((d) => {
        const alreadyHasActive = Boolean(d.patterns?.activeTreatment);
        const alreadyHasArchive = Boolean(d.patterns?.treatmentArchive?.length);
        const importedActive = legacyActive
          ? {
              date: typeof legacyActive.date === "string" ? legacyActive.date : "",
              name: typeof legacyActive.name === "string" ? legacyActive.name : "",
              kind: (typeof legacyActive.kind === "string" ? legacyActive.kind : "medication") as TreatmentKind,
              result: (typeof legacyActive.result === "string" ? legacyActive.result : "pain") as TreatmentResult,
              notes: typeof legacyActive.notes === "string" ? legacyActive.notes : "",
              custom: Boolean(legacyActive.custom),
            }
          : undefined;

        return {
          ...d,
          patterns: {
            ...(d.patterns ?? { treatmentArchive: [] }),
            activeTreatment: alreadyHasActive ? d.patterns?.activeTreatment : importedActive,
            treatmentArchive: alreadyHasArchive ? d.patterns!.treatmentArchive : legacyArchive,
          },
        };
      });
    }

    // Keep the old keys as an emergency read-only copy for this migration,
    // but never use them as the canonical source again.
    window.localStorage.setItem(migrationKey, "1");
  }, [hydrated, update]);

  const clearActiveTreatment = () => {
    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: undefined,
        treatmentArchive: d.patterns?.treatmentArchive ?? [],
      },
    }));
  };

  const archiveTreatmentComparison = () => {
    if (!treatmentDate) {
      window.alert("Choose a treatment start date before archiving.");
      return;
    }

    if (
      !window.confirm(
        "Archive this treatment? It will move to Treatment history and remain available for future review. Daily health logs and medications will not be changed.",
      )
    ) {
      return;
    }

    const archived: ArchivedTreatment = {
      id: `${Date.now()}`,
      name: treatmentName.trim() || "Unnamed treatment",
      kind: treatmentKind,
      result: treatmentResult,
      notes: treatmentNotes.trim(),
      startDate: treatmentDate,
      archivedAt: todayKey(),
      custom: customTreatment,
    };

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: undefined,
        treatmentArchive: [archived, ...(d.patterns?.treatmentArchive ?? [])],
      },
    }));
  };

  const deleteTreatmentComparison = () => {
    if (
      !window.confirm(
        "Permanently delete this treatment comparison? This removes the treatment name, type, start date and notes. Daily health logs and medications will NOT be deleted.",
      )
    ) {
      return;
    }

    clearActiveTreatment();
  };

  const restoreArchivedTreatment = (archived: ArchivedTreatment) => {
    if (
      treatmentDate &&
      !window.confirm(
        "Replace the current active treatment with this archived treatment? The current active treatment will not be archived automatically.",
      )
    ) {
      return;
    }

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: {
          date: archived.startDate,
          name: archived.name === "Unnamed treatment" ? "" : archived.name,
          kind: archived.kind,
          result: archived.result ?? "pain",
          notes: archived.notes,
          custom: archived.custom,
        },
        treatmentArchive: (d.patterns?.treatmentArchive ?? []).filter((item) => item.id !== archived.id),
      },
    }));
  };

  const deleteArchivedTreatment = (id: string) => {
    if (
      !window.confirm(
        "Permanently delete this archived treatment? Daily health logs and medications will NOT be deleted.",
      )
    ) {
      return;
    }

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        treatmentArchive: (d.patterns?.treatmentArchive ?? []).filter((item) => item.id !== id),
      },
    }));
  };

  const treatmentWindow = (before: boolean) => {
    if (!treatmentDate) return [] as string[];

    const days: string[] = [];

    for (let index = 1; index <= 28; index += 1) {
      days.push(before ? addDays(treatmentDate, -index) : addDays(treatmentDate, index - 1));
    }

    return days;
  };

  const treatmentBeforeDays = treatmentWindow(true);
  const treatmentAfterDays = treatmentWindow(false).filter((day) => day <= todayKey());
  const treatmentBeforeLoggedDays = treatmentBeforeDays.filter((day) => Boolean(dayLogs[day])).length;
  const treatmentAfterLoggedDays = treatmentAfterDays.filter((day) => Boolean(dayLogs[day])).length;

  const treatmentMetric = (metricFn: (log: DayLog) => number | null): TreatmentMetric => ({
    before: avg(
      treatmentBeforeDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
    after: avg(
      treatmentAfterDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
  });

  const treatmentEventRate = (countFn: (log: DayLog) => number): TreatmentMetric => ({
    before: treatmentBeforeDays.length
      ? treatmentBeforeDays.reduce((sum, day) => sum + countFn(dayLogs[day] ?? {}), 0) / treatmentBeforeDays.length
      : null,
    after: treatmentAfterDays.length
      ? treatmentAfterDays.reduce((sum, day) => sum + countFn(dayLogs[day] ?? {}), 0) / treatmentAfterDays.length
      : null,
  });

  const treatmentPain = treatmentMetric((log) => avgDayPain(log) ?? null);
  const treatmentTetany = treatmentMetric(dayTetanyIntensity);
  const treatmentPanic = treatmentMetric(dayPanicIntensity);
  const treatmentTetanyEpisodes = treatmentEventRate((log) => log.tetany?.length ?? 0);
  const treatmentPanicEpisodes = treatmentEventRate((log) => log.panic?.length ?? 0);
  const treatmentHeadache = treatmentEventRate(
    (log) =>
      (log.pain ?? []).filter(
        (entry) =>
          entry.headache ||
          entry.headacheIntensity != null ||
          (entry.headacheTypes?.length ?? 0) > 0,
      ).length,
  );

  const treatmentHeadacheIntensity = treatmentMetric(dayHeadacheIntensity);

  const treatmentHotFlash = treatmentMetric(dayHotFlash);
  const treatmentHotFlashEpisodes = treatmentEventRate(
    (log) =>
      (log.pain ?? []).filter(
        (entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0,
      ).length,
  );

  const treatmentResultOptions: Array<{
    id: TreatmentResult;
    label: string;
    metric: TreatmentMetric;
    decimals: number;
    unit: string;
    max?: number;
    color: MetricColor;
  }> = [
    { id: "pain", label: "Pain", metric: treatmentPain, decimals: 1, unit: "/10", max: 10, color: "rose" },
    {
      id: "panicEpisodes",
      label: "Panic episode",
      metric: treatmentPanicEpisodes,
      decimals: 2,
      unit: "/day",
      color: "purple",
    },
    {
      id: "tetanyEpisodes",
      label: "Tetany episode",
      metric: treatmentTetanyEpisodes,
      decimals: 2,
      unit: "/day",
      color: "blue",
    },
    {
      id: "headache",
      label: "Headache",
      metric: treatmentHeadache,
      decimals: 2,
      unit: "/day",
      color: "cyan",
    },
    {
      id: "panicIntensity",
      label: "Panic intensity",
      metric: treatmentPanic,
      decimals: 1,
      unit: "/10",
      max: 10,
      color: "purple",
    },
    {
      id: "tetanyIntensity",
      label: "Tetany intensity",
      metric: treatmentTetany,
      decimals: 1,
      unit: "/5",
      max: 5,
      color: "blue",
    },
  ];

  const selectedTreatmentResult =
    treatmentResultOptions.find((option) => option.id === treatmentResult) ?? treatmentResultOptions[0];

  const treatmentChanges = [
    { label: "Pain", metric: treatmentPain },
    { label: "Tetany episodes", metric: treatmentTetanyEpisodes },
    { label: "Tetany intensity", metric: treatmentTetany },
    { label: "Panic episodes", metric: treatmentPanicEpisodes },
    { label: "Panic intensity", metric: treatmentPanic },
    { label: "Hot flashes", metric: treatmentHotFlash },
    { label: "Hot flash episodes", metric: treatmentHotFlashEpisodes },
    { label: "Headache", metric: treatmentHeadache },
    { label: "Headache intensity", metric: treatmentHeadacheIntensity },
  ]
    .filter((entry) => entry.metric.before != null && entry.metric.after != null)
    .map((entry) => {
      const delta = Number(entry.metric.after) - Number(entry.metric.before);
      return {
        ...entry,
        delta,
        percent: percentageChange(entry.metric.before, entry.metric.after),
      };
    });

  const treatmentImprovedCount = treatmentChanges.filter((entry) => entry.delta < 0).length;
  const treatmentWorsenedCount = treatmentChanges.filter((entry) => entry.delta > 0).length;
  const treatmentUnchangedCount = treatmentChanges.filter((entry) => entry.delta === 0).length;
  const strongestTreatmentChange =
    [...treatmentChanges].sort((a, b) => Math.abs(b.percent ?? b.delta) - Math.abs(a.percent ?? a.delta))[0] ?? null;
  const treatmentOverall =
    treatmentChanges.length === 0
      ? "Not enough data"
      : treatmentImprovedCount > treatmentWorsenedCount
        ? "Overall improvement"
        : treatmentWorsenedCount > treatmentImprovedCount
          ? "Overall worsening"
          : "Mixed or unchanged";

  const treatmentLoggedDays = treatmentBeforeLoggedDays + treatmentAfterLoggedDays;
  const treatmentConfidence: ConfidenceLevel =
    treatmentBeforeLoggedDays >= 21 && treatmentAfterLoggedDays >= 21
      ? "High"
      : treatmentBeforeLoggedDays >= 7 && treatmentAfterLoggedDays >= 7
        ? "Medium"
        : "Low";

  const treatmentChangeLabel = (entry: (typeof treatmentChanges)[number] | null) => {
    if (!entry) return "Not enough data";
    const direction = entry.delta < 0 ? "improved" : entry.delta > 0 ? "worsened" : "unchanged";
    const relative = entry.percent == null ? "" : ` · ${formatSignedPercent(entry.percent)}`;
    return `${entry.label}: ${direction}${relative}`;
  };

  const formattedTreatmentDate = treatmentDate
    ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${treatmentDate}T12:00:00`),
      )
    : "Select treatment start date";

  const treatmentKindLabel =
    treatmentKind === "medication"
      ? "Medication"
      : treatmentKind === "supplement"
        ? "Supplement"
        : treatmentKind === "diet"
          ? "Diet"
          : treatmentKind === "therapy"
            ? "Therapy"
            : treatmentKind === "exercise"
              ? "Exercise"
              : "Other";

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
  ].filter((option) => {
    if (!cycleTrackingHidden) return true;
    return option.id !== "period" && option.id !== "heavyPeriod";
  });

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

  useEffect(() => {
    if (!triggerOptions.some((option) => option.id === selectedTrigger)) {
      setSelectedTrigger(triggerOptions[0]?.id ?? "");
    }
  }, [cycleTrackingHidden, selectedTrigger, view.custom.foodQuickAdd]);

  useEffect(() => {
    if (!outcomeOptions.some((option) => option.id === selectedOutcome)) {
      setSelectedOutcome(outcomeOptions[0]?.id ?? "");
    }
  }, [selectedOutcome]);

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
      const level = log.periodInfo?.level ?? log.period;
      return (
        level === "spotting" || level === "light" || level === "medium" || level === "heavy" || level === "very-heavy"
      );
    }

    if (trigger === "heavyPeriod") {
      const level = log.periodInfo?.level ?? log.period;
      return level === "heavy" || level === "very-heavy";
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
      return (dayBowelSymptoms(log) ?? 0) > 0;
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

  const analysisDays = useMemo(() => {
    const start = addDays(todayKey(), -(analysisRange - 1));
    return allLoggedDays.filter((day) => day >= start && day <= todayKey());
  }, [allLoggedDays, analysisRange]);

  const daysWithTrigger = analysisDays.filter((day) => hasTrigger(day, dayLogs[day], selectedTrigger));

  const daysWithoutTrigger = analysisDays.filter((day) => !hasTrigger(day, dayLogs[day], selectedTrigger));

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
      const withDays = analysisDays.filter((day) => hasTrigger(day, dayLogs[day], trigger.id));
      const withoutDays = analysisDays.filter((day) => !hasTrigger(day, dayLogs[day], trigger.id));
      if (withDays.length < 3 || withoutDays.length < 3) return;

      outcomeOptions.forEach((outcome) => {
        // Do not rank an event against itself (for example Panic → Panic or
        // Poor sleep → Poor sleep). Those are tautologies, not correlations.
        if (trigger.id === outcome.id) return;

        const equivalentPairs = new Set([
          "panic:panic",
          "tetany:tetany",
          "headache:headache",
          "hotFlash:hotFlash",
          "poorSleep:poorSleep",
          "histamineFlare:histamineFlare",
        ]);
        if (equivalentPairs.has(`${trigger.id}:${outcome.id}`)) return;

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
    <div className="space-y-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2">
        <PatternTabs active={activeTab} onChange={setActiveTab} hideCycle={cycleTrackingHidden} />

        {activeTab === "triggers" && (
          <div className="lg:col-span-2">
            <AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} />
          </div>
        )}

        {!cycleTrackingHidden && activeTab === "cycle" && (
          <div className="flex flex-col gap-3 lg:contents">
            {/* ------------------------------------------------------------------ */}
            {/* Cycle phase                                                        */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.cycle", "painFlow", 10)}
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
                        <p className="text-xs font-medium text-foreground">{t("Most common period flow")}</p>

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
                <div className="mt-4 rounded-3xl bg-background p-4 ring-1 ring-border">
                  <h3 className="text-sm font-semibold text-foreground">{t("Cycle Summary")}</h3>

                  <div className="mt-3 space-y-2.5">
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
              layoutOrderValue={layoutOrder(view, "patterns.cycle", "bodyChanges", 20)}
              title="Body changes"
              subtitle="Mood, energy, hot flashes, pressure and bowel symptoms"
              defaultOpen={false}
            >
              <Card
                title="Cycle phase — other"
                description="Mood, energy, hot flashes and bowel symptoms grouped by cycle phase."
              >
                <div className="mt-3 space-y-2.5">
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
            {adminCycleMetrics.length > 0 ? (
              <CollapsibleSection layoutOrderValue={layoutOrder(view, "patterns.cycle", "customMetrics", 30)} title="Custom metrics" subtitle="Admin-created numeric and scale fields" defaultOpen={false}>
                <Card title="Cycle phase — custom metrics" description="Admin-created values grouped by cycle phase.">
                  <div className="mt-3 space-y-2.5">{adminCycleMetrics.map((metric) => <PhaseBarChart key={metric.id} title={metric.title} description="Average saved supplementary value by cycle phase." bars={metric.bars} max={metric.max ?? 10} decimals={1} unit={metric.unit} />)}</div>
                </Card>
              </CollapsibleSection>
            ) : null}
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="This month at a glance"
              description={`${monthlyComparisonLabel} · compared over the same number of days.`}
            >
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Most improved
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatChange(mostImproved)}
                  </p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Needs attention
                  </p>
                  <p className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-300">
                    {formatChange(mostWorsened)}
                  </p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Most stable
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatChange(mostStable)}</p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Confidence")}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{monthlyConfidence}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{monthlyLoggedDays} logged days</p>
                </div>
              </div>
            </Card>

            {adminMonthlyMetrics.length > 0 ? (
              <CollapsibleSection
                layoutOrderValue={layoutOrder(view, "patterns.monthly", "customMetrics", 60)}
                title="Custom metrics"
                subtitle="Admin-created numeric and scale fields"
                defaultOpen={false}
              >
                <Card
                  title="Monthly comparison — custom metrics"
                  description={`${monthlyComparisonLabel} · same number of elapsed days in each month.`}
                >
                  <div className="mt-3 space-y-2.5">
                    {adminMonthlyMetrics.map((metric) => (
                      <ComparisonMetric
                        key={metric.id}
                        title={metric.title}
                        subtitle="Average of saved supplementary values"
                        previous={metric.previous}
                        current={metric.current}
                        max={metric.max}
                        decimals={1}
                        unit={metric.unit}
                        color="green"
                        neutralTrend
                        icon={<Activity className="h-5 w-5" />}
                      />
                    ))}
                  </div>
                </Card>
              </CollapsibleSection>
            ) : null}

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
                detail: `Based on ${monthlyLoggedDays} logged day${monthlyLoggedDays === 1 ? "" : "s"} in ${currentMonthLabel}`,
              }}
            />

            {/* ------------------------------------------------------------------ */}
            {/* Monthly comparison — panic and tetany                              */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "panicTetany", 20)}
              title="Panic & tetany"
              subtitle="Monthly frequency and intensity comparison"
              defaultOpen={true}
            >
              <Card
                title="Monthly comparison — panic & tetany"
                description={`${monthlyComparisonLabel} · same number of elapsed days in each month.`}
              >
                <div className="mt-3 space-y-2.5">
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

            <CollapsibleSection title="Symptoms" subtitle="Hot flashes, headaches and pressure" defaultOpen={false}>
              <div className="space-y-3">
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
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "lifestyle", 40)}
              title="Lifestyle & routines"
              subtitle="Sleep, weight, medication and workouts"
              defaultOpen={false}
            >
              <div className="space-y-3">
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
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "hormones", 50)}
              title="Hormones"
              subtitle="PCOS and histamine changes"
              defaultOpen={false}
            >
              <div className="space-y-3">
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

            </CollapsibleSection>
          </div>
        )}

        {activeTab === "treatment" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="Treatment comparison"
              description="Compare the four weeks before treatment with the first four weeks after its start."
            >
              <div className="mt-3 space-y-2.5">
                <div>
                  <label htmlFor="treatment-name" className="text-sm font-semibold text-foreground">
                    {t("What did you start?")}
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("Choose one of your medicines or enter another treatment.")}
                  </p>

                  {!customTreatment && view.meds.length > 0 ? (
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        id="treatment-name"
                        value={treatmentName}
                        onChange={(event) => setTreatmentName(event.target.value)}
                        className="min-h-11 min-w-0 rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="">{t("Choose medicine")}</option>
                        {view.meds.map((med) => (
                          <option key={med.id} value={med.name}>
                            {med.name}
                            {med.dose ? ` — ${med.dose}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTreatment(true);
                          setTreatmentName("");
                        }}
                        className="min-h-11 rounded-2xl bg-background px-3 text-xs font-semibold text-primary ring-1 ring-border"
                      >
                        {t("Other")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        id="treatment-name"
                        type="text"
                        value={treatmentName}
                        onChange={(event) => setTreatmentName(event.target.value)}
                        placeholder={t("e.g. Elicea, physiotherapy, low-histamine diet")}
                        className="min-h-11 min-w-0 rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      {view.meds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTreatment(false);
                            setTreatmentName("");
                          }}
                          className="min-h-11 rounded-2xl bg-background px-3 text-xs font-semibold text-primary ring-1 ring-border"
                        >
                          {t("Medicines")}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="treatment-kind" className="text-sm font-semibold text-foreground">
                    {t("Type")}
                  </label>
                  <select
                    id="treatment-kind"
                    value={treatmentKind}
                    onChange={(event) => setTreatmentKind(event.target.value as TreatmentKind)}
                    className="mt-2 min-h-11 w-full rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="medication">{t("Medication")}</option>
                    <option value="supplement">{t("Supplement")}</option>
                    <option value="diet">{t("Diet")}</option>
                    <option value="therapy">{t("Therapy")}</option>
                    <option value="exercise">{t("Exercise")}</option>
                    <option value="other">{t("Other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="treatment-result" className="text-sm font-semibold text-foreground">
                    {t("Treatment result")}
                  </label>
                  <select
                    id="treatment-result"
                    value={treatmentResult}
                    onChange={(event) => setTreatmentResult(event.target.value as TreatmentResult)}
                    className="mt-2 min-h-12 w-full rounded-2xl bg-tint px-4 text-sm font-medium text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="pain">{t("Pain")}</option>
                    <option value="panicEpisodes">{t("Panic episode")}</option>
                    <option value="tetanyEpisodes">{t("Tetany episode")}</option>
                    <option value="headache">{t("Headache")}</option>
                    <option value="panicIntensity">{t("Panic intensity")}</option>
                    <option value="tetanyIntensity">{t("Tetany intensity")}</option>
                  </select>
                </div>

                <div>
                  <span className="text-sm font-semibold text-foreground">{t("Treatment start date")}</span>
                  <div className="relative mt-2 min-h-12 overflow-hidden rounded-2xl bg-tint ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                    <div className="pointer-events-none flex min-h-12 items-center justify-between gap-3 px-4">
                      <span
                        className={`text-sm font-medium ${treatmentDate ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {formattedTreatmentDate}
                      </span>
                      <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
                    </div>
                    <input
                      type="date"
                      aria-label={t("Treatment start date")}
                      max={todayKey()}
                      value={treatmentDate}
                      onChange={(event) => setTreatmentDate(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-[0.01]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="treatment-notes" className="text-sm font-semibold text-foreground">
                    {t("Notes")} <span className="font-normal text-muted-foreground">{t("(optional)")}</span>
                  </label>
                  <textarea
                    id="treatment-notes"
                    value={treatmentNotes}
                    onChange={(event) => setTreatmentNotes(event.target.value)}
                    placeholder={t("Why you started it, dose change, or anything useful to remember")}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl bg-tint px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {(treatmentDate || treatmentName || treatmentNotes) && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {treatmentName || t("Unnamed treatment")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {treatmentKindLabel} · Result: {selectedTreatmentResult.label}
                        {treatmentDate ? ` · Started ${formattedTreatmentDate}` : " · Start date not selected"}
                      </p>
                    </div>
                  </div>
                )}

                {(treatmentDate || treatmentName || treatmentNotes) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={archiveTreatmentComparison}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary/10 px-3 text-sm font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Archive className="h-4 w-4" />
                      {t("Archive")}
                    </button>
                    <button
                      type="button"
                      onClick={deleteTreatmentComparison}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-3 text-sm font-semibold text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("Delete")}
                    </button>
                  </div>
                )}

                {!treatmentDate && (
                  <Empty text="Add what you started and choose its start date. Then log at least 7 days before and after it to unlock the comparison." />
                )}
              </div>
            </Card>

            {treatmentDate && (
              <>
                <SummaryPanel
                  title={treatmentName ? `${treatmentName} at a glance` : "Treatment at a glance"}
                  items={[
                    {
                      label: "Treatment",
                      value: `${treatmentName || "Unnamed"} · ${treatmentKindLabel}`,
                      tone: "neutral",
                    },
                    {
                      label: "Started",
                      value: formattedTreatmentDate,
                      tone: "neutral",
                    },
                    {
                      label: "Treatment result",
                      value: selectedTreatmentResult.label,
                      tone: "neutral",
                    },
                    {
                      label: "Logged data",
                      value: `${treatmentBeforeLoggedDays} before · ${treatmentAfterLoggedDays} after`,
                      tone: "neutral",
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
                    {
                      label: "Strongest change",
                      value: treatmentChangeLabel(strongestTreatmentChange),
                      tone:
                        strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta < 0
                          ? "good"
                          : strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta > 0
                            ? "bad"
                            : "neutral",
                    },
                  ]}
                  confidence={{
                    level: treatmentConfidence,
                    detail: `Based on ${treatmentBeforeLoggedDays} days before and ${treatmentAfterLoggedDays} days after`,
                  }}
                />

                <CollapsibleSection
                  title="Treatment results"
                  subtitle="Pain, tetany, panic, hot flashes and headache before versus after"
                  defaultOpen={true}
                >
                  <div className="space-y-3">
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
                      title="Tetany episodes"
                      subtitle="Average number of tetany episodes per day"
                      previous={treatmentTetanyEpisodes.before}
                      current={treatmentTetanyEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="blue"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Activity className="h-5 w-5" />}
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
                      title="Panic episodes"
                      subtitle="Average number of panic episodes per day"
                      previous={treatmentPanicEpisodes.before}
                      current={treatmentPanicEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="purple"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Sparkles className="h-5 w-5" />}
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
                      title="Hot flashes"
                      subtitle="Average hot flash intensity before and after treatment"
                      previous={treatmentHotFlash.before}
                      current={treatmentHotFlash.after}
                      max={5}
                      decimals={1}
                      unit="/5"
                      color="orange"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Flame className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Hot flash episodes"
                      subtitle="Average number of hot flash entries per day"
                      previous={treatmentHotFlashEpisodes.before}
                      current={treatmentHotFlashEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="orange"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Flame className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Headache"
                      subtitle="Average number of headache entries per day"
                      previous={treatmentHeadache.before}
                      current={treatmentHeadache.after}
                      decimals={2}
                      unit="/day"
                      color="cyan"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Brain className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Headache intensity"
                      subtitle="Average headache intensity before and after treatment"
                      previous={treatmentHeadacheIntensity.before}
                      current={treatmentHeadacheIntensity.after}
                      max={10}
                      decimals={1}
                      unit="/10"
                      color="cyan"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Brain className="h-5 w-5" />}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Detailed treatment summary"
                  subtitle="Counts and treatment marker details"
                  defaultOpen={false}
                >
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
                        label: "Unchanged metrics",
                        value: `${treatmentUnchangedCount}`,
                        tone: "neutral",
                      },
                      {
                        label: "Strongest change",
                        value: treatmentChangeLabel(strongestTreatmentChange),
                        tone:
                          strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta < 0
                            ? "good"
                            : strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta > 0
                              ? "bad"
                              : "neutral",
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
                      detail: `Based on ${treatmentBeforeLoggedDays} days before and ${treatmentAfterLoggedDays} days after`,
                    }}
                  />

                  <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
                    Treatment marker: {treatmentDate}. The comparison uses up to 28 days on each side of this date.
                  </p>
                </CollapsibleSection>
              </>
            )}
          </div>
        )}

        {activeTab === "treatment" && archivedTreatments.length > 0 && (
          <CollapsibleSection
            title="Treatment history"
            subtitle={`${archivedTreatments.length} archived treatment${archivedTreatments.length === 1 ? "" : "s"}`}
            defaultOpen={true}
          >
            <div className="space-y-2.5">
              {archivedTreatments.map((archived) => {
                const archivedKindLabel =
                  archived.kind === "medication"
                    ? "Medication"
                    : archived.kind === "supplement"
                      ? "Supplement"
                      : archived.kind === "diet"
                        ? "Diet"
                        : archived.kind === "therapy"
                          ? "Therapy"
                          : archived.kind === "exercise"
                            ? "Exercise"
                            : "Other";

                const startLabel = new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${archived.startDate}T12:00:00`));

                const archivedLabel = new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${archived.archivedAt}T12:00:00`));

                return (
                  <article key={archived.id} className="rounded-2xl bg-tint p-3.5 ring-1 ring-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{archived.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {archivedKindLabel}
                          {archived.result
                            ? ` · Result: ${
                                archived.result === "panicEpisodes"
                                  ? "Panic episode"
                                  : archived.result === "tetanyEpisodes"
                                    ? "Tetany episode"
                                    : archived.result === "headache"
                                      ? "Headache"
                                      : archived.result === "panicIntensity"
                                        ? "Panic intensity"
                                        : archived.result === "tetanyIntensity"
                                          ? "Tetany intensity"
                                          : archived.result === "negativeMood"
                                            ? "Negative mood"
                                            : "Pain"
                              }`
                            : ""}
                          · Started {startLabel}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Archived {archivedLabel}</p>
                        {archived.notes && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {archived.notes}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Archived
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => restoreArchivedTreatment(archived)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-background px-3 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-surface"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore for comparison
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteArchivedTreatment(archived.id)}
                        aria-label={`Delete archived treatment ${archived.name}`}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {activeTab === "triggers" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="Smart correlations"
              description="Automatically ranked associations calculated only from your own logs."
            >
              {strongestAssociations.length === 0 ? (
                <Empty text="Log at least 3 days with and 3 days without a trigger to unlock smart correlations." />
              ) : (
                <div className="mt-3 space-y-2.5">
                  {strongestAssociations.slice(0, 5).map((association, index) => (
                    <article
                      key={`smart-${association.trigger}-${association.outcome}`}
                      className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface text-xs font-bold ring-1 ring-border/50">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {association.trigger} → {association.outcome}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            The outcome was {Math.abs(association.difference).toFixed(0)} percentage points{" "}
                            {association.difference > 0 ? "more common" : "less common"} on days with this trigger.
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Based on {association.withCount} days with and {association.withoutCount} days without the
                            trigger.
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  <p className="text-[10px] leading-relaxed text-muted-foreground"><TrText value="Correlations show associations in your logs. They do not prove that one factor caused another." /></p>
                </div>
              )}
            </Card>
            {/* ------------------------------------------------------------------ */}
            {/* Trigger comparison                                                 */}
            {/* ------------------------------------------------------------------ */}
            <Card
              title="Trigger comparison"
              description="Compare how often an outcome occurred on days with and without a possible trigger."
            >
              <div className="mt-3 space-y-2.5">
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

              <div className="mt-3 grid grid-cols-2 gap-2">
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

                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground"><TrText value="This shows an association in your logs, not proof that the selected trigger caused the outcome." /></p>
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

              <CollapsibleSection
                title="Strongest correlations"
                subtitle="Ranked associations calculated only from your logged data"
                defaultOpen={false}
              >
                {strongestAssociations.length === 0 ? (
                  <Empty text="Log at least 3 days with and 3 days without a trigger to calculate correlations." />
                ) : (
                  <div className="space-y-3">
                    {strongestAssociations.map((association) => (
                      <div
                        key={`${association.trigger}-${association.outcome}`}
                        className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                      >
                        <p className="text-sm font-semibold text-foreground">{association.trigger}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">→ {association.outcome}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Based on {association.withCount} days with and {association.withoutCount} days without the
                          trigger
                        </p>
                        <p
                          className={`mt-2 text-sm font-bold ${
                            association.difference > 0
                              ? "text-rose-600 dark:text-rose-300"
                              : "text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {Math.abs(association.difference).toFixed(0)} percentage points{" "}
                          {association.difference > 0 ? "higher" : "lower"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <button
                type="button"
                onClick={saveTriggerCombination}
                disabled={!selectedTrigger || !selectedOutcome}
                className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-[1.03] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save this comparison
              </button>

              <CollapsibleSection
                title="Saved comparisons"
                subtitle="Open a saved trigger and outcome pair"
                defaultOpen={false}
              >
                {(view.settings.savedTriggers ?? []).length === 0 ? (
                  <Empty text="No saved comparisons yet." />
                ) : (
                  <div className="space-y-2">
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
                            aria-label={t("Remove saved comparison")}
                            onClick={() => removeTriggerCombination(saved.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm text-muted-foreground transition hover:bg-background hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>
            </Card>{" "}
          </div>
        )}
    </div>
  );
}

function PatternsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("Health of Bixbo")}>
      <div className="px-5 pt-2 lg:px-0">
        <div className="grid grid-cols-2 rounded-2xl bg-tint p-1 ring-1 ring-border/70 lg:mx-auto lg:w-full lg:max-w-[420px]">
          <Link
            to="/insights"
            className="rounded-xl px-4 py-2 text-center text-sm font-semibold text-muted-foreground transition hover:bg-surface/70 hover:text-foreground"
          >
            Insights
          </Link>
          <span className="rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-sm">
            Patterns
          </span>
        </div>
      </div>
      <PatternsContent />
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
    <div className="rounded-2xl bg-tint p-3 text-center ring-1 ring-border/40">
      <p className="text-[11px] font-semibold text-muted-foreground"><TrText value={label} /></p>

      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {percentage != null ? `${percentage.toFixed(0)}%` : "—"}
      </p>

      <div className="mx-auto mt-2 flex h-16 w-10 items-end overflow-hidden rounded-xl bg-background/70">
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
