import { useMemo, useState } from "react";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { type BixboData, fromKey } from "@/lib/storage";
import {
  averageNumbers,
  dailyVitalRecordCount,
  dailyVitalTrendValue,
  daysBetweenInclusive,
  monthlyVitalRecords,
  shiftTrendAnchor,
  sleepTrendColor,
  trendDayHeading,
  trendRange,
  type VitalTrendMetric,
  type VitalTrendPoint,
} from "@/components/home/vitalTrends";
import { DashboardPeriodControl, MetricCards } from "./InsightDashboardPrimitives";
import { type Period } from "./shared";

const WEIGHT_COLOR = "#7B9140";
const TEMPERATURE_COLOR = "#E15C4A";

function pointsForMetric(
  metric: VitalTrendMetric,
  period: Period,
  anchor: Date,
  data: BixboData,
  locale: string,
): VitalTrendPoint[] {
  if (period === "Y") {
    const year = anchor.getFullYear();
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      const records = monthlyVitalRecords(metric, start, end, data);
      return {
        key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: start.toLocaleDateString(locale, { month: "short" }),
        heading: start.toLocaleDateString(locale, { month: "long", year: "numeric" }),
        value: averageNumbers(records.values),
        details: records.details,
        recordCount: records.values.length,
      };
    });
  }

  const { start, end } = trendRange(period, anchor);
  return daysBetweenInclusive(start, end).map((key) => {
    const date = fromKey(key);
    return {
      key,
      label: period === "W" ? date.toLocaleDateString(locale, { weekday: "short" }).slice(0, 2) : String(date.getDate()),
      heading: trendDayHeading(key),
      value: dailyVitalTrendValue(metric, data.dayLogs[key]),
      details: [],
      recordCount: dailyVitalRecordCount(metric, key, data),
    };
  });
}

function averageOf(points: VitalTrendPoint[]) {
  return averageNumbers(points.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value)));
}

