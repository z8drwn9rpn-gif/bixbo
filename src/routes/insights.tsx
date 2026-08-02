import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Ico } from "@/components/icons/BixboIcons";
import { useBixbo, EMPTY, addDays, toKey, fromKey, painColor, BRISTOL, avgDayPain, isIntercourseKind } from "@/lib/storage";

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

type Period = "W" | "M" | "Y" | "P";

function rangeFor(period: Period, anchor: Date) {
  // Always derive purely from `period` + `anchor` (no mutation of shared objects,
  // no reliance on the previous render's day-of-month). Root cause of the stale
  // month bug: `end` used to be a clone of `anchor` keeping its original
  // day-of-month, so a month view only ever covered days 1..anchor-day-of-month
  // instead of the full month (e.g. viewing July while anchor's date was "1"
  // showed just a single day). Now start/end are computed as true calendar
  // boundaries for the given period.
  const base = new Date(anchor); base.setHours(0, 0, 0, 0);
  if (period === "W") {
    // Monday → Sunday of the week containing `anchor`.
    const dow = (base.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const start = new Date(base); start.setDate(base.getDate() - dow);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { startK: toKey(start), endK: toKey(end) };
  }
  if (period === "M" || period === "P") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { startK: toKey(start), endK: toKey(end) };
  }
  const start = new Date(base.getFullYear(), 0, 1);
  const end = new Date(base.getFullYear(), 11, 31);
  return { startK: toKey(start), endK: toKey(end) };
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

  // ŠukŠuk! — count only actual sex/intercourse entries, not oral/fingering/other touch entries.
  const sexCount = days.reduce(
    (s, k) => s + (view.dayLogs[k]?.sex?.filter((e) => isIntercourseKind(e.kind)).length ?? 0),
    0,
  );


  // Bowel by type
  const bowelCounts = new Array(8).fill(0) as number[];
  days.forEach((k) => view.dayLogs[k]?.bowel?.forEach((b) => { bowelCounts[b.bristol] = (bowelCounts[b.bristol] ?? 0) + 1; }));

  // Weight uses an Apple-style rolling range so previous logged days are visible in Month view.
  const weightDays = useMemo(() => {
    const end = new Date(anchor); end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (period === "W") start.setDate(end.getDate() - 6);
    else if (period === "M") start.setDate(end.getDate() - 30);
    else start.setFullYear(end.getFullYear() - 1);
    return eachDay(toKey(start), toKey(end));
  }, [period, anchor]);
  const weightSeries = weightDays.map((k) => view.dayLogs[k]?.weight);
  const tempSeries = weightDays.map((k) => view.dayLogs[k]?.temperature);

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
  // Year view aggregates to 12 monthly buckets so the bars stay readable,
  // matching the weight/temperature charts.
  const monthLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const aggregateMonthly = (keys: string[], series: (number | undefined)[]) => {
    const sums = new Array(12).fill(0) as number[];
    const counts = new Array(12).fill(0) as number[];
    keys.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const mi = Number(k.slice(5, 7)) - 1;
      sums[mi] += v; counts[mi]++;
    });
    return sums.map((s, i) => (counts[i] ? s / counts[i] : undefined));
  };
  const hfBars = period === "Y" ? aggregateMonthly(days, hfSeries) : hfSeries;
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
    else if (period === "M" || period === "P") { n.setDate(1); n.setMonth(n.getMonth() - 1); }
    else n.setFullYear(n.getFullYear() - 1);
    return n;
  });
  const goNext = () => setAnchor((d) => {
    const n = new Date(d);
    if (period === "W") n.setDate(n.getDate() + 7);
    else if (period === "M" || period === "P") { n.setDate(1); n.setMonth(n.getMonth() + 1); }
    else n.setFullYear(n.getFullYear() + 1);
    return n;
  });

  const label = period === "Y"
    ? String(anchor.getFullYear())
    : period === "M" || period === "P"
      ? anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : `${startK} → ${endK}`;

  return (
    <AppShell title="Health of Bixbo">
      <div className="px-5 pt-2 pb-24 space-y-4">
        <div className="flex gap-2">
          {((view.settings.gender === "male" ? ["W","M","Y"] : ["W","M","Y","P"]) as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 rounded-2xl px-3 py-2 text-sm font-medium ${period === p ? "bg-primary text-primary-foreground" : "bg-surface text-foreground ring-1 ring-border"}`}>
              {p === "W" ? "Week" : p === "M" ? "Month" : p === "Y" ? "Year" : "Period"}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={goPrev} className="rounded-full p-2 hover:bg-tint"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium">{label}</span>
          <button onClick={goNext} className="rounded-full p-2 hover:bg-tint"><ChevronRight className="h-4 w-4" /></button>
        </div>


        {period === "P" && (
          <>
            <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Ico e="🫐" size={16} /> Blueberry cycle
              </p>
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
                  <p className="mt-1 font-serif text-lg">{cycleSummary.count >= 2 ? `Regular (${cycleSummary.avg}-day)` : "Not enough data"}</p>
                </div>
                <div className="rounded-2xl bg-tint p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last period</p>
                  <p className="mt-1 font-serif text-base">
                    {view.cycle.lastPeriodStart ?? "—"}{view.cycle.lastPeriodEnd ? ` → ${view.cycle.lastPeriodEnd}` : ""}
                  </p>
                </div>
              </div>
            </section>

            <BirthControlCalendar data={view} anchor={anchor} />

            <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Ico e="❤️" size={16} /> ŠukŠuk!
              </p>
              <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {sexCount === 1 ? "entry" : "entries"} this month
              </p>
            </section>
          </>
        )}

        {period !== "P" && (<>
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
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ŠukŠuk!</p>
          <p className="mt-2 font-serif text-5xl leading-none">{sexCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sexCount === 1 ? "entry" : "entries"} in this {period === "W" ? "week" : period === "M" ? "month" : "year"}
          </p>
        </section>

        {view.settings.gender !== "male" && (
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Blueberry cycle</p>
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
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Hot flashes</p>
          {hfTotal ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-4xl leading-none">{hfTotal}</span>
                <span className="text-sm text-muted-foreground">
                  {hfTotal === 1 ? "episode" : "episodes"} · avg {hfAvg!.toFixed(1)}/5 · most often L{hfTop}
                </span>
              </div>
              <div className="mt-4 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${hfBars.length}, minmax(0, 1fr))`, height: 60 }}>
                {hfBars.map((n, i) => (
                  n != null
                    ? <div key={i} className="w-full rounded-t" title={period === "Y" ? `${monthLabels[i]}: avg ${n.toFixed(1)}/5` : `${days[i]}: ${n}/5`} style={{ height: `${Math.max(10, (n / 5) * 100)}%`, background: `hsl(${130 - ((n - 1) * 130) / 4} 70% 50%)` }} />
                    : <div key={i} className="h-1 w-full self-end rounded bg-tint" />
                ))}
              </div>
              {period === "Y" && (
                <div className="mt-1 grid gap-1 text-center text-[9px] text-muted-foreground" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                  {monthLabels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
              )}
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



        <WeightLineChart period={period} days={weightDays} series={weightSeries} label="Weight" unit="kg" />
        <WeightLineChart period={period} days={weightDays} series={tempSeries} label="Body temperature" unit="°C" />

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sleep</p>
          <SleepChart period={period} days={days} series={sleepSeries} anchor={anchor} />
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt;8h</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> 8h</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> &gt;8h</span>
          </div>
        </section>

        <MedsAdherence data={view} />
        </>)}
      </div>
    </AppShell>
  );
}

