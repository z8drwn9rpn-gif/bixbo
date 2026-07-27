import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, addDays, toKey, fromKey, painColor, BRISTOL, avgDayPain } from "@/lib/storage";

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

  // ŠukŠuk! — count only actual sex (not fingering / oral / other)
  const SEX_KINDS = new Set(["sex", "sex_with_condom", "sex_without_condom"]);
  const sexCount = days.reduce(
    (s, k) => s + (view.dayLogs[k]?.sex?.filter((e) => SEX_KINDS.has(String(e.kind))).length ?? 0),
    0,
  );


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

  // Hot flashes — collect per-day max intensity + distribution across levels 1–5
  const hfDescriptions: Record<number, string> = {
    1: "Mild warmth",
    2: "Warm flush",
    3: "Sweating",
    4: "Strong wave",
    5: "Drenching",
  };
  const hfSeries = days.map((k) => {
    const vals = (view.dayLogs[k]?.pain ?? []).map((p) => p.hotFlashes).filter((n): n is number => n != null);
    return vals.length ? Math.max(...vals) : undefined;
  });
  const hfCounts = [0, 0, 0, 0, 0, 0] as number[];
  days.forEach((k) => (view.dayLogs[k]?.pain ?? []).forEach((p) => {
    if (p.hotFlashes && p.hotFlashes >= 1 && p.hotFlashes <= 5) hfCounts[p.hotFlashes]++;
  }));
  const hfTotal = hfCounts.reduce((a, b) => a + b, 0);
  const hfAvg = (() => {
    const s = hfCounts.reduce((sum, c, i) => sum + c * i, 0);
    return hfTotal ? s / hfTotal : null;
  })();
  const hfTop = (() => {
    let bestN = 0, bestC = 0;
    for (let i = 1; i <= 5; i++) if (hfCounts[i] > bestC) { bestC = hfCounts[i]; bestN = i; }
    return bestN;
  })();


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
          <PainChart period={period} days={days} series={painSeries} anchor={anchor} />
        </section>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ŠukŠuk! ❤️</p>
          <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sexCount === 1 ? "entry" : "entries"} in this {period === "W" ? "week" : period === "M" ? "month" : "year"}
          </p>
        </section>

        {view.settings.gender !== "male" && (
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
        )}


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
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Hot flashes 🥵</p>
          {hfTotal ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-4xl leading-none">{hfTotal}</span>
                <span className="text-sm text-muted-foreground">
                  {hfTotal === 1 ? "episode" : "episodes"} · avg {hfAvg!.toFixed(1)}/5 · most often L{hfTop}
                </span>
              </div>
              <div className="mt-4 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height: 60 }}>
                {hfSeries.map((n, i) => (
                  n != null
                    ? <div key={i} className="w-full rounded-t" style={{ height: `${Math.max(10, (n / 5) * 100)}%`, background: `hsl(${130 - ((n - 1) * 130) / 4} 70% 50%)` }} />
                    : <div key={i} className="h-1 w-full self-end rounded bg-tint" />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const c = hfCounts[n];
                  const pct = hfTotal ? (c / hfTotal) * 100 : 0;
                  const hue = 130 - ((n - 1) * 130) / 4;
                  return (
                    <div key={n} className="flex items-center gap-2 text-[11px]">
                      <span className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: `hsl(${hue} 70% 50%)` }}>{n}</span>
                      <span className="w-16 shrink-0 text-muted-foreground">{hfDescriptions[n]}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `hsl(${hue} 70% 50%)` }} />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{c}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="mt-1 text-sm text-muted-foreground">No hot flashes logged</p>}
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

        <MedsAdherence data={view} />
      </div>
    </AppShell>
  );
}

