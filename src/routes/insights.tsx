import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PatternsContent } from "./patterns";
import { useI18n } from "@/hooks/useI18n";
import { countNoBowelMovements } from "@/lib/domain/bowel";
import { layoutOrder } from "@/lib/layoutRegistry";
import { EMPTY, avgDayPain, useBixbo } from "@/lib/storage";
import { PainInsightsCard } from "@/features/insights/PainInsightsCard";
import { BowelOverviewCard } from "@/features/insights/BowelOverviewCard";
import { MedsAdherenceInsightsCard } from "@/features/insights/MedsAdherenceInsightsCard";
import { TimeOfDayInsightsCard } from "@/features/insights/TimeOfDayInsightsCard";
import { SukSukInsightsCard } from "@/features/insights/SukSukInsightsCard";
import { SymptomsTrendInsightsCard } from "@/features/insights/SymptomsTrendInsightsCard";
import { YearHealthHeatmap } from "@/features/insights/YearHealthHeatmap";
import {
  eachDay,
  rangeFor,
  shiftInsightPeriodAnchor,
  type HeatmapPeriod,
  type Period,
} from "@/features/insights/shared";

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
  const [insightsFilter, setInsightsFilter] = useState<"all" | "overview" | "pain" | "symptoms" | "bowel" | "sex" | "meds">("all");

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

    {overviewView === "insights" ? <div className="px-5 pt-2 lg:px-0"><div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={t("Insights sections")}>
      {([["all", "All"], ["overview", "Overview"], ["pain", "Pain"], ["symptoms", "Symptoms"], ["bowel", "Bowel"], ["sex", "ŠukŠuk"], ["meds", "Meds"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setInsightsFilter(id)} aria-pressed={insightsFilter === id} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${insightsFilter === id ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface text-muted-foreground ring-1 ring-border/70 hover:text-foreground"}`}>{t(label)}</button>)}
    </div></div> : null}

    {overviewView === "patterns" ? <PatternsContent /> : <div data-bixbo-insights-dashboard="true" className="flex flex-col gap-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:px-0 lg:pb-12">
      <div className={insightsFilter === "all" || insightsFilter === "overview" ? "lg:col-span-2" : "hidden"} style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}><YearHealthHeatmap data={view} anchor={anchor} onShiftPeriod={shiftHeatmapPeriod} /></div>

      <div className={insightsFilter === "all" || insightsFilter === "pain" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "pain", 20) }}>
        <PainInsightsCard data={view} period={painPeriod} days={painDays} series={painSeries} anchor={painAnchor} averageValue={painAvg} onPeriodChange={setPainPeriod} onPeriodShift={(delta) => setPainAnchor((current) => shiftInsightPeriodAnchor(current, painPeriod, delta))} />
      </div>

      <div className={insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden"} style={{ order: 25 }}>
        <SymptomsTrendInsightsCard data={view} />
      </div>

      <div className={insightsFilter === "all" || insightsFilter === "bowel" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "bowel", 40) }}>
        <BowelOverviewCard days={bowelDays} dayLogs={view.dayLogs} period={bowelPeriod} anchor={bowelAnchor} noBowelMovementCount={noBowelMovementCount} onPeriodChange={setBowelPeriod} onPeriodShift={(delta) => setBowelAnchor((current) => shiftInsightPeriodAnchor(current, bowelPeriod, delta))} />
      </div>
      <div className={insightsFilter === "all" || insightsFilter === "sex" ? "" : "hidden"} style={{ order: 45 }}>
        <SukSukInsightsCard data={view} />
      </div>
      <div className={insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}><TimeOfDayInsightsCard data={view} days={timeOfDayDays} period={timeOfDayPeriod} anchor={timeOfDayAnchor} onPeriodChange={setTimeOfDayPeriod} onPeriodShift={(delta) => setTimeOfDayAnchor((current) => shiftInsightPeriodAnchor(current, timeOfDayPeriod, delta))} /></div>
      <div className={insightsFilter === "all" || insightsFilter === "meds" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "meds", 60) }}><MedsAdherenceInsightsCard data={view} period={medsPeriod} anchor={medsAnchor} onPeriodChange={setMedsPeriod} onPeriodShift={(delta) => setMedsAnchor((current) => shiftInsightPeriodAnchor(current, medsPeriod, delta))} /></div>
    </div>}
  </AppShell>;
}
