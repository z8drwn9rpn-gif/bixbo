import { useState, type ReactNode } from "react";
import { ChevronDown, Ico } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { layoutOrder } from "@/lib/layoutRegistry";
import type { PatternsContentModel } from "./usePatternsContentModel";
import { clampPercent, formatMetricValue, percentageChange, TrText } from "./shared";

type Tone = "good" | "bad" | "neutral";

type MetricCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  previous: number | null;
  current: number | null;
  previousLabel: string;
  currentLabel: string;
  decimals?: number;
  unit?: string;
  color: string;
  max?: number;
  higherIsWorse?: boolean;
  neutralTrend?: boolean;
};

function toneClass(tone: Tone) {
  if (tone === "good") return "text-emerald-700 dark:text-emerald-300";
  if (tone === "bad") return "text-rose-600 dark:text-rose-300";
  return "text-muted-foreground";
}

function comparisonSummary(
  previous: number | null,
  current: number | null,
  decimals: number,
  unit: string,
  higherIsWorse: boolean,
  neutralTrend = false,
) {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return { text: "Comparison unavailable", tone: "neutral" as Tone };
  }

  const delta = current - previous;
  if (delta === 0) return { text: "No change", tone: "neutral" as Tone };

  const tone: Tone = neutralTrend ? "neutral" : higherIsWorse ? (delta < 0 ? "good" : "bad") : delta > 0 ? "good" : "bad";
  const verb = neutralTrend ? "Changed" : tone === "good" ? "Improved" : "Worsened";
  const absolute = formatMetricValue(Math.abs(delta), decimals, unit);
  const pct = percentageChange(previous, current);
  const pctText = pct == null ? "" : ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`;

  return { text: `${verb} by ${absolute}${pctText}`, tone };
}

function MetricHeader({ icon, title, subtitle, color }: { icon: string; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/80 ring-1 ring-border/55"
        style={{ boxShadow: "0 3px 8px rgba(45,52,35,.12)" }}
      >
        <Ico e={icon} size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight" style={{ color }}>
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ComparisonFooter({ text, tone }: { text: string; tone: Tone }) {
  return (
    <div className={`mt-3 rounded-xl bg-background/70 px-3 py-2 text-center text-[11px] font-semibold ring-1 ring-border/45 ${toneClass(tone)}`}>
      {text}
    </div>
  );
}

function VerticalComparisonCard({
  title,
  subtitle,
  icon,
  previous,
  current,
  previousLabel,
  currentLabel,
  decimals = 0,
  unit = "",
  color,
  max,
  higherIsWorse = true,
  neutralTrend = false,
}: MetricCardProps) {
  const values = [previous, current].filter((value): value is number => value != null && Number.isFinite(value));
  const chartMax = Math.max(1, max ?? 0, ...values.map((value) => Math.abs(value)));
  const summary = comparisonSummary(previous, current, decimals, unit, higherIsWorse, neutralTrend);

  return (
    <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45">
      <MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: previousLabel, value: previous, opacity: 0.52 },
          { label: currentLabel, value: current, opacity: 1 },
        ].map((item) => {
          const pct = item.value == null ? 0 : clampPercent((Math.max(0, item.value) / chartMax) * 100);
          return (
            <div key={`${title}-${item.label}`} className="min-w-0 text-center">
              <p className="truncate text-[10px] font-semibold text-muted-foreground">{item.label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                {formatMetricValue(item.value, decimals, unit)}
              </p>
              <div className="relative mx-auto mt-2 flex h-24 max-w-[108px] items-end justify-center rounded-2xl bg-background/45 px-3 pb-2 ring-1 ring-border/35">
                <span className="absolute bottom-1.5 h-2 w-[72%] rounded-full bg-tint ring-1 ring-border/35" />
                {item.value != null ? (
                  <span
                    data-bixbo-chart-mark="bar"
                    className="relative z-10 w-9 rounded-t-[8px]"
                    style={{
                      height: `${Math.max(item.value === 0 ? 4 : 10, pct * 0.72)}px`,
                      background: color,
                      opacity: item.opacity,
                      filter: `saturate(${item.opacity === 1 ? 1.48 : 1.25}) contrast(1.06)`,
                    }}
                  />
                ) : (
                  <span className="relative z-10 mb-1 text-lg font-semibold text-muted-foreground">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ComparisonFooter text={summary.text} tone={summary.tone} />
    </article>
  );
}

function IntensityComparisonCard({
  title,
  subtitle,
  icon,
  previous,
  current,
  previousLabel,
  currentLabel,
  decimals = 1,
  unit = "",
  color,
  max = 10,
  higherIsWorse = true,
  neutralTrend = false,
}: MetricCardProps) {
  const summary = comparisonSummary(previous, current, decimals, unit, higherIsWorse, neutralTrend);
  const previousPct = previous == null ? null : clampPercent((Math.max(0, previous) / max) * 100);
  const currentPct = current == null ? null : clampPercent((Math.max(0, current) / max) * 100);
  const connectorStart = previousPct != null && currentPct != null ? Math.min(previousPct, currentPct) : null;
  const connectorWidth = previousPct != null && currentPct != null ? Math.abs(currentPct - previousPct) : null;

  return (
    <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45">
      <MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground">{previousLabel}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatMetricValue(previous, decimals, unit)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-muted-foreground">{currentLabel}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color }}>{formatMetricValue(current, decimals, unit)}</p>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-background/45 px-3 pb-3 pt-2.5 ring-1 ring-border/35">
        <div className="flex justify-between text-[9px] tabular-nums text-muted-foreground">
          <span>0</span>
          <span>{max / 2}</span>
          <span>{max}</span>
        </div>
        <div className="relative mt-1 h-8">
          <div className="absolute inset-x-1 top-[13px] h-1.5 rounded-full bg-tint ring-1 ring-border/40" />
          {connectorStart != null && connectorWidth != null ? (
            <span
              className="absolute top-[13px] h-1.5 rounded-full"
              style={{
                left: `calc(${connectorStart}% + 4px)`,
                width: `calc(${connectorWidth}% - 1px)`,
                background: color,
                opacity: 0.42,
              }}
            />
          ) : null}
          {previousPct != null ? (
            <span
              className="absolute top-1.5 h-5 w-5 -translate-x-1/2 rounded-full"
              style={{ left: `clamp(10px, ${previousPct}%, calc(100% - 10px))`, background: color, opacity: 0.52 }}
              aria-label={`${previousLabel} ${formatMetricValue(previous, decimals, unit)}`}
            />
          ) : null}
          {currentPct != null ? (
            <span
              className="absolute top-1 h-6 w-6 -translate-x-1/2 rounded-full"
              style={{
                left: `clamp(12px, ${currentPct}%, calc(100% - 12px))`,
                background: color,
                filter: "saturate(1.48) contrast(1.06)",
              }}
              aria-label={`${currentLabel} ${formatMetricValue(current, decimals, unit)}`}
            />
          ) : null}
        </div>
      </div>

      <ComparisonFooter text={summary.text} tone={summary.tone} />
    </article>
  );
}

function RingComparisonCard({
  title,
  subtitle,
  icon,
  previous,
  current,
  previousLabel,
  currentLabel,
  color,
  tint,
}: MetricCardProps & { tint: string }) {
  const summary = comparisonSummary(previous, current, 0, "%", false, false);
  const rings = [
    { label: previousLabel, value: previous, opacity: 0.58 },
    { label: currentLabel, value: current, opacity: 1 },
  ];

  return (
    <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45">
      <MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {rings.map((item) => {
          const pct = item.value == null ? 0 : clampPercent(item.value);
          return (
            <div key={`${title}-${item.label}`} className="text-center">
              <p className="text-[10px] font-semibold text-muted-foreground">{item.label}</p>
              <div
                className="relative mx-auto mt-2 h-20 w-20 rounded-full p-[9px]"
                style={{
                  background: `conic-gradient(${color} 0 ${pct}%, ${tint} ${pct}% 100%)`,
                  opacity: item.opacity,
                  boxShadow: "inset 2px 2px 3px rgba(255,255,255,.55), inset -2px -2px 4px rgba(55,45,30,.16), 0 4px 8px rgba(45,52,35,.17)",
                  filter: "saturate(1.38) contrast(1.05)",
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-surface ring-1 ring-border/45">
                  <span className="text-base font-bold tabular-nums text-foreground">{item.value == null ? "—" : `${item.value.toFixed(0)}%`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ComparisonFooter text={summary.text} tone={summary.tone} />
    </article>
  );
}

function MonthlySection({
  title,
  subtitle,
  icon,
  defaultOpen,
  order,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  defaultOpen: boolean;
  order: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ order }} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-tint/30"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/60 ring-1 ring-border/45">
          <Ico e={icon} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-border/45 p-3"><div className="space-y-3">{children}</div></div> : null}
    </section>
  );
}

function OverviewTile({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: Tone }) {
  const backgrounds = tone === "good" ? "bg-emerald-500/8 ring-emerald-500/15" : tone === "bad" ? "bg-rose-500/8 ring-rose-500/15" : "bg-tint/55 ring-border/45";
  return (
    <div className={`rounded-2xl p-3 ring-1 ${backgrounds}`}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/45">
          <Ico e={icon} size={25} />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className={`mt-1 text-[13px] font-semibold leading-snug ${toneClass(tone)}`}><TrText value={value} /></p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-tint/45 px-3 py-2.5 ring-1 ring-border/40">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/40">
        <Ico e={icon} size={23} />
      </span>
      <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">{label}</span>
      <span className={`max-w-[58%] text-right text-[11px] font-semibold leading-snug ${toneClass(tone)}`}><TrText value={value} /></span>
    </div>
  );
}

export function PatternsMonthlyDashboard({ model }: { model: PatternsContentModel }) {
  const {
    t,
    view,
    currentMonthLabel,
    previousMonthLabel,
    monthlyComparisonLabel,
    panicCurrent,
    panicPrevious,
    tetanyCurrent,
    tetanyPrevious,
    hotFlashCurrent,
    hotFlashPrevious,
    headacheCurrent,
    headachePrevious,
    pressureCurrent,
    pressurePrevious,
    sleepCurrent,
    sleepPrevious,
    weightCurrent,
    weightPrevious,
    medicationCurrent,
    medicationPrevious,
    workoutCurrent,
    workoutPrevious,
    pcosCurrent,
    pcosPrevious,
    histamineCurrent,
    histaminePrevious,
    adminMonthlyMetrics,
    mostImproved,
    mostWorsened,
    mostStable,
    monthlyConfidence,
    monthlyLoggedDays,
    formatChange,
  } = model;

  const improvedTone: Tone = mostImproved && mostImproved.score > 0 ? "good" : "neutral";
  const worsenedTone: Tone = mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral";
  const confidenceIcon = monthlyConfidence === "High" ? "✅" : monthlyConfidence === "Medium" ? "⭐" : "⚠️";

  return (
    <>
      <section
        data-bixbo-jump-label={t("This month at a glance")}
        style={{ order: layoutOrder(view, "patterns.monthly", "overview", 10) }}
        className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:col-span-2"
      >
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{t("This month at a glance")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {monthlyComparisonLabel} · {t("compared over the same number of days.")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <OverviewTile icon="✅" label={t("Most improved")} value={formatChange(mostImproved)} tone={improvedTone} />
          <OverviewTile icon="⚠️" label={t("Needs attention")} value={formatChange(mostWorsened)} tone={worsenedTone} />
          <OverviewTile icon="⚖️" label={t("Most stable")} value={formatChange(mostStable)} tone="neutral" />
          <OverviewTile icon={confidenceIcon} label={t("Confidence")} value={`${monthlyConfidence} · ${monthlyLoggedDays} ${t("logged days")}`} tone="neutral" />
        </div>
      </section>

      <section
        style={{ order: layoutOrder(view, "patterns.monthly", "summary", 15) }}
        className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:col-span-2"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/15"><Ico e="⭐" size={25} /></span>
          <h2 className="text-sm font-semibold text-foreground">{t("Monthly Summary")}</h2>
        </div>
        <div className="mt-3 space-y-2">
          <SummaryRow icon="✅" label={t("Most improved")} value={formatChange(mostImproved)} tone={improvedTone} />
          <SummaryRow icon="⚠️" label={t("Needs attention")} value={formatChange(mostWorsened)} tone={worsenedTone} />
          <SummaryRow icon="⚖️" label={t("Most stable")} value={formatChange(mostStable)} tone="neutral" />
          <SummaryRow icon={confidenceIcon} label={t("Confidence")} value={`${monthlyConfidence} · ${monthlyLoggedDays} ${t("logged days")}`} tone="neutral" />
        </div>
      </section>

      <MonthlySection
        title={t("Symptoms")}
        subtitle={t("Hot flashes, headaches and pressure")}
        icon="🌡️"
        defaultOpen={true}
        order={layoutOrder(view, "patterns.monthly", "symptoms", 20)}
      >
        <VerticalComparisonCard title={t("Hot flashes")} subtitle={t("Number of logged hot flashes")} icon="🌡️" previous={hotFlashPrevious.count} current={hotFlashCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.hotFlash} higherIsWorse />
        <IntensityComparisonCard title={t("Hot-flash intensity")} subtitle={t("Average intensity of logged hot flashes")} icon="🌡️" previous={hotFlashPrevious.intensity} current={hotFlashCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={5} decimals={1} unit="/5" color={CHART_COLORS.hotFlash} higherIsWorse />
        <VerticalComparisonCard title={t("Headaches")} subtitle={t("Number of logged headaches")} icon="🧠" previous={headachePrevious.count} current={headacheCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.headache} higherIsWorse />
        <IntensityComparisonCard title={t("Headache intensity")} subtitle={t("Average headache intensity")} icon="❤️" previous={headachePrevious.intensity} current={headacheCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={10} decimals={1} unit="/10" color={CHART_COLORS.headache} higherIsWorse />
        <VerticalComparisonCard title={t("Pressure entries")} subtitle={t("Number of pain logs containing pressure")} icon="💧" previous={pressurePrevious.count} current={pressureCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.mood} higherIsWorse />
        <IntensityComparisonCard title={t("Pressure intensity")} subtitle={t("Average intensity of logged pressure")} icon="⚡" previous={pressurePrevious.intensity} current={pressureCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={10} decimals={1} unit="/10" color={CHART_COLORS.mood} higherIsWorse />
      </MonthlySection>

      <MonthlySection
        title={t("Panic & tetany")}
        subtitle={t("Monthly frequency and intensity comparison")}
        icon="🧠"
        defaultOpen={true}
        order={layoutOrder(view, "patterns.monthly", "panicTetany", 30)}
      >
        <VerticalComparisonCard title={t("Panic attacks")} subtitle={t("Number of logged panic attacks")} icon="⭐" previous={panicPrevious.count} current={panicCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.panic} higherIsWorse />
        <IntensityComparisonCard title={t("Panic intensity")} subtitle={t("Average intensity of logged panic attacks")} icon="🧠" previous={panicPrevious.intensity} current={panicCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={10} decimals={1} unit="/10" color={CHART_COLORS.panic} higherIsWorse />
        <VerticalComparisonCard title={t("Tetany episodes")} subtitle={t("Number of logged tetany episodes")} icon="⚡" previous={tetanyPrevious.count} current={tetanyCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.tetany} higherIsWorse />
        <IntensityComparisonCard title={t("Tetany intensity")} subtitle={t("Average intensity of logged tetany episodes")} icon="🌀" previous={tetanyPrevious.intensity} current={tetanyCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={5} decimals={1} unit="/5" color={CHART_COLORS.tetany} higherIsWorse />
      </MonthlySection>

      <MonthlySection
        title={t("Lifestyle & routines")}
        subtitle={t("Sleep, weight, medication and workouts")}
        icon="🌙"
        defaultOpen={false}
        order={layoutOrder(view, "patterns.monthly", "lifestyle", 40)}
      >
        <IntensityComparisonCard title={t("Average sleep")} subtitle={t("Average number of logged sleep hours")} icon="🌙" previous={sleepPrevious} current={sleepCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={12} decimals={1} unit="h" color={CHART_COLORS.sleep} higherIsWorse={false} neutralTrend />
        <IntensityComparisonCard title={t("Average weight")} subtitle={t("Average logged body weight")} icon="⚖️" previous={weightPrevious} current={weightCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={Math.max(100, weightPrevious ?? 0, weightCurrent ?? 0)} decimals={1} unit="kg" color={CHART_COLORS.weight} higherIsWorse={false} neutralTrend />
        <RingComparisonCard title={t("Medication adherence")} subtitle={t("Percentage of scheduled doses marked as taken")} icon="💊" previous={medicationPrevious} current={medicationCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.medication} tint={CHART_TINTS.medication} />
        <VerticalComparisonCard title={t("Workouts")} subtitle={t("Number of logged workout sessions")} icon="🏋️" previous={workoutPrevious.count} current={workoutCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.workout} higherIsWorse={false} />
        <VerticalComparisonCard title={t("Workout time")} subtitle={t("Total logged workout minutes")} icon="👟" previous={workoutPrevious.minutes} current={workoutCurrent.minutes} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} decimals={0} unit=" min" color={CHART_COLORS.workout} higherIsWorse={false} />
      </MonthlySection>

      <MonthlySection
        title={t("Hormones")}
        subtitle={t("PCOS and histamine changes")}
        icon="❤️"
        defaultOpen={false}
        order={layoutOrder(view, "patterns.monthly", "hormones", 50)}
      >
        <VerticalComparisonCard title={t("PCOS symptoms")} subtitle={t("Total number of logged PCOS symptom tags")} icon="❤️" previous={pcosPrevious} current={pcosCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.pcos} higherIsWorse />
        <VerticalComparisonCard title={t("Histamine flares")} subtitle={t("Number of food entries marked as a histamine flare")} icon="🍃" previous={histaminePrevious} current={histamineCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.histamine} higherIsWorse />
      </MonthlySection>

      {adminMonthlyMetrics.length > 0 ? (
        <MonthlySection
          title={t("Custom metrics")}
          subtitle={t("Admin-created numeric and scale fields")}
          icon="⭐"
          defaultOpen={false}
          order={layoutOrder(view, "patterns.monthly", "customMetrics", 60)}
        >
          {adminMonthlyMetrics.map((metric) => (
            <IntensityComparisonCard
              key={metric.id}
              title={metric.title}
              subtitle={t("Average of saved supplementary values")}
              icon="⭐"
              previous={metric.previous}
              current={metric.current}
              previousLabel={previousMonthLabel}
              currentLabel={currentMonthLabel}
              max={metric.max ?? Math.max(1, metric.previous ?? 0, metric.current ?? 0)}
              decimals={1}
              unit={metric.unit}
              color={CHART_COLORS.neutral}
              higherIsWorse={false}
              neutralTrend
            />
          ))}
        </MonthlySection>
      ) : null}
    </>
  );
}
