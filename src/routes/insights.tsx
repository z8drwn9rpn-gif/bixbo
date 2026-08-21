import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DiagnosticProfiler } from "@/components/DiagnosticProfiler";
import { useI18n } from "@/hooks/useI18n";
import { countNoBowelMovements } from "@/lib/domain/bowel";
import { layoutOrder } from "@/lib/layoutRegistry";
import { EMPTY, avgDayPain, useBixbo } from "@/lib/storage";
import { PainInsightsCard } from "@/features/insights/PainInsightsCard";
import { MentalDistressInsightsCard } from "@/features/insights/MentalDistressInsightsCard";
import { BowelOverviewCard } from "@/features/insights/BowelOverviewCard";
import { DayPatternsInsightsCard } from "@/features/insights/DayPatternsInsightsCard";
import { MedsAdherenceInsightsCard } from "@/features/insights/MedsAdherenceInsightsCard";
import { TimeOfDayInsightsCard } from "@/features/insights/TimeOfDayInsightsCard";
import { SukSukInsightsCard } from "@/features/insights/SukSukInsightsCard";
import { SymptomsTrendInsightsCard } from "@/features/insights/SymptomsTrendInsightsCard";
import { YearHealthHeatmap } from "@/features/insights/YearHealthHeatmap";
import { InsightsJumpControl } from "@/features/patterns/InsightsJumpControl";
import "@/features/insights/insights-3d.css";
import {
  eachDay,
  rangeFor,
  shiftInsightPeriodAnchor,
  type HeatmapPeriod,
  type Period,
} from "@/features/insights/shared";

const LazyPatternsContent = lazy(() =>
  import("@/features/patterns/PatternsContent").then((module) => ({ default: module.PatternsContent })),
);

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

