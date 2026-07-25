import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Settings as SettingsIcon, Share2, Trash2, Pill, Heart, Droplets, Utensils, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import {
  useBixbo, EMPTY, toKey, fromKey, todayKey, PAIN_DESCRIPTIONS, painColor, BRISTOL, nextPredictedPeriod, daysBetween,
  type BixboData, type DayLog, type PeriodLevel, type BowelEntry, type SexEntry,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Calendar & daily overview" },
      { name: "description", content: "Track pain, panic attacks, cycle, meds, food and more — all on one calm calendar." },
      { property: "og:title", content: "BIXBO — Calendar & daily overview" },
      { property: "og:description", content: "Track pain, panic attacks, cycle, meds, food and more." },
    ],
  }),
  component: HomePage,
});

function periodLabel(p?: PeriodLevel) {
  if (!p) return null;
  return { spotting: "Spotting", light: "Light", medium: "Medium", heavy: "Heavy", veryheavy: "Very heavy" }[p];
}

function HomePage() {
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<string>(todayKey());
  const [logOpen, setLogOpen] = useState(false);
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();

  // Meds reminders + period notification
  useEffect(() => {
    if (!hydrated || !view.settings.notifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const int = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      view.meds.forEach((m) => {
        if (m.asNeeded) return;
        if (m.times.includes(hhmm)) {
          const taken = view.medLog[todayKey()]?.[`${m.id}@${hhmm}`];
          if (!taken) new Notification(`💊 ${m.name}`, { body: `Time for your ${hhmm} dose${m.dose ? ` (${m.dose})` : ""}` });
        }
      });
      // Period predict: 1 day before at 09:00
      if (hhmm === "09:00") {
        const p = nextPredictedPeriod(view.cycle);
        if (p && daysBetween(todayKey(), p.start) === 1) {
          new Notification("🫐 Period starts tomorrow", { body: "Get your supplies ready 💚" });
        }
      }
    }, 60000);
    return () => clearInterval(int);
  }, [hydrated, view.meds, view.medLog, view.cycle, view.settings.notifications]);

  const goToPrevMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const openQuick = (cat: string) => { setQuickCat(cat); setLogOpen(true); };

  return (
    <AppShell
      title="BIXBO"
      big
      right={
        <Link to="/settings" className="rounded-full p-2 hover:bg-tint" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Link>
      }
    >
      <div className="px-5 pt-1">
        <div className="flex items-center justify-between">
          <button onClick={goToPrevMonth} aria-label="Previous month" className="rounded-full p-2 hover:bg-tint">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-serif text-2xl font-bold">{monthLabel(monthAnchor)}</h2>
          <button onClick={goToNextMonth} aria-label="Next month" className="rounded-full p-2 hover:bg-tint">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-1">
        <MonthCalendar
          month={monthAnchor} data={view} selected={selected} onSelect={setSelected}
          onSwipeMonth={(delta) => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))}
        />
      </div>

      {/* Top meds row */}
      <div className="mt-4 grid grid-cols-2 gap-2 px-5">
        <MedsProgress data={view} />
        <Link to="/meds" className="flex items-center justify-center gap-2 rounded-2xl bg-surface p-3 text-sm font-medium ring-1 ring-border hover:bg-tint">
          <Pill className="h-4 w-4" /> Manage meds
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between px-5">
        <h2 className="font-serif text-xl font-bold">
          {selected === todayKey()
            ? "Today"
            : fromKey(selected).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <ShareDayButton date={selected} view={view} />
      </div>

      {/* Category badges */}
      <TodayBadges log={view.dayLogs[selected]} onQuick={openQuick} />

      <DayPreview date={selected} data={view} update={update} />

      <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2">
        <Button
          onClick={() => { setQuickCat(undefined); setLogOpen(true); }}
          className="h-14 rounded-full px-6 shadow-lg"
        >
          <Plus className="h-5 w-5" /> Log
        </Button>
      </div>

      <LogSheet open={logOpen} onOpenChange={(b) => { setLogOpen(b); if (!b) setQuickCat(undefined); }}
        date={selected} data={view} update={update} initial={quickCat as never} />
    </AppShell>
  );
}

