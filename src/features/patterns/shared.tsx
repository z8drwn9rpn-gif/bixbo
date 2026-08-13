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
import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCorrelationFieldsForFeature, registryAdminCorrelationThreshold, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";
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

export function TrText({ value }: { value: unknown }) {
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

export type MetricColor =
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

export type PhaseBar = {
  label: string;
  value: number | null;
};

export type ComparisonMetricProps = {
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

export type TreatmentMetric = {
  before: number | null;
  after: number | null;
};

export type SelectOption = {
  id: string;
  label: string;
};

export function strictAdminNumericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

export type VitalEntry = {
  id?: string;
  time?: string;
  value: number;
};

export type DayLogWithVitals = DayLog & {
  weightEntries?: VitalEntry[];
};

export function latestWeightForDay(log: DayLog | undefined): number | null {
  if (!log) return null;
  const entries = ((log as DayLogWithVitals).weightEntries ?? [])
    .filter((entry) => entry && Number.isFinite(Number(entry.value)))
    .map((entry) => ({ ...entry, value: Number(entry.value), time: entry.time ?? "" }))
    .sort((a, b) => a.time.localeCompare(b.time));

  if (entries.length > 0) return entries[entries.length - 1].value;
  return log.weight != null && Number.isFinite(Number(log.weight)) ? Number(log.weight) : null;
}

export type PatternTab = "cycle" | "monthly" | "treatment" | "triggers";

export type AnalysisRange = 7 | 30 | 90;

export type TreatmentKind = PatternTreatmentKind;

export type TreatmentResult = PatternTreatmentResult;

export type ArchivedTreatment = ArchivedPatternTreatment;

export const PATTERN_TABS: Array<{ id: PatternTab; label: string }> = [
  { id: "cycle", label: "Cycle" },
  { id: "monthly", label: "Monthly" },
  { id: "treatment", label: "Treatment" },
  { id: "triggers", label: "Triggers" },
];

export const METRIC_COLORS: Record<
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

export const PHASE_COLORS = [
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

export function Card({ title, description, children, layoutOrderValue }: { title: string; description?: string; children: ReactNode; layoutOrderValue?: number }) {
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

export function Empty({ text = "Log at least 7 days to unlock this analysis." }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 rounded-2xl bg-tint px-4 py-5 text-center ring-1 ring-border/40">
      <p className="text-sm font-medium text-foreground">{t("More data needed")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(text)}</p>
    </div>
  );
}

export function formatMetricValue(value: number | null, decimals: number, unit: string) {
  if (value == null || !Number.isFinite(value)) return "—";

  return `${value.toFixed(decimals)}${unit}`;
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function percentageChange(previous: number | null, current: number | null): number | null {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatSignedPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

export function phaseLabelByValue(bars: PhaseBar[], mode: "highest" | "lowest" = "highest") {
  const available = bars.filter(
    (bar): bar is PhaseBar & { value: number } => bar.value != null && Number.isFinite(bar.value),
  );

  if (available.length === 0) return "—";

  return available.reduce((selected, current) => {
    if (mode === "lowest") return current.value < selected.value ? current : selected;
    return current.value > selected.value ? current : selected;
  }).label;
}

export function PhaseBarChart({
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

export function monthLabelFromPrefix(prefix: string, language: "en" | "sk"): string {
  const match = /^(\d{4})-(\d{2})$/.exec(prefix);
  if (!match) return prefix;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function ComparisonMetric({
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

export function MetricColumn({
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

export function SummaryRow({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
      <span className="text-sm text-muted-foreground">{t(label)}</span>

      <span className="font-semibold text-foreground"><TrText value={value} /></span>
    </div>
  );
}

export type ConfidenceLevel = "Low" | "Medium" | "High";

export type SummaryItem = {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
};

export function ConfidenceBadge({ level, detail }: { level: ConfidenceLevel; detail: string }) {
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

export function SummaryPanel({
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

export function PatternTabs({
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
            data-bixbo-pattern-tab={tab.id}
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

export function AnalysisRangeSelector({
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

export function CollapsibleSection({
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

export function TriggerResult({
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
