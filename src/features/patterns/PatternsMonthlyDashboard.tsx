import { useState, type ReactNode } from "react";
import { ChevronDown, Ico } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { layoutOrder } from "@/lib/layoutRegistry";
import type { PatternsContentModel } from "./usePatternsContentModel";
import { clampPercent, formatMetricValue, percentageChange } from "./shared";

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

const PREVIOUS_COLOR = "#8b5cf6";

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

function IconBubble({ icon, size = 28 }: { icon: string; size?: number }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/82 shadow-sm ring-1 ring-border/55">
      <Ico e={icon} size={size} />
    </span>
  );
}

function ConfidenceStar({ size = 27 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />
      <path d="m32 7 7 14 16 2.3-11.5 11.2 2.7 15.8L32 42.8 17.8 50.3l2.7-15.8L9 23.3 25 21 32 7Z" fill="#f6c945" stroke="#c99421" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m25 17 4-7 2 11-7 2 1-6Z" fill="#fff4ad" opacity="0.7" />
    </svg>
  );
}

function MetricHeader({ icon, title, subtitle, color }: { icon: string; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <IconBubble icon={icon} />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight" style={{ color }}>{title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ComparisonFooter({ text, tone }: { text: string; tone: Tone }) {
  return <div className={`rounded-xl bg-background/72 px-2 py-2 text-center text-[10px] font-semibold leading-snug ring-1 ring-border/45 ${toneClass(tone)}`}>{text}</div>;
}

function CombinedFrequencyIntensityCard({
  title,
  subtitle,
  icon,
  previousCount,
  currentCount,
  previousIntensity,
  currentIntensity,
  previousLabel,
  currentLabel,
  intensityMax,
  intensityUnit,
  color,
}: {
  title: string;
  subtitle: string;
  icon: string;
  previousCount: number | null;
  currentCount: number | null;
  previousIntensity: number | null;
  currentIntensity: number | null;
  previousLabel: string;
  currentLabel: string;
  intensityMax: number;
  intensityUnit: string;
  color: string;
}) {
  const countMax = Math.max(1, previousCount ?? 0, currentCount ?? 0);
  const countSummary = comparisonSummary(previousCount, currentCount, 0, "", true);
  const intensitySummary = comparisonSummary(previousIntensity, currentIntensity, 1, intensityUnit, true);
  const previousIntensityPct = previousIntensity == null ? null : clampPercent((previousIntensity / intensityMax) * 100);
  const currentIntensityPct = currentIntensity == null ? null : clampPercent((currentIntensity / intensityMax) * 100);
  const intensityDelta = previousIntensity != null && currentIntensity != null ? currentIntensity - previousIntensity : null;

  return (
    <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45">
      <MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="min-w-0 rounded-2xl bg-background/52 p-2.5 ring-1 ring-border/40">
          <p className="text-[10px] font-bold text-foreground">Count <span className="font-normal text-muted-foreground">(frequency)</span></p>
          <div className="mt-2 grid h-[112px] grid-cols-2 items-end gap-3 border-b border-border/45 px-2 pb-1">
            {[
              { label: previousLabel, value: previousCount, paint: PREVIOUS_COLOR, opacity: 0.72 },
              { label: currentLabel, value: currentCount, paint: color, opacity: 1 },
            ].map((item) => {
              const pct = item.value == null ? 0 : clampPercent((Math.max(0, item.value) / countMax) * 100);
              const height = item.value == null ? 0 : Math.max(item.value === 0 ? 4 : 12, pct * 0.78);
              return (
                <div key={`${title}-${item.label}-count`} className="flex h-full min-w-0 flex-col items-center justify-end">
                  <span className="mb-1 text-[11px] font-bold tabular-nums text-foreground">{item.value == null ? "—" : item.value.toFixed(0)}</span>
                  {item.value != null ? (
                    <span
                      data-bixbo-chart-mark="bar"
                      title={`${item.label}: ${item.value.toFixed(0)} ${title.toLowerCase()}`}
                      className="w-10 rounded-t-[9px]"
                      style={{ height: `${height}%`, background: item.paint, opacity: item.opacity, boxShadow: "inset 2px 2px 3px rgba(255,255,255,.58), inset -2px -3px 4px rgba(65,35,20,.18), 0 4px 8px rgba(45,52,35,.18)", filter: "saturate(1.58) contrast(1.08)" }}
                    />
                  ) : <span className="mb-4 text-lg font-semibold text-muted-foreground">—</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-center text-[8px] font-semibold leading-tight text-muted-foreground"><span className="truncate">{previousLabel}</span><span className="truncate">{currentLabel}</span></div>
        </div>

        <div className="min-w-0 rounded-2xl bg-background/52 p-2.5 ring-1 ring-border/40">
          <p className="text-[10px] font-bold text-foreground">Intensity <span className="font-normal text-muted-foreground">(0–{intensityMax})</span></p>
          <div className="mt-4 flex min-h-[91px] flex-col justify-center">
            <div className="relative mx-2 h-12">
              <span className="absolute inset-x-0 top-[21px] h-1.5 rounded-full bg-tint ring-1 ring-border/35" />
              {previousIntensityPct != null && currentIntensityPct != null ? <span className="absolute top-[22px] h-1 -translate-y-1/2 rounded-full" style={{ left: `${Math.min(previousIntensityPct, currentIntensityPct)}%`, width: `${Math.max(2, Math.abs(currentIntensityPct - previousIntensityPct))}%`, background: `linear-gradient(90deg, ${PREVIOUS_COLOR}, ${color})` }} /> : null}
              {previousIntensityPct != null ? <button type="button" data-bixbo-chart-mark="intensity-point" title={`${previousLabel}: ${previousIntensity?.toFixed(1)}${intensityUnit}`} className="absolute top-[10px] h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white shadow-md" style={{ left: `clamp(12px, ${previousIntensityPct}%, calc(100% - 12px))`, background: PREVIOUS_COLOR }} aria-label={`${previousLabel} intensity ${previousIntensity?.toFixed(1)}${intensityUnit}`} /> : null}
              {currentIntensityPct != null ? <button type="button" data-bixbo-chart-mark="intensity-point" title={`${currentLabel}: ${currentIntensity?.toFixed(1)}${intensityUnit}`} className="absolute top-[10px] h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white shadow-md" style={{ left: `clamp(12px, ${currentIntensityPct}%, calc(100% - 12px))`, background: color, filter: "saturate(1.55) contrast(1.08)" }} aria-label={`${currentLabel} intensity ${currentIntensity?.toFixed(1)}${intensityUnit}`} /> : null}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[9px] font-bold tabular-nums">
              <div className="min-w-0 text-left" style={{ color: PREVIOUS_COLOR }}><p>{previousIntensity == null ? "—" : `${previousIntensity.toFixed(1)}${intensityUnit}`}</p><p className="truncate text-[8px] font-medium text-muted-foreground">{previousLabel}</p></div>
              <div className="min-w-0 text-right" style={{ color }}><p>{currentIntensity == null ? "—" : `${currentIntensity.toFixed(1)}${intensityUnit}`}</p><p className="truncate text-[8px] font-medium text-muted-foreground">{currentLabel}</p></div>
            </div>
            {intensityDelta != null ? <p className={`mt-1 text-center text-[8px] font-semibold ${toneClass(intensitySummary.tone)}`}>{intensityDelta > 0 ? "+" : ""}{intensityDelta.toFixed(1)} vs previous</p> : null}
          </div>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2"><ComparisonFooter text={`Count: ${countSummary.text}`} tone={countSummary.tone} /><ComparisonFooter text={`Intensity: ${intensitySummary.text}`} tone={intensitySummary.tone} /></div>
    </article>
  );
}

function VerticalComparisonCard({ title, subtitle, icon, previous, current, previousLabel, currentLabel, decimals = 0, unit = "", color, max, higherIsWorse = true, neutralTrend = false }: MetricCardProps) {
  const values = [previous, current].filter((value): value is number => value != null && Number.isFinite(value));
  const chartMax = Math.max(1, max ?? 0, ...values.map((value) => Math.abs(value)));
  const summary = comparisonSummary(previous, current, decimals, unit, higherIsWorse, neutralTrend);
  return (
    <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45">
      <MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[{ label: previousLabel, value: previous, paint: PREVIOUS_COLOR, opacity: 0.65 }, { label: currentLabel, value: current, paint: color, opacity: 1 }].map((item) => {
          const pct = item.value == null ? 0 : clampPercent((Math.max(0, item.value) / chartMax) * 100);
          return <div key={`${title}-${item.label}`} className="min-w-0 text-center"><p className="truncate text-[10px] font-semibold text-muted-foreground">{item.label}</p><p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{formatMetricValue(item.value, decimals, unit)}</p><div className="relative mx-auto mt-2 flex h-20 max-w-[106px] items-end justify-center rounded-2xl bg-background/48 px-3 pb-2 ring-1 ring-border/35"><span className="absolute bottom-1.5 h-2 w-[72%] rounded-full bg-tint ring-1 ring-border/35" />{item.value != null ? <span data-bixbo-chart-mark="bar" title={`${item.label}: ${formatMetricValue(item.value, decimals, unit)}`} className="relative z-10 w-9 rounded-t-[8px]" style={{ height: `${Math.max(item.value === 0 ? 4 : 10, pct * 0.56)}px`, background: item.paint, opacity: item.opacity, filter: "saturate(1.5) contrast(1.06)", boxShadow: "inset 2px 2px 3px rgba(255,255,255,.5), inset -2px -2px 3px rgba(40,35,20,.14), 0 3px 6px rgba(45,52,35,.14)" }} /> : <span className="relative z-10 mb-1 text-lg font-semibold text-muted-foreground">—</span>}</div></div>;
        })}
      </div>
      <div className="mt-3"><ComparisonFooter text={summary.text} tone={summary.tone} /></div>
    </article>
  );
}

function CompactScaleCard({ title, subtitle, icon, previous, current, previousLabel, currentLabel, decimals = 1, unit = "", color, max = 10, higherIsWorse = true, neutralTrend = false }: MetricCardProps) {
  const summary = comparisonSummary(previous, current, decimals, unit, higherIsWorse, neutralTrend);
  const previousPct = previous == null ? null : clampPercent((Math.max(0, previous) / max) * 100);
  const currentPct = current == null ? null : clampPercent((Math.max(0, current) / max) * 100);
  return <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45"><MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} /><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[10px] font-semibold text-muted-foreground">{previousLabel}</p><p className="mt-0.5 text-lg font-bold tabular-nums">{formatMetricValue(previous, decimals, unit)}</p></div><div className="text-right"><p className="text-[10px] font-semibold text-muted-foreground">{currentLabel}</p><p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color }}>{formatMetricValue(current, decimals, unit)}</p></div></div><div className="mx-auto mt-2 max-w-[280px] rounded-xl bg-background/48 px-3 py-3 ring-1 ring-border/35"><div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>{max / 2}</span><span>{max}</span></div><div className="relative mt-1 h-7"><div className="absolute inset-x-1 top-3 h-1.5 rounded-full bg-tint ring-1 ring-border/40" />{previousPct != null ? <span data-bixbo-chart-mark="intensity-point" title={`${previousLabel}: ${formatMetricValue(previous, decimals, unit)}`} className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full" style={{ left: `clamp(8px, ${previousPct}%, calc(100% - 8px))`, background: PREVIOUS_COLOR, opacity: 0.7 }} /> : null}{currentPct != null ? <span data-bixbo-chart-mark="intensity-point" title={`${currentLabel}: ${formatMetricValue(current, decimals, unit)}`} className="absolute top-1 h-5 w-5 -translate-x-1/2 rounded-full" style={{ left: `clamp(10px, ${currentPct}%, calc(100% - 10px))`, background: color, filter: "saturate(1.55) contrast(1.08)", boxShadow: "0 2px 5px rgba(45,52,35,.18)" }} /> : null}</div></div><div className="mt-3"><ComparisonFooter text={summary.text} tone={summary.tone} /></div></article>;
}

function RingComparisonCard({ title, subtitle, icon, previous, current, previousLabel, currentLabel, color, tint }: MetricCardProps & { tint: string }) {
  const summary = comparisonSummary(previous, current, 0, "%", false, false);
  return <article className="rounded-2xl bg-tint/55 p-3.5 ring-1 ring-border/45"><MetricHeader icon={icon} title={title} subtitle={subtitle} color={color} /><div className="mt-3 grid grid-cols-2 gap-3">{[{ label: previousLabel, value: previous, opacity: .58 }, { label: currentLabel, value: current, opacity: 1 }].map((item) => { const pct = item.value == null ? 0 : clampPercent(item.value); return <div key={item.label} className="text-center"><p className="text-[10px] font-semibold text-muted-foreground">{item.label}</p><p className="mt-1 text-xl font-bold tabular-nums">{item.value == null ? "—" : `${item.value.toFixed(0)}%`}</p><div className="relative mx-auto mt-2 h-20 w-20 rounded-full p-2" style={{ background: `conic-gradient(${color} ${pct}%, ${tint} ${pct}% 100%)`, opacity: item.opacity }}><div className="grid h-full w-full place-items-center rounded-full bg-background/95"><span className="text-xs font-bold tabular-nums">{item.value == null ? "—" : `${item.value.toFixed(0)}%`}</span></div></div></div>; })}</div><div className="mt-3"><ComparisonFooter text={summary.text} tone={summary.tone} /></div></article>;
}

function metricIconForLabel(label: string | null | undefined) {
  const value = (label ?? "").toLowerCase();
  if (value.includes("panic")) return "✨";
  if (value.includes("tetany")) return "⚡";
  if (value.includes("hot flash")) return "🌡️";
  if (value.includes("headache")) return "🧠";
  if (value.includes("pressure")) return "💢";
  if (value.includes("workout")) return "👟";
  if (value.includes("pcos")) return "🌻";
  if (value.includes("histamine")) return "🌶️";
  if (value.includes("medication")) return "💊";
  if (value.includes("sleep")) return "🌙";
  if (value.includes("weight")) return "⚖️";
  return "✨";
}

function OverviewTile({ icon, confidence, label, value, tone }: { icon?: string; confidence?: boolean; label: string; value: string; tone: Tone }) {
  const backgrounds = tone === "good" ? "bg-emerald-500/10 ring-emerald-500/15" : tone === "bad" ? "bg-rose-500/10 ring-rose-500/15" : "bg-tint/55 ring-border/40";
  return <div className={`min-w-0 rounded-2xl p-3 ring-1 ${backgrounds}`}><div className="flex items-start gap-2.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/82 shadow-sm ring-1 ring-border/55">{confidence ? <ConfidenceStar /> : <Ico e={icon} size={27} />}</span><div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</p><p className={`mt-1 break-words text-[12px] font-semibold leading-snug ${toneClass(tone)}`}>{value}</p></div></div></div>;
}

function MonthlySection({ title, subtitle, icon, defaultOpen, order, children }: { title: string; subtitle: string; icon: string; defaultOpen: boolean; order: number; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section style={{ order }} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-tint/30"><IconBubble icon={icon} size={27} /><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p></div><ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button>{open ? <div className="space-y-2.5 border-t border-border/45 p-3">{children}</div> : null}</section>;
}

export function PatternsMonthlyDashboard({ model }: { model: PatternsContentModel }) {
  const { t, view, currentMonthLabel, previousMonthLabel, monthlyComparisonLabel, panicCurrent, panicPrevious, tetanyCurrent, tetanyPrevious, hotFlashCurrent, hotFlashPrevious, headacheCurrent, headachePrevious, pressureCurrent, pressurePrevious, sleepCurrent, sleepPrevious, weightCurrent, weightPrevious, medicationCurrent, medicationPrevious, workoutCurrent, workoutPrevious, pcosCurrent, pcosPrevious, histamineCurrent, histaminePrevious, adminMonthlyMetrics, mostImproved, mostWorsened, mostStable, monthlyConfidence, monthlyLoggedDays, formatChange } = model;
  const improvedTone: Tone = mostImproved && mostImproved.score > 0 ? "good" : "neutral";
  const worsenedTone: Tone = mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral";

  return <>
    <section data-bixbo-jump-label={t("This month at a glance")} style={{ order: layoutOrder(view, "patterns.monthly", "overview", 10) }} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{t("This month at a glance")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{monthlyComparisonLabel} · {t("compared over the same number of days.")}</p><div className="mt-3 grid grid-cols-2 gap-2"><OverviewTile icon={metricIconForLabel(mostImproved?.label)} label={t("Most improved")} value={formatChange(mostImproved)} tone={improvedTone} /><OverviewTile icon={metricIconForLabel(mostWorsened?.label)} label={t("Needs attention")} value={formatChange(mostWorsened)} tone={worsenedTone} /><OverviewTile icon={metricIconForLabel(mostStable?.label)} label={t("Most stable")} value={formatChange(mostStable)} tone="neutral" /><OverviewTile confidence label={t("Confidence")} value={`${monthlyConfidence} · ${monthlyLoggedDays} ${t("logged days")}`} tone="neutral" /></div></section>

    <MonthlySection title={t("Symptoms")} subtitle={t("Hot flashes, headaches and pressure")} icon="🔅" defaultOpen order={layoutOrder(view, "patterns.monthly", "symptoms", 20)}><CombinedFrequencyIntensityCard title={t("Hot flashes")} subtitle={t("Frequency and intensity in one view")} icon="🌡️" previousCount={hotFlashPrevious.count} currentCount={hotFlashCurrent.count} previousIntensity={hotFlashPrevious.intensity} currentIntensity={hotFlashCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} intensityMax={5} intensityUnit="/5" color={CHART_COLORS.hotFlash} /><CombinedFrequencyIntensityCard title={t("Headaches")} subtitle={t("Frequency and intensity in one view")} icon="🧠" previousCount={headachePrevious.count} currentCount={headacheCurrent.count} previousIntensity={headachePrevious.intensity} currentIntensity={headacheCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} intensityMax={10} intensityUnit="/10" color={CHART_COLORS.headache} /><CombinedFrequencyIntensityCard title={t("Pressure")} subtitle={t("Frequency and intensity in one view")} icon="💢" previousCount={pressurePrevious.count} currentCount={pressureCurrent.count} previousIntensity={pressurePrevious.intensity} currentIntensity={pressureCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} intensityMax={10} intensityUnit="/10" color={CHART_COLORS.mood} /></MonthlySection>

    <MonthlySection title={t("Panic & tetany")} subtitle={t("Monthly frequency and intensity comparison")} icon="✨" defaultOpen order={layoutOrder(view, "patterns.monthly", "panicTetany", 30)}><CombinedFrequencyIntensityCard title={t("Panic attacks")} subtitle={t("Frequency and intensity in one view")} icon="✨" previousCount={panicPrevious.count} currentCount={panicCurrent.count} previousIntensity={panicPrevious.intensity} currentIntensity={panicCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} intensityMax={10} intensityUnit="/10" color={CHART_COLORS.panic} /><CombinedFrequencyIntensityCard title={t("Tetany episodes")} subtitle={t("Frequency and intensity in one view")} icon="⚡" previousCount={tetanyPrevious.count} currentCount={tetanyCurrent.count} previousIntensity={tetanyPrevious.intensity} currentIntensity={tetanyCurrent.intensity} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} intensityMax={5} intensityUnit="/5" color={CHART_COLORS.tetany} /></MonthlySection>

    <MonthlySection title={t("Lifestyle & routines")} subtitle={t("Sleep, weight, medication and workouts")} icon="🌙" defaultOpen={false} order={layoutOrder(view, "patterns.monthly", "lifestyle", 40)}><CompactScaleCard title={t("Average sleep")} subtitle={t("Average number of logged sleep hours")} icon="🌙" previous={sleepPrevious} current={sleepCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={12} decimals={1} unit="h" color={CHART_COLORS.sleep} higherIsWorse={false} neutralTrend /><CompactScaleCard title={t("Average weight")} subtitle={t("Average logged body weight")} icon="⚖️" previous={weightPrevious} current={weightCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={Math.max(100, weightPrevious ?? 0, weightCurrent ?? 0)} decimals={1} unit="kg" color={CHART_COLORS.weight} higherIsWorse={false} neutralTrend /><RingComparisonCard title={t("Medication adherence")} subtitle={t("Percentage of scheduled doses marked as taken")} icon="💊" previous={medicationPrevious} current={medicationCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.medication} tint={CHART_TINTS.medication} /><VerticalComparisonCard title={t("Workouts")} subtitle={t("Number of logged workout sessions")} icon="👟" previous={workoutPrevious.count} current={workoutCurrent.count} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.workout} higherIsWorse={false} /><VerticalComparisonCard title={t("Workout time")} subtitle={t("Total logged workout minutes")} icon="👟" previous={workoutPrevious.minutes} current={workoutCurrent.minutes} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} decimals={0} unit=" min" color={CHART_COLORS.workout} higherIsWorse={false} /></MonthlySection>

    <MonthlySection title={t("Hormones")} subtitle={t("PCOS and histamine changes")} icon="🌻" defaultOpen={false} order={layoutOrder(view, "patterns.monthly", "hormones", 50)}><VerticalComparisonCard title={t("PCOS symptoms")} subtitle={t("Total number of logged PCOS symptom tags")} icon="🌻" previous={pcosPrevious} current={pcosCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.pcos} higherIsWorse /><VerticalComparisonCard title={t("Histamine flares")} subtitle={t("Number of food entries marked as a histamine flare")} icon="🌶️" previous={histaminePrevious} current={histamineCurrent} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} color={CHART_COLORS.histamine} higherIsWorse /></MonthlySection>

    {adminMonthlyMetrics.length > 0 ? <MonthlySection title={t("Custom metrics")} subtitle={t("Admin-created numeric and scale fields")} icon="✨" defaultOpen={false} order={layoutOrder(view, "patterns.monthly", "customMetrics", 60)}>{adminMonthlyMetrics.map((metric) => <CompactScaleCard key={metric.id} title={metric.title} subtitle={t("Average of saved supplementary values")} icon="✨" previous={metric.previous} current={metric.current} previousLabel={previousMonthLabel} currentLabel={currentMonthLabel} max={metric.max ?? Math.max(1, metric.previous ?? 0, metric.current ?? 0)} decimals={1} unit={metric.unit} color={CHART_COLORS.neutral} higherIsWorse={false} neutralTrend />)}</MonthlySection> : null}
  </>;
}