function MedsAdherence({ data }: { data: ReturnType<typeof useBixbo>["data"] }) {
  const { update } = useBixbo();
  const [range, setRange] = useState<7 | 30>(7);
  const [open, setOpen] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(end.getDate() - (range - 1));
  const days: string[] = [];
  for (let i = 0; i < range; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(toKey(d)); }

  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const asNeeded = data.meds.filter((m) => m.asNeeded);

  const toggleDose = (dayKey: string, medKey: string) => update((d) => {
    const day = { ...(d.medLog[dayKey] ?? {}) };
    if (day[medKey]) delete day[medKey]; else day[medKey] = true;
    return { ...d, medLog: { ...d.medLog, [dayKey]: day } };
  });

  const perDay = days.map((k) => {
    const expected = scheduled.reduce((s, m) => s + m.times.length, 0);
    const missed: { medName: string; time: string; key: string }[] = [];
    const takenList: { medName: string; time: string; key: string }[] = [];
    let taken = 0;
    scheduled.forEach((m) => m.times.forEach((t) => {
      const key = `${m.id}@${t}`;
      if (data.medLog[k]?.[key]) { taken++; takenList.push({ medName: m.name, time: t, key }); }
      else missed.push({ medName: m.name, time: t, key });
    }));
    return { date: k, expected, taken, missed, takenList };
  });
  const totalExpected = perDay.reduce((s, d) => s + d.expected, 0);
  const totalTaken = perDay.reduce((s, d) => s + d.taken, 0);
  const overallPct = totalExpected ? Math.round((totalTaken / totalExpected) * 100) : null;



  const perMed = scheduled.flatMap((m) => m.times.map((t) => {
    let taken = 0;
    days.forEach((k) => { if (data.medLog[k]?.[`${m.id}@${t}`]) taken++; });
    const expected = days.length;
    return { id: `${m.id}@${t}`, name: m.name, dose: m.dose, time: t, taken, expected, pct: expected ? Math.round((taken / expected) * 100) : 0 };
  })).sort((a, b) => a.pct - b.pct);

  const asNeededCounts = asNeeded.map((m) => {
    let count = 0;
    days.forEach((k) => {
      const log = data.medLog[k] ?? {};
      Object.keys(log).forEach((key) => { if (log[key] && (key === `${m.id}@asNeeded` || key.startsWith(`${m.id}@`))) count++; });
    });
    return { id: m.id, name: m.name, count };
  });

  const cellColor = (d: typeof perDay[number]) => {
    if (d.expected === 0) return "var(--tint)";
    const r = d.taken / d.expected;
    if (r >= 1) return "#22c55e";
    if (r > 0) return "#eab308";
    return "#ef4444";
  };

  const fmt = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (data.meds.length === 0) return null;

  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">💊 Meds adherence</p>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex gap-2">
            {([7, 30] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-medium ${range === r ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}>
                {r}-day
              </button>
            ))}
          </div>

          {totalExpected > 0 ? (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-serif text-5xl leading-none">{overallPct}%</span>
              <span className="text-sm text-muted-foreground">{totalTaken}/{totalExpected} doses</span>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No scheduled meds in this range.</p>
          )}

          {perDay.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Daily heatmap</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(range, 15)}, minmax(0, 1fr))` }}>
                {perDay.map((d) => (
                  <button key={d.date} onClick={() => setExpandedDay(expandedDay === d.date ? null : d.date)}
                    title={`${fmt(d.date)} — ${d.taken}/${d.expected}`}
                    className={`aspect-square rounded ${expandedDay === d.date ? "ring-2 ring-primary" : ""}`}
                    style={{ background: cellColor(d) }} />
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "#22c55e" }} /> full</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "#eab308" }} /> partial</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded" style={{ background: "#ef4444" }} /> none</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-tint" /> n/a</span>
              </div>
              {expandedDay && (() => {
                const d = perDay.find((x) => x.date === expandedDay);
                if (!d) return null;
                return (
                  <div className="mt-3 rounded-2xl bg-tint p-3 text-xs">
                    <p className="font-medium">{fmt(d.date)} — {d.taken}/{d.expected} taken</p>
                    {d.takenList.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {d.takenList.map((m) => (
                          <li key={m.key}>
                            <button onClick={() => toggleDose(d.date, m.key)} className="text-left text-green-700 hover:underline" title="Tap to uncheck">
                              ✓ {m.time} — {m.medName} <span className="text-[10px] text-muted-foreground">· tap to uncheck</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {d.missed.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {d.missed.map((m) => (
                          <li key={m.key}>
                            <button onClick={() => toggleDose(d.date, m.key)} className="text-left hover:underline" title="Tap to mark taken">
                              ✗ {m.time} — {m.medName} <span className="text-[10px]">· tap to mark taken</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : d.expected > 0 ? <p className="mt-1 text-muted-foreground">All doses taken 💚</p> : null}
                  </div>
                );
              })()}

            </div>
          )}

          {perMed.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Per medication</p>
              <ul className="space-y-2">
                {perMed.map((m) => {
                  const color = m.pct >= 90 ? "#22c55e" : m.pct >= 60 ? "#eab308" : "#ef4444";
                  return (
                    <li key={m.id} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 truncate">{m.name} <span className="text-muted-foreground">{m.time}</span></span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint">
                        <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: color }} />
                      </div>
                      <span className="w-14 shrink-0 text-right tabular-nums">{m.pct}% <span className="text-muted-foreground">({m.taken}/{m.expected})</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {asNeededCounts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">As-needed (frequency)</p>
              <ul className="space-y-1 text-xs">
                {asNeededCounts.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">{m.count}× in {range} days</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