/**
 * Birth-control (HAK) monthly calendar.
 * 28-day pack: pills #1–#24 active, #25–#28 inactive placebo.
 * Pill number counts continuously from settings.birthControlSince.
 */
function BirthControlCalendar({ data, anchor }: { data: ReturnType<typeof useBixbo>["data"]; anchor: Date }) {
  const [sel, setSel] = useState<string | null>(null);
  const since = data.settings.birthControlSince;
  if (!since || data.settings.gender === "male") return null;

  const bcMed = data.meds.find((m) => /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`));

  const y = anchor.getFullYear(), mo = anchor.getMonth();
  const first = new Date(y, mo, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const todayK = toKey(new Date());

  const pillNumber = (k: string) => {
    const diff = Math.round((fromKey(k).getTime() - fromKey(since).getTime()) / 86400000);
    if (diff < 0) return null;
    return (diff % 28) + 1;
  };
  const takenAt = (k: string): string | null => {
    const log = data.medLog[k] ?? {};
    const times = data.medLogTimes?.[k] ?? {};
    const keys = Object.keys(log).filter((key) => log[key] && (!bcMed || key.startsWith(`${bcMed.id}@`)));
    if (!keys.length) return null;
    return times[keys[0]] ?? keys[0].split("@")[1] ?? "";
  };

  const cells: (string | null)[] = [
    ...new Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(y, mo, i + 1))),
  ];

  const detail = (() => {
    if (!sel) return null;
    const n = pillNumber(sel);
    if (n == null) return `${sel} · before you started`;
    const t = takenAt(sel);
    const inactive = n > 24;
    return `Pill #${n}${inactive ? " (inactive white)" : ""} · ${t ? `taken${t ? ` at ${t}` : ""}` : "not recorded"}`;
  })();

  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Ico e="💊" size={16} /> Birth control
      </p>
      <p className="mt-3 text-center font-serif text-lg">
        {anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((k, i) => {
          if (!k) return <span key={i} />;
          const n = pillNumber(k);
          const t = n == null ? null : takenAt(k);
          const inactive = n != null && n > 24;
          const future = k > todayK;
          const isToday = k === todayK;
          const missed = n != null && !inactive && !t && !future;

          let bg = "transparent", color = "var(--foreground)", ring = "1px solid var(--border)";
          if (n == null || future) { bg = "transparent"; color = "var(--muted-foreground)"; }
          else if (inactive) { bg = "var(--tint)"; color = "var(--muted-foreground)"; ring = "1px solid var(--border)"; }
          else if (t != null) { bg = "var(--primary)"; color = "var(--primary-foreground)"; ring = "none"; }
          else if (missed) { ring = "2px solid #d94545"; color = "#d94545"; }

          return (
            <button key={k} onClick={() => setSel(sel === k ? null : k)}
              className={`flex aspect-square flex-col items-center justify-center rounded-full text-[13px] leading-none ${sel === k ? "ring-2 ring-primary" : ""}`}
              style={{ background: bg, color, border: sel === k ? undefined : ring, outline: isToday ? "2.5px solid var(--foreground)" : undefined }}>
              <span className="text-[8px] opacity-70">{n != null ? `#${n}` : ""}</span>
              <span className="font-semibold">{Number(k.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> taken</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: "#d94545" }} /> missed</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-tint ring-1 ring-border" /> inactive (white)</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-foreground" /> today</span>
      </div>
      <p className="mt-3 rounded-2xl bg-tint p-3 text-xs">
        {detail ?? "Tap a day for details."}
      </p>
      {!bcMed && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tip: add your pill in Medications (name it e.g. “Birth control”) so taken doses are detected precisely.
        </p>
      )}
    </section>
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

  // Doses logged for meds that no longer exist in the list — keep history visible.
  const knownIds = new Set(data.meds.map((m) => m.id));
  const removedCounts = (() => {
    const acc: Record<string, number> = {};
    days.forEach((k) => {
      const log = data.medLog[k] ?? {};
      Object.entries(log).forEach(([key, val]) => {
        if (!val) return;
        const id = key.split("@")[0];
        if (knownIds.has(id)) return;
        acc[id] = (acc[id] ?? 0) + 1;
      });
    });
    return Object.entries(acc).map(([id, count]) => ({ id, count, name: data.medNames?.[id] ?? "Removed medication" }));
  })();

  const cellColor = (d: typeof perDay[number]) => {
    if (d.expected === 0) return "var(--tint)";
    const r = d.taken / d.expected;
    if (r >= 1) return "#22c55e";
    if (r > 0) return "#eab308";
    return "#ef4444";
  };

  const fmt = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (data.meds.length === 0 && removedCounts.length === 0) return null;

  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Meds adherence</p>
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
          {removedCounts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Discontinued meds (history)</p>
              <ul className="space-y-1 text-xs">
                {removedCounts.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">{m.count} doses in {range} days</span>
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

function WeightLineChart({ period, days, series, label = "Weight", unit = "kg" }:
  { period: Period; days: string[]; series: (number | undefined)[]; label?: string; unit?: string }) {
  const [active, setActive] = useState<{ value: number; index: number; date: string } | null>(null);
  // For yearly view, collapse 365 daily samples into 12 monthly averages so labels are readable.
  const aggregated = (() => {
    if (period !== "Y") {
      return days.map((k, i) => ({ value: series[i], date: k }));
    }
    const monthly: { sum: number; n: number; anyDate: string }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0, anyDate: "" }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v;
      monthly[m].n += 1;
      monthly[m].anyDate = k;
    });
    const now = new Date();
    return monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      date: mm.anyDate || toKey(new Date(now.getFullYear(), i, 15)),
    }));
  })();

  const points = aggregated
    .map((p, index) => p.value == null ? null : { value: p.value, index, date: p.date })
    .filter((p): p is { value: number; index: number; date: string } => p != null);
  const nums = points.map((p) => p.value);
  const fmtDate = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (!nums.length) {
    return (
      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">No data</p>
      </section>
    );
  }

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const rawMin = Math.min(...nums);
  const rawMax = Math.max(...nums);
  const span = Math.max(0.6, rawMax - rawMin);
  const yMin = Math.floor((rawMin - span * 0.25) * 2) / 2;
  const yMax = Math.ceil((rawMax + span * 0.25) * 2) / 2;
  const yMid = (yMin + yMax) / 2;

  const width = 320;
  const height = 170;
  const left = 10;
  const right = 38;
  const top = 12;
  const bottom = 30;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const denom = Math.max(1, aggregated.length - 1);
  const xFor = (index: number) => left + (index / denom) * chartW;
  const yFor = (value: number) => top + ((yMax - value) / Math.max(0.1, yMax - yMin)) * chartH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.index).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(" ");

  const MON_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const ticks = aggregated
    .map((p, i) => ({ k: p.date, i, d: fromKey(p.date) }))
    .filter(({ i, d }) => {
      if (period === "W") return true;
      if (period === "M") return i === 0 || i === aggregated.length - 1 || i % 7 === 0;
      // Year: every month (aggregated already has 12 points)
      return true;
    });
  const tickLabel = (k: string) => {
    const d = fromKey(k);
    return period === "Y" ? MON_SHORT[d.getMonth()] : String(d.getDate());
  };
  const dateLabel = period === "Y"
    ? `${new Date().getFullYear()} — monthly average`
    : `${fmtDate(days[0])} – ${fmtDate(days[days.length - 1])}`;


  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-serif text-5xl leading-none">{avg.toFixed(1)}</span>
        <span className="pb-1 text-sm font-semibold text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      <div className="mt-3 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label={`${label} line chart`}>
          {[yMax, yMid, yMin].map((y) => (
            <g key={y}>
              <line x1={left} x2={width - right} y1={yFor(y)} y2={yFor(y)} stroke="var(--border)" strokeWidth="1" />
              <text x={width - right + 8} y={yFor(y) + 4} fontSize="10" fill="var(--muted-foreground)">{y.toFixed(y % 1 ? 1 : 0)}</text>
            </g>
          ))}
          {ticks.map(({ k, i }) => (
            <g key={k}>
              <line x1={xFor(i)} x2={xFor(i)} y1={top} y2={height - bottom} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" />
              <text x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">{tickLabel(k)}</text>
            </g>
          ))}
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p) => (
            <g key={p.date}>
              <circle cx={xFor(p.index)} cy={yFor(p.value)} r="3" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
              <circle cx={xFor(p.index)} cy={yFor(p.value)} r="12" fill="transparent" style={{ cursor: "pointer" }}
                onClick={() => setActive(active?.date === p.date ? null : p)}>
                <title>{`${period === "Y" ? MON_SHORT[fromKey(p.date).getMonth()] : fmtDate(p.date)}: ${p.value.toFixed(1)} ${unit}`}</title>
              </circle>
            </g>
          ))}
          {active && (
            <g pointerEvents="none">
              <rect x={Math.min(Math.max(xFor(active.index) - 38, 2), width - right - 40)} y={Math.max(yFor(active.value) - 32, 2)}
                width="78" height="24" rx="6" fill="var(--foreground)" opacity="0.9" />
              <text x={Math.min(Math.max(xFor(active.index) - 38, 2), width - right - 40) + 39} y={Math.max(yFor(active.value) - 32, 2) + 16}
                textAnchor="middle" fontSize="10" fill="var(--background)">
                {`${period === "Y" ? MON_SHORT[fromKey(active.date).getMonth()] : fmtDate(active.date)} · ${active.value.toFixed(1)}${unit}`}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}

function SleepChart({ period, days, series, anchor }:
  { period: Period; days: string[]; series: (number | undefined)[]; anchor: Date }) {
  // Mirrors PainChart's layout: labelled Y axis on the left, dotted gridlines,
  // and X-axis labels that adapt to the active period.
  type Bar = { value?: number; label: string; sub?: string };
  let bars: Bar[] = [];
  if (period === "Y") {
    const monthly: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v; monthly[m].n += 1;
    });
    const MON = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    bars = monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      label: MON[i],
    }));
  } else if (period === "M") {
    bars = days.map((k, i) => {
      const d = fromKey(k).getDate();
      return { value: series[i], label: d % 2 === 1 ? String(d) : "" };
    });
  } else {
    bars = days.map((k, i) => {
      const d = fromKey(k);
      const wd = ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
      return { value: series[i], label: wd, sub: String(d.getDate()) };
    });
  }

  const sleepColor = (h?: number) => h == null ? "var(--tint)" : h < 8 ? "#ef4444" : h === 8 ? "#eab308" : "#22c55e";
  const yLabels = [12, 10, 8, 6, 4, 2, 0];
  const height = 140;

  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        <div className="flex flex-col items-end pr-1" style={{ height }}>
          <div className="flex h-full flex-col justify-between text-[10px] font-medium text-muted-foreground">
            {yLabels.map((y) => <span key={y} className="leading-none tabular-nums">{y}</span>)}
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((y) => (
              <div key={y} className="border-t border-dashed border-border/40" />
            ))}
          </div>
          <div className="relative grid items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`, height }}>
            {bars.map((b, i) => (
              b.value != null
                ? <div key={i} className="w-full rounded-t" style={{ height: `${Math.max(4, (b.value / 12) * 100)}%`, background: sleepColor(b.value) }} title={`${b.label || days[i]}: ${b.value.toFixed(1)} h`} />
                : <div key={i} className="h-[2px] w-full self-end rounded bg-tint/60" title={`${days[i]}: no entry`} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-5">
        <div className="grid flex-1 gap-[2px] text-center text-[9px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((b, i) => (
            <div key={i} className="leading-tight">
              <div className="tabular-nums">{b.label}</div>
              {b.sub && <div className="text-[8px] opacity-70 tabular-nums">{b.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Sleep (hours)</span>
        <span>{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</span>
      </div>
      {period === "Y" && bars.every((b) => b.value == null) && (
        <p className="mt-2 text-center text-xs text-muted-foreground">No sleep entries in {anchor.getFullYear()}</p>
      )}
    </div>
  );
}

function PainChart({ period, days, series, anchor }:
  { period: Period; days: string[]; series: (number | undefined)[]; anchor: Date }) {
  // Aggregate for year view: 12 monthly averages
  type Bar = { value?: number; label: string; sub?: string };
  let bars: Bar[] = [];
  if (period === "Y") {
    const monthly: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
    days.forEach((k, i) => {
      const v = series[i];
      if (v == null) return;
      const m = fromKey(k).getMonth();
      monthly[m].sum += v; monthly[m].n += 1;
    });
    const MON = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    bars = monthly.map((mm, i) => ({
      value: mm.n ? mm.sum / mm.n : undefined,
      label: MON[i],
    }));
  } else if (period === "M") {
    bars = days.map((k, i) => {
      const d = fromKey(k).getDate();
      // Show every other day so labels never collide but daily rating is readable.
      return { value: series[i], label: d % 2 === 1 ? String(d) : "" };
    });
  } else {
    bars = days.map((k, i) => {
      const d = fromKey(k);
      const wd = ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
      return { value: series[i], label: wd, sub: String(d.getDate()) };
    });
  }

  const yLabels = [10, 8, 6, 4, 2, 0];
  const height = 140;

  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        <div className="flex flex-col items-end pr-1" style={{ height }}>
          <div className="flex h-full flex-col justify-between text-[10px] font-medium text-muted-foreground">
            {yLabels.map((y) => <span key={y} className="leading-none tabular-nums">{y}</span>)}
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((y) => (
              <div key={y} className="border-t border-dashed border-border/40" />
            ))}
          </div>
          <div className="relative grid items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`, height }}>
            {bars.map((b, i) => (
              b.value != null
                ? <div key={i} className="w-full rounded-t" style={{ height: `${Math.max(4, (b.value / 10) * 100)}%`, background: painColor(b.value) }} title={`${b.label || days[i]}: ${b.value.toFixed(1)} / 10`} />
                : <div key={i} className="h-[2px] w-full self-end rounded bg-tint/60" title={`${days[i]}: no entry`} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-5">
        <div className="grid flex-1 gap-[2px] text-center text-[9px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((b, i) => (
            <div key={i} className="leading-tight">
              <div className="tabular-nums">{b.label}</div>
              {b.sub && <div className="text-[8px] opacity-70 tabular-nums">{b.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Pain (0–10)</span>
        <span>{period === "Y" ? "Month" : period === "M" ? "Day of month" : "Day"}</span>
      </div>
      {period === "Y" && bars.every((b) => b.value == null) && (
        <p className="mt-2 text-center text-xs text-muted-foreground">No pain entries in {anchor.getFullYear()}</p>
      )}
    </div>
  );
}
