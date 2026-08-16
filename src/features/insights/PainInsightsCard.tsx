import { useMemo, useState } from "react";
import { useDismissTapTooltip, CHART_GRID } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { avgDayPain, fromKey, PAIN_DESCRIPTIONS, type BixboData } from "@/lib/storage";
import {
  InsightFloatingTooltip,
  fmtCoupleTooltipDay,
  fmtTapMonth,
  rangeFor,
  eachDay,
  shiftInsightPeriodAnchor,
  vividPainChartColor,
  type InsightTooltipDetails,
  type Period,
} from "./shared";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";

type Bar = { value?: number; label: string; key?: string };

function periodBars(period: Period, days: string[], series: (number | undefined)[]): Bar[] {
  if (period === "Y") {
    const months = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((key, index) => {
      const value = series[index];
      if (value == null) return;
      const month = fromKey(key).getMonth();
      months[month].sum += value;
      months[month].n += 1;
    });
    return months.map((month, index) => ({
      value: month.n ? month.sum / month.n : undefined,
      label: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][index],
    }));
  }
  if (period === "M") {
    return days.map((key, index) => ({
      value: series[index],
      label: fromKey(key).getDate() % 2 === 1 ? String(fromKey(key).getDate()) : "",
      key,
    }));
  }
  return days.map((key, index) => {
    const date = fromKey(key);
    return {
      value: series[index],
      label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()],
      key,
    };
  });
}

