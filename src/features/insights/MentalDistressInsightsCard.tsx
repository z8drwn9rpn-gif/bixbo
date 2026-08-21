import { useEffect, useMemo, useState } from "react";
import { useDismissTapTooltip } from "@/components/charts";
import { BrainIcon } from "@/components/icons/BixboBrandIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, todayKey, type BixboData, type DayLog } from "@/lib/storage";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";
import {
  InsightFloatingTooltip,
  eachDay,
  rangeFor,
  shiftInsightPeriodAnchor,
  vividPainChartColor,
  type InsightTooltipDetails,
  type Period,
} from "./shared";

type MentalWellbeingEntry = {
  id: string;
  time?: string;
  distress: number;
  states?: string[];
  factors?: string[];
  note?: string;
};

type MentalDayLog = DayLog & { mentalWellbeing?: MentalWellbeingEntry[] };
type MentalPoint = { key: string; value: number; entry: MentalWellbeingEntry };
type Bucket = { key: string; label: string; value: number | null; count: number };
type ChoiceCount = { value: string; count: number };
type ChoiceStat = {
  raw: string;
  label: string;
  count: number;
  average: number;
  highest: number;
};

const MENTAL_SCALE_LABELS = [
  "None",
  "Very mild",
  "Mild",
  "Uncomfortable",
  "Moderate",
  "Distressing",
  "Strong",
  "Severe",
  "Very severe",
  "Extreme",
  "Worst possible",
] as const;

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function entriesForDay(day: DayLog | undefined): MentalWellbeingEntry[] {
  const entries = (day as MentalDayLog | undefined)?.mentalWellbeing ?? [];
  return entries.filter((entry) => Number.isFinite(entry.distress) && entry.distress >= 0 && entry.distress <= 10);
}

function dateLabel(key: string) {
  return fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dateTimeLabel(point: MentalPoint | null) {
  if (!point) return "—";
  const date = dateLabel(point.key);
  return point.entry.time ? `${date} · ${point.entry.time}` : date;
}

function cleanChoiceLabel(value: string) {
  return value.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "").trim();
}

