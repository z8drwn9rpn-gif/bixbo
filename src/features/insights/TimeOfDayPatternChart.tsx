import { useEffect, useState } from "react";
import { useDismissTapTooltip } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { useBixbo } from "@/lib/storage";
import {
  InsightFloatingTooltip,
  InsightPeriodControl,
  PANIC_COLOR,
  TETANY_COLOR,
  TIME_BLOCK_LABELS,
  TIME_BLOCK_SHORT,
  timeBlockOf,
  type InsightTooltipDetails,
  type Period,
} from "./shared";

export function TimeOfDayPatternChart({ data, days, period, anchor, onPeriodChange, onPeriodShift }: {
  data: ReturnType<typeof useBixbo>["data"];
  days: string[];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t, language } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period]);

  const tetanyBlocks = [0, 0, 0, 0];
  const panicBlocks = [0, 0, 0, 0];
  days.forEach((k) => {
    data.dayLogs[k]?.tetany?.forEach((entry) => { const block = timeBlockOf(entry.time); if (block != null) tetanyBlocks[block]++; });
    data.dayLogs[k]?.panic?.forEach((entry) => { const block = timeBlockOf(entry.time); if (block != null) panicBlocks[block]++; });
  });
  const tetanyTotal = tetanyBlocks.reduce((a, b) => a + b, 0);
  const panicTotal = panicBlocks.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...tetanyBlocks, ...panicBlocks);

  const sentence = (() => {
    if (!tetanyTotal && !panicTotal) return null;
    const topOf = (blocks: number[], total: number) => {
      if (!total) return null;
      let best = 0;
      for (let i = 1; i < 4; i++) if (blocks[i] > blocks[best]) best = i;
      return { i: best, pct: Math.round((blocks[best] / total) * 100) };
    };
    const tetanyTop = topOf(tetanyBlocks, tetanyTotal);
    const panicTop = topOf(panicBlocks, panicTotal);
    const blockName = (i: number) => t(TIME_BLOCK_SHORT[i]);
    const blockHours = (i: number) => TIME_BLOCK_LABELS[i].split(" ")[1];
    if (language === "sk") {
      if (tetanyTop && panicTop) return `Tetánia sa najčastejšie vyskytuje v časti dňa ${blockName(tetanyTop.i).toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct} % prípadov), zatiaľ čo panické záchvaty vrcholia v časti dňa ${blockName(panicTop.i).toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct} % prípadov).`;
      if (tetanyTop) return `Tetánia sa najčastejšie vyskytuje v časti dňa ${blockName(tetanyTop.i).toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct} % prípadov).`;
      if (panicTop) return `Panické záchvaty sa najčastejšie vyskytujú v časti dňa ${blockName(panicTop.i).toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct} % prípadov).`;
    }
    if (tetanyTop && panicTop) return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[tetanyTop.i].toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct}% of cases), while panic attacks peak in the ${TIME_BLOCK_SHORT[panicTop.i].toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct}% of cases).`;
    if (tetanyTop) return `Tetany occurs most often in the ${TIME_BLOCK_SHORT[tetanyTop.i].toLowerCase()} (${blockHours(tetanyTop.i)}, ${tetanyTop.pct}% of cases).`;
    if (panicTop) return `Panic attacks occur most often in the ${TIME_BLOCK_SHORT[panicTop.i].toLowerCase()} (${blockHours(panicTop.i)}, ${panicTop.pct}% of cases).`;
    return null;
  })();

  return <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Time of Day Pattern")}</p>
      <InsightPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Time of day pattern period" />
    </div>
    {!tetanyTotal && !panicTotal ? <p className="mt-2 text-sm text-muted-foreground">{t("Not enough data yet")}</p> : <>
      <div className="mt-2 flex gap-4 text-[10px]"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TETANY_COLOR }} /> Tetany ({tetanyTotal})</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PANIC_COLOR }} /> Panic ({panicTotal})</span></div>
      <div className="relative mt-4 grid grid-cols-4 items-end gap-3" style={{ height: 110 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="flex h-full items-end justify-center gap-1">
          <div className="flex flex-col items-center justify-end" style={{ height: "100%" }}>{tetanyBlocks[i] > 0 && <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{tetanyBlocks[i]}</span>}<button type="button" aria-label={`${TIME_BLOCK_LABELS[i]}. Tetany ${tetanyBlocks[i]} times`} aria-pressed={active === `t${i}`} onClick={(e) => { e.stopPropagation(); setActive((c) => c === `t${i}` ? null : `t${i}`); }} className={`w-4 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === `t${i}` ? "ring-2 ring-foreground/70" : ""}`} style={{ height: `${Math.max(4, (tetanyBlocks[i] / max) * 100)}%`, background: TETANY_COLOR }} /></div>
          <div className="flex flex-col items-center justify-end" style={{ height: "100%" }}>{panicBlocks[i] > 0 && <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{panicBlocks[i]}</span>}<button type="button" aria-label={`${TIME_BLOCK_LABELS[i]}. Panic ${panicBlocks[i]} times`} aria-pressed={active === `p${i}`} onClick={(e) => { e.stopPropagation(); setActive((c) => c === `p${i}` ? null : `p${i}`); }} className={`w-4 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === `p${i}` ? "ring-2 ring-foreground/70" : ""}`} style={{ height: `${Math.max(4, (panicBlocks[i] / max) * 100)}%`, background: PANIC_COLOR }} /></div>
        </div>)}
        {active ? (() => { const isTetany = active[0] === "t"; const i = Number(active.slice(1)); const count = isTetany ? tetanyBlocks[i] : panicBlocks[i]; const total = isTetany ? tetanyTotal : panicTotal; const percentage = total ? Math.round((count / total) * 100) : 0; const color = isTetany ? TETANY_COLOR : PANIC_COLOR; const details: InsightTooltipDetails = { owner: "You", heading: TIME_BLOCK_LABELS[i], value: `${isTetany ? "Tetany" : "Panic"} ${count}×`, description: `${percentage}% of entries in the selected period`, color, summary: `${TIME_BLOCK_LABELS[i]} · ${isTetany ? "Tetany" : "Panic"} ${count}× · ${percentage}%` }; return <InsightFloatingTooltip leftPct={(i + 0.5) * 25} details={details} />; })() : null}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-3 text-center text-[10px] text-muted-foreground">{TIME_BLOCK_SHORT.map((label) => <span key={label}>{label}</span>)}</div>
      {sentence && <p className="mt-3 text-sm text-muted-foreground">{sentence}</p>}
    </>}
  </section>;
}
