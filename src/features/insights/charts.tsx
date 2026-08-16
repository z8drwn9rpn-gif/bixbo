import { useEffect, useState } from "react";
import { CHART_GRID, useDismissTapTooltip } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { BRISTOL, PAIN_DESCRIPTIONS, fromKey } from "@/lib/storage";
import {
  BRISTOL_MYSTERY_COLOR,
  HOT_FLASH_COLORS,
  HOT_FLASH_DESCRIPTIONS,
  InsightFloatingTooltip,
  InsightPeriodControl,
  TrText,
  fmtCoupleTooltipDay,
  fmtTapDay,
  fmtTapMonth,
  vividPainChartColor,
  type InsightTooltipDetails,
  type Period,
} from "./shared";

type InsightBar = { value?: number; label: string; sub?: string };

function InsightBarChartFrame({ bars, yLabels, yMax, colorFor, tooltipDetails, axisLabel, periodLabel, emptyMessage }: {
  bars: InsightBar[];
  yLabels: number[];
  yMax: number;
  colorFor: (value: number, index: number) => string;
  tooltipDetails: (index: number, value: number) => InsightTooltipDetails;
  axisLabel?: string;
  periodLabel?: string;
  emptyMessage?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  const height = 140;
  const allEmpty = bars.every((bar) => bar.value == null);
  const activeDetails = active != null && bars[active]?.value != null ? tooltipDetails(active, bars[active].value!) : null;

  return (
    <div className="mt-4 rounded-2xl bg-background/55 px-3 py-3 ring-1 ring-border/40">
      <div className="flex gap-1">
        <div className="flex flex-col items-end pr-1" style={{ height }}>
          <div className="flex h-full flex-col justify-between text-[10px] font-medium text-muted-foreground">
            {yLabels.map((value) => <span key={value} className="leading-none tabular-nums">{value}</span>)}
          </div>
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {yLabels.map((value) => <div key={value} className="border-t border-dashed" style={{ borderColor: CHART_GRID }} />)}
          </div>
          <div className="relative grid items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`, height }}>
            {bars.map((bar, index) => bar.value != null ? (
              <button key={index} type="button" aria-label={tooltipDetails(index, bar.value).summary} aria-pressed={active === index}
                onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }}
                className={`min-w-0 rounded-t transition-[transform,filter] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "brightness-105 ring-2 ring-foreground/80" : ""}`}
                style={{ height: `${Math.max(5, (bar.value / yMax) * 100)}%`, background: colorFor(bar.value, index) }} />
            ) : <div key={index} className="h-[2px] w-full self-end rounded bg-tint/60" />)}
            {activeDetails && active != null ? <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={activeDetails} /> : null}
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-5">
        <div className="grid flex-1 gap-[2px] text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}>
          {bars.map((bar, index) => <div key={index} className="leading-tight"><div className="tabular-nums">{bar.label}</div>{bar.sub ? <div className="text-[10px] tabular-nums opacity-70">{bar.sub}</div> : null}</div>)}
        </div>
      </div>
      {(axisLabel || periodLabel) && <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground"><span>{axisLabel}</span><span><TrText value={periodLabel} /></span></div>}
      {allEmpty && emptyMessage ? <p className="mt-2 text-center text-xs text-muted-foreground">{emptyMessage}</p> : null}
    </div>
  );
}

export function PainChart({ period, days, series, anchor }: { period: Period; days: string[]; series: (number | undefined)[]; anchor: Date }) {
  let bars: InsightBar[] = [];
  if (period === "Y") {
    const monthly = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((k, i) => { const v = series[i]; if (v == null) return; const m = fromKey(k).getMonth(); monthly[m].sum += v; monthly[m].n += 1; });
    const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    bars = monthly.map((mm, i) => ({ value: mm.n ? mm.sum / mm.n : undefined, label: MON[i] }));
  } else if (period === "M") {
    bars = days.map((k, i) => ({ value: series[i], label: fromKey(k).getDate() % 2 === 1 ? String(fromKey(k).getDate()) : "" }));
  } else {
    bars = days.map((k, i) => { const d = fromKey(k); return { value: series[i], label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()], sub: String(d.getDate()) }; });
  }
  return <InsightBarChartFrame bars={bars} yLabels={[10, 8, 6, 4, 2, 0]} yMax={10} colorFor={(value) => vividPainChartColor(value)}
    tooltipDetails={(i, value) => {
      const heading = period === "Y" ? fmtTapMonth(i, anchor.getFullYear()) : fmtCoupleTooltipDay(days[i]);
      const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(value)))] ?? "Pain";
      const color = vividPainChartColor(value);
      return { owner: "You", heading, value: `Pain ${value.toFixed(1)}/10`, description, color, summary: `${period === "Y" ? heading : days[i]} · Pain ${value.toFixed(1)}/10 · ${description}` };
    }} axisLabel="Pain (0–10)" periodLabel={period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}
    emptyMessage={period === "Y" ? `No pain entries in ${anchor.getFullYear()}` : undefined} />;
}