function MedsProgress({ data }: { data: BixboData }) {
  const k = todayKey();
  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const total = scheduled.reduce((s, m) => s + m.times.length, 0);
  const taken = scheduled.reduce((s, m) => s + m.times.filter((t) => data.medLog[k]?.[`${m.id}@${t}`]).length, 0);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">
      <div>
        <p className="text-xs text-muted-foreground">Meds today</p>
        <p className="font-serif text-lg font-bold">{taken}/{total || 0}</p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
        💊
      </div>
    </div>
  );
}

function TodayBadges({ log, onQuick }: { log?: DayLog; onQuick: (cat: string) => void }) {
  const items: { key: string; cat: string; label: string; icon: React.ReactNode; color: string; count: number }[] = [
    { key: "meds",   cat: "meds",   label: "Meds",    icon: <Pill className="h-4 w-4" />,      color: "#3b82f6", count: (log?.extraMeds?.length ?? 0) },
    { key: "pain",   cat: "pain",   label: "Symptoms",icon: <Heart className="h-4 w-4" />,     color: "#ef4444", count: (log?.pain?.length ?? 0) },
    { key: "cycle",  cat: "period", label: "Cycle",   icon: <Droplets className="h-4 w-4" />,  color: "#ec4899", count: (log?.period || log?.periodInfo?.level) ? 1 : 0 },
    { key: "food",   cat: "food",   label: "Food",    icon: <Utensils className="h-4 w-4" />,  color: "#f97316", count: (log?.food?.length ?? 0) },
    { key: "panic",  cat: "panic",  label: "Panic",   icon: <Zap className="h-4 w-4" />,       color: "#a855f7", count: (log?.panic?.length ?? 0) },
  ];
  return (
    <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-5 pb-1">
      {items.map((it) => (
        <button key={it.key} onClick={() => onQuick(it.cat)}
          className="relative flex shrink-0 flex-col items-center gap-1">
          <span className="relative grid h-11 w-11 place-items-center rounded-full text-white shadow-sm"
                style={{ background: it.color, opacity: it.count > 0 ? 1 : 0.55 }}>
            {it.icon}
            {it.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {it.count}
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------- Day preview ------------------- */
function DayPreview({ date, data, update }:
  { date: string; data: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const log = data.dayLogs[date];
  const rawNotes = data.dayNotes[date] ?? [];
  const notes: { text: string; time?: string }[] = (rawNotes as (string | { text: string; time?: string })[])
    .map((n) => typeof n === "string" ? { text: n } : n);
  const todos = data.todos[date] ?? [];
  const events = data.events.filter((e) => date >= e.startDate && date <= e.endDate);
  const tasks = data.tasks.filter((t) => date >= t.startDate && date <= t.endDate);

  const k = todayKey();
  const isToday = date === k;
  const meds = data.meds;
  const takenList = data.meds
    .filter((m) => !m.asNeeded)
    .flatMap((m) => m.times.map((t) => ({ key: `${m.id}@${t}`, med: m, time: t, taken: !!data.medLog[date]?.[`${m.id}@${t}`] })))
    .filter((x) => x.taken);
  const extraMeds = log?.extraMeds ?? [];

  const anything = !!(
    log && (
      log.pain?.length || log.tetany?.length || log.panic?.length ||
      log.period || log.periodInfo?.level || log.food?.length ||
      log.bowel?.length || log.sex?.length || log.heat?.length || log.workout?.length ||
      log.temperature != null || log.weight != null || log.sleepHours != null || extraMeds.length
    )
  ) || notes.length || todos.length || events.length || tasks.length || takenList.length;

  if (!anything) return (
    <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
      <p className="text-sm text-muted-foreground">Nothing logged {isToday ? "today" : "this day"} yet.</p>
      <p className="mt-1 text-xs text-muted-foreground">Tap the <span className="font-bold">+ Log</span> button below.</p>
    </div>
  );

  return (
    <div className="space-y-3 px-5 pt-3 pb-32">
      {(takenList.length > 0 || extraMeds.length > 0) && (
        <Card title="Meds" icon="💊">
          <ul className="space-y-1 text-sm">
            {takenList.map((x) => <li key={x.key}>✓ {x.time} — {x.med.name}{x.med.dose ? ` (${x.med.dose})` : ""}</li>)}
            {extraMeds.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="flex-1">• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}{e.note ? ` — ${e.note}` : ""}</span>
                <button onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((x) => x.id !== e.id) } } }))} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {log?.pain?.length && (
        <Card title="Pain" icon="🩹">
          <ul className="space-y-2">
            {log.pain.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: painColor(p.score) }}>
                  {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}</p>
                  {p.parts.length > 0 && <p className="text-sm">{p.parts.join(", ")}</p>}
                  {p.quality.length > 0 && <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p>}
                  {p.symptoms.length > 0 && <p className="text-xs text-muted-foreground">+ {p.symptoms.join(", ")}</p>}
                  {p.mood?.length ? <p className="text-xs text-muted-foreground">Mood: {p.mood.join(", ")}</p> : null}
                  {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
                  {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
                  {p.note && <p className="mt-1 text-sm">"{p.note}"</p>}
                </div>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], pain: (d.dayLogs[date]?.pain ?? []).filter((x) => x.id !== p.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) || null}

      {log?.panic?.length ? (
        <Card title="Panic attacks" icon="⚡">
          <ul className="space-y-2">
            {log.panic.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.time} · intensity {p.intensity}/10 · {p.minutes} min</p>
                  {p.trigger && <p className="text-xs text-muted-foreground">Trigger: {p.trigger}</p>}
                  {p.physical.length > 0 && <p className="text-xs">Physical: {p.physical.join(", ")}</p>}
                  {p.cognitive.length > 0 && <p className="text-xs">Cognitive: {p.cognitive.join(", ")}</p>}
                  <p className="text-[11px] text-muted-foreground">Hyperventilation: {p.hyperventilation}{p.tetanyPresent ? " · tetany present" : ""}</p>
                  {p.helped.length > 0 && <p className="text-[11px] text-muted-foreground">Helped: {p.helped.join(", ")}</p>}
                  {p.note && <p className="mt-1 text-sm">"{p.note}"</p>}
                </div>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.tetany?.length ? (
        <Card title="Tetany" icon="⚡">
          <ul className="space-y-1 text-sm">
            {log.tetany.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <span className="flex-1">{t.time} · {t.types.join(", ")} · {t.intensity}/5 · {t.minutes}min{t.triggers.length ? ` — ${t.triggers.join(", ")}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== t.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.period || log?.periodInfo?.level) && (
        <Card title="Blueberry 🫐" icon="🫐">
          <p className="text-sm">Flow: {periodLabel(log?.periodInfo?.level ?? log?.period)}</p>
          {log?.periodInfo?.discharge && <p className="text-xs text-muted-foreground">Discharge: {log.periodInfo.discharge}{log.periodInfo.dischargeNote ? ` — ${log.periodInfo.dischargeNote}` : ""}</p>}
          {log?.periodInfo?.note && <p className="mt-1 text-sm">"{log.periodInfo.note}"</p>}
        </Card>
      )}

      {log?.sex?.length ? (
        <Card title="ŠukŠuk! ❤️" icon="❤️">
          <ul className="space-y-1 text-sm">
            {log.sex.map((s: SexEntry) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="flex-1">{s.time} · {String(s.kind).replace(/_/g, " ")}{s.feelingAfter ? ` · ${s.feelingAfter}` : ""}{s.painful && s.painful !== "no" ? ` · painful ${s.painful}` : ""}{s.note ? ` — ${s.note}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== s.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.heat?.length ? (
        <Card title="Heat / Cold / TENS" icon="🔥">
          <ul className="space-y-1 text-sm">
            {log.heat.map((h) => (
              <li key={h.id} className="flex items-start gap-2">
                <span className="flex-1">{h.kind === "heat" ? "🔥" : h.kind === "cold" ? "🧊" : "⚡"} {h.start} · {h.minutes} min{h.note ? ` — ${h.note}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], heat: (d.dayLogs[date]?.heat ?? []).filter((x) => x.id !== h.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.food?.length ? (
        <Card title="Food" icon="🍽️">
          <ul className="space-y-1 text-sm">
            {log.food.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="flex-1">{f.time} · {f.what}{f.feelings.length ? ` — ${f.feelings.join(", ")}` : ""}{f.hydrationMl != null ? ` · 💧 ${f.hydrationMl}ml` : ""}{f.caffeineMg != null ? ` · ☕ ${f.caffeineMg}mg` : ""}{f.alcoholDrinks != null ? ` · 🍷 ${f.alcoholDrinks}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], food: (d.dayLogs[date]?.food ?? []).filter((x) => x.id !== f.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.bowel?.length ? (
        <Card title="Bowel" icon="💩">
          <ul className="space-y-1 text-sm">
            {log.bowel.map((b: BowelEntry) => {
              const bristol = b.bristol === 0 ? null : BRISTOL.find((x) => x.n === b.bristol);
              return (
                <li key={b.id} className="flex items-start gap-2">
                  <span className="flex-1">{b.time} · {bristol ? `Type ${bristol.n} — ${bristol.sub}` : "No bowel movement"}{b.note ? ` — ${b.note}` : ""}</span>
                  <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], bowel: (d.dayLogs[date]?.bowel ?? []).filter((x) => x.id !== b.id) } } }))} />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {log?.workout?.length ? (
        <Card title="Workout" icon="🧘🏼‍♀️">
          <ul className="space-y-1 text-sm">
            {log.workout.map((w) => (
              <li key={w.id} className="flex items-start gap-2">
                <span className="flex-1">{w.time} · {w.kind} · {w.minutes} min{w.feeling ? ` — ${w.feeling}` : ""}{w.note ? ` — ${w.note}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], workout: (d.dayLogs[date]?.workout ?? []).filter((x) => x.id !== w.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (
        <Card title="Temp / Sleep / Weight" icon="🌡️">
          {log?.temperature != null && <p className="text-sm">Temperature: {log.temperature}°C</p>}
          {log?.weight != null && <p className="text-sm">Weight: {log.weight} kg</p>}
          {log?.sleepHours != null && <p className="text-sm">Sleep: {log.sleepHours} h {log.sleepQuality ?? ""}</p>}
          {log?.sleepQuality && log?.sleepHours == null && <p className="text-sm">Sleep quality: {log.sleepQuality}</p>}
        </Card>
      )}

      {tasks.length > 0 && (
        <Card title="Tasks" icon="✅">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={() => update((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x) }))} />
                <span className={`flex-1 ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}{t.time ? ` · ${t.time}${t.timeEnd ? `–${t.timeEnd}` : ""}` : ""}{t.note ? ` — ${t.note}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {events.length > 0 && (
        <Card title="Events" icon="📅">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                <span className="flex-1">{e.title}{e.time ? ` · ${e.time}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}{e.startDate !== e.endDate ? ` (${e.startDate}→${e.endDate})` : ""}{e.note ? ` — ${e.note}` : ""}</span>
                <DeleteBtn onClick={() => update((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {notes.length > 0 && (
        <Card title="Notes" icon="📝">
          <ul className="space-y-1 text-sm">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-1">{n.time ? `${n.time} · ` : ""}{n.text}</span>
                <button onClick={() => update((d) => {
                  const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
                  const next = list.filter((_, j) => j !== i);
                  return { ...d, dayNotes: { ...d.dayNotes, [date]: next as { text: string; time?: string }[] } };
                })} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden>{icon}</span>
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const lines: string[] = [
      `BIXBO — ${fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`,
    ];
    if (log.pain?.length) {
      lines.push("");
      lines.push("Pain:");
      for (const p of log.pain) lines.push(`  • ${p.time} · ${p.score}/10 (${PAIN_DESCRIPTIONS[Math.round(p.score)]})${p.parts.length ? ` — ${p.parts.join(", ")}` : ""}${p.quality.length ? ` [${p.quality.join(", ")}]` : ""}`);
    }
    if (log.panic?.length) {
      lines.push("");
      lines.push("Panic attacks:");
      for (const p of log.panic) lines.push(`  • ${p.time} · ${p.intensity}/10 · ${p.minutes}min${p.trigger ? ` — ${p.trigger}` : ""}`);
    }
    if (log.periodInfo?.level || log.period) lines.push("", `Period: ${periodLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null) lines.push(`Sleep: ${log.sleepHours}h ${log.sleepQuality ?? ""}`);
    const text = lines.join("\n");
    if (navigator.share) { try { await navigator.share({ title: "How I feel today", text }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); alert("Copied to clipboard"); } catch { alert(text); }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> Share day
    </Button>
  );
}
