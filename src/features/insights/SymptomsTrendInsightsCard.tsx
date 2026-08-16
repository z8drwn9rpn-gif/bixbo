import { useEffect, useMemo, useState, type SVGProps } from "react";
import { useDismissTapTooltip } from "@/components/charts";
import { fromKey, todayKey, type BixboData, type DayLog } from "@/lib/storage";
import { DashboardPeriodControl, MetricCards } from "./InsightDashboardPrimitives";
import { eachDay, InsightFloatingTooltip, rangeFor, shiftInsightPeriodAnchor, type InsightTooltipDetails, type Period } from "./shared";

type SymptomKey = "headache" | "tetany" | "panic" | "nausea" | "pressure" | "hotFlashes";

type SymptomMeta = {
  label: string;
  shortLabel: string;
  max: number;
  color: string;
};

type Bucket = {
  key: string;
  label: string;
  value: number | null;
  count: number;
};

const SYMPTOMS: Record<SymptomKey, SymptomMeta> = {
  headache: { label: "Headache", shortLabel: "Headache", max: 10, color: "#F3A327" },
  tetany: { label: "Tetany episode", shortLabel: "Tetany", max: 5, color: "#E58BA9" },
  panic: { label: "Panic episode", shortLabel: "Panic", max: 10, color: "#C33C62" },
  nausea: { label: "Nausea", shortLabel: "Nausea", max: 10, color: "#7AA65B" },
  pressure: { label: "Pressure", shortLabel: "Pressure", max: 10, color: "#7990B4" },
  hotFlashes: { label: "Hot flashes", shortLabel: "Hot flashes", max: 5, color: "#F07C23" },
};

const SYMPTOM_ORDER = Object.keys(SYMPTOMS) as SymptomKey[];

function SymptomIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: SymptomKey }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "headache") return <svg {...common} {...props}><path d="M8 19v-2.2c-2-1.4-3.2-3.8-3.2-6.4A7.2 7.2 0 0 1 12 3.2c4 0 7.2 3.2 7.2 7.2v2.2l1.6 2.4h-3v4H14"/><path d="M8.5 9.5h2M9.5 8.5v2M14.5 7.5l-1.3 2h2l-1.7 2.6"/></svg>;
  if (kind === "tetany") return <svg {...common} {...props}><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/></svg>;
  if (kind === "panic") return <svg {...common} {...props}><path d="M6.2 8.5a7 7 0 1 1-.3 7.5c-1.5-3 0-6.7 3-7.4 2.5-.6 4.8 1.2 4.7 3.5-.1 2-2.1 3.3-3.7 2.5-1.2-.6-1.4-2.1-.6-2.9"/></svg>;
  if (kind === "nausea") return <svg {...common} {...props}><path d="M9 3v5c0 2-1.5 3.1-3.1 4.2C4 13.6 3 15.4 3.3 17.6 3.7 20.3 6 22 8.8 22H12c5 0 8.8-3.7 8.8-8.5 0-4.1-2.8-7.2-6.8-7.9v4.1c0 2.2-1.4 3.7-3.6 3.7H8.5"/></svg>;
  if (kind === "pressure") return <svg {...common} {...props}><path d="M5 17a8 8 0 1 1 14 0"/><path d="m12 13 3.7-4.1"/><circle cx="12" cy="13" r="1.2"/><path d="M7 17h10"/></svg>;
  return <svg {...common} {...props}><path d="M7 20c-2-2-2-4 0-6s2-4 0-6-2-4 0-6M12 20c-2-2-2-4 0-6s2-4 0-6-2-4 0-6M17 20c-2-2-2-4 0-6s2-4 0-6-2-4 0-6"/></svg>;
}

