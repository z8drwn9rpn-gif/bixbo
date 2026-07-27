import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, todayKey, daysBetween, addDays, fromKey, painColor, PAIN_DESCRIPTIONS, predictPeriods, nextPredictedPeriod, avgDayPain, type PainEntry, type PanicAttack, type TetanyEpisode, type ExtraMed, type Med, type PartnerData, type DayNote } from "@/lib/storage";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Couple — BIXBO" },
      { name: "description", content: "Compare pain, tetany, panic and meds with your partner." },
      { property: "og:title", content: "Couple — BIXBO" },
      { property: "og:description", content: "Compare pain, tetany, panic and meds with your partner." },
    ],
  }),
  component: CouplePage,
});

function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No pain entries yet.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((p) => (
          <li key={`${p.dateKey}-${p.id}`} className="flex items-start gap-3 rounded-2xl bg-tint p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: painColor(p.score) }}>
              {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{p.dateKey} · {p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}</p>
              {p.parts?.length ? <p className="text-sm">{p.parts.join(", ")}</p> : null}
              {p.quality?.length ? <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p> : null}
              {p.symptoms?.length ? <p className="text-xs text-muted-foreground">+ {p.symptoms.join(", ")}</p> : null}
              {p.hotFlashes != null ? <p className="text-xs text-muted-foreground">🥵 Hot flashes {p.hotFlashes}/5</p> : null}
              {p.mood?.length ? <p className="text-xs text-muted-foreground">Mood: {p.mood.join(", ")}</p> : null}
              {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
              {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
              {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TetanyList({ title, entries }: { title: string; entries: (TetanyEpisode & { dateKey: string })[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((t) => (
          <li key={`${t.dateKey}-${t.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">{t.dateKey} · {t.time} · intensity {t.intensity}/5 · {t.minutes == null ? "ongoing" : `${t.minutes} min`}</p>
            {t.types?.length ? <p>{t.types.join(", ")}</p> : null}
            {t.location?.length ? <p className="text-xs text-muted-foreground">Location: {t.location.join(", ")}</p> : null}
            {t.triggers?.length ? <p className="text-xs text-muted-foreground">Triggers: {t.triggers.join(", ")}</p> : null}
            {t.helped?.length ? <p className="text-xs text-muted-foreground">Helped: {t.helped.join(", ")}</p> : null}
            {t.note && <p className="mt-1 whitespace-pre-line">"{t.note}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanicList({ title, entries }: { title: string; entries: (PanicAttack & { dateKey: string })[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((p) => (
          <li key={`${p.dateKey}-${p.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">{p.dateKey} · {p.time} · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}</p>
            {p.trigger && <p>Trigger: {p.trigger}</p>}
            {p.physical?.length ? <p className="text-xs text-muted-foreground">Physical: {p.physical.join(", ")}</p> : null}
            {p.cognitive?.length ? <p className="text-xs text-muted-foreground">Cognitive: {p.cognitive.join(", ")}</p> : null}
            {p.helped?.length ? <p className="text-xs text-muted-foreground">Helped: {p.helped.join(", ")}</p> : null}
            {p.note && <p className="mt-1 whitespace-pre-line">"{p.note}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedsList({ title, days }: {
  title: string;
  days: { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] }[];
}) {
  const nonEmpty = days.filter((d) => d.extra.length || d.meds.some((m) => !m.asNeeded && m.times.some((t) => d.medLog[`${m.id}@${t}`])));
  if (!nonEmpty.length) return <p className="text-xs text-muted-foreground">No meds logged yet.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {nonEmpty.slice(0, 14).map((d) => (
          <li key={d.dateKey} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">{d.dateKey}</p>
            {d.meds.map((m) => m.asNeeded ? null : m.times.filter((t) => d.medLog[`${m.id}@${t}`]).map((t) => (
              <p key={`${m.id}@${t}`}>✓ {t} — {m.name}{m.dose ? ` (${m.dose})` : ""}</p>
            )))}
            {d.extra.map((e) => (
              <p key={e.id}>• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}{e.note ? ` — ${e.note}` : ""}</p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayNotesList({ title, notes }: { title: string; notes: { dateKey: string; text: string; time?: string }[] }) {
  if (!notes.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {notes.map((n, i) => (
          <li key={`${n.dateKey}-${n.time ?? i}-${i}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">{n.dateKey}{n.time ? ` · ${n.time}` : ""}</p>
            <p className="mt-1 whitespace-pre-line">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CouplePainChart({ days, mine, theirs, partnerName }: {
  days: string[];
  mine: Record<string, { pain?: PainEntry[] }>;
  theirs: Record<string, { pain?: PainEntry[] }>;
  partnerName: string;
}) {
  const yLabels = [10, 8, 6, 4, 2, 0];
  const height = 118;
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Pain — last 14 days</p>
      <div className="mt-4 flex gap-1.5">
        <div className="flex flex-col justify-between pr-1 text-[9px] text-muted-foreground" style={{ height }}>
          {yLabels.map((y) => <span key={y} className="leading-none">{y}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((y) => <div key={y} className="border-t border-dashed border-border/50" />)}
          </div>
          <div className="relative grid items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height }}>
            {days.map((k) => {
              const myAvg = avgDayPain(mine[k]);
              const theirAvg = avgDayPain(theirs[k]);
              return (
                <div key={k} className="flex h-full items-end justify-center gap-[1px]">
                  {myAvg != null ? (
                    <div className="w-[45%] rounded-t" style={{ height: `${Math.max(4, (myAvg / 10) * 100)}%`, background: painColor(myAvg) }} title={`Me ${k}: ${myAvg.toFixed(1)}`} />
                  ) : <div className="w-[45%]" />}
                  {theirAvg != null ? (
                    <div className="w-[45%] rounded-t opacity-70 ring-1 ring-foreground/30" style={{ height: `${Math.max(4, (theirAvg / 10) * 100)}%`, background: painColor(theirAvg) }} title={`${partnerName} ${k}: ${theirAvg.toFixed(1)}`} />
                  ) : <div className="w-[45%]" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-4">
        <div className="grid flex-1 gap-[2px] text-center text-[8px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((k) => {
            const d = fromKey(k);
            const wd = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
            return <div key={k} className="leading-tight"><div>{wd}</div><div className="text-[7px] opacity-70">{d.getDate()}</div></div>;
          })}
        </div>
      </div>
      <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary" /> Me</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary opacity-70 ring-1 ring-foreground/30" /> {partnerName}</span>
      </div>
    </section>
  );
}

const PERIOD_COLORS: Record<string, string> = {
  spotting: "#F9C6D7", light: "#F19FBB", medium: "#D96B94", heavy: "#B33B6C", veryheavy: "#7A1F45",
};

function BlueberrySection({ partner }: { partner: PartnerData }) {
  const cycle = partner.cycle;
  if (!cycle?.lastPeriodStart) {
    // still show logged period days if any
    const anyPeriod = Object.entries(partner.dayLogs).some(([, l]) => l.period || l.periodInfo?.level);
    if (!anyPeriod) return null;
  }
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeStart = new Date(monthStart); rangeStart.setDate(rangeStart.getDate() - 14);
  const rangeEnd = new Date(monthStart); rangeEnd.setMonth(rangeEnd.getMonth() + 2); rangeEnd.setDate(0);
  const predicted = cycle ? predictPeriods(cycle, rangeStart, rangeEnd) : [];
  const next = cycle ? nextPredictedPeriod(cycle) : null;

  // Build 6-week grid starting Monday, covering current month
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - dow);
  const cells: { key: string; inMonth: boolean; date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ key, inMonth: d.getMonth() === today.getMonth(), date: d });
  }
  const todayK = todayKey();
  const isPredicted = (k: string) => predicted.some((p) => k >= p.start && k <= p.end);
  const isLogged = (k: string) => {
    const l = partner.dayLogs[k]; return !!(l?.period || l?.periodInfo?.level);
  };
  const loggedLevel = (k: string): string | null => {
    const l = partner.dayLogs[k]; const lvl = l?.periodInfo?.level || l?.period; return lvl || null;
  };
  const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Local notification when partner's period is approaching (3 days or less)
  useEffect(() => {
    if (!next || typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const daysUntil = daysBetween(todayKey(), next.start);
    if (daysUntil < 0 || daysUntil > 3) return;
    const notifyKey = `bixbo:partner-period-notified:${next.start}`;
    if (localStorage.getItem(notifyKey)) return;
    const fire = () => {
      const body =
        daysUntil === 0 ? `${partner.name || "Your partner"}'s period is predicted to start today.` :
        daysUntil === 1 ? `${partner.name || "Your partner"}'s period is predicted to start tomorrow.` :
        `${partner.name || "Your partner"}'s period is predicted in ${daysUntil} days (${next.start}).`;
      try {
        new Notification("🫐 Blueberry reminder", { body, icon: "/favicon.svg" });
        localStorage.setItem(notifyKey, "1");
      } catch { /* ignore */ }
    };
    if (Notification.permission === "granted") fire();
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => { if (p === "granted") fire(); });
    }
  }, [next?.start, partner.name]);


  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
      <h3 className="font-serif text-lg font-semibold">🫐 {partner.name || "Partner"} — Blueberry</h3>
      {next && (() => {
        const daysUntil = daysBetween(todayKey(), next.start);
        const label =
          daysUntil < 0 ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} late` :
          daysUntil === 0 ? "today" :
          daysUntil === 1 ? "tomorrow" :
          `in ${daysUntil} days`;
        return (
          <div className="rounded-2xl bg-tint p-3 text-sm space-y-1">
            <p>
              🩸 Next period: <span className="font-semibold">{next.start}</span> ({label})
            </p>
            <p className="text-xs text-muted-foreground">
              Predicted window: {next.start} → {next.end}
            </p>
          </div>
        );
      })()}
      {cycle && (
        <p className="text-xs text-muted-foreground">Cycle {cycle.cycleLength}d · period {cycle.periodLength}d</p>
      )}
      <div className="rounded-2xl bg-tint p-3">
        <p className="text-center text-xs font-medium mb-2">{monthName}</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
          {["M","T","W","T","F","S","S"].map((d,i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            const logged = loggedLevel(c.key);
            const pred = isPredicted(c.key) && !logged;
            const bg = logged ? PERIOD_COLORS[logged] || "#D96B94" : undefined;
            return (
              <div key={c.key}
                className={`aspect-square grid place-items-center rounded-full text-[10px] ${c.inMonth ? "" : "opacity-30"} ${c.key === todayK ? "ring-2 ring-primary" : ""}`}
                style={{
                  background: bg,
                  color: logged ? "white" : undefined,
                  border: pred ? "1.5px dashed #D96B94" : undefined,
                }}
                title={logged ? `Period: ${logged}` : pred ? "Predicted period" : ""}>
                {c.date.getDate()}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D96B94" }} /> Logged</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: "#D96B94" }} /> Predicted</span>
        </div>
      </div>
    </section>
  );
}

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;
  // (previous 14-day window removed — everything now filters to current month)

  // Only show entries from the current month
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inThisMonth = (k: string) => k.startsWith(monthPrefix);

  const collectPain = (dayLogs: Record<string, { pain?: PainEntry[] }>) => {
    const out: (PainEntry & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) { if (!inThisMonth(k)) continue; for (const p of l?.pain ?? []) out.push({ ...p, dateKey: k }); }
    return out.sort((a, b) => (b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey))).slice(0, 30);
  };
  const collectTetany = (dayLogs: Record<string, { tetany?: TetanyEpisode[] }>) => {
    const out: (TetanyEpisode & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) { if (!inThisMonth(k)) continue; for (const t of l?.tetany ?? []) out.push({ ...t, dateKey: k }); }
    return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectPanic = (dayLogs: Record<string, { panic?: PanicAttack[] }>) => {
    const out: (PanicAttack & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) { if (!inThisMonth(k)) continue; for (const p of l?.panic ?? []) out.push({ ...p, dateKey: k }); }
    return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectMedDays = (meds: Med[], medLog: Record<string, Record<string, boolean>>, dayLogs: Record<string, { extraMeds?: ExtraMed[] }>) => {
    const keys = new Set<string>([
      ...Object.keys(medLog ?? {}).filter(inThisMonth),
      ...Object.keys(dayLogs ?? {}).filter(inThisMonth),
    ]);
    return Array.from(keys).sort((a, b) => b.localeCompare(a)).map((k) => ({
      dateKey: k, meds, medLog: medLog[k] ?? {}, extra: dayLogs[k]?.extraMeds ?? [],
    }));
  };
  const collectNotes = (dayNotes: Record<string, DayNote[] | string[] | undefined>) => {
    const out: { dateKey: string; text: string; time?: string }[] = [];
    for (const [k, raw] of Object.entries(dayNotes ?? {})) {
      if (!inThisMonth(k)) continue;
      for (const n of raw ?? []) {
        if (typeof n === "string") out.push({ dateKey: k, text: n });
        else if (n.text?.trim()) out.push({ dateKey: k, text: n.text, time: n.time });
      }
    }
    return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  };


  const myPain = collectPain(view.dayLogs);
  const myTetany = collectTetany(view.dayLogs);
  const myPanic = collectPanic(view.dayLogs);
  const myMeds = collectMedDays(view.meds, view.medLog, view.dayLogs);
  const myNotes = collectNotes(view.dayNotes);

  const partnerPain = partner ? collectPain(partner.dayLogs) : [];
  const partnerTetany = partner ? collectTetany(partner.dayLogs) : [];
  const partnerPanic = partner ? collectPanic(partner.dayLogs) : [];
  const partnerMeds = partner ? collectMedDays(partner.meds ?? [], partner.medLog ?? {}, partner.dayLogs) : [];
  const partnerNotes = partner ? collectNotes(partner.dayNotes ?? {}) : [];
  const chartDays = Array.from({ length: 14 }, (_, i) => addDays(todayKey(), i - 13)).filter(inThisMonth);

  return (
    <AppShell title="Couple">
      <div className="space-y-4 px-5 pt-4 pb-24">
        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm">No partner linked yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">In Settings → Couple sharing, exchange pairing codes with your partner to see each other's logs.</p>
            <Link to="/settings" className="mt-3 inline-block text-primary underline text-sm">Open Settings</Link>
          </div>
        ) : (
          <>
            <CouplePainChart days={chartDays} mine={view.dayLogs} theirs={partner.dayLogs} partnerName={partner.name || "Partner"} />

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">🔥 {partner.name || "Partner"} — pain</h3>
              <PainList title="Recent" entries={partnerPain} />
              <DayNotesList title="Day notes" notes={partnerNotes} />
            </section>

            {(partnerTetany.length > 0 || partnerPanic.length > 0) && (
              <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
                <h3 className="font-serif text-lg font-semibold">⚡ {partner.name || "Partner"} — episodes</h3>
                <TetanyList title="Tetany" entries={partnerTetany} />
                <PanicList title="Panic attacks" entries={partnerPanic} />
              </section>
            )}

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">💊 {partner.name || "Partner"} — meds</h3>
              <MedsList title="Recent days" days={partnerMeds} />
            </section>

            {partner.gender !== "male" && <BlueberrySection partner={partner} />}



            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">🔥 My pain</h3>
              <PainList title="Recent" entries={myPain} />
              <DayNotesList title="Day notes" notes={myNotes} />
            </section>

            {(myTetany.length > 0 || myPanic.length > 0) && (
              <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
                <h3 className="font-serif text-lg font-semibold">⚡ My episodes</h3>
                <TetanyList title="Tetany" entries={myTetany} />
                <PanicList title="Panic attacks" entries={myPanic} />
              </section>
            )}

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">💊 My meds</h3>
              <MedsList title="Recent days" days={myMeds} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
