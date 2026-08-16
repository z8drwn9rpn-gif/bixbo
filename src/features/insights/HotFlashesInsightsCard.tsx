import { useMemo, useState } from "react";
import { useDismissTapTooltip } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { type BixboData } from "@/lib/storage";
import {
  HOT_FLASH_COLORS,
  HOT_FLASH_DESCRIPTIONS,
  InsightFloatingTooltip,
  rangeFor,
  eachDay,
  shiftInsightPeriodAnchor,
  fmtCoupleTooltipDay,
  fmtTapMonth,
  type InsightTooltipDetails,
  type Period,
} from "./shared";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";

function previousHotFlashCount(data: BixboData, period: Period, anchor: Date) {
  const previousAnchor = shiftInsightPeriodAnchor(anchor, period, -1);
  const { startK, endK } = rangeFor(period, previousAnchor);
  return eachDay(startK, endK).reduce((total, key) => total + (data.dayLogs[key]?.pain ?? []).filter((entry) => !!entry.hotFlashes).length, 0);
}

export function HotFlashesInsightsCard({
  data,
  period,
  days,
  bars,
  counts,
  total,
  average,
  topLevel,
  anchor,
  onPeriodChange,
  onPeriodShift,
}: {
  data: BixboData;
  period: Period;
  days: string[];
  bars: (number | undefined)[];
  counts: number[];
  total: number;
  average: number | null;
  topLevel: number;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));

  const previousTotal = useMemo(() => previousHotFlashCount(data, period, anchor), [anchor, data, period]);
  const trendPct = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;
  const peakLevel = Math.max(0, ...counts.map((count, level) => count > 0 ? level : 0));
  const severeCount = (counts[4] ?? 0) + (counts[5] ?? 0);
  const activeIndexes = bars.map((value, index) => value != null ? index : -1).filter((index) => index >= 0);
  const clusterText = activeIndexes.length
    ? period === "M"
      ? activeIndexes.some((index) => index < 10) && activeIndexes.some((index) => index >= 10 && index < 20)
        ? "Episodes clustered early and mid-month"
        : activeIndexes[0] < Math.max(1, bars.length / 2) ? "Episodes clustered early in the month" : "Episodes clustered later in the month"
      : period === "W" ? "Episodes clustered within this week" : "Episodes clustered in a few months"
    : "No episode cluster yet";

  const activeDetails: InsightTooltipDetails | null = active != null && bars[active] != null
    ? (() => {
        const value = bars[active]!;
        const level = Math.max(1, Math.min(5, Math.round(value)));
        const heading = period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtCoupleTooltipDay(days[active]);
        const description = HOT_FLASH_DESCRIPTIONS[level] ?? "Hot flash";
        const color = HOT_FLASH_COLORS[level];
        return { owner: "You", heading, value: `Hot flash ${value.toFixed(1)}/5`, description, color, summary: `${heading} · Hot flash ${value.toFixed(1)}/5 · ${description}` };
      })()
    : null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{t("Hot flashes")}</p>
      <DashboardPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Hot flashes period" />

      {total ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-4xl leading-none text-foreground">{total}</span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{total === 1 ? "episode" : "episodes"} · avg {average?.toFixed(1) ?? "—"}/5 · most often L{topLevel}</span>
          </div>

          <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45">
            <p className="text-[10px] text-muted-foreground">Episodes by day</p>
            <div className="relative mt-2 grid h-[50px] items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}>
              {bars.map((value, index) => value != null ? (
                <button key={index} type="button" onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }} aria-pressed={active === index}
                  className={`min-w-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "ring-2 ring-foreground/70" : ""}`}
                  style={{ height: `${Math.max(12, (value / 5) * 100)}%`, background: HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))] }} />
              ) : <div key={index} className="h-2 w-2 place-self-center self-end rounded-full bg-tint/75" />)}
              {activeDetails && active != null ? <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={activeDetails} top={-68} connectorSide="bottom" /> : null}
            </div>
            <div className="mt-1.5 flex justify-between border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
              {period === "M" ? [1, 5, 10, 15, 20, 25, 31].map((value) => <span key={value}>{value}</span>)
                : period === "W" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((value) => <span key={value}>{value}</span>)
                  : ["Jan", "Mar", "May", "Jul", "Sep", "Nov", "Dec"].map((value) => <span key={value}>{value}</span>)}
            </div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</p>

            <div className="mt-3 space-y-2">
              {[1, 2, 3, 4, 5].map((level) => {
                const count = counts[level] ?? 0;
                const pct = total ? (count / total) * 100 : 0;
                const color = HOT_FLASH_COLORS[level];
                return (
                  <div key={level} className="grid grid-cols-[24px_92px_minmax(0,1fr)_22px] items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] text-white" style={{ background: color, fontWeight: 700 }}>{level}</span>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{HOT_FLASH_DESCRIPTIONS[level]}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-tint/70"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
                    <span className="text-right text-[10px] tabular-nums text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <QuickInsights items={[
            { kind: "target", color: HOT_FLASH_COLORS[Math.max(1, topLevel)], text: `Most episodes were level ${topLevel}` },
            { kind: "bars", color: "#f07c23", text: clusterText },
            { kind: "leaf", color: "#6ea83c", text: severeCount ? `${severeCount} severe ${severeCount === 1 ? "episode was" : "episodes were"} logged` : "No severe hot flashes logged" },
          ]} />

          <MetricCards items={[
            { label: "Peak level", value: peakLevel || "—", sub: peakLevel ? HOT_FLASH_DESCRIPTIONS[peakLevel] : "No episodes", color: HOT_FLASH_COLORS[Math.max(1, peakLevel || 1)] },
            { label: "Top frequency", value: topLevel ? `Level ${topLevel}` : "—", sub: topLevel ? HOT_FLASH_DESCRIPTIONS[topLevel] : "No episodes", color: HOT_FLASH_COLORS[Math.max(1, topLevel || 1)] },
            { label: "Trend", value: trendPct == null ? "—" : `${trendPct > 0 ? "↑ " : trendPct < 0 ? "↓ " : ""}${Math.abs(trendPct)}%`, sub: period === "W" ? "vs last week" : period === "M" ? "vs last month" : "vs last year", kind: "trend", color: trendPct != null && trendPct <= 0 ? "#76aa3e" : "#ef4444" },
          ]} />
        </>
      ) : <p className="mt-3 text-xs text-muted-foreground">{t("No hot flashes logged")}</p>}
    </section>
  );
}