export function BristolChart({ bowelCounts, noBowelMovementCount, period, anchor, onPeriodChange, onPeriodShift }: {
  bowelCounts: number[]; noBowelMovementCount: number; period: Period; anchor: Date; onPeriodChange: (period: Period) => void; onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period]);
  const max = Math.max(1, ...bowelCounts);
  const chartTypes = [{ n: 0, label: "Type 0 — Mystery", sub: "Unknown / mixed", color: BRISTOL_MYSTERY_COLOR, shape: "mystery" }, ...BRISTOL];
  return <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Bowel")}</p><InsightPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Bowel period" /></div>
    <div className="relative mt-3 flex items-end gap-2">
      {chartTypes.map((b) => { const count = bowelCounts[b.n] ?? 0; const selected = active === b.n; return <div key={b.n} className="relative flex flex-1 flex-col items-center gap-1"><div className="flex h-20 w-full items-end"><button type="button" aria-label={`${b.label}. ${count} ${count === 1 ? "entry" : "entries"}. ${b.sub}`} aria-pressed={selected} onClick={(e) => { e.stopPropagation(); setActive((c) => c === b.n ? null : b.n); }} className={`w-full rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "ring-2 ring-foreground/70" : ""}`} style={{ height: `${Math.max(5, (count / max) * 100)}%`, background: b.color }} /></div><span className="text-[10px] text-muted-foreground">T{b.n}</span><span className="text-[10px]">{count}</span></div>; })}
      {active != null ? (() => { const item = chartTypes.find((type) => type.n === active); const count = bowelCounts[active] ?? 0; if (!item) return null; const details: InsightTooltipDetails = { owner: "You", heading: item.label, value: `${count} ${count === 1 ? "entry" : "entries"}`, description: item.sub, color: item.n === 0 ? "#8b5cf6" : item.color, summary: `${t(item.label)} · ${count} ${count === 1 ? "entry" : "entries"} · ${item.sub}` }; return <InsightFloatingTooltip leftPct={((active + 0.5) / chartTypes.length) * 100} details={details} />; })() : null}
    </div>
    <p className="mt-3 border-t border-border/60 pt-3 text-[11px] font-medium text-muted-foreground">{t("No bowel movements")}: <span className="tabular-nums font-semibold text-foreground">{noBowelMovementCount}</span></p>
  </section>;
}

export function HfBars({ bars, period, days, anchor }: { bars: (number | undefined)[]; period: Period; days: string[]; anchor: Date }) {
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  return <div><div className="relative grid items-end gap-1 pt-5" style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`, height: 82 }}>
    {bars.map((value, index) => value != null ? <button key={index} type="button" aria-label={period === "Y" ? `${fmtTapMonth(index, anchor.getFullYear())}. Hot flash average ${value.toFixed(1)} out of 5` : `${fmtTapDay(days[index])}. Hot flash ${value.toFixed(1)} out of 5`} aria-pressed={active === index}
      onClick={(e) => { e.stopPropagation(); setActive((c) => c === index ? null : index); }} className={`w-full rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "ring-2 ring-foreground/70" : ""}`}
      style={{ height: `${Math.max(10, (value / 5) * 100)}%`, background: HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))] }} /> : <div key={index} className="h-1 w-full self-end rounded bg-tint" />)}
    {active != null && bars[active] != null ? (() => { const value = bars[active]!; const heading = period === "Y" ? fmtTapMonth(active, anchor.getFullYear()) : fmtCoupleTooltipDay(days[active]); const description = HOT_FLASH_DESCRIPTIONS[Math.max(1, Math.min(5, Math.round(value)))] ?? "Hot flash"; const color = HOT_FLASH_COLORS[Math.max(1, Math.min(5, Math.round(value)))]; const details: InsightTooltipDetails = { owner: "You", heading, value: `Hot flash ${value.toFixed(1)}/5`, description, color, summary: `${period === "Y" ? heading : days[active]} · Hot flash ${value.toFixed(1)}/5 · ${description}` }; return <InsightFloatingTooltip leftPct={((active + 0.5) / Math.max(1, bars.length)) * 100} details={details} />; })() : null}
  </div></div>;
}
