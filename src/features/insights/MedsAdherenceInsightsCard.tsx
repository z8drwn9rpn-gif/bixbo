import { useEffect, useMemo, useState } from "react";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, medScheduleItems, toKey, useBixbo, type BixboData } from "@/lib/storage";
import { resolveScheduledDose } from "@/lib/domain/meds";
import { INSIGHT_COLORS, MON_SHORT3, type Period } from "./shared";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";

type DayAdherence = {
  date: string;
  expected: number;
  taken: number;
  pct: number | null;
  missed: { medName: string; time: string; key: string; item: string }[];
  takenList: { medName: string; time: string; key: string; item: string }[];
};

function rangeForMeds(period: Period, anchor: Date) {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);
  if (period === "W") {
    const offset = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, title: "Week" };
  }
  if (period === "M") {
    return { start: new Date(base.getFullYear(), base.getMonth(), 1), end: new Date(base.getFullYear(), base.getMonth() + 1, 0), title: "Month" };
  }
  return { start: new Date(base.getFullYear(), 0, 1), end: new Date(base.getFullYear(), 11, 31), title: "Year" };
}

function dayKeys(start: Date, end: Date) {
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    result.push(toKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function adherenceColor(pct: number | null) {
  if (pct == null) return INSIGHT_COLORS.oliveLight;
  if (pct >= 90) return "#28A85B";
  if (pct >= 75) return "#F0D33A";
  if (pct >= 40) return "#F7A21C";
  return "#D84343";
}

function timeBucket(time: string) {
  const hour = Number(time.split(":")[0]);
  if (!Number.isFinite(hour)) return "Other";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Midday";
  return "Evening";
}

function compactDate(key: string) {
  return fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function MedsAdherenceInsightsCard({ data, period, anchor, onPeriodChange, onPeriodShift }: {
  data: BixboData;
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const { update } = useBixbo();
  const [open, setOpen] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const range = useMemo(() => rangeForMeds(period, anchor), [anchor, period]);
  const days = useMemo(() => dayKeys(range.start, range.end), [range.end, range.start]);
  const scheduled = useMemo(() => data.meds.filter((med) => !med.asNeeded), [data.meds]);
  const asNeeded = useMemo(() => data.meds.filter((med) => med.asNeeded), [data.meds]);
  const minuteKey = Math.floor(Date.now() / 60_000);

  useEffect(() => setExpandedKey(null), [anchor, period]);

  const perDay = useMemo<DayAdherence[]>(() => {
    const now = new Date(minuteKey * 60_000);
    return days.map((date) => {
      let expected = 0;
      let taken = 0;
      const missed: DayAdherence["missed"] = [];
      const takenList: DayAdherence["takenList"] = [];
      scheduled.forEach((med) => med.times.forEach((time) => {
        const state = resolveScheduledDose(med, date, time, data.medLog, data.medLogItems ?? {}, now);
        if (!state.eligible) return;
        expected += state.allItems.length;
        taken += state.selectedItems.length;
        state.selectedItems.forEach((item) => takenList.push({ medName: item, time, key: state.key, item }));
        state.missedItems.forEach((item) => missed.push({ medName: item, time, key: state.key, item }));
      }));
      return { date, expected, taken, missed, takenList, pct: expected ? Math.round((taken / expected) * 100) : null };
    });
  }, [data.medLog, data.medLogItems, days, minuteKey, scheduled]);

  const totalExpected = perDay.reduce((sum, day) => sum + day.expected, 0);
  const totalTaken = perDay.reduce((sum, day) => sum + day.taken, 0);
  const overallPct = totalExpected ? Math.round((totalTaken / totalExpected) * 100) : null;

  const perMed = useMemo(() => {
    const now = new Date(minuteKey * 60_000);
    return scheduled.flatMap((med) => med.times.flatMap((time) => medScheduleItems(med).map((item) => {
      let expected = 0;
      let taken = 0;
      days.forEach((date) => {
        const state = resolveScheduledDose(med, date, time, data.medLog, data.medLogItems ?? {}, now);
        if (!state.eligible) return;
        expected += 1;
        if (state.selectedItems.includes(item)) taken += 1;
      });
      return { id: `${med.id}@${time}@${item}`, name: item, dose: med.dose, time, expected, taken, pct: expected ? Math.round((taken / expected) * 100) : null };
    }))).filter((entry) => entry.expected > 0).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  }, [data.medLog, data.medLogItems, days, minuteKey, scheduled]);

  const monthly = useMemo(() => Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDays = perDay.filter((day) => fromKey(day.date).getMonth() === monthIndex);
    const expected = monthDays.reduce((sum, day) => sum + day.expected, 0);
    const taken = monthDays.reduce((sum, day) => sum + day.taken, 0);
    return { key: `${range.start.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`, label: MON_SHORT3[monthIndex], expected, taken, pct: expected ? Math.round((taken / expected) * 100) : null };
  }), [perDay, range.start]);

  const bestStreak = useMemo(() => {
    let bestStart = "";
    let bestEnd = "";
    let bestLength = 0;
    let currentStart = "";
    let currentLength = 0;
    perDay.forEach((day) => {
      const good = day.expected > 0 && (day.pct ?? 0) >= 90;
      if (good) {
        if (!currentLength) currentStart = day.date;
        currentLength += 1;
        if (currentLength > bestLength) {
          bestLength = currentLength;
          bestStart = currentStart;
          bestEnd = day.date;
        }
      } else {
        currentLength = 0;
        currentStart = "";
      }
    });
    return { length: bestLength, start: bestStart, end: bestEnd };
  }, [perDay]);

  const strongestTime = useMemo(() => {
    const buckets = new Map<string, { taken: number; expected: number }>();
    perMed.forEach((entry) => {
      const name = timeBucket(entry.time);
      const current = buckets.get(name) ?? { taken: 0, expected: 0 };
      current.taken += entry.taken;
      current.expected += entry.expected;
      buckets.set(name, current);
    });
    return Array.from(buckets.entries())
      .map(([name, value]) => ({ name, ...value, pct: value.expected ? Math.round((value.taken / value.expected) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)[0] ?? null;
  }, [perMed]);

  const needsAttention = perMed[0] ?? null;
  const asNeededCounts = useMemo(() => asNeeded.map((med) => {
    let count = 0;
    days.forEach((date) => {
      Object.entries(data.medLog[date] ?? {}).forEach(([key, value]) => {
        if (value && (key === `${med.id}@asNeeded` || key.startsWith(`${med.id}@`))) count += 1;
      });
    });
    return { id: med.id, name: med.name, count };
  }).filter((entry) => entry.count > 0), [asNeeded, data.medLog, days]);

  const toggleDose = (dayKey: string, medKey: string, item?: string) => update((current) => {
    const day = { ...(current.medLog[dayKey] ?? {}) };
    const dayItems = { ...(current.medLogItems?.[dayKey] ?? {}) };
    if (!item) {
      if (day[medKey]) { delete day[medKey]; delete dayItems[medKey]; }
      else day[medKey] = true;
    } else {
      const [medId] = medKey.split("@");
      const med = current.meds.find((entry) => entry.id === medId);
      const allItems = med ? medScheduleItems(med) : [item];
      const existing = dayItems[medKey] ?? (day[medKey] ? allItems : []);
      const next = new Set(existing.filter((name) => allItems.includes(name)));
      if (next.has(item)) next.delete(item); else next.add(item);
      const selected = allItems.filter((name) => next.has(name));
      if (selected.length) { day[medKey] = true; dayItems[medKey] = selected; }
      else { delete day[medKey]; delete dayItems[medKey]; }
    }
    return { ...current, medLog: { ...current.medLog, [dayKey]: day }, medLogItems: { ...(current.medLogItems ?? {}), [dayKey]: dayItems } };
  });

  if (data.meds.length === 0) return null;

  const overallInsight = overallPct == null ? "No scheduled doses in this period" : overallPct >= 90 ? "Overall adherence was excellent" : overallPct >= 75 ? "Overall adherence stayed solid" : "Overall adherence needs attention";

  const renderDaily = () => {
    if (period === "Y") {
      return <div className="grid grid-cols-6 gap-x-3 gap-y-2">{monthly.map((month) => (
        <button key={month.key} type="button" onClick={() => setExpandedKey((current) => current === month.key ? null : month.key)} className="flex min-w-0 flex-col items-center gap-1" aria-label={`${month.label} ${range.start.getFullYear()} · ${month.pct == null ? "n/a" : `${month.pct}%`}`}>
          <span className="text-[10px] text-muted-foreground">{month.label}</span>
          <span className={`h-3.5 w-3.5 rounded-full ring-1 ${expandedKey === month.key ? "ring-2 ring-primary" : "ring-border/30"}`} style={{ background: adherenceColor(month.pct) }} />
        </button>
      ))}</div>;
    }
    const columns = period === "W" ? 7 : 16;
    return <div className="grid gap-x-2 gap-y-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>{perDay.map((day) => (
      <button key={day.date} type="button" onClick={() => setExpandedKey((current) => current === day.date ? null : day.date)} className="flex min-w-0 flex-col items-center gap-1" aria-label={`${compactDate(day.date)} · ${day.taken}/${day.expected} doses`}>
        <span className="text-[9px] tabular-nums text-muted-foreground">{fromKey(day.date).getDate()}</span>
        <span className={`h-3 w-3 rounded-full ring-1 ${expandedKey === day.date ? "ring-2 ring-primary" : "ring-border/30"}`} style={{ background: adherenceColor(day.pct) }} />
      </button>
    ))}</div>;
  };

  const expandedDay = period === "Y" ? null : perDay.find((day) => day.date === expandedKey);
  const expandedMonth = period === "Y" ? monthly.find((month) => month.key === expandedKey) : null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55 ring-1 ring-border/50"><Ico e={String.fromCodePoint(0x1f48a)} size={28} /></span>
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{t("Meds adherence")}</p>
            <p className="mt-0.5 whitespace-nowrap text-[10px] text-foreground" style={{ fontWeight: 700 }}>{range.title} · {period === "Y" ? range.start.getFullYear() : range.start.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <span className="pt-1 text-[10px] text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>

      {open ? <>
        <DashboardPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Meds adherence period" />

        {totalExpected > 0 ? <div className="mt-3">
          <div className="flex items-end gap-2"><span className="font-serif text-4xl leading-none" style={{ color: adherenceColor(overallPct) }}>{overallPct}%</span><span className="pb-0.5 whitespace-nowrap text-xs text-muted-foreground">{totalTaken}/{totalExpected} doses</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full" style={{ width: `${overallPct ?? 0}%`, background: adherenceColor(overallPct) }} /></div>
        </div> : <p className="mt-3 text-xs text-muted-foreground">{t("No scheduled meds in this period.")}</p>}

        <div className="mt-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{period === "Y" ? "Monthly adherence" : "Daily adherence"}</p>
          {renderDaily()}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground">{[["90–100%", "#28A85B"], ["75–89%", "#F0D33A"], ["40–74%", "#F7A21C"], ["0–39%", "#D84343"], ["n/a", INSIGHT_COLORS.oliveLight]].map(([label, color]) => <span key={label} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>)}</div>

          {expandedDay ? <div className="mt-2 rounded-xl bg-tint/35 px-3 py-2 text-[10px] ring-1 ring-border/45">
            <p className="text-foreground" style={{ fontWeight: 700 }}>{compactDate(expandedDay.date)} · {expandedDay.taken}/{expandedDay.expected} taken</p>
            {expandedDay.takenList.map((med) => <button key={`${med.key}-${med.item}`} type="button" onClick={() => toggleDose(expandedDay.date, med.key, med.item)} className="mt-1 block text-left text-[10px]" style={{ color: "#28A85B" }}>Taken · {med.time} — {med.medName}</button>)}
            {expandedDay.missed.map((med) => <button key={`${med.key}-${med.item}`} type="button" onClick={() => toggleDose(expandedDay.date, med.key, med.item)} className="mt-1 block text-left text-[10px]" style={{ color: "#D84343" }}>Missed · {med.time} — {med.medName}</button>)}
          </div> : null}
          {expandedMonth ? <div className="mt-2 rounded-xl bg-tint/35 px-3 py-2 text-[10px] ring-1 ring-border/45"><p className="text-foreground" style={{ fontWeight: 700 }}>{expandedMonth.label} {range.start.getFullYear()} · {expandedMonth.pct == null ? "n/a" : `${expandedMonth.pct}%`}</p><p className="mt-1 text-muted-foreground">{expandedMonth.taken}/{expandedMonth.expected} doses taken</p></div> : null}
        </div>

        <QuickInsights items={[
          { kind: "trend", color: "#6f8a3e", text: overallInsight },
          { kind: "moon", color: "#6f8a3e", text: strongestTime ? `${strongestTime.name} meds were the strongest` : "No strongest time yet" },
          { kind: "target", color: "#d84a43", text: needsAttention ? `${needsAttention.name} needs the most attention` : "No medication needs attention" },
        ]} />

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Per medication</p>
          <div className="divide-y divide-border/55">{perMed.map((entry) => <div key={entry.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(72px,.9fr)_50px] items-center gap-2 py-1.5">
            <p className="min-w-0 whitespace-nowrap text-[11px] text-foreground">{entry.name} <span className="text-muted-foreground">{entry.time}</span></p>
            <div className="h-1.5 overflow-hidden rounded-full bg-tint/70"><div className="h-full rounded-full" style={{ width: `${entry.pct ?? 0}%`, background: adherenceColor(entry.pct) }} /></div>
            <div className="text-right"><p className="text-xs tabular-nums text-foreground" style={{ fontWeight: 700 }}>{entry.pct == null ? "n/a" : `${entry.pct}%`}</p><p className="text-[9px] tabular-nums text-muted-foreground">{entry.taken}/{entry.expected}</p></div>
          </div>)}</div>
        </div>

        {asNeededCounts.length ? <div className="mt-2 rounded-xl bg-tint/25 px-3 py-2 ring-1 ring-border/40"><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">As needed</p><div className="mt-1 space-y-1">{asNeededCounts.map((entry) => <p key={entry.id} className="flex justify-between text-[10px] text-muted-foreground"><span>{entry.name}</span><span className="tabular-nums">{entry.count}×</span></p>)}</div></div> : null}

        <MetricCards items={[
          { label: "Best streak", value: bestStreak.length ? `${bestStreak.length} days` : "—", sub: bestStreak.length ? `${compactDate(bestStreak.start)}–${compactDate(bestStreak.end)}` : "No streak yet", kind: "flame", color: "#f07c23" },
          { label: "Strongest time", value: strongestTime?.name ?? "—", sub: strongestTime ? `${strongestTime.pct}% adherence` : "No data", kind: "moon", color: "#5f6570" },
          { label: "Needs attention", value: needsAttention?.name ?? "—", sub: needsAttention?.pct == null ? "No data" : `${needsAttention.pct}% adherence`, kind: "target", color: "#d84a43" },
        ]} />
      </> : null}
    </section>
  );
}
