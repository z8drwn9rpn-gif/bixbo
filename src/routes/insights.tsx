import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, painColor, fromKey, todayKey, addDays, isDateInRange } from "@/lib/storage";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Health of Bixbo — Insights" },
      { name: "description", content: "Weekly, monthly, and yearly trends for pain, cycle and activity." },
      { property: "og:title", content: "Health of Bixbo — Insights" },
      { property: "og:description", content: "Weekly, monthly, and yearly trends for pain, cycle and activity." },
    ],
  }),
  component: InsightsPage,
});

type Range = "week" | "month" | "year";

function InsightsPage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [range, setRange] = useState<Range>("month");

  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  const end = todayKey();
  const start = addDays(end, -(days - 1));

  const painPoints = useMemo(() => {
    const out: { key: string; score: number }[] = [];
    for (let i = 0; i < days; i++) {
      const k = addDays(start, i);
      const log = view.dayLogs[k];
      const m = log?.pain?.reduce((mm, p) => Math.max(mm, p.score), 0);
      if (m != null) out.push({ key: k, score: m });
    }
    return out;
  }, [days, start, view.dayLogs]);

  const painAvg = painPoints.length ? (painPoints.reduce((s, p) => s + p.score, 0) / painPoints.length).toFixed(1) : "—";

  const sexCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < days; i++) {
      const k = addDays(start, i);
      n += view.dayLogs[k]?.sex?.length ?? 0;
    }
    return n;
  }, [days, start, view.dayLogs]);

  const cycleStats = useMemo(() => {
    const c = view.cycle;
    return {
      cycleLen: c.cycleLength,
      periodLen: c.periodLength,
      last: c.lastPeriodStart ? `${c.lastPeriodStart} → ${c.lastPeriodEnd ?? "?"}` : "not set",
      regular: "Regular (28-day)",
    };
  }, [view.cycle]);

  return (
    <AppShell title="Health of Bixbo">
      <div className="space-y-4 px-5 pt-4 pb-24">
        <div className="flex gap-2">
          {(["week","month","year"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                range === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"
              }`}
            >{r}</button>
          ))}
        </div>

        <Section title="Pain scale">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl">{painAvg}</span>
            <span className="text-xs text-muted-foreground">avg · {painPoints.length} entries</span>
          </div>
          <PainBars points={painPoints} days={days} start={start} />
        </Section>

        <Section title="ŠukŠuk! ❤️">
          <p className="font-serif text-3xl">{sexCount}</p>
          <p className="text-xs text-muted-foreground">entries in this {range}</p>
        </Section>

        <Section title="Blueberry 🫐 cycle">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Cycle length" value={`${cycleStats.cycleLen} days`} />
            <Stat label="Period length" value={`${cycleStats.periodLen} days`} />
            <Stat label="Regularity" value={cycleStats.regular} />
            <Stat label="Last period" value={cycleStats.last} />
          </div>
        </Section>

        <Section title="Sleep">
          <SleepStrip start={start} days={days} view={view} />
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tint p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-serif text-base">{value}</p>
    </div>
  );
}

function PainBars({ points, days, start }: { points: { key: string; score: number }[]; days: number; start: string }) {
  const map = new Map(points.map((p) => [p.key, p.score]));
  const step = days > 60 ? Math.ceil(days / 60) : 1;
  const bars: { k: string; s?: number }[] = [];
  for (let i = 0; i < days; i += step) {
    const k = addDays(start, i);
    bars.push({ k, s: map.get(k) });
  }
  return (
    <div className="flex h-24 items-end gap-[1px]">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 rounded-t-sm" style={{
          height: b.s != null ? `${(b.s / 10) * 100}%` : "4%",
          background: b.s != null ? painColor(b.s) : "var(--tint)",
        }} title={b.k + (b.s != null ? ` — ${b.s}` : "")} />
      ))}
    </div>
  );
}

function SleepStrip({ start, days, view }: { start: string; days: number; view: any }) {
  const step = days > 60 ? Math.ceil(days / 60) : 1;
  const bars: { h?: number }[] = [];
  for (let i = 0; i < days; i += step) {
    const k = addDays(start, i);
    bars.push({ h: view.dayLogs[k]?.sleepHours });
  }
  return (
    <div className="flex h-16 items-end gap-[1px]">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-primary/60" style={{
          height: b.h != null ? `${Math.min(1, b.h / 10) * 100}%` : "4%",
          opacity: b.h != null ? 1 : 0.2,
        }} />
      ))}
    </div>
  );
}
