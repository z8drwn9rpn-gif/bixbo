import { useEffect, useMemo, useState } from "react";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { layoutOrder } from "@/lib/layoutRegistry";
import { avgDayPain } from "@/lib/storage";
import {
  dayBowelSymptoms,
  dayEnergy,
  dayHotFlash,
  dayPressureIntensity,
  negativeMoodCount,
  phaseAvg,
  phaseDays,
  phaseFlowMode,
} from "@/lib/patterns";
import type { PatternsContentModel } from "./usePatternsContentModel";
import {
  CollapsibleSection,
  PHASE_COLORS,
  PhaseBarChart,
  TrText,
  clampPercent,
  formatMetricValue,
  phaseLabelByValue,
} from "./shared";

type PhaseValue = { label: string; value: number | null };
type BodyMetric = {
  label: string;
  detail: string;
  icon: string;
  values: PhaseValue[];
  max: number;
  decimals: number;
  unit: string;
  unitLabel: string;
};

type CycleView = {
  label: string;
  shortLabel: string;
  averagePain: number | null;
  flow: string;
  phasePain: PhaseValue[];
  dailyPain: Array<{ day: string; value: number | null }>;
};

function average(values: PhaseValue[]) {
  const numbers = values.map((item) => item.value).filter((value): value is number => value != null && Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

function normalizedFlow(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("‑");
}

function highestIndex(values: PhaseValue[]) {
  let winner = -1;
  let winnerValue = Number.NEGATIVE_INFINITY;
  values.forEach((item, index) => {
    if (item.value == null || !Number.isFinite(item.value)) return;
    if (item.value > winnerValue) {
      winner = index;
      winnerValue = item.value;
    }
  });
  return winner;
}

function MonthNavigator({ label, canPrevious, canNext, onPrevious, onNext }: { label: string; canPrevious: boolean; canNext: boolean; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="mt-3 grid grid-cols-[38px_minmax(0,1fr)_38px] items-center gap-2 rounded-2xl bg-tint/45 p-1.5 ring-1 ring-border/45">
      <button type="button" onClick={onPrevious} disabled={!canPrevious} aria-label="Previous period comparison" className="grid h-9 w-9 place-items-center rounded-full bg-background/75 text-lg font-semibold text-primary ring-1 ring-border/45 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
      <div className="min-w-0 text-center">
        <div className="flex items-center justify-center gap-1.5"><Ico e="🫐" size={17} /><p className="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Compare periods</p></div>
        <p className="truncate text-[11px] font-semibold text-foreground">{label}</p>
      </div>
      <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next period comparison" className="grid h-9 w-9 place-items-center rounded-full bg-background/75 text-lg font-semibold text-primary ring-1 ring-border/45 disabled:cursor-not-allowed disabled:opacity-30">›</button>
    </div>
  );
}

function MonthSummaryCard({ cycle, index }: { cycle: CycleView; index: number }) {
  const accent = index === 0 ? "#8b5cf6" : "#f43f75";
  const tint = index === 0 ? "rgba(139,92,246,.07)" : "rgba(244,63,117,.07)";
  return (
    <article className="min-w-0 rounded-2xl p-3 ring-1 ring-border/45" style={{ background: tint }}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold text-foreground">{cycle.label}</p>
        <Ico e="🫐" size={19} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="min-w-0">
          <p className="text-[9px] text-muted-foreground">Avg pain</p>
          <p className="mt-0.5 whitespace-nowrap text-[18px] font-bold tabular-nums text-foreground">{cycle.averagePain == null ? "—" : cycle.averagePain.toFixed(1)}<span className="text-[10px] font-semibold">/10</span></p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] text-muted-foreground">Most common flow</p>
          <div className="mt-0.5 flex items-center justify-end gap-1"><Ico e="🩸" size={17} /><p className="max-w-[88px] truncate text-[10px] font-semibold text-foreground"><TrText value={cycle.flow} /></p></div>
        </div>
      </div>
      <div className="mt-2 flex h-14 items-end gap-[2px] border-b border-border/45 px-0.5 pb-1">
        {cycle.dailyPain.length === 0 ? <span className="mb-1 text-[9px] text-muted-foreground">No logged pain</span> : cycle.dailyPain.map((point) => {
          const pct = point.value == null ? 0 : clampPercent((Math.max(0, point.value) / 10) * 100);
          return <span key={point.day} data-bixbo-chart-mark="bar" title={`${point.day}: ${point.value == null ? "—" : `${point.value.toFixed(1)}/10`}`} className="min-w-[2px] flex-1 rounded-t-[3px]" style={{ height: point.value == null ? "2px" : `${Math.max(4, pct * .48)}px`, background: accent, opacity: point.value == null ? .16 : .9, boxShadow: "inset 1px 1px 1px rgba(255,255,255,.48), inset -1px -1px 2px rgba(40,35,20,.15), 0 1px 2px rgba(45,52,35,.12)", filter: "saturate(1.45) contrast(1.05)" }} />;
        })}
      </div>
    </article>
  );
}

function PhaseComparisonCard({ phase, index, cycles }: { phase: string; index: number; cycles: CycleView[] }) {
  const palette = PHASE_COLORS[index] ?? PHASE_COLORS[0];
  const values = cycles.map((cycle) => cycle.phasePain[index]?.value ?? null);
  return (
    <article className={`min-w-0 rounded-2xl bg-background/65 px-2 py-3 text-center ring-1 ${index === 1 ? "ring-rose-400/65 shadow-sm" : "ring-border/55"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.045em]" style={{ color: palette.solid }}>{phase}</p>
      <div className="mt-2 grid h-24 grid-cols-2 items-end gap-2 border-b border-border/50 px-1 pb-1">
        {cycles.map((cycle, cycleIndex) => {
          const value = values[cycleIndex];
          const pct = value == null ? 0 : clampPercent((Math.max(0, value) / 10) * 100);
          return <div key={`${phase}-${cycle.label}`} className="flex h-full min-w-0 flex-col items-center justify-end"><span className="mb-1 whitespace-nowrap text-[10px] font-bold tabular-nums text-foreground">{value == null ? "—" : value.toFixed(1)}<span className="text-[8px]">/10</span></span><span data-bixbo-chart-mark="bar" title={`${cycle.label} ${phase}: ${value == null ? "—" : `${value.toFixed(1)}/10`}`} className="w-8 rounded-t-[8px]" style={{ height: value == null ? "3px" : `${Math.max(8, pct * .58)}px`, background: cycleIndex === 0 ? "#8b5cf6" : palette.solid, opacity: cycleIndex === 0 ? .72 : 1, boxShadow: "inset 2px 2px 3px rgba(255,255,255,.55), inset -2px -2px 3px rgba(40,35,20,.16), 0 3px 6px rgba(45,52,35,.16)", filter: "saturate(1.55) contrast(1.07)" }} /></div>;
        })}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-center text-[8px] font-semibold text-muted-foreground">{cycles.map((cycle) => <span key={`${phase}-${cycle.shortLabel}`} className="truncate">{cycle.shortLabel}</span>)}</div>
    </article>
  );
}

function QuickItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-1.5 px-1"><Ico e={icon} size={24} /><div className="min-w-0 flex-1"><p className="text-[9px] leading-tight text-muted-foreground">{label}</p><p className="mt-0.5 text-[10px] font-semibold leading-tight text-foreground"><TrText value={value} /></p></div></div>;
}

function MetricPhaseCell({ value, max, decimals, unit, index, highlight }: { value: number | null; max: number; decimals: number; unit: string; index: number; highlight: boolean }) {
  const palette = PHASE_COLORS[index] ?? PHASE_COLORS[0];
  const percentage = value == null ? 0 : clampPercent((Math.max(0, value) / max) * 100);
  return <div className="min-w-0"><div className="flex items-center gap-1"><span className="truncate text-[11px] font-bold tabular-nums text-foreground">{formatMetricValue(value, decimals, unit)}</span>{highlight ? <Ico e="✨" size={14} /> : null}</div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint/80 ring-1 ring-border/30"><div className="h-full rounded-full" style={{ width: value == null ? "0%" : `${Math.max(percentage, value === 0 ? 0 : 7)}%`, background: palette.solid, filter: "saturate(1.4) contrast(1.06)", boxShadow: "inset 0 1px 1px rgba(255,255,255,.55), 0 1px 3px rgba(45,52,35,.14)" }} /></div></div>;
}

function BodyMetricRow({ metric }: { metric: BodyMetric }) {
  const winner = highestIndex(metric.values);
  return <div className="grid grid-cols-[minmax(104px,1.5fr)_repeat(3,minmax(48px,.72fr))] items-center gap-2 border-t border-border/45 px-3 py-2.5 first:border-t-0"><div className="flex min-w-0 items-center gap-2"><Ico e={metric.icon} size={25} /><div className="min-w-0"><p className="truncate text-[10px] font-semibold leading-tight text-foreground">{metric.label}</p><p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground">{metric.detail}</p></div></div>{metric.values.map((item, index) => <MetricPhaseCell key={`${metric.label}-${item.label}`} value={item.value} max={metric.max} decimals={metric.decimals} unit={metric.unit} index={index} highlight={winner === index && item.value != null} />)}</div>;
}

function SummaryTile({ icon, label, value, meta, tone }: { icon: string; label: string; value: string; meta?: string; tone: "rose" | "purple" | "green" }) {
  const backgrounds = { rose: "bg-rose-500/10 ring-rose-500/15", purple: "bg-violet-500/10 ring-violet-500/15", green: "bg-emerald-500/10 ring-emerald-500/15" } as const;
  return <div className={`min-w-0 rounded-2xl px-2 py-3 ring-1 ${backgrounds[tone]}`}><div className="flex items-start gap-1.5"><Ico e={icon} size={27} /><div className="min-w-0 flex-1"><p className="text-[9px] leading-tight text-muted-foreground">{label}</p><p className="mt-1 text-[11px] font-semibold leading-tight text-foreground"><TrText value={value} /></p>{meta ? <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold leading-tight text-foreground">{meta}</p> : null}</div></div></div>;
}

export function PatternsCycleDashboard({ model }: { model: PatternsContentModel }) {
  const { t, language, view, dayLogs, cycles, adminCycleMetrics } = model;
  const minimumEndIndex = cycles.length > 1 ? 1 : 0;
  const [selectedEndIndex, setSelectedEndIndex] = useState(() => Math.max(minimumEndIndex, cycles.length - 1));

  useEffect(() => {
    setSelectedEndIndex((current) => Math.min(Math.max(minimumEndIndex, current), Math.max(minimumEndIndex, cycles.length - 1)));
  }, [cycles.length, minimumEndIndex]);

  const selectedCycles = useMemo(() => {
    if (cycles.length === 0) return [];
    const end = Math.min(selectedEndIndex, cycles.length - 1);
    const start = cycles.length > 1 ? Math.max(0, end - 1) : end;
    return cycles.slice(start, end + 1);
  }, [cycles, selectedEndIndex]);

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(language || undefined, { month: "short", year: "numeric" }), [language]);
  const shortMonthFormatter = useMemo(() => new Intl.DateTimeFormat(language || undefined, { month: "short" }), [language]);

  const cycleViews = useMemo<CycleView[]>(() => selectedCycles.map((cycle) => {
    const buckets = phaseDays([cycle]);
    const phasePain: PhaseValue[] = [
      { label: "Before", value: phaseAvg(buckets.before, dayLogs, (log) => avgDayPain(log) ?? null) },
      { label: "During", value: phaseAvg(buckets.during, dayLogs, (log) => avgDayPain(log) ?? null) },
      { label: "After", value: phaseAvg(buckets.after, dayLogs, (log) => avgDayPain(log) ?? null) },
    ];
    const allDays = Array.from(new Set([...buckets.before, ...buckets.during, ...buckets.after])).sort();
    return {
      label: monthFormatter.format(new Date(`${cycle.start}T12:00:00`)),
      shortLabel: shortMonthFormatter.format(new Date(`${cycle.start}T12:00:00`)),
      averagePain: phaseAvg(allDays, dayLogs, (log) => avgDayPain(log) ?? null),
      flow: normalizedFlow(phaseFlowMode(buckets.during, dayLogs)),
      phasePain,
      dailyPain: allDays.map((day) => ({ day, value: dayLogs[day] ? avgDayPain(dayLogs[day]) ?? null : null })),
    };
  }), [selectedCycles, dayLogs, monthFormatter, shortMonthFormatter]);

  const selectedPhaseBuckets = useMemo(() => phaseDays(selectedCycles), [selectedCycles]);
  const makeBars = (valueFn: (log: (typeof dayLogs)[string]) => number | null | undefined): PhaseValue[] => [
    { label: "Before", value: phaseAvg(selectedPhaseBuckets.before, dayLogs, valueFn) },
    { label: "During", value: phaseAvg(selectedPhaseBuckets.during, dayLogs, valueFn) },
    { label: "After", value: phaseAvg(selectedPhaseBuckets.after, dayLogs, valueFn) },
  ];

  const painPhaseBars = makeBars((log) => avgDayPain(log) ?? null);
  const moodPhaseBars = makeBars(negativeMoodCount);
  const energyPhaseBars = makeBars(dayEnergy);
  const hotFlashPhaseBars = makeBars(dayHotFlash);
  const pressurePhaseBars = makeBars(dayPressureIntensity);
  const bowelPhaseBars = makeBars(dayBowelSymptoms);
  const commonFlowLabel = normalizedFlow(phaseFlowMode(selectedPhaseBuckets.during, dayLogs));
  const highestPainPhase = phaseLabelByValue(painPhaseBars);
  const bestEnergyPhase = phaseLabelByValue(energyPhaseBars);
  const bestEnergyValue = energyPhaseBars.find((item) => item.label === bestEnergyPhase)?.value ?? null;
  const highestPainValue = painPhaseBars.find((item) => item.label === highestPainPhase)?.value ?? null;

  const bodyMetrics: BodyMetric[] = [
    { label: t("Negative mood"), detail: t("tags/day"), icon: "🙁", values: moodPhaseBars, max: 3, decimals: 1, unit: "", unitLabel: t("count") },
    { label: t("Energy"), detail: "0–5", icon: "⚡", values: energyPhaseBars, max: 5, decimals: 1, unit: "/5", unitLabel: t("score") },
    { label: t("Hot flashes"), detail: "0–5", icon: "🌡️", values: hotFlashPhaseBars, max: 5, decimals: 1, unit: "/5", unitLabel: t("score") },
    { label: t("Pressure intensity"), detail: "0–10", icon: "💢", values: pressurePhaseBars, max: 10, decimals: 1, unit: "/10", unitLabel: "0–10" },
    { label: t("Bowel symptoms"), detail: t("per day"), icon: "💩", values: bowelPhaseBars, max: 3, decimals: 1, unit: "", unitLabel: t("count") },
  ];

  const comparisonLabel = cycleViews.length > 1 ? `${cycleViews[0].label} ↔ ${cycleViews[1].label}` : cycleViews[0]?.label ?? t("No periods logged");

  return <>
    <section data-bixbo-insight-chart-card="pain" data-bixbo-jump-label={t("Pain & flow")} style={{ order: layoutOrder(view, "patterns.cycle", "painFlow", 10) }} className="overflow-hidden rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <div className="flex items-start gap-2.5"><Ico e="🫐" size={28} /><div><h2 className="text-sm font-semibold text-foreground">{t("Pain & flow")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t("Average pain intensity (0–10)")}</p></div></div>
      <MonthNavigator label={comparisonLabel} canPrevious={cycles.length > 1 && selectedEndIndex > minimumEndIndex} canNext={selectedEndIndex < cycles.length - 1} onPrevious={() => setSelectedEndIndex((value) => Math.max(minimumEndIndex, value - 1))} onNext={() => setSelectedEndIndex((value) => Math.min(cycles.length - 1, value + 1))} />
      <div className="mt-3 grid grid-cols-2 gap-2">{cycleViews.map((cycle, index) => <MonthSummaryCard key={cycle.label} cycle={cycle} index={index} />)}</div>
      <div className="mt-3 grid grid-cols-3 gap-2">{["Before", "During", "After"].map((phase, index) => <PhaseComparisonCard key={phase} phase={t(phase)} index={index} cycles={cycleViews} />)}</div>
      <div className="mt-3 rounded-2xl bg-tint/35 px-3 py-3 ring-1 ring-border/55"><div className="flex items-center gap-2"><Ico e="✨" size={23} /><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Quick insights")}</p></div><div className="mt-2 grid grid-cols-3 divide-x divide-border/50"><QuickItem icon="🔥" label={t("Highest pain")} value={highestPainPhase} /><QuickItem icon="⚡" label={t("Best energy")} value={bestEnergyPhase} /><QuickItem icon="🩸" label={t("Most common flow")} value={commonFlowLabel} /></div></div>
    </section>

    <section data-bixbo-jump-label={t("Body changes")} style={{ order: layoutOrder(view, "patterns.cycle", "bodyChanges", 20) }} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <div className="px-4 pb-3 pt-4"><h2 className="text-sm font-semibold text-foreground">{t("Body changes")}</h2><div className="mt-3 grid grid-cols-[minmax(104px,1.5fr)_repeat(3,minmax(48px,.72fr))] items-center gap-2"><span />{PHASE_COLORS.map((phase) => <div key={phase.label} className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phase.solid }} /><span className="truncate text-[9px] font-semibold text-muted-foreground">{t(phase.label)}</span></div>)}</div></div>
      <div className="border-t border-border/45">{bodyMetrics.map((metric) => <BodyMetricRow key={metric.label} metric={metric} />)}</div>
      <div className="border-t border-border/45 p-3"><div className="rounded-2xl bg-background/55 p-3 ring-1 ring-border/45"><h2 className="text-sm font-semibold text-foreground">{t("Cycle summary")}</h2><div className="mt-2.5 grid grid-cols-3 gap-2"><SummaryTile icon="🔥" label={t("Highest pain")} value={highestPainPhase} meta={highestPainValue == null ? undefined : `(${highestPainValue.toFixed(1)}/10)`} tone="rose" /><SummaryTile icon="⚡" label={t("Best energy")} value={bestEnergyPhase} meta={bestEnergyValue == null ? undefined : `(${bestEnergyValue.toFixed(1)}/5)`} tone="purple" /><SummaryTile icon="🩸" label={t("Most common flow")} value={commonFlowLabel} tone="green" /></div></div></div>
    </section>

    {adminCycleMetrics.length > 0 ? <CollapsibleSection layoutOrderValue={layoutOrder(view, "patterns.cycle", "customMetrics", 30)} title="Custom metrics" subtitle="Admin-created numeric and scale fields" defaultOpen={false}><div className="space-y-2.5">{adminCycleMetrics.map((metric) => <PhaseBarChart key={metric.id} title={metric.title} description="Average saved supplementary value by cycle phase." bars={metric.bars} max={metric.max ?? 10} decimals={1} unit={metric.unit} />)}</div></CollapsibleSection> : null}
  </>;
}
