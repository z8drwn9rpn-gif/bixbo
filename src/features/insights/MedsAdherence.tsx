import { useEffect, useMemo, useState } from "react";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, medScheduleItems, toKey, useBixbo } from "@/lib/storage";
import { resolveScheduledDose } from "@/lib/domain/meds";
import { INSIGHT_COLORS, InsightPeriodControl, MON_SHORT3, type Period } from "./shared";

export function MedsAdherence({ data, period, anchor, onPeriodChange, onPeriodShift }: {
  data: ReturnType<typeof useBixbo>["data"];
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const { update } = useBixbo();
  const [open, setOpen] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => setExpandedKey(null), [period, anchor]);

  const scheduled = data.meds.filter((med) => !med.asNeeded);
  const asNeeded = data.meds.filter((med) => med.asNeeded);

  const range = useMemo(() => {
    const base = new Date(anchor);
    base.setHours(0, 0, 0, 0);
    if (period === "W") {
      const mondayOffset = (base.getDay() + 6) % 7;
      const start = new Date(base); start.setDate(base.getDate() - mondayOffset);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start, end, label: `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, title: "Week" };
    }
    if (period === "M") {
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return { start, end, label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), title: "Month" };
    }
    const start = new Date(base.getFullYear(), 0, 1);
    const end = new Date(base.getFullYear(), 11, 31);
    return { start, end, label: `1 Jan – 31 Dec ${base.getFullYear()}`, title: "Year" };
  }, [anchor, period]);

  const days = useMemo(() => {
    const out: string[] = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) { out.push(toKey(cursor)); cursor.setDate(cursor.getDate() + 1); }
    return out;
  }, [range.end, range.start]);

  const adherenceMinuteKey = Math.floor(Date.now() / 60_000);
  const perDay = useMemo(() => {
    const adherenceNow = new Date(adherenceMinuteKey * 60_000);
    return days.map((date) => {
    const missed: { medName: string; time: string; key: string; item: string }[] = [];
    const takenList: { medName: string; time: string; key: string; item: string }[] = [];
    let expected = 0; let taken = 0;
    scheduled.forEach((med) => med.times.forEach((time) => {
      const state = resolveScheduledDose(med, date, time, data.medLog, data.medLogItems ?? {}, adherenceNow);
      if (!state.eligible) return;
      expected += state.allItems.length;
      taken += state.selectedItems.length;
      state.selectedItems.forEach((item) => takenList.push({ medName: item, time, key: state.key, item }));
      state.missedItems.forEach((item) => missed.push({ medName: item, time, key: state.key, item }));
    }));
    return { date, expected, taken, missed, takenList, pct: expected ? Math.round((taken / expected) * 100) : null };
    });
  }, [adherenceMinuteKey, data.medLog, data.medLogItems, days, scheduled]);

  const totalExpected = perDay.reduce((sum, day) => sum + day.expected, 0);
  const totalTaken = perDay.reduce((sum, day) => sum + day.taken, 0);
  const overallPct = totalExpected ? Math.round((totalTaken / totalExpected) * 100) : null;
  const adherenceColor = (pct: number | null): string => pct == null ? INSIGHT_COLORS.oliveLight : pct >= 90 ? "#28A85B" : pct >= 75 ? "#F0D33A" : pct >= 40 ? "#F7A21C" : "#D84343";

  const perMed = useMemo(() => {
    const adherenceNow = new Date(adherenceMinuteKey * 60_000);
    return scheduled.flatMap((med) => med.times.flatMap((time) => medScheduleItems(med).map((item) => {
    let expected = 0; let taken = 0;
    days.forEach((date) => {
      const state = resolveScheduledDose(med, date, time, data.medLog, data.medLogItems ?? {}, adherenceNow);
      if (!state.eligible) return;
      expected += 1; if (state.selectedItems.includes(item)) taken += 1;
    });
    return { id: `${med.id}@${time}@${item}`, name: item, dose: med.dose, time, taken, expected, pct: expected ? Math.round((taken / expected) * 100) : null };
    }))).filter((entry) => entry.expected > 0).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  }, [adherenceMinuteKey, data.medLog, data.medLogItems, days, scheduled]);

  const asNeededCounts = useMemo(() => asNeeded.map((med) => {
    let count = 0;
    days.forEach((date) => { const log = data.medLog[date] ?? {}; Object.keys(log).forEach((key) => { if (log[key] && (key === `${med.id}@asNeeded` || key.startsWith(`${med.id}@`))) count += 1; }); });
    return { id: med.id, name: med.name, count };
  }), [asNeeded, data.medLog, days]);

  const knownIds = useMemo(() => new Set(data.meds.map((med) => med.id)), [data.meds]);
  const removedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    days.forEach((date) => Object.entries(data.medLog[date] ?? {}).forEach(([key, value]) => {
      if (!value) return; const id = key.split("@")[0]; if (knownIds.has(id)) return; counts[id] = (counts[id] ?? 0) + 1;
    }));
    return Object.entries(counts).map(([id, count]) => ({ id, count, name: data.medNames?.[id] ?? "Removed medication" }));
  }, [data.medLog, data.medNames, days, knownIds]);

  const toggleDose = (dayKey: string, medKey: string, item?: string) => update((current) => {
    const day = { ...(current.medLog[dayKey] ?? {}) };
    const dayItems = { ...(current.medLogItems?.[dayKey] ?? {}) };
    if (!item) {
      if (day[medKey]) { delete day[medKey]; delete dayItems[medKey]; } else day[medKey] = true;
    } else {
      const [medId] = medKey.split("@");
      const med = current.meds.find((entry) => entry.id === medId);
      const allItems = med ? medScheduleItems(med) : [item];
      const existing = dayItems[medKey] ?? (day[medKey] ? allItems : []);
      const next = new Set(existing.filter((name) => allItems.includes(name)));
      if (next.has(item)) next.delete(item); else next.add(item);
      const selected = allItems.filter((name) => next.has(name));
      if (selected.length) { day[medKey] = true; dayItems[medKey] = selected; } else { delete day[medKey]; delete dayItems[medKey]; }
    }
    return { ...current, medLog: { ...current.medLog, [dayKey]: day }, medLogItems: { ...(current.medLogItems ?? {}), [dayKey]: dayItems } };
  });

  const fmtDay = (date: string) => fromKey(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const monthly = useMemo(() => period !== "Y" ? [] : Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDays = perDay.filter((day) => fromKey(day.date).getMonth() === monthIndex);
    const expected = monthDays.reduce((sum, day) => sum + day.expected, 0);
    const taken = monthDays.reduce((sum, day) => sum + day.taken, 0);
    return { key: `${range.start.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`, label: MON_SHORT3[monthIndex], expected, taken, pct: expected ? Math.round((taken / expected) * 100) : null };
  }), [perDay, period, range.start]);
  const bestMonth = period === "Y" ? monthly.filter((m) => m.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0] : undefined;
  const worstMonth = period === "Y" ? monthly.filter((m) => m.pct != null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0] : undefined;

  if (data.meds.length === 0 && removedCounts.length === 0) return null;

  return <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 flex-1 items-start justify-between text-left">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Meds adherence")}</p><p className="mt-1 truncate text-[11px] font-medium text-foreground">{range.title} · {range.label}</p></div>
        <span className="ml-2 shrink-0 pt-0.5 text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      <InsightPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Meds adherence period" />
    </div>
    {open && <>
      {totalExpected > 0 ? <div className="mt-4"><div className="flex items-end gap-2"><span className="font-serif text-5xl leading-none" style={{ color: adherenceColor(overallPct) }}>{overallPct}%</span><span className="pb-1 text-sm text-muted-foreground">{totalTaken}/{totalExpected} doses</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${overallPct ?? 0}%`, background: adherenceColor(overallPct) }} /></div></div> : <p className="mt-4 text-sm text-muted-foreground">{t("No scheduled meds in this period.")}</p>}
      <div className="mt-5"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{period === "Y" ? "Monthly adherence" : "Daily adherence"}</p>
        {period === "Y" ? <div className="grid grid-cols-6 gap-2">{monthly.map((month) => <button key={month.key} type="button" onClick={() => setExpandedKey(expandedKey === month.key ? null : month.key)} className={`rounded-xl p-2 text-center ring-1 transition ${expandedKey === month.key ? "ring-primary" : "ring-border/70"}`} style={{ background: adherenceColor(month.pct) }}><span className="block text-[10px] font-semibold text-black/75">{month.label}</span><span className="mt-0.5 block text-[10px] font-bold text-black/80">{month.pct == null ? "n/a" : `${month.pct}%`}</span></button>)}</div>
        : <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{perDay.map((day) => <button key={day.date} type="button" onClick={() => setExpandedKey(expandedKey === day.date ? null : day.date)} title={`${fmtDay(day.date)} — ${day.taken}/${day.expected}`} aria-label={`${fmtDay(day.date)} — ${day.taken}/${day.expected} doses`} className={`aspect-square min-h-7 min-w-0 rounded-lg ring-1 transition ${expandedKey === day.date ? "ring-2 ring-primary" : "ring-border/30"}`} style={{ background: adherenceColor(day.pct) }} />)}</div>}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">{[{ label: "90–100%", color: "#28A85B" }, { label: "75–89%", color: "#F0D33A" }, { label: "40–74%", color: "#F7A21C" }, { label: "0–39%", color: "#D84343" }, { label: "n/a", color: INSIGHT_COLORS.oliveLight }].map((item) => <span key={item.label} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded" style={{ background: item.color }} />{t(item.label)}</span>)}</div>
        {expandedKey && (period === "Y" ? (() => { const month = monthly.find((item) => item.key === expandedKey); if (!month) return null; return <div className="mt-3 rounded-2xl bg-tint p-3 text-xs"><p className="font-medium">{month.label} {range.start.getFullYear()} · {month.pct == null ? "n/a" : `${month.pct}%`}</p><p className="mt-1 text-muted-foreground">{month.taken}/{month.expected} doses taken</p></div>; })() : (() => { const day = perDay.find((item) => item.date === expandedKey); if (!day) return null; return <div className="mt-3 rounded-2xl bg-tint p-3 text-xs" role="status" aria-live="polite"><p className="font-medium">{fmtDay(day.date)} — {day.taken}/{day.expected} taken</p>{day.takenList.length > 0 && <ul className="mt-1 space-y-0.5">{day.takenList.map((med) => <li key={`${med.key}-${med.item}`}><button type="button" onClick={() => toggleDose(day.date, med.key, med.item)} className="text-left hover:underline" style={{ color: "#28A85B" }}>Taken · {med.time} — {med.medName}<span className="text-[10px] text-muted-foreground"> · {t("tap to uncheck")}</span></button></li>)}</ul>}{day.missed.length > 0 ? <ul className="mt-1 space-y-0.5 text-muted-foreground">{day.missed.map((med) => <li key={`${med.key}-${med.item}`}><button type="button" onClick={() => toggleDose(day.date, med.key, med.item)} className="text-left hover:underline">Missed · {med.time} — {med.medName}<span className="text-[10px]"> · {t("tap to mark taken")}</span></button></li>)}</ul> : day.expected > 0 ? <p className="mt-1 flex items-center gap-1 text-muted-foreground">All doses taken <Ico e="💚" size={13} /></p> : null}</div>; })())}
      </div>
      {period === "Y" && (bestMonth || worstMonth) && <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-tint p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Best month")}</p><p className="mt-1 text-sm font-semibold">{bestMonth?.label ?? "—"} · {bestMonth?.pct ?? "—"}%</p></div><div className="rounded-2xl bg-tint p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Lowest month")}</p><p className="mt-1 text-sm font-semibold">{worstMonth?.label ?? "—"} · {worstMonth?.pct ?? "—"}%</p></div></div>}
      {perMed.length > 0 && <div className="mt-5"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("Per medication")}</p><ul className="space-y-3">{perMed.map((med) => { const color = adherenceColor(med.pct); return <li key={med.id} className="flex items-center gap-2 text-xs"><span className="w-32 shrink-0 truncate">{med.name}<span className="text-muted-foreground"> {med.time}</span></span><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${med.pct ?? 0}%`, background: color }} /></div><span className="w-14 shrink-0 text-right tabular-nums">{med.pct ?? 0}%<span className="block text-[10px] text-muted-foreground">{med.taken}/{med.expected}</span></span></li>; })}</ul></div>}
      {asNeededCounts.length > 0 && <div className="mt-5"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("As-needed (frequency)")}</p><ul className="space-y-1 text-xs">{asNeededCounts.map((med) => <li key={med.id} className="flex justify-between gap-3"><span>{med.name}</span><span className="text-muted-foreground">{med.count}× in this {range.title.toLowerCase()}</span></li>)}</ul></div>}
      {removedCounts.length > 0 && <div className="mt-5"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("Discontinued meds (history)")}</p><ul className="space-y-1 text-xs">{removedCounts.map((med) => <li key={med.id} className="flex justify-between gap-3"><span>{med.name}</span><span className="text-muted-foreground">{med.count} doses in this {range.title.toLowerCase()}</span></li>)}</ul></div>}
    </>}
  </section>;
}
