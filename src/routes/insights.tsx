import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, addDays, toKey, painColor, BRISTOL, avgDayPain } from "@/lib/storage";

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

type Period = "W" | "M" | "Y";

function rangeFor(period: Period, anchor: Date) {
  const end = new Date(anchor); end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  if (period === "W") start.setDate(end.getDate() - 6);
  else if (period === "M") start.setDate(1);
  else start.setMonth(0, 1);
  const endK = toKey(end);
  const startK = toKey(start);
  return { startK, endK };
}

function eachDay(startK: string, endK: string): string[] {
  const out: string[] = []; let k = startK;
  while (k <= endK) { out.push(k); k = addDays(k, 1); }
  return out;
}

function InsightsPage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [period, setPeriod] = useState<Period>("W");
  const [anchor, setAnchor] = useState<Date>(new Date());

  const { startK, endK } = useMemo(() => rangeFor(period, anchor), [period, anchor]);
  const days = useMemo(() => eachDay(startK, endK), [startK, endK]);

  const painSeries = days.map((k) => avgDayPain(view.dayLogs[k]));
  const painAvg = (() => {
    const nums = painSeries.filter((n): n is number => n != null);
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  })();

  // Sex count (only actual sex)
  const sexCount = days.reduce((s, k) => s + (view.dayLogs[k]?.sex?.filter((x) => x.kind === "sex").length ?? 0), 0);

  // Bowel by type
  const bowelCounts = new Array(8).fill(0) as number[];
  days.forEach((k) => view.dayLogs[k]?.bowel?.forEach((b) => { bowelCounts[b.bristol] = (bowelCounts[b.bristol] ?? 0) + 1; }));

  // Weight
  const weightSeries = days.map((k) => view.dayLogs[k]?.weight);
  const wNums = weightSeries.filter((n): n is number => n != null);
  const wMin = wNums.length ? Math.min(...wNums) : 0;
  const wMax = wNums.length ? Math.max(...wNums) : 0;

  // Sleep
  const sleepSeries = days.map((k) => view.dayLogs[k]?.sleepHours);
  const sleepColor = (h?: number) => h == null ? "var(--tint)" : h < 8 ? "#ef4444" : h === 8 ? "#eab308" : "#22c55e";

  // Cycle summary (last 6 months)
  const cycleSummary = (() => {
    const starts: string[] = [];
    if (view.cycle.lastPeriodStart) starts.push(view.cycle.lastPeriodStart);
    // Detect period starts from dayLogs
    const keys = Object.keys(view.dayLogs).sort();
    let prev = "";
    for (const k of keys) {
      const l = view.dayLogs[k]; if (!l?.period && !l?.periodInfo?.level) continue;
      const prevIsPeriod = prev && (view.dayLogs[prev]?.period || view.dayLogs[prev]?.periodInfo?.level);
      if (!prevIsPeriod || addDays(prev, 1) !== k) starts.push(k);
      prev = k;
    }
    const uniq = Array.from(new Set(starts)).sort();
    const cycleLens: number[] = [];
    for (let i = 1; i < uniq.length; i++) {
      const d = (new Date(uniq[i]).getTime() - new Date(uniq[i - 1]).getTime()) / 86400000;
      if (d > 10 && d < 60) cycleLens.push(d);
    }
    const avg = cycleLens.length ? Math.round(cycleLens.reduce((a, b) => a + b, 0) / cycleLens.length) : view.cycle.cycleLength;
    return { avg, count: cycleLens.length, periodLen: view.cycle.periodLength };
  })();

  const goPrev = () => setAnchor((d) => {
    const n = new Date(d);
    if (period === "W") n.setDate(n.getDate() - 7);
    else if (period === "M") n.setMonth(n.getMonth() - 1);
    else n.setFullYear(n.getFullYear() - 1);
    return n;
  });
  const goNext = () => setAnchor((d) => {
    const n = new Date(d);
    if (period === "W") n.setDate(n.getDate() + 7);
    else if (period === "M") n.setMonth(n.getMonth() + 1);
    else n.setFullYear(n.getFullYear() + 1);
    return n;
  });

  const label = period === "Y"
    ? String(anchor.getFullYear())
    : period === "M"
      ? anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : `${startK} → ${endK}`;

  return (
    <AppShell title="Health of Bixbo">
      <div className="px-5 pt-2 pb-24 space-y-4">
        <div className="flex gap-2">
          {(["W","M","Y"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 rounded-2xl px-3 py-2 text-sm font-medium ${period === p ? "bg-primary text-primary-foreground" : "bg-surface text-foreground ring-1 ring-border"}`}>
              {p === "W" ? "Week" : p === "M" ? "Month" : "Year"}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={goPrev} className="rounded-full p-2 hover:bg-tint"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium">{label}</span>
          <button onClick={goNext} className="rounded-full p-2 hover:bg-tint"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pain scale</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-5xl leading-none">{painAvg != null ? painAvg.toFixed(1) : "–"}</span>
            <span className="text-sm text-muted-foreground">
              avg · {painSeries.filter((n) => n != null).length} {painSeries.filter((n) => n != null).length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div className="mt-5 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height: 80 }}>
            {painSeries.map((n, i) => (
              n != null
                ? <div key={i} className="w-full rounded-t" style={{ height: `${Math.max(6, (n / 10) * 100)}%`, background: painColor(n) }} />
                : <div key={i} className="h-1 w-full self-end rounded bg-tint" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ŠukŠuk! ❤️</p>
          <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sexCount === 1 ? "entry" : "entries"} in this {period === "W" ? "week" : period === "M" ? "month" : "year"}
          </p>
        </section>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Blueberry 🫐 cycle</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycle length</p>
              <p className="mt-1 font-serif text-xl">{cycleSummary.avg} days</p>
            </div>
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Period length</p>
              <p className="mt-1 font-serif text-xl">{cycleSummary.periodLen} days</p>
            </div>
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Regularity</p>
              <p className="mt-1 font-serif text-lg">
                {cycleSummary.count >= 2 ? `Regular (${cycleSummary.avg}-day)` : "Not enough data"}
              </p>
            </div>
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last period</p>
              <p className="mt-1 font-serif text-base">
                {view.cycle.lastPeriodStart ?? "—"}{view.cycle.lastPeriodEnd ? ` → ${view.cycle.lastPeriodEnd}` : ""}
              </p>
            </div>
          </div>
        </section>


        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Bowel — Bristol distribution</p>
          <div className="mt-3 flex items-end gap-2">
            {BRISTOL.map((b) => {
              const c = bowelCounts[b.n] ?? 0;
              const max = Math.max(1, ...bowelCounts.slice(1));
              return (
                <div key={b.n} className="flex flex-1 flex-col items-center gap-1">
                  <div className="h-20 w-full flex items-end">
                    <div className="w-full rounded-t" style={{ height: `${(c / max) * 100}%`, background: b.color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">T{b.n}</span>
                  <span className="text-[10px]">{c}</span>
                </div>
              );
            })}
          </div>
          {bowelCounts[0] > 0 && <p className="mt-2 text-xs text-muted-foreground">No movement: {bowelCounts[0]}</p>}
        </section>

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Weight</p>
          {wNums.length ? (
            <>
              <p className="mt-1 text-sm">Min {wMin} · Max {wMax} kg</p>
              <div className="mt-3 flex h-16 items-end gap-1">
                {weightSeries.map((w, i) => (
                  <div key={i} className="flex-1 h-full flex items-end">
                    {w != null && (
                      <div className="w-full rounded-t bg-primary/70"
                        style={{ height: `${((w - wMin) / Math.max(1, wMax - wMin)) * 100}%` }} />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : <p className="mt-1 text-sm text-muted-foreground">No data</p>}
        </section>

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sleep</p>
          <div className="mt-3 flex h-20 items-end gap-1">
            {sleepSeries.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                {h != null && <div className="w-full rounded-t" style={{ height: `${Math.min(100, (h / 12) * 100)}%`, background: sleepColor(h) }} />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt;8h</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> 8h</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> &gt;8h</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
