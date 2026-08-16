import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PatternsContent } from "./patterns";
import { useI18n } from "@/hooks/useI18n";
import { countNoBowelMovements } from "@/lib/domain/bowel";
import { layoutOrder } from "@/lib/layoutRegistry";
import { EMPTY, avgDayPain, toKey, useBixbo } from "@/lib/storage";
import { HfBars, PainChart } from "@/features/insights/charts";
import { BowelOverviewCard } from "@/features/insights/BowelOverviewCard";
import { MedsAdherence } from "@/features/insights/MedsAdherence";
import { TimeOfDayPatternChart } from "@/features/insights/TimeOfDayPatternChart";
import { YearHealthHeatmap } from "@/features/insights/YearHealthHeatmap";
import {
  HOT_FLASH_COLORS,
  HOT_FLASH_DESCRIPTIONS,
  InsightPeriodControl,
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
  const [insightsFilter, setInsightsFilter] = useState<"all" | "overview" | "pain" | "symptoms" | "bowel" | "meds">("all");

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

  const painDays = useMemo(() => periodDays(painPeriod, painAnchor), [painAnchor, painPeriod, periodDays]);
  const hotFlashDays = useMemo(() => periodDays(hotFlashPeriod, hotFlashAnchor), [hotFlashAnchor, hotFlashPeriod, periodDays]);
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

  const hfSeries = useMemo(() => hotFlashDays.map((key) => {
    const vals = (view.dayLogs[key]?.pain ?? []).map((entry) => entry.hotFlashes).filter((value): value is number => value != null);
    return vals.length ? Math.max(...vals) : undefined;
  }), [hotFlashDays, view.dayLogs]);

  const hfCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    hotFlashDays.forEach((key) => (view.dayLogs[key]?.pain ?? []).forEach((entry) => {
      if (entry.hotFlashes && entry.hotFlashes >= 1 && entry.hotFlashes <= 5) counts[entry.hotFlashes]++;
    }));
    return counts;
  }, [hotFlashDays, view.dayLogs]);

  const aggregateMonthly = useCallback((keys: string[], series: (number | undefined)[]) => {
    const sums = new Array(12).fill(0) as number[];
    const counts = new Array(12).fill(0) as number[];
    keys.forEach((key, index) => {
      const value = series[index];
      if (value == null) return;
      const monthIndex = Number(key.slice(5, 7)) - 1;
      sums[monthIndex] += value;
      counts[monthIndex]++;
    });
    return sums.map((sum, index) => counts[index] ? sum / counts[index] : undefined);
  }, []);

  const hfBars = useMemo(() => hotFlashPeriod === "Y" ? aggregateMonthly(hotFlashDays, hfSeries) : hfSeries, [aggregateMonthly, hfSeries, hotFlashDays, hotFlashPeriod]);
  const hfTotal = hfCounts.reduce((a, b) => a + b, 0);
  const hfAvg = hfTotal ? hfCounts.reduce((sum, count, index) => sum + count * index, 0) / hfTotal : null;
  let hfTop = 0;
  for (let level = 1; level <= 5; level++) if (hfCounts[level] > (hfCounts[hfTop] ?? 0)) hfTop = level;

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
      {([["all", "All"], ["overview", "Overview"], ["pain", "Pain"], ["symptoms", "Symptoms"], ["bowel", "Bowel"], ["meds", "Meds"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setInsightsFilter(id)} aria-pressed={insightsFilter === id} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${insightsFilter === id ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface text-muted-foreground ring-1 ring-border/70 hover:text-foreground"}`}>{t(label)}</button>)}
    </div></div> : null}

    {overviewView === "patterns" ? <PatternsContent /> : <div className="flex flex-col gap-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:px-0 lg:pb-12">
      <div className={insightsFilter === "all" || insightsFilter === "overview" ? "lg:col-span-2" : "hidden"} style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}><YearHealthHeatmap data={view} anchor={anchor} onShiftPeriod={shiftHeatmapPeriod} /></div>

      <section style={{ order: layoutOrder(view, "insights", "pain", 20) }} className={`${insightsFilter === "all" || insightsFilter === "pain" ? "" : "hidden "}rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Pain scale")}</p><InsightPeriodControl value={painPeriod} onChange={setPainPeriod} anchor={painAnchor} onShift={(delta) => setPainAnchor((current) => shiftInsightPeriodAnchor(current, painPeriod, delta))} ariaLabel="Pain scale period" /></div>
        <div className="mt-2 flex items-baseline gap-2"><span className="font-serif text-4xl leading-none">{painAvg != null ? painAvg.toFixed(1) : "–"}</span><span className="text-sm text-muted-foreground">avg · {painSeries.filter((value) => value != null).length} {painSeries.filter((value) => value != null).length === 1 ? "entry" : "entries"}</span></div>
        <PainChart key={`pain-${painPeriod}-${toKey(painAnchor)}`} period={painPeriod} days={painDays} series={painSeries} anchor={painAnchor} />
      </section>

      <section style={{ order: layoutOrder(view, "insights", "hotFlashes", 30) }} className={`${insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden "}rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Hot flashes")}</p><InsightPeriodControl value={hotFlashPeriod} onChange={setHotFlashPeriod} anchor={hotFlashAnchor} onShift={(delta) => setHotFlashAnchor((current) => shiftInsightPeriodAnchor(current, hotFlashPeriod, delta))} ariaLabel="Hot flashes period" /></div>
        {hfTotal ? <><div className="mt-2 flex items-baseline gap-2"><span className="font-serif text-4xl leading-none">{hfTotal}</span><span className="text-sm text-muted-foreground">{hfTotal === 1 ? "episode" : "episodes"} · avg {hfAvg!.toFixed(1)}/5 · most often L{hfTop}</span></div><HfBars key={`hot-flashes-${hotFlashPeriod}-${toKey(hotFlashAnchor)}`} bars={hfBars} period={hotFlashPeriod} days={hotFlashDays} anchor={hotFlashAnchor} /><div className="mt-3 space-y-1">{[1, 2, 3, 4, 5].map((level) => { const count = hfCounts[level]; const pct = hfTotal ? (count / hfTotal) * 100 : 0; const color = HOT_FLASH_COLORS[level]; return <div key={level} className="flex items-center gap-2 text-[10px]"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{level}</span><span className="w-16 shrink-0 text-muted-foreground">{HOT_FLASH_DESCRIPTIONS[level]}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div><span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span></div>; })}</div></> : <p className="mt-2 text-sm text-muted-foreground">{t("No hot flashes logged")}</p>}
      </section>

      <div className={insightsFilter === "all" || insightsFilter === "bowel" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "bowel", 40) }}>
        <BowelOverviewCard days={bowelDays} dayLogs={view.dayLogs} period={bowelPeriod} anchor={bowelAnchor} noBowelMovementCount={noBowelMovementCount} onPeriodChange={setBowelPeriod} onPeriodShift={(delta) => setBowelAnchor((current) => shiftInsightPeriodAnchor(current, bowelPeriod, delta))} />
      </div>
      <div className={insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}><TimeOfDayPatternChart data={view} days={timeOfDayDays} period={timeOfDayPeriod} anchor={timeOfDayAnchor} onPeriodChange={setTimeOfDayPeriod} onPeriodShift={(delta) => setTimeOfDayAnchor((current) => shiftInsightPeriodAnchor(current, timeOfDayPeriod, delta))} /></div>
      <div className={insightsFilter === "all" || insightsFilter === "meds" ? "" : "hidden"} style={{ order: layoutOrder(view, "insights", "meds", 60) }}><MedsAdherence data={view} period={medsPeriod} anchor={medsAnchor} onPeriodChange={setMedsPeriod} onPeriodShift={(delta) => setMedsAnchor((current) => shiftInsightPeriodAnchor(current, medsPeriod, delta))} /></div>
    </div>}
  </AppShell>;
}