function mostCommonChoice(points: MentalPoint[], field: "states" | "factors"): ChoiceCount | null {
  const counts = new Map<string, number>();
  points.forEach(({ entry }) => {
    (entry[field] ?? []).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  return Array.from(counts.entries()).reduce<ChoiceCount | null>((best, [value, count]) => {
    return !best || count > best.count ? { value, count } : best;
  }, null);
}

function choiceStats(points: MentalPoint[], field: "states" | "factors"): ChoiceStat[] {
  const values = new Map<string, number[]>();
  points.forEach(({ entry }) => {
    (entry[field] ?? []).forEach((choice) => {
      const current = values.get(choice) ?? [];
      current.push(entry.distress);
      values.set(choice, current);
    });
  });
  return Array.from(values.entries()).map(([raw, distressValues]) => ({
    raw,
    label: cleanChoiceLabel(raw),
    count: distressValues.length,
    average: distressValues.reduce((sum, value) => sum + value, 0) / distressValues.length,
    highest: Math.max(...distressValues),
  }));
}

function highDistressFactor(points: MentalPoint[]): (ChoiceCount & { percentage: number }) | null {
  const high = points.filter((point) => point.value >= 7);
  if (!high.length) return null;
  const counts = new Map<string, number>();
  high.forEach(({ entry }) => {
    (entry.factors ?? []).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  const best = Array.from(counts.entries()).reduce<ChoiceCount | null>((current, [value, count]) => {
    return !current || count > current.count ? { value, count } : current;
  }, null);
  return best ? { ...best, percentage: Math.round((best.count / high.length) * 100) } : null;
}

function clusterText(period: Period, buckets: Bucket[]) {
  const width = period === "M" ? 5 : 3;
  let best: { start: number; end: number; score: number } | null = null;
  for (let start = 0; start < buckets.length; start++) {
    const values = buckets
      .slice(start, Math.min(buckets.length, start + width))
      .map((bucket) => bucket.value)
      .filter((value): value is number => value != null);
    if (!values.length) continue;
    const score = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (!best || score > best.score) best = { start, end: Math.min(buckets.length - 1, start + width - 1), score };
  }
  if (!best) return null;
  if (period === "Y") {
    const start = buckets[best.start]?.label;
    const end = buckets[best.end]?.label;
    return { label: start === end ? start : `${start}–${end}`, score: best.score };
  }
  const startKey = buckets[best.start]?.key;
  const endKey = buckets[best.end]?.key;
  if (!startKey || !endKey) return null;
  const start = fromKey(startKey);
  const end = fromKey(endKey);
  const endMonth = end.toLocaleDateString("en-GB", { month: "short" });
  const label = start.getDate() === end.getDate()
    ? `${end.getDate()} ${endMonth}`
    : start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ${endMonth}`
      : `${dateLabel(startKey)}–${dateLabel(endKey)}`;
  return { label, score: best.score };
}

export function MentalDistressInsightsCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("M");
  const [anchor, setAnchor] = useState<Date>(() => {
    const date = fromKey(todayKey());
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period]);

  const { startK, endK } = useMemo(() => rangeFor(period, anchor), [anchor, period]);
  const dayKeys = useMemo(() => eachDay(startK, endK), [endK, startK]);
  const points = useMemo<MentalPoint[]>(
    () => dayKeys.flatMap((key) => entriesForDay(data.dayLogs[key]).map((entry) => ({ key, value: entry.distress, entry }))),
    [data.dayLogs, dayKeys],
  );

  const buckets = useMemo<Bucket[]>(() => {
    if (period === "Y") {
      return Array.from({ length: 12 }, (_, month) => {
        const prefix = `${anchor.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
        const values = points.filter((point) => point.key.startsWith(prefix)).map((point) => point.value);
        return {
          key: prefix,
          label: new Date(anchor.getFullYear(), month, 1).toLocaleDateString("en-GB", { month: "short" }),
          value: average(values),
          count: values.length,
        };
      });
    }
    return dayKeys.map((key) => {
      const values = entriesForDay(data.dayLogs[key]).map((entry) => entry.distress);
      return { key, label: dateLabel(key), value: average(values), count: values.length };
    });
  }, [anchor, data.dayLogs, dayKeys, period, points]);

  const avg = average(points.map((point) => point.value));
  const peak = points.reduce<MentalPoint | null>((best, point) => !best || point.value > best.value ? point : best, null);
  const lowest = points.reduce<MentalPoint | null>((best, point) => !best || point.value < best.value ? point : best, null);
  const state = mostCommonChoice(points, "states");
  const factor = highDistressFactor(points);
  const cluster = clusterText(period, buckets);

  const stateStats = useMemo(
    () => choiceStats(points, "states").sort((a, b) => b.count - a.count || b.average - a.average).slice(0, 5),
    [points],
  );
  const factorStats = useMemo(
    () => choiceStats(points, "factors").sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 5),
    [points],
  );
  const maxStateCount = Math.max(1, ...stateStats.map((item) => item.count));
  const strongestFactor = factorStats.find((item) => item.count >= 2) ?? factorStats[0] ?? null;

  const previousAverage = useMemo(() => {
    const previousAnchor = shiftInsightPeriodAnchor(anchor, period, -1);
    const previousRange = rangeFor(period, previousAnchor);
    const values = eachDay(previousRange.startK, previousRange.endK)
      .flatMap((key) => entriesForDay(data.dayLogs[key]).map((entry) => entry.distress));
    return average(values);
  }, [anchor, data.dayLogs, period]);

  const trendPct = avg != null && previousAverage != null && previousAverage > 0
    ? Math.round(((avg - previousAverage) / previousAverage) * 100)
    : null;
  const trendComparison = period === "W" ? "vs last week" : period === "M" ? "vs last month" : "vs last year";

  const activeBucket = active == null ? null : buckets[active] ?? null;
  const activeDetails: InsightTooltipDetails | null = activeBucket?.value != null ? (() => {
    const value = activeBucket.value;
    const level = Math.max(0, Math.min(10, Math.round(value)));
    const heading = period === "Y" ? `${activeBucket.label} ${anchor.getFullYear()}` : activeBucket.label;
    const description = `${MENTAL_SCALE_LABELS[level]} · ${activeBucket.count} ${activeBucket.count === 1 ? "entry" : "entries"}`;
    return {
      owner: "You",
      heading,
      value: `Mental distress ${value.toFixed(1)}/10`,
      description,
      color: vividPainChartColor(value),
      summary: `${heading} · Mental distress ${value.toFixed(1)}/10 · ${description}`,
    };
  })() : null;

  const xLabels = period === "W"
    ? buckets.map((bucket) => fromKey(bucket.key).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2))
    : period === "M"
      ? ["1", "5", "10", "15", "20", "25", String(fromKey(endK).getDate())]
      : ["Jan", "Mar", "May", "Jul", "Sep", "Nov", "Dec"];

  return (
    <section
      className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80"
      data-bixbo-mental-insights-card="true"
      data-bixbo-mental-distress-card="true"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55 ring-1 ring-border/50">
          <BrainIcon size={30} />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{t("Mental insights")}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Mental wellbeing · 0–10 scale</p>
        </div>
      </div>

      <DashboardPeriodControl
        value={period}
        onChange={setPeriod}
        anchor={anchor}
        onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))}
        ariaLabel="Mental insights period"
      />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-4xl leading-none text-foreground">{avg != null ? avg.toFixed(1) : "–"}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">avg · {points.length} {points.length === 1 ? "entry" : "entries"}</span>
        </div>
        {trendPct != null ? (
          <span
            className="rounded-xl bg-background/55 px-2.5 py-1 text-[10px] font-semibold ring-1 ring-border/60"
            style={{ color: trendPct <= 0 ? "#76aa3e" : "#e04a5d" }}
          >
            {trendPct > 0 ? "↑ " : trendPct < 0 ? "↓ " : ""}{Math.abs(trendPct)}% {trendComparison}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl bg-background/45 px-3 pb-2.5 pt-3 ring-1 ring-border/45">
        <p className="text-[10px] font-semibold text-foreground">Mental distress <span className="font-normal text-muted-foreground">(0–10)</span></p>
        <div className="mt-2 flex gap-2">
          <div className="flex h-[150px] w-5 flex-col justify-between text-right text-[10px] text-muted-foreground">
            {[10, 8, 6, 4, 2, 0].map((value) => <span key={value} className="leading-none tabular-nums">{value}</span>)}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[10, 8, 6, 4, 2, 0].map((value) => <div key={value} className="border-t border-dashed border-border/55" />)}
            </div>
            <div className={`relative grid h-[150px] items-end ${period === "M" ? "gap-[1px]" : "gap-[3px]"}`} style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
              {buckets.map((bucket, index) => bucket.value != null ? (
                <button
                  key={bucket.key}
                  type="button"
                  aria-label={`${bucket.label}. Mental distress ${bucket.value.toFixed(1)} of 10`}
                  aria-pressed={active === index}
                  data-bixbo-chart-mark="bar"
                  onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }}
                  className={`min-w-0 rounded-t-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "ring-2 ring-foreground/70" : ""}`}
                  style={{ height: `${Math.max(4, (bucket.value / 10) * 100)}%`, background: vividPainChartColor(bucket.value) }}
                />
              ) : <div key={bucket.key} className="h-[2px] self-end rounded bg-tint/45" />)}
              {activeDetails && active != null ? <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, buckets.length)) * 100} details={activeDetails} top={0} /> : null}
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex justify-between pl-7 text-[9px] text-muted-foreground">
          {xLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</p>
      </div>

      <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45" data-bixbo-mental-states-section="true">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">Mental states</p>
          <p className="text-[9px] text-muted-foreground">Entries</p>
        </div>
        {stateStats.length ? (
          <div className="space-y-2.5">
            {stateStats.map((item) => (
              <div key={item.raw} className="grid grid-cols-[minmax(96px,122px)_minmax(0,1fr)_26px] items-center gap-2">
                <span className="truncate text-[10px] font-medium text-foreground">{item.label}</span>
                <span className="relative h-4 overflow-visible rounded-md bg-tint/45">
                  <span
                    data-bixbo-chart-mark="bar"
                    data-bixbo-chart-direction="horizontal"
                    className="absolute inset-y-0 left-0 min-w-[6px]"
                    style={{ width: `${Math.max(4, (item.count / maxStateCount) * 100)}%`, background: vividPainChartColor(item.average) }}
                  />
                </span>
                <span className="text-right text-[10px] font-semibold tabular-nums text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[72px] place-items-center text-center text-xs text-muted-foreground">No mental states logged in this period.</div>
        )}
      </div>

      <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45" data-bixbo-distress-factor-section="true">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">Distress by factor <span className="font-normal text-muted-foreground">(avg 0–10)</span></p>
          <p className="text-[9px] text-muted-foreground">Avg · n</p>
        </div>
        {factorStats.length ? (
          <div className="space-y-2.5">
            {factorStats.map((item) => (
              <div key={item.raw} className="grid grid-cols-[minmax(96px,122px)_minmax(0,1fr)_30px_32px] items-center gap-1.5">
                <span className="truncate text-[10px] font-medium text-foreground">{item.label}</span>
                <span className="relative h-4 overflow-visible rounded-md bg-tint/45">
                  <span
                    data-bixbo-chart-mark="bar"
                    data-bixbo-chart-direction="horizontal"
                    className="absolute inset-y-0 left-0 min-w-[6px]"
                    style={{ width: `${Math.max(4, item.average * 10)}%`, background: vividPainChartColor(item.average) }}
                  />
                </span>
                <span className="text-right text-[10px] font-semibold tabular-nums" style={{ color: vividPainChartColor(item.average) }}>{item.average.toFixed(1)}</span>
                <span className="text-right text-[9px] tabular-nums text-muted-foreground">n={item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[72px] place-items-center text-center text-xs text-muted-foreground">No mental factors logged in this period.</div>
        )}
        <p className="mt-3 text-[9px] leading-snug text-muted-foreground">Associations in your logs, not causes.</p>
      </div>

      <QuickInsights items={[
        {
          kind: "target",
          color: cluster ? vividPainChartColor(cluster.score) : "#6ea83c",
          text: cluster ? `Highest distress cluster: ${cluster.label} (avg ${cluster.score.toFixed(1)})` : "No distress cluster yet",
        },
        {
          kind: "bars",
          color: "#6ea83c",
          text: state ? `Most common state: ${cleanChoiceLabel(state.value)} (${state.count} ${state.count === 1 ? "entry" : "entries"})` : "No mental state pattern yet",
        },
        {
          kind: "moon",
          color: strongestFactor ? vividPainChartColor(strongestFactor.average) : factor ? vividPainChartColor(7) : "#6ea83c",
          text: strongestFactor
            ? `${strongestFactor.label} showed the highest average distress (${strongestFactor.average.toFixed(1)}/10, n=${strongestFactor.count})`
            : factor
              ? `${cleanChoiceLabel(factor.value)} appeared in ${factor.percentage}% of high-distress logs`
              : "No factor pattern yet",
        },
      ]} />

      <MetricCards items={[
        { label: "Peak", value: peak ? peak.value.toFixed(peak.value % 1 ? 1 : 0) : "—", sub: dateTimeLabel(peak), color: "#ef4444" },
        { label: "Lowest", value: lowest ? lowest.value.toFixed(lowest.value % 1 ? 1 : 0) : "—", sub: dateTimeLabel(lowest), color: "#82b53f" },
        {
          label: "Trend",
          value: trendPct == null ? "—" : `${trendPct > 0 ? "↑ " : trendPct < 0 ? "↓ " : ""}${Math.abs(trendPct)}%`,
          sub: trendComparison,
          kind: "trend",
          color: trendPct != null && trendPct <= 0 ? "#76aa3e" : "#f07c23",
        },
      ]} />
    </section>
  );
}
