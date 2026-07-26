import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Settings as SettingsIcon, Share2, Trash2, Pill } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import {
  useBixbo, EMPTY, toKey, fromKey, todayKey, PAIN_DESCRIPTIONS, painColor, BRISTOL, nextPredictedPeriod, daysBetween, asArr,
  type BixboData, type PeriodLevel, type BowelEntry, type SexEntry,
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
  const [editEntry, setEditEntry] = useState<unknown>(undefined);
  const openEdit = (cat: string, entry: unknown) => { setQuickCat(cat); setEditEntry(entry); setEditPain(undefined); setLogOpen(true); };

  // Meds reminders + period notification
  useEffect(() => {
    if (!hydrated || !view.settings.notifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const isMale = view.settings.gender === "male";
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
      // Period predict: 1 day before at 09:00 (skip in male mode)
      if (!isMale && hhmm === "09:00") {
        const p = nextPredictedPeriod(view.cycle);
        if (p && daysBetween(todayKey(), p.start) === 1) {
          new Notification("🫐 Period starts tomorrow", { body: "Get your supplies ready 💚" });
        }
      }
    }, 60000);
    return () => clearInterval(int);
  }, [hydrated, view.meds, view.medLog, view.cycle, view.settings.notifications, view.settings.gender]);

  const goToPrevMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  

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

      {view.settings.gender !== "male" && (() => {
        const p = nextPredictedPeriod(view.cycle);
        if (!p) return null;
        const fmt = (k: string) => fromKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        return (
          <div className="mx-5 mt-3 rounded-full bg-tint px-4 py-2 text-center text-xs text-muted-foreground ring-1 ring-border">
            Next period predicted: <span className="font-semibold text-foreground">{fmt(p.start)} – {fmt(p.end)}</span>
          </div>
        );
      })()}

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


      <DayPreview date={selected} data={view} update={update}
        onEditPain={(p) => { setEditPain(p); setEditEntry(undefined); setQuickCat("pain"); setLogOpen(true); }}
        onEdit={openEdit} />

      <QuickTags
        update={update}
        onLongPress={(cat) => {
          const map: Record<string, string | undefined> = {
            pain: "pain", tetany: "tetany", panic: "panic",
            mood: "pain", energy: "pain", histamine: "pain",
          };
          const target = map[cat];
          if (target) { setQuickCat(target); setEditPain(undefined); setEditEntry(undefined); setLogOpen(true); }
        }}
      />

      <div className="fixed bottom-24 right-5 z-30">
        <Button
          onClick={() => { setQuickCat(undefined); setEditPain(undefined); setEditEntry(undefined); setLogOpen(true); }}
          className="h-14 rounded-full px-6 shadow-lg"
        >
          <Plus className="h-5 w-5" /> Log
        </Button>
      </div>

      <LogSheet open={logOpen} onOpenChange={(b) => { setLogOpen(b); if (!b) { setQuickCat(undefined); setEditPain(undefined); setEditEntry(undefined); } }}
        date={selected} data={view} update={update} initial={quickCat as never} initialPain={editPain} editEntry={editEntry} />
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