function longestAboveEight(points: VitalTrendPoint[]) {
  let best = 0;
  let current = 0;
  points.forEach((point) => {
    if (point.value != null && point.value > 8) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

function SleepChart({ points }: { points: VitalTrendPoint[] }) {
  const yLabels = [12, 10, 8, 6, 4, 2, 0];
  const visibleIndexes = new Set<number>();
  if (points.length <= 12) points.forEach((_, index) => visibleIndexes.add(index));
  else points.forEach((_, index) => { if (index === 0 || index === points.length - 1 || index % 2 === 0) visibleIndexes.add(index); });

  return (
    <div data-bixbo-insight-chart-card="pain" className="mt-3 rounded-2xl bg-background/45 px-3 pb-3 pt-3 ring-1 ring-border/45">
      <div className="flex gap-2">
        <div className="flex h-[154px] w-5 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground">
          {yLabels.map((value) => <span key={value} className="leading-none">{value}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {yLabels.map((value) => <div key={value} className="border-t border-dashed border-border/70" />)}
          </div>
          <div
            className="relative grid h-[154px] items-end gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, points.length)}, minmax(0, 1fr))` }}
          >
            {points.map((point) => point.value != null ? (
              <span
                key={point.key}
                data-bixbo-chart-mark="bar"
                aria-label={`${point.heading} · ${point.value.toFixed(1)} h`}
                className="min-w-0 rounded-t-[6px]"
                style={{
                  height: `${Math.max(5, (Math.min(12, point.value) / 12) * 100)}%`,
                  background: sleepTrendColor(point.value),
                  filter: "saturate(1.5) contrast(1.08)",
                }}
              />
            ) : <span key={point.key} className="h-[2px] self-end rounded bg-border/55" />)}
          </div>
        </div>
      </div>
      <div className="mt-1 grid gap-[2px] pl-7 text-center text-[9px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${Math.max(1, points.length)}, minmax(0, 1fr))` }}>
        {points.map((point, index) => <span key={point.key} className="truncate">{visibleIndexes.has(index) ? point.label : ""}</span>)}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#EF4444" }} /> &lt;8h</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#F3C30D" }} /> 8h</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#72C64A" }} /> &gt;8h</span>
      </div>
    </div>
  );
}

function LineChart({
  metric,
  points,
  color,
}: {
  metric: "weight" | "temperature";
  points: VitalTrendPoint[];
  color: string;
}) {
  const values = points.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value));
  if (!values.length) return <div className="mt-3 grid min-h-36 place-items-center rounded-2xl bg-background/45 text-xs text-muted-foreground ring-1 ring-border/45">No data in this period</div>;

  const chartWidth = 304;
  const chartHeight = 150;
  const left = 16;
  const right = 34;
  const top = 12;
  const bottom = 24;
  const chartW = chartWidth - left - right;
  const chartH = chartHeight - top - bottom;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minimumSpan = metric === "temperature" ? 0.6 : 1.0;
  const span = Math.max(minimumSpan, rawMax - rawMin);
  const yMin = rawMin - span * 0.22;
  const yMax = rawMax + span * 0.22;
  const denom = Math.max(1, points.length - 1);
  const xFor = (index: number) => left + (index / denom) * chartW;
  const yFor = (value: number) => top + ((yMax - value) / Math.max(0.001, yMax - yMin)) * chartH;
  const plotted = points
    .map((point, index) => point.value == null ? null : { point, index, x: xFor(index), y: yFor(point.value) })
    .filter((item): item is { point: VitalTrendPoint; index: number; x: number; y: number } => item != null);
  const path = plotted.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  const visibleIndexes = new Set<number>();
  points.forEach((_, index) => {
    const step = points.length <= 12 ? 2 : Math.max(1, Math.floor(points.length / 6));
    if (index === 0 || index === points.length - 1 || index % step === 0) visibleIndexes.add(index);
  });

  const sorted = [...values].sort((a, b) => a - b);
  const lower = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const upper = sorted[Math.floor((sorted.length - 1) * 0.75)];
  const bandTop = metric === "temperature" && sorted.length >= 4 ? yFor(upper) : null;
  const bandBottom = metric === "temperature" && sorted.length >= 4 ? yFor(lower) : null;

  return (
    <div className="mt-3 rounded-2xl bg-background/45 p-2 ring-1 ring-border/45">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full overflow-visible" role="img">
        {bandTop != null && bandBottom != null ? (
          <rect x={left} y={bandTop} width={chartW} height={Math.max(3, bandBottom - bandTop)} rx="5" fill="rgba(123,145,64,.10)" stroke="rgba(123,145,64,.18)" />
        ) : null}
        {[0, 0.5, 1].map((fraction) => {
          const y = top + fraction * chartH;
          const value = yMax - fraction * (yMax - yMin);
          return (
            <g key={fraction}>
              <line x1={left} x2={left + chartW} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" />
              <text x={chartWidth - 2} y={y + 3} textAnchor="end" fontSize="8" fill="var(--muted-foreground)">{value.toFixed(1)}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="rgba(45,52,35,.18)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.2)" />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "saturate(1.45) drop-shadow(0 1.5px 1.5px rgba(45,52,35,.22))" }} />
        {plotted.map((item, plottedIndex) => {
          const latest = plottedIndex === plotted.length - 1;
          return (
            <g key={item.point.key}>
              {latest ? <circle cx={item.x} cy={item.y} r="7.2" fill={color} opacity=".16" /> : null}
              <circle cx={item.x} cy={item.y} r={latest ? 5.1 : 4} fill="var(--surface)" stroke={color} strokeWidth={latest ? 2.8 : 2.2} style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(45,52,35,.20))" }} />
              <circle cx={item.x - 1.2} cy={item.y - 1.2} r="1" fill="rgba(255,255,255,.9)" />
            </g>
          );
        })}
        {points.map((point, index) => visibleIndexes.has(index) ? (
          <text key={`label-${point.key}`} x={xFor(index)} y={chartHeight - 5} textAnchor="middle" fontSize="7.5" fill="var(--muted-foreground)">{point.label}</text>
        ) : null)}
      </svg>
    </div>
  );
}

function MetricHeader({ icon, title, subtitle, color }: { icon: string; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/55">
        <Ico e={icon} size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight" style={{ color }}>{title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function DayPatternsInsightsCard({ data }: { data: BixboData }) {
  const { t, language } = useI18n();
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const [period, setPeriod] = useState<Period>("M");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const sleepPoints = useMemo(() => pointsForMetric("sleep", period, anchor, data, locale), [anchor, data, locale, period]);
  const weightPoints = useMemo(() => pointsForMetric("weight", period, anchor, data, locale), [anchor, data, locale, period]);
  const temperaturePoints = useMemo(() => pointsForMetric("temperature", period, anchor, data, locale), [anchor, data, locale, period]);
  const previousAnchor = useMemo(() => shiftTrendAnchor(anchor, period, -1), [anchor, period]);
  const previousWeight = useMemo(() => averageOf(pointsForMetric("weight", period, previousAnchor, data, locale)), [data, locale, period, previousAnchor]);
  const previousTemperature = useMemo(() => averageOf(pointsForMetric("temperature", period, previousAnchor, data, locale)), [data, locale, period, previousAnchor]);

  const sleepAverage = averageOf(sleepPoints);
  const weightAverage = averageOf(weightPoints);
  const temperatureAverage = averageOf(temperaturePoints);
  const weightValues = weightPoints.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value));
  const temperatureValues = temperaturePoints.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value));
  const aboveEight = sleepPoints.filter((point) => point.value != null && point.value > 8).length;
  const streak = longestAboveEight(sleepPoints);
  const weightDelta = weightAverage != null && previousWeight != null ? weightAverage - previousWeight : null;
  const temperatureDelta = temperatureAverage != null && previousTemperature != null ? temperatureAverage - previousTemperature : null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/15"><Ico e="📊" size={28} /></span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{t("Day patterns")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Sleep, weight and body temperature over time")}</p>
        </div>
      </div>

      <DashboardPeriodControl value={period} onChange={setPeriod} anchor={anchor} onShift={(delta) => setAnchor((current) => shiftTrendAnchor(current, period, delta))} ariaLabel="Day patterns period" />

      <article className="mt-3 rounded-2xl bg-tint/42 p-3 ring-1 ring-border/45">
        <MetricHeader icon="🌙" title={t("Sleep")} subtitle={t("Hours logged each day")} color={CHART_COLORS.sleep} />
        <SleepChart points={sleepPoints} />
        <MetricCards items={[
          { label: t("Average"), value: sleepAverage == null ? "—" : `${sleepAverage.toFixed(1)}h`, kind: "moon", color: CHART_COLORS.sleep },
          { label: t("Above 8h"), value: `${aboveEight}`, sub: t("logged points"), kind: "bars", color: "#72C64A" },
          { label: t("Longest streak"), value: `${streak}`, sub: t("points"), kind: "flame", color: "#F97316" },
        ]} />
      </article>

      <article className="mt-3 rounded-2xl bg-tint/42 p-3 ring-1 ring-border/45">
        <MetricHeader icon="⚖️" title={t("Weight")} subtitle={t("Logged body weight")} color={WEIGHT_COLOR} />
        <div className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0">
            <p className="text-[22px] font-bold leading-none tabular-nums text-foreground">{weightAverage == null ? "—" : weightAverage.toFixed(1)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">kg · {t("average")}</p>
            <p className={`mt-2 text-[11px] font-semibold ${weightDelta == null ? "text-muted-foreground" : weightDelta <= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
              {weightDelta == null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{t("vs previous period")}</p>
          </div>
          <LineChart metric="weight" points={weightPoints} color={WEIGHT_COLOR} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{t("Min")} {weightValues.length ? `${Math.min(...weightValues).toFixed(1)} kg` : "—"}</span>
          <span>{t("Max")} {weightValues.length ? `${Math.max(...weightValues).toFixed(1)} kg` : "—"}</span>
        </div>
      </article>

      <article className="mt-3 rounded-2xl bg-tint/42 p-3 ring-1 ring-border/45">
        <MetricHeader icon="🌡️" title={t("Body temperature")} subtitle={t("Logged temperature trend")} color={TEMPERATURE_COLOR} />
        <div className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2">
          <div className="min-w-0">
            <p className="text-[22px] font-bold leading-none tabular-nums text-foreground">{temperatureAverage == null ? "—" : temperatureAverage.toFixed(1)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">°C · {t("average")}</p>
            <p className={`mt-2 text-[11px] font-semibold ${temperatureDelta == null ? "text-muted-foreground" : Math.abs(temperatureDelta) < 0.05 ? "text-muted-foreground" : temperatureDelta < 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300"}`}>
              {temperatureDelta == null ? "—" : `${temperatureDelta > 0 ? "+" : ""}${temperatureDelta.toFixed(1)} °C`}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{t("vs previous period")}</p>
          </div>
          <LineChart metric="temperature" points={temperaturePoints} color={TEMPERATURE_COLOR} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{t("Low")} {temperatureValues.length ? `${Math.min(...temperatureValues).toFixed(1)} °C` : "—"}</span>
          <span>{t("High")} {temperatureValues.length ? `${Math.max(...temperatureValues).toFixed(1)} °C` : "—"}</span>
        </div>
      </article>
    </section>
  );
}