function average(values: (number | undefined)[]) {
  const nums = values.filter((value): value is number => value != null);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function dateLabel(key: string | undefined) {
  if (!key) return "—";
  return fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PainInsightsCard({
  data,
  period,
  days,
  series,
  anchor,
  averageValue,
  onPeriodChange,
  onPeriodShift,
}: {
  data: BixboData;
  period: Period;
  days: string[];
  series: (number | undefined)[];
  anchor: Date;
  averageValue: number | null;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));

  const bars = useMemo(() => periodBars(period, days, series), [days, period, series]);
  const defined = series
    .map((value, index) => ({ value, index, key: days[index] }))
    .filter((item): item is { value: number; index: number; key: string } => item.value != null);

  const peak = defined.reduce<typeof defined[number] | null>((best, item) => !best || item.value > best.value ? item : best, null);
  const lowest = defined.reduce<typeof defined[number] | null>((best, item) => !best || item.value < best.value ? item : best, null);

  const previousAverage = useMemo(() => {
    const previousAnchor = shiftInsightPeriodAnchor(anchor, period, -1);
    const { startK, endK } = rangeFor(period, previousAnchor);
    return average(eachDay(startK, endK).map((key) => avgDayPain(data.dayLogs[key])));
  }, [anchor, data.dayLogs, period]);

  const trendPct = averageValue != null && previousAverage != null && previousAverage > 0
    ? Math.round(((averageValue - previousAverage) / previousAverage) * 100)
    : null;

  const cluster = useMemo(() => {
    if (!defined.length) return null;
    const width = period === "M" ? 5 : 3;
    let best: { start: number; end: number; score: number } | null = null;
    for (let start = 0; start < series.length; start++) {
      let sum = 0;
      let n = 0;
      for (let index = start; index < Math.min(series.length, start + width); index++) {
        const value = series[index];
        if (value == null) continue;
        sum += value;
        n += 1;
      }
      if (!n) continue;
      const score = sum / n;
      if (!best || score > best.score) best = { start, end: Math.min(series.length - 1, start + width - 1), score };
    }
    if (!best) return null;
    if (period === "Y") {
      const startMonth = fromKey(days[best.start]).toLocaleDateString("en-GB", { month: "short" });
      const endMonth = fromKey(days[best.end]).toLocaleDateString("en-GB", { month: "short" });
      return startMonth === endMonth ? startMonth : `${startMonth}–${endMonth}`;
    }
    const start = fromKey(days[best.start]);
    const end = fromKey(days[best.end]);
    const month = end.toLocaleDateString("en-GB", { month: "short" });
    return start.getDate() === end.getDate() ? `${end.getDate()} ${month}` : `${start.getDate()}–${end.getDate()} ${month}`;
  }, [days, defined.length, period, series]);

  const moderateHigh = defined.filter((item) => item.value >= 4).length;
  const earlyCut = Math.max(1, Math.ceil(series.length / 3));
  const earlyAverage = average(series.slice(0, earlyCut));
  const laterAverage = average(series.slice(earlyCut));
  const activeDetails: InsightTooltipDetails | null = active != null && bars[active]?.value != null
    ? (() => {
        const value = bars[active].value!;
        const heading = period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtCoupleTooltipDay(days[active]);
        const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(value)))] ?? "Pain";
        const color = vividPainChartColor(value);
        return {
          owner: "You",
          heading,
          value: `Pain ${value.toFixed(1)}/10`,
          description,
          color,
          summary: `${heading} · Pain ${value.toFixed(1)}/10 · ${description}`,
        };
      })()
    : null;

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground" style={{ fontWeight: 700 }}>{t("Pain scale")}</p>
      <DashboardPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Pain scale period" />

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-serif text-5xl leading-none text-foreground">{averageValue != null ? averageValue.toFixed(1) : "–"}</span>
        <span className="text-base text-muted-foreground">avg · {defined.length} {defined.length === 1 ? "entry" : "entries"}</span>
      </div>

      <div className="mt-4 rounded-[26px] bg-background/45 px-3 pb-3 pt-4 ring-1 ring-border/45">
        <p className="text-[11px] text-muted-foreground">Pain (0–10)</p>
        <div className="mt-2 flex gap-2">
          <div className="flex h-[190px] w-6 flex-col justify-between text-right text-[11px] text-muted-foreground">
            {[10, 8, 6, 4, 2, 0].map((value) => <span key={value} className="leading-none tabular-nums">{value}</span>)}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[10, 8, 6, 4, 2, 0].map((value) => <div key={value} className="border-t border-dashed" style={{ borderColor: CHART_GRID }} />)}
            </div>
            <div className="relative grid h-[190px] items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}>
              {bars.map((bar, index) => bar.value != null ? (
                <button key={index} type="button" aria-label={`Pain ${bar.value.toFixed(1)}`} aria-pressed={active === index}
                  onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }}
                  className={`min-w-0 rounded-t-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "ring-2 ring-foreground/70" : ""}`}
                  style={{ height: `${Math.max(4, (bar.value / 10) * 100)}%`, background: vividPainChartColor(bar.value) }} />
              ) : <div key={index} className="h-[2px] self-end rounded bg-tint/45" />)}
              {activeDetails && active != null ? <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={activeDetails} top={0} /> : null}
            </div>
          </div>
        </div>
        <div className="mt-2 grid gap-[3px] pl-8 text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}>
          {bars.map((bar, index) => <span key={index} className="truncate">{bar.label}</span>)}
        </div>
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</p>
      </div>

      <QuickInsights items={[
        { kind: "target", color: "#e64c73", text: cluster ? `Highest pain cluster: ${cluster}` : "No pain cluster yet" },
        { kind: "bars", color: "#f07c23", text: moderateHigh >= Math.max(1, Math.ceil(defined.length / 2)) ? "Most entries were moderate to high" : "Most entries stayed low to mild" },
        { kind: "leaf", color: "#6ea83c", text: earlyAverage != null && laterAverage != null && earlyAverage <= laterAverage ? "Pain was lower early in the period" : "Pain was higher early in the period" },
      ]} />

      <MetricCards items={[
        { label: "Peak", value: peak ? peak.value.toFixed(1) : "—", sub: dateLabel(peak?.key), color: "#ef4444" },
        { label: "Lowest", value: lowest ? lowest.value.toFixed(1) : "—", sub: dateLabel(lowest?.key), color: "#82b53f" },
        { label: "Trend", value: trendPct == null ? "—" : `${trendPct > 0 ? "↑ " : trendPct < 0 ? "↓ " : ""}${Math.abs(trendPct)}%`, sub: period === "W" ? "vs last week" : period === "M" ? "vs last month" : "vs last year", kind: "trend", color: trendPct != null && trendPct <= 0 ? "#76aa3e" : "#f07c23" },
      ]} />
    </section>
  );
}
