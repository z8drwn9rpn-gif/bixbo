import { useEffect, useMemo, useState } from "react";
import { useDismissTapTooltip, CHART_GRID } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { type BixboData } from "@/lib/storage";
import {
  InsightFloatingTooltip,
  PANIC_COLOR,
  TETANY_COLOR,
  TIME_BLOCK_LABELS,
  TIME_BLOCK_SHORT,
  timeBlockOf,
  type InsightTooltipDetails,
  type Period,
} from "./shared";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";

export function TimeOfDayInsightsCard({ data, days, period, anchor, onPeriodChange, onPeriodShift }: {
  data: BixboData;
  days: string[];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period]);

  const { tetanyBlocks, panicBlocks } = useMemo(() => {
    const tetany = [0, 0, 0, 0];
    const panic = [0, 0, 0, 0];
    days.forEach((key) => {
      data.dayLogs[key]?.tetany?.forEach((entry) => { const block = timeBlockOf(entry.time); if (block != null) tetany[block] += 1; });
      data.dayLogs[key]?.panic?.forEach((entry) => { const block = timeBlockOf(entry.time); if (block != null) panic[block] += 1; });
    });
    return { tetanyBlocks: tetany, panicBlocks: panic };
  }, [data.dayLogs, days]);

  const tetanyTotal = tetanyBlocks.reduce((sum, value) => sum + value, 0);
  const panicTotal = panicBlocks.reduce((sum, value) => sum + value, 0);
  const total = tetanyTotal + panicTotal;
  const max = Math.max(1, ...tetanyBlocks, ...panicBlocks);
  const combined = tetanyBlocks.map((value, index) => value + panicBlocks[index]);
  const topIndex = combined.reduce((best, value, index, all) => value > all[best] ? index : best, 0);
  const tetanyTop = tetanyBlocks.reduce((best, value, index, all) => value > all[best] ? index : best, 0);
  const panicTop = panicBlocks.reduce((best, value, index, all) => value > all[best] ? index : best, 0);
  const quietIndexes = combined.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value).slice(0, 2).map((item) => item.index);
  const quietText = quietIndexes.length ? `${TIME_BLOCK_SHORT[quietIndexes[0]]}${quietIndexes[1] != null ? ` and ${TIME_BLOCK_SHORT[quietIndexes[1]].toLowerCase()}` : ""} activity stayed low` : "Activity stayed low outside peak times";

  const activeDetails: InsightTooltipDetails | null = active ? (() => {
    const isTetany = active[0] === "t";
    const index = Number(active.slice(1));
    const count = isTetany ? tetanyBlocks[index] : panicBlocks[index];
    const groupTotal = isTetany ? tetanyTotal : panicTotal;
    const percentage = groupTotal ? Math.round((count / groupTotal) * 100) : 0;
    const color = isTetany ? TETANY_COLOR : PANIC_COLOR;
    return { owner: "You", heading: TIME_BLOCK_LABELS[index], value: `${isTetany ? "Tetany" : "Panic"} ${count}×`, description: `${percentage}% of entries in this period`, color, summary: `${TIME_BLOCK_LABELS[index]} · ${isTetany ? "Tetany" : "Panic"} ${count}× · ${percentage}%` };
  })() : null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{t("Time of Day Pattern")}</p>
      <DashboardPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Time of day pattern period" />

      {!total ? <p className="mt-3 text-xs text-muted-foreground">{t("Not enough data yet")}</p> : (
        <>
          <div className="mt-3 flex gap-4 text-[10px] text-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TETANY_COLOR }} /> Tetany ({tetanyTotal})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PANIC_COLOR }} /> Panic ({panicTotal})</span>
          </div>

          <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45">
            <p className="text-[10px] text-muted-foreground">Number of events</p>
            <div className="mt-2 flex gap-2">
              <div className="flex h-[150px] w-5 flex-col justify-between text-right text-[10px] text-muted-foreground">{[3, 2, 1, 0].map((value) => <span key={value} className="leading-none">{value}</span>)}</div>
              <div className="relative min-w-0 flex-1">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">{[3, 2, 1, 0].map((value) => <div key={value} className="border-t border-dashed" style={{ borderColor: CHART_GRID }} />)}</div>
                <div className="relative grid h-[150px] grid-cols-4 items-end gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex h-full items-end justify-center gap-1.5">
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="mb-1 text-[10px] tabular-nums text-muted-foreground">{tetanyBlocks[index]}</span>
                        <button type="button" aria-label={`${TIME_BLOCK_LABELS[index]}. Tetany ${tetanyBlocks[index]} times`} aria-pressed={active === `t${index}`}
                          onClick={(event) => { event.stopPropagation(); setActive((current) => current === `t${index}` ? null : `t${index}`); }}
                          className={`w-6 rounded-t-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === `t${index}` ? "ring-2 ring-foreground/70" : ""}`}
                          style={{ height: `${Math.max(4, (tetanyBlocks[index] / max) * 100)}%`, background: TETANY_COLOR }} />
                      </div>
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="mb-1 text-[10px] tabular-nums text-muted-foreground">{panicBlocks[index]}</span>
                        <button type="button" aria-label={`${TIME_BLOCK_LABELS[index]}. Panic ${panicBlocks[index]} times`} aria-pressed={active === `p${index}`}
                          onClick={(event) => { event.stopPropagation(); setActive((current) => current === `p${index}` ? null : `p${index}`); }}
                          className={`w-6 rounded-t-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === `p${index}` ? "ring-2 ring-foreground/70" : ""}`}
                          style={{ height: `${Math.max(4, (panicBlocks[index] / max) * 100)}%`, background: PANIC_COLOR }} />
                      </div>
                    </div>
                  ))}
                  {activeDetails && active ? <InsightFloatingTooltip leftPct={(Number(active.slice(1)) + 0.5) * 25} details={activeDetails} top={0} /> : null}
                </div>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-3 pl-7 text-center text-[10px] text-muted-foreground">{TIME_BLOCK_SHORT.map((label) => <span key={label}>{label}</span>)}</div>
          </div>

          <QuickInsights items={[
            { kind: "moon", color: "#e895b0", text: tetanyTotal ? `Tetany peaked at ${TIME_BLOCK_SHORT[tetanyTop].toLowerCase()}` : "No tetany episodes in this period" },
            { kind: "target", color: PANIC_COLOR, text: panicTotal ? `Panic attacks happened mostly at ${TIME_BLOCK_SHORT[panicTop].toLowerCase()}` : "No panic attacks in this period" },
            { kind: "leaf", color: "#6ea83c", text: quietText },
          ]} />

          <MetricCards items={[
            { label: "Top period", value: TIME_BLOCK_SHORT[topIndex], sub: "Most events", kind: "moon", color: "#e895b0" },
            { label: "Tetany share", value: `${Math.round((tetanyTotal / total) * 100)}%`, sub: `${tetanyTotal} of ${total} events`, color: TETANY_COLOR },
            { label: "Panic share", value: `${Math.round((panicTotal / total) * 100)}%`, sub: `${panicTotal} of ${total} events`, color: PANIC_COLOR },
          ]} />
        </>
      )}
    </section>
  );
}