/* ------------------- Day preview ------------------- */
function DayPreview({ date, data, update, onEditPain, onEdit }:
  { date: string; data: BixboData; update: (u: (d: BixboData) => BixboData) => void; onEditPain?: (p: import("@/lib/storage").PainEntry) => void; onEdit?: (cat: string, entry: unknown) => void }) {
  const log = data.dayLogs[date];
  const rawNotes = data.dayNotes[date] ?? [];
  const notes: { text: string; time?: string }[] = (rawNotes as (string | { text: string; time?: string })[])
    .map((n) => typeof n === "string" ? { text: n } : n);
  const todos = data.todos[date] ?? [];
  const events = data.events.filter((e) => date >= e.startDate && date <= e.endDate);
  const tasks = data.tasks.filter((t) => date >= t.startDate && date <= t.endDate);

  const k = todayKey();
  const isToday = date === k;
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const meds = data.meds;
  const scheduled = data.meds
    .filter((m) => !m.asNeeded)
    .flatMap((m) => m.times.map((t) => ({ key: `${m.id}@${t}`, med: m, time: t, taken: !!data.medLog[date]?.[`${m.id}@${t}`] })));
  const takenList = scheduled.filter((x) => x.taken);
  const missedList = scheduled.filter((x) => !x.taken && (date < k || (date === k && x.time < nowHHMM)));
  const extraMeds = log?.extraMeds ?? [];
  const isMale = data.settings.gender === "male";

  const anything = !!(
    log && (
      log.pain?.length || log.tetany?.length || log.panic?.length ||
      log.period || log.periodInfo?.level || log.food?.length ||
      log.bowel?.length || log.sex?.length || log.heat?.length || log.workout?.length ||
      log.temperature != null || log.weight != null || log.sleepHours != null || extraMeds.length
    )
  ) || notes.length || todos.length || events.length || tasks.length || takenList.length || missedList.length;

  if (!anything) return (
    <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
      <p className="text-sm text-muted-foreground">Nothing logged {isToday ? "today" : "this day"} yet.</p>
      <p className="mt-1 text-xs text-muted-foreground">Tap the <span className="font-bold">+ Log</span> button below.</p>
    </div>
  );

  const markMissedTaken = (medKey: string) =>
    update((d) => ({ ...d, medLog: { ...d.medLog, [date]: { ...(d.medLog[date] ?? {}), [medKey]: true } } }));

  return (
    <div className="space-y-3 px-5 pt-3 pb-32">
      {(takenList.length > 0 || extraMeds.length > 0 || missedList.length > 0) && (
        <Card title="Meds" icon="💊">
          <ul className="space-y-1 text-sm">
            {takenList.map((x) => <li key={x.key}>✓ {x.time} — {x.med.name}{x.med.dose ? ` (${x.med.dose})` : ""}</li>)}
            {missedList.map((x) => (
              <li key={x.key} className="flex items-start gap-2">
                <button onClick={() => markMissedTaken(x.key)} className="flex-1 text-left text-destructive/90" title="Tap to mark taken">
                  ✗ {x.time} — {x.med.name}{x.med.dose ? ` (${x.med.dose})` : ""} <span className="text-[10px] text-muted-foreground">· missed (tap if taken)</span>
                </button>
              </li>
            ))}
            {extraMeds.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("meds", e)} className="flex-1 text-left">• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}{e.note ? ` — ${e.note}` : ""}</button>
                <button onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((x) => x.id !== e.id) } } }))} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {log?.pain?.length && (
        <Card title="Pain" icon="🔥">
          <ul className="space-y-2">
            {log.pain.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <button onClick={() => onEditPain?.(p)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: painColor(p.score) }} aria-label="Edit pain entry">
                  {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
                </button>
                <button onClick={() => onEditPain?.(p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">{p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}</p>
                  {p.parts.length > 0 && <p className="text-sm">{p.parts.join(", ")}</p>}
                  {p.quality.length > 0 && <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p>}
                  {p.symptoms.length > 0 && <p className="text-xs text-muted-foreground">+ {p.symptoms.join(", ")}</p>}
                  {p.hotFlashes != null && <p className="text-xs text-muted-foreground">🥵 Hot flashes intensity {p.hotFlashes}/5</p>}
                  {p.mood?.length ? <p className="text-xs text-muted-foreground">Mood: {p.mood.join(", ")}</p> : null}
                  {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
                  {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
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
                <button onClick={() => onEdit?.("panic", p)} className="flex-1 text-left">
                  <p className="text-sm font-medium">{p.time} · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}</p>
                  {p.trigger && <p className="text-xs text-muted-foreground">Trigger: {p.trigger}</p>}
                  {p.physical.length > 0 && <p className="text-xs">Physical: {p.physical.join(", ")}</p>}
                  {p.cognitive.length > 0 && <p className="text-xs">Cognitive: {p.cognitive.join(", ")}</p>}
                  <p className="text-[11px] text-muted-foreground">Hyperventilation: {p.hyperventilation}{p.tetanyPresent ? " · tetany present" : ""}</p>
                  {p.helped.length > 0 && <p className="text-[11px] text-muted-foreground">Helped: {p.helped.join(", ")}</p>}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.tetany?.length ? (
        <Card title="Tetany" icon="⚡">
          <ul className="space-y-2 text-sm">
            {log.tetany.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("tetany", t)} className="flex-1 text-left">
                  <p>{t.time} · {t.types.join(", ") || "Tetany"} · {t.intensity}/5 · {t.minutes == null ? "ongoing" : `${t.minutes}min`}{t.triggers.length ? ` — ${t.triggers.join(", ")}` : ""}</p>
                  {t.location?.length ? <p className="text-xs text-muted-foreground">Location: {t.location.join(", ")}</p> : null}
                  {t.helped?.length ? <p className="text-xs text-muted-foreground">Helped: {t.helped.join(", ")}</p> : null}
                  {t.note && <p className="mt-1 text-sm whitespace-pre-line">"{t.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== t.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!isMale && (log?.period || log?.periodInfo?.level) && (
        <Card title="Blueberry 🫐" icon="🫐">
          <button onClick={() => onEdit?.("period", undefined)} className="w-full text-left">
            <p className="text-sm">Flow: {periodLabel(log?.periodInfo?.level ?? log?.period)}</p>
            {log?.periodInfo?.discharge && <p className="text-xs text-muted-foreground">Discharge: {log.periodInfo.discharge}{log.periodInfo.dischargeNote ? ` — ${log.periodInfo.dischargeNote}` : ""}</p>}
            {log?.periodInfo?.note && <p className="mt-1 text-sm whitespace-pre-line">"{log.periodInfo.note}"</p>}
            <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
          </button>
        </Card>
      )}

      {log?.sex?.length ? (
        <Card title="ŠukŠuk! ❤️" icon="❤️">
          <ul className="space-y-1 text-sm">
            {log.sex.map((s: SexEntry) => (
              <li key={s.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("sex", s)} className="flex-1 text-left">{s.time} · {String(s.kind).replace(/_/g, " ")}{asArr(s.feelingAfter).length ? ` · ${asArr(s.feelingAfter).join(", ")}` : ""}{s.painful && s.painful !== "no" ? ` · painful ${s.painful}` : ""}{s.note ? ` — ${s.note}` : ""}</button>
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
                <button onClick={() => onEdit?.("heat", h)} className="flex-1 text-left">{h.kind === "heat" ? "🔥" : h.kind === "cold" ? "🧊" : "⚡"} {h.start} · {h.minutes} min{h.note ? ` — ${h.note}` : ""}</button>
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
                <button onClick={() => onEdit?.("food", f)} className="flex-1 text-left">{f.time} · {f.what}{f.feelings.length ? ` — ${f.feelings.join(", ")}` : ""}{f.hydrationMl != null ? ` · 💧 ${f.hydrationMl}ml` : ""}{f.caffeineMg != null ? ` · ☕ ${f.caffeineMg}mg` : ""}{f.alcoholDrinks != null ? ` · 🍷 ${f.alcoholDrinks}` : ""}</button>
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
                  <button onClick={() => onEdit?.("bowel", b)} className="flex-1 text-left">{b.time} · {bristol ? `Type ${bristol.n} — ${bristol.sub}` : "No bowel movement"}{b.feelings?.length ? ` · ${b.feelings.join(", ")}` : ""}{b.symptoms?.length ? ` · ${b.symptoms.join(", ")}` : ""}{b.note ? ` — ${b.note}` : ""}</button>
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
                <button onClick={() => onEdit?.("workout", w)} className="flex-1 text-left">{w.time} · {w.kind} · {w.minutes} min{asArr(w.feeling).length ? ` — ${asArr(w.feeling).join(", ")}` : ""}{w.note ? ` — ${w.note}` : ""}</button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], workout: (d.dayLogs[date]?.workout ?? []).filter((x) => x.id !== w.id) } } }))} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (
        <Card title="Temp / Sleep / Weight" icon="🌡️">
          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">
            {log?.temperature != null && <p className="text-sm">Temperature: {log.temperature}°C</p>}
            {log?.weight != null && <p className="text-sm">Weight: {log.weight} kg</p>}
            {log?.sleepHours != null && <p className="text-sm">Sleep: {log.sleepHours} h {asArr(log.sleepQuality).join(", ")}</p>}
            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && <p className="text-sm">Sleep quality: {asArr(log.sleepQuality).join(", ")}</p>}
            <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
          </button>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card title="Tasks" icon="✅">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={() => update((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x) }))} />
                <button onClick={() => onEdit?.("task", t)} className={`flex-1 text-left ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}{t.time ? ` · ${t.time}${t.timeEnd ? `–${t.timeEnd}` : ""}` : ""}{t.note ? ` — ${t.note}` : ""}</button>
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
                <button onClick={() => onEdit?.("event", e)} className="flex-1 text-left">{e.title}{e.time ? ` · ${e.time}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}{e.startDate !== e.endDate ? ` (${e.startDate}→${e.endDate})` : ""}{e.note ? ` — ${e.note}` : ""}</button>
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
    const dateLabel = fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines: string[] = [`🥑 BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((s, p) => s + p.score, 0) / log.pain.length;
      lines.push(`🔥 Pain — avg ${avg.toFixed(1)}/10 · ${log.pain.length} entr${log.pain.length === 1 ? "y" : "ies"}`);
      for (const p of log.pain) {
        const bits = [`${p.time}`, `${p.score}/10 (${PAIN_DESCRIPTIONS[Math.round(p.score)]})`];
        if (p.parts.length) bits.push(p.parts.join(", "));
        if (p.quality.length) bits.push(`[${p.quality.join(", ")}]`);
        lines.push(`  • ${bits.join(" · ")}`);
        if (p.note) lines.push(`    "${p.note}"`);
      }
      lines.push("");
    }
    if (log.panic?.length) {
      lines.push(`⚡ Panic attacks — ${log.panic.length}`);
      for (const p of log.panic) lines.push(`  • ${p.time} · ${p.intensity}/10 · ${p.minutes == null ? "ongoing" : `${p.minutes}min`}${p.trigger ? ` — ${p.trigger}` : ""}`);
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`💥 Tetany — ${log.tetany.length}`);
      for (const t of log.tetany) lines.push(`  • ${t.time} · ${t.types.join(", ")} · ${t.intensity}/5 · ${t.minutes == null ? "ongoing" : `${t.minutes}min`}`);
      lines.push("");
    }
    if (log.periodInfo?.level || log.period) lines.push(`🫐 Period: ${periodLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null) lines.push(`😴 Sleep: ${log.sleepHours}h ${asArr(log.sleepQuality).join(", ")}`);
    if (log.temperature != null) lines.push(`🌡️ Temp: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`⚖️ Weight: ${log.weight}kg`);
    if (log.food?.length) lines.push(`🍽️ Food: ${log.food.length} entries`);
    if (log.workout?.length) lines.push(`🧘 Workout: ${log.workout.map((w) => `${w.kind} ${w.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO 🥑");
    const text = lines.join("\n");
    if (navigator.share) { try { await navigator.share({ title: `How I feel · ${dateLabel}`, text }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); alert("Copied to clipboard"); } catch { alert(text); }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> Share day
    </Button>
  );
}