function InsightsPage() {
  const { t } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [overviewView, setOverviewView] = useState<"insights" | "patterns">("insights");

  const [painPeriod, setPainPeriod] = useState<Period>("M");
  const [bowelPeriod, setBowelPeriod] = useState<Period>("M");
  const [timeOfDayPeriod, setTimeOfDayPeriod] = useState<Period>("M");
  const [medsPeriod, setMedsPeriod] = useState<Period>("M");

  const [painAnchor, setPainAnchor] = useState<Date>(() => new Date());
  const [bowelAnchor, setBowelAnchor] = useState<Date>(() => new Date());
  const [timeOfDayAnchor, setTimeOfDayAnchor] = useState<Date>(() => new Date());
  const [medsAnchor, setMedsAnchor] = useState<Date>(() => new Date());

  const periodDays = useCallback((selectedPeriod: Period, selectedAnchor: Date) => {
    const { startK, endK } = rangeFor(selectedPeriod, selectedAnchor);
    return eachDay(startK, endK);
  }, []);

  const painDays = useMemo(() => periodDays(painPeriod, painAnchor), [painAnchor, painPeriod, periodDays]);
  const bowelDays = useMemo(() => periodDays(bowelPeriod, bowelAnchor), [bowelAnchor, bowelPeriod, periodDays]);
  const timeOfDayDays = useMemo(() => periodDays(timeOfDayPeriod, timeOfDayAnchor), [periodDays, timeOfDayAnchor, timeOfDayPeriod]);

  const painSeries = useMemo(() => painDays.map((key) => avgDayPain(view.dayLogs[key])), [painDays, view.dayLogs]);
  const painAvg = useMemo(() => {
    const nums = painSeries.filter((value): value is number => value != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }, [painSeries]);

  const noBowelMovementCount = useMemo(
    () => countNoBowelMovements(bowelDays, view.dayLogs),
    [bowelDays, view.dayLogs],
  );

  const shiftHeatmapPeriod = (period: HeatmapPeriod, delta: -1 | 1) => setAnchor((current) => {
    const next = new Date(current);
    next.setHours(0, 0, 0, 0);
    if (period === "Y") { next.setFullYear(next.getFullYear() + delta); return next; }
    if (period === "7D") { next.setDate(next.getDate() + delta * 7); return next; }
    next.setDate(1); next.setMonth(next.getMonth() + delta); return next;
  });

  return <AppShell title={t("Health of Bixbo")}>
    <div className="px-5 pt-2 lg:px-0">
      <div className="grid grid-cols-2 rounded-2xl bg-tint p-1 ring-1 ring-border/70 lg:mx-auto lg:w-full lg:max-w-[420px]">
        {(["insights", "patterns"] as const).map((value) => <button key={value} type="button" onClick={() => setOverviewView(value)} className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${overviewView === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface/70 hover:text-foreground"}`} aria-pressed={overviewView === value}>{value === "insights" ? "Insights" : "Patterns"}</button>)}
      </div>
    </div>

    {overviewView === "patterns" ? <Suspense fallback={<div className="px-5 py-6 text-sm text-muted-foreground lg:px-0">Loading patterns…</div>}><DiagnosticProfiler id="PatternsContent"><LazyPatternsContent /></DiagnosticProfiler></Suspense> : <div id="bixbo-insights-content" data-bixbo-insights-dashboard="true" className="flex flex-col gap-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:px-0 lg:pb-12">
      <InsightsJumpControl refreshKey="insights" />

      <div data-bixbo-jump-label={t("Overview")} className="lg:col-span-2" style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}>
        <DiagnosticProfiler id="YearHealthHeatmap"><YearHealthHeatmap data={view} anchor={anchor} onShiftPeriod={shiftHeatmapPeriod} /></DiagnosticProfiler>
      </div>

      <div data-bixbo-jump-label={t("Pain")} style={{ order: layoutOrder(view, "insights", "pain", 20) }}>
        <DiagnosticProfiler id="PainInsightsCard"><PainInsightsCard data={view} period={painPeriod} days={painDays} series={painSeries} anchor={painAnchor} averageValue={painAvg} onPeriodChange={setPainPeriod} onPeriodShift={(delta) => setPainAnchor((current) => shiftInsightPeriodAnchor(current, painPeriod, delta))} /></DiagnosticProfiler>
      </div>

      <div data-bixbo-jump-label={t("Mental insights")} style={{ order: 22 }}>
        <DiagnosticProfiler id="MentalDistressInsightsCard"><MentalDistressInsightsCard data={view} /></DiagnosticProfiler>
      </div>

      <div data-bixbo-jump-label={t("Symptoms")} style={{ order: 25 }}>
        <DiagnosticProfiler id="SymptomsTrendInsightsCard"><SymptomsTrendInsightsCard data={view} /></DiagnosticProfiler>
      </div>

      <div data-bixbo-jump-label={t("Bowel")} style={{ order: layoutOrder(view, "insights", "bowel", 40) }}>
        <DiagnosticProfiler id="BowelOverviewCard"><BowelOverviewCard days={bowelDays} dayLogs={view.dayLogs} period={bowelPeriod} anchor={bowelAnchor} noBowelMovementCount={noBowelMovementCount} onPeriodChange={setBowelPeriod} onPeriodShift={(delta) => setBowelAnchor((current) => shiftInsightPeriodAnchor(current, bowelPeriod, delta))} /></DiagnosticProfiler>
      </div>
      <div data-bixbo-jump-label={t("ŠukŠuk")} style={{ order: 45 }}>
        <DiagnosticProfiler id="SukSukInsightsCard"><SukSukInsightsCard data={view} /></DiagnosticProfiler>
      </div>
      <div data-bixbo-jump-label={t("Time of day")} style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}>
        <DiagnosticProfiler id="TimeOfDayInsightsCard"><TimeOfDayInsightsCard data={view} days={timeOfDayDays} period={timeOfDayPeriod} anchor={timeOfDayAnchor} onPeriodChange={setTimeOfDayPeriod} onPeriodShift={(delta) => setTimeOfDayAnchor((current) => shiftInsightPeriodAnchor(current, timeOfDayPeriod, delta))} /></DiagnosticProfiler>
      </div>
      <div data-bixbo-jump-label={t("Recover & body")} style={{ order: 55 }}>
        <DiagnosticProfiler id="DayPatternsInsightsCard"><DayPatternsInsightsCard data={view} /></DiagnosticProfiler>
      </div>
      <div data-bixbo-jump-label={t("Meds")} style={{ order: layoutOrder(view, "insights", "meds", 60) }}>
        <DiagnosticProfiler id="MedsAdherenceInsightsCard"><MedsAdherenceInsightsCard data={view} period={medsPeriod} anchor={medsAnchor} onPeriodChange={setMedsPeriod} onPeriodShift={(delta) => setMedsAnchor((current) => shiftInsightPeriodAnchor(current, medsPeriod, delta))} /></DiagnosticProfiler>
      </div>
    </div>}
  </AppShell>;
}