function valuesForDay(day: DayLog | undefined, symptom: SymptomKey): number[] {
  if (!day) return [];
  if (symptom === "tetany") return (day.tetany ?? []).map((entry) => entry.intensity).filter(Number.isFinite);
  if (symptom === "panic") return (day.panic ?? []).map((entry) => entry.intensity).filter(Number.isFinite);

  const pain = day.pain ?? [];
  if (symptom === "headache") return pain.filter((entry) => entry.headache && entry.headacheIntensity != null).map((entry) => entry.headacheIntensity!).filter(Number.isFinite);
  if (symptom === "nausea") return pain.filter((entry) => entry.nausea && entry.nauseaSeverity != null).map((entry) => entry.nauseaSeverity!).filter(Number.isFinite);
  if (symptom === "pressure") return pain.filter((entry) => entry.pressureIntensity != null && ((entry.pressureTypes?.length ?? 0) > 0 || entry.quality.includes("Pressure"))).map((entry) => entry.pressureIntensity!).filter(Number.isFinite);
  return pain.filter((entry) => entry.hotFlashes != null && (entry.hotFlashesOn !== false)).map((entry) => entry.hotFlashes!).filter(Number.isFinite);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function dateLabel(key: string) {
  return fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function SymptomsTrendInsightsCard({ data }: { data: BixboData }) {
  const [symptom, setSymptom] = useState<SymptomKey>("headache");
  const [period, setPeriod] = useState<Period>("M");
  const [anchor, setAnchor] = useState<Date>(() => {
    const date = fromKey(todayKey());
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period, symptom]);

  const meta = SYMPTOMS[symptom];
  const { startK, endK } = useMemo(() => rangeFor(period, anchor), [anchor, period]);
  const dayKeys = useMemo(() => eachDay(startK, endK), [endK, startK]);

  const allEntries = useMemo(() => dayKeys.flatMap((key) => valuesForDay(data.dayLogs[key], symptom).map((value) => ({ key, value }))), [data.dayLogs, dayKeys, symptom]);

  const buckets = useMemo<Bucket[]>(() => {
    if (period !== "Y") {
      return dayKeys.map((key) => {
        const values = valuesForDay(data.dayLogs[key], symptom);
        return { key, label: dateLabel(key), value: values.length ? Math.max(...values) : null, count: values.length };
      });
    }

    return Array.from({ length: 12 }, (_, month) => {
      const key = monthKey(anchor.getFullYear(), month);
      const values = allEntries.filter((entry) => entry.key.startsWith(key)).map((entry) => entry.value);
      return {
        key,
        label: new Date(anchor.getFullYear(), month, 1).toLocaleDateString("en-GB", { month: "short" }),
        value: average(values),
        count: values.length,
      };
    });
  }, [allEntries, anchor, data.dayLogs, dayKeys, period, symptom]);

  const avg = average(allEntries.map((entry) => entry.value));
  const peak = allEntries.reduce<{ key: string; value: number } | null>((best, entry) => !best || entry.value > best.value ? entry : best, null);
  const max = meta.max;

  const activeBucket = active == null ? null : buckets[active] ?? null;
  const activeDetails: InsightTooltipDetails | null = activeBucket?.value != null ? {
    owner: "You",
    heading: period === "Y" ? `${activeBucket.label} ${anchor.getFullYear()}` : activeBucket.label,
    value: `${meta.label} ${activeBucket.value.toFixed(activeBucket.value % 1 ? 1 : 0)}/${max}`,
    description: `${activeBucket.count} ${activeBucket.count === 1 ? "entry" : "entries"}`,
    color: meta.color,
    summary: `${activeBucket.label} · ${meta.label} ${activeBucket.value.toFixed(1)}/${max}`,
  } : null;

  const xLabels = period === "W"
    ? buckets.map((bucket) => fromKey(bucket.key).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2))
    : period === "M"
      ? ["1", "5", "10", "15", "20", "25", String(fromKey(endK).getDate())]
      : ["Jan", "Mar", "May", "Jul", "Sep", "Nov", "Dec"];

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80" data-symptoms-trend-card="true">
      <div className="flex items-start gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55 text-primary ring-1 ring-border/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 13h4l2-7 4 12 2-7 2 2h4"/></svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-base leading-none text-foreground" style={{ fontWeight: 800 }}>Symptoms trend</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">One chart for all tracked symptoms</p>
        </div>
      </div>

      <DashboardPeriodControl value={period} onChange={setPeriod} anchor={anchor} onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))} ariaLabel="Symptoms trend period" />

      <div className="mt-2 grid grid-cols-6 gap-1" role="group" aria-label="Symptom shown in chart">
        {SYMPTOM_ORDER.map((key) => {
          const item = SYMPTOMS[key];
          const selected = key === symptom;
          return (
            <button key={key} type="button" onClick={() => setSymptom(key)} aria-pressed={selected}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-center transition active:scale-[.98] ${selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-background/55 text-muted-foreground ring-1 ring-border/55"}`}>
              <SymptomIcon kind={key} className="h-4 w-4 shrink-0" />
              <span className="max-w-full text-[8px] leading-[1.05]" style={{ fontWeight: selected ? 700 : 600 }}>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
          <span className="truncate text-xs text-foreground" style={{ fontWeight: 700 }}>{meta.label}</span>
        </div>
        <span className="whitespace-nowrap text-[9px] text-muted-foreground">Intensity 0–{max}</span>
      </div>

      <div className="mt-2 rounded-2xl bg-background/45 px-2.5 py-2.5 ring-1 ring-border/45">
        <div className="relative pl-6">
          <div className="absolute inset-y-0 left-0 flex w-5 flex-col justify-between pb-0.5 text-right text-[9px] tabular-nums text-muted-foreground">
            <span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span>
          </div>
          <div className="relative h-[150px] border-b border-border/70">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2].map((line) => <span key={line} className="block w-full border-t border-dashed border-border/55" />)}
            </div>
            <div className="absolute inset-0 grid items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }}>
              {buckets.map((bucket, index) => {
                const heightPct = bucket.value == null ? 0 : Math.max(3, Math.min(100, (bucket.value / max) * 100));
                return (
                  <button key={bucket.key} type="button" onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }}
                    aria-label={`${bucket.label}. ${meta.label}. ${bucket.value == null ? "No entries" : `${bucket.value.toFixed(1)} of ${max}`}`}
                    className={`relative flex h-full min-w-0 items-end justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "z-10" : ""}`}>
                    {bucket.value == null
                      ? <span className="mb-0.5 h-1 w-full max-w-[7px] rounded-full bg-tint/80" />
                      : <span className={`w-full max-w-[12px] rounded-t-[5px] ${active === index ? "ring-2 ring-foreground/55" : ""}`} style={{ height: `${heightPct}%`, background: meta.color }} />}
                  </button>
                );
              })}
            </div>
            {activeDetails && active != null ? <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, buckets.length)) * 100} details={activeDetails} top={-70} connectorSide="bottom" /> : null}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground">{xLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
          <p className="mt-0.5 text-center text-[9px] text-muted-foreground">{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</p>
        </div>
      </div>

      <MetricCards items={[
        { label: "Entries", value: String(allEntries.length), sub: period === "W" ? "this week" : period === "M" ? "this month" : "this year", kind: "bars", color: meta.color },
        { label: "Peak", value: peak ? (period === "Y" ? fromKey(peak.key).toLocaleDateString("en-GB", { month: "short" }) : dateLabel(peak.key)) : "—", sub: peak ? `${peak.value.toFixed(peak.value % 1 ? 1 : 0)}/${max}` : "No data", kind: "trend", color: meta.color },
        { label: "Average", value: avg == null ? "—" : avg.toFixed(1), sub: `of ${max}`, kind: "bars", color: meta.color },
      ]} />
    </section>
  );
}
