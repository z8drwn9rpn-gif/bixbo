import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pill, Bell, Download, Upload, Share2, Trash2, X, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import {
  useBixbo, todayKey, fromKey, EMPTY, BRISTOL, PAIN_DESCRIPTIONS,
  isDateInRange, nextPredictedPeriod,
  type BixboData,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Health diary" },
      { name: "description", content: "Track your cycle, pain, meds and notes in one calm place." },
      { property: "og:title", content: "BIXBO — Health diary" },
      { property: "og:description", content: "Track your cycle, pain, meds and notes in one calm place." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, update, replace, hydrated } = useBixbo();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(() => todayKey());

  const view = hydrated ? data : EMPTY;
  const tKey = todayKey();
  const meds = view.meds;
  const takenToday = view.medLog[tKey] ?? {};
  const totalSlots = useMemo(
    () => meds.reduce((n, m) => n + (m.asNeeded ? 0 : m.times.length), 0),
    [meds],
  );
  const takenCount = useMemo(
    () => meds.reduce((n, m) => n + (m.asNeeded ? 0 : m.times.filter((t) => takenToday[`${m.id}@${t}`]).length), 0),
    [meds, takenToday],
  );

  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifPerm("unsupported"); return; }
    setNotifPerm(Notification.permission);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = new Date();
    for (const m of meds) {
      if (m.asNeeded) continue;
      for (const t of m.times) {
        const [h, mi] = t.split(":").map(Number);
        const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, 0);
        const delta = when.getTime() - now.getTime();
        if (delta > 0 && delta < 24 * 60 * 60 * 1000) {
          timers.push(setTimeout(() => {
            try { new Notification(`Time for ${m.name}`, { body: `${t}${m.dose ? ` · ${m.dose}` : ""}` }); } catch {}
          }, delta));
        }
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [meds]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bixbo-backup-${tKey}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try { replace({ ...EMPTY, ...JSON.parse(await file.text()) }); } catch { alert("Could not read that file."); }
  };

  const nextP = nextPredictedPeriod(view.cycle);

  return (
    <AppShell title="BIXBO" big>
      <div className="px-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold">{monthLabel(month)}</h2>
          <div className="flex items-center gap-1">
            <button className="rounded-full p-2 hover:bg-tint" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-full p-2 hover:bg-tint" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(todayKey()); }}>
              <span className="text-xs font-medium">Today</span>
            </button>
            <button className="rounded-full p-2 hover:bg-tint" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <MonthCalendar month={month} data={view} selected={selected} onSelect={setSelected} />

      {nextP && (
        <div className="mt-3 px-5">
          <p className="rounded-2xl bg-tint p-2 text-center text-[11px] text-muted-foreground">
            Next period predicted: <span className="font-semibold text-foreground">{fromKey(nextP.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {fromKey(nextP.end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3 px-5">
        <div className="flex items-center justify-between">
          <p className="font-serif text-xl font-semibold">
            {fromKey(selected).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <ShareDayButton date={selected} view={view} />
        </div>

        <DayPreview date={selected} view={view} update={update} />

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Meds today" value={`${takenCount}/${totalSlots || 0}`} />
          <MiniStat label="Notifications" value={notifPerm === "granted" ? "On" : "Off"} />
          <MiniStat label="Backup" value="Local" />
        </div>

        <div className="flex items-center justify-between rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-lg">💊</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Medications</p>
              <p className="text-sm">Manage your regimen</p>
            </div>
          </div>
          <Link to="/meds"><Button size="sm" variant="outline" className="rounded-full"><Pill className="h-3.5 w-3.5" /> Manage</Button></Link>
        </div>

        {notifPerm === "default" && (
          <button
            onClick={() => Notification.requestPermission().then(setNotifPerm)}
            className="flex w-full items-center gap-2 rounded-2xl bg-primary/10 p-3 text-left text-sm text-primary"
          >
            <Bell className="h-4 w-4" /> Turn on medication reminders
          </button>
        )}

        <div className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Backup</p>
          <p className="mt-1 text-xs text-muted-foreground">Data lives on this device. Export JSON to move it.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export</Button>
            <label className="inline-flex">
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.currentTarget.value = ""; }} />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> Import
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <div className="pointer-events-auto flex justify-end">
          <LogSheet date={selected} data={view} update={update} />
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tint px-2 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-lg leading-tight">{value}</p>
    </div>
  );
}

function periodLabel(p: string) {
  return { spotting: "Spotting", light: "Light", medium: "Medium", heavy: "Heavy", veryheavy: "Very heavy" }[p] ?? "—";
}
function sexLabel(k: string) {
  return {
    sex_with_condom: "Sex — with condom",
    sex_without_condom: "Sex — without condom",
    fingering: "Fingering",
    oral_giving: "Oral — giving",
    oral_receiving: "Oral — receiving",
    other: "Other",
    none: "None",
  }[k] ?? k;
}

function DayPreview({
  date, view, update,
}: { date: string; view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const log = view.dayLogs[date] ?? {};
  const notes = view.dayNotes[date] ?? [];
  const events = view.events.filter((e) => isDateInRange(date, e.startDate, e.endDate));
  const tasks = view.tasks.filter((t) => isDateInRange(date, t.startDate, t.endDate));
  const dayMed = view.medLog[date] ?? {};
  const medsTaken = view.meds.flatMap((m) => (m.asNeeded ? [] : m.times).filter((t) => dayMed[`${m.id}@${t}`]).map((t) => ({ id: `${m.id}@${t}`, name: m.name, dose: m.dose, time: t })));

  const removePain = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), pain: (d.dayLogs[date]?.pain ?? []).filter((p) => p.id !== id) } } }));
  const removeHeat = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), heat: (d.dayLogs[date]?.heat ?? []).filter((p) => p.id !== id) } } }));
  const removeFood = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), food: (d.dayLogs[date]?.food ?? []).filter((p) => p.id !== id) } } }));
  const removeBowel = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), bowel: (d.dayLogs[date]?.bowel ?? []).filter((p) => p.id !== id) } } }));
  const removeSex = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), sex: (d.dayLogs[date]?.sex ?? []).filter((p) => p.id !== id) } } }));
  const removeExtra = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((p) => p.id !== id) } } }));
  const removeWorkout = (id: string) => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), workout: (d.dayLogs[date]?.workout ?? []).filter((p) => p.id !== id) } } }));
  const clearPeriod = () => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), period: undefined, periodInfo: undefined } } }));
  const clearTempWeight = () => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), temperature: undefined, weight: undefined, sleepHours: undefined } } }));
  const removeNote = (i: number) => update((d) => ({ ...d, dayNotes: { ...d.dayNotes, [date]: (d.dayNotes[date] ?? []).filter((_, idx) => idx !== i) } }));
  const removeEvent = (id: string) => update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
  const removeTask = (id: string) => update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  const toggleTask = (id: string) => update((d) => ({ ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) }));

  const empty =
    !(log.pain?.length) && !(log.heat?.length) && !(log.food?.length) && !(log.bowel?.length) &&
    !(log.sex?.length) && !(log.workout?.length) && !(log.extraMeds?.length) &&
    !log.period && !log.periodInfo?.level && log.temperature == null && log.weight == null && log.sleepHours == null &&
    notes.length === 0 && events.length === 0 && tasks.length === 0 && medsTaken.length === 0;

  if (empty) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Nothing logged for this day yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Tap the Log button.</p>
      </div>
    );
  }

  const periodLevel = log.periodInfo?.level ?? log.period;
  return (
    <div className="space-y-2">
      {periodLevel && (
        <Card icon="🫐" title={`Period · ${periodLabel(periodLevel)}`} onRemove={clearPeriod}>
          {log.periodInfo?.discharge && <p className="mt-1 text-xs text-muted-foreground">Discharge: {log.periodInfo.discharge}</p>}
          {log.periodInfo?.note && <p className="mt-1 text-sm">{log.periodInfo.note}</p>}
        </Card>
      )}
      {events.map((e) => (
        <Card key={e.id} icon="📅" title={e.title}
          subtitle={`${e.startDate}${e.endDate !== e.startDate ? ` → ${e.endDate}` : ""}${e.time ? ` · ${e.time}` : ""}`}
          onRemove={() => removeEvent(e.id)} accent={e.color}>
          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
        </Card>
      ))}
      {tasks.map((t) => (
        <Card key={t.id} icon={t.done ? "✅" : "◻️"} title={t.title}
          subtitle={t.time ? `${t.time}` : undefined} onRemove={() => removeTask(t.id)}
          action={
            <button onClick={() => toggleTask(t.id)} aria-label="Toggle" className={`grid h-6 w-6 place-items-center rounded-full border-2 ${t.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
              {t.done && <Check className="h-3 w-3" />}
            </button>
          }
        />
      ))}
      {(log.pain ?? []).map((p) => (
        <Card key={p.id} icon="🔥" title={`Pain ${p.score}/10`}
          subtitle={`${p.time} · ${PAIN_DESCRIPTIONS[Math.round(p.score)]}`} onRemove={() => removePain(p.id)}>
          {p.parts.length > 0 && <TagRow label="Where" items={p.parts} />}
          {p.quality.length > 0 && <TagRow label="How" items={p.quality} />}
          {p.symptoms.length > 0 && <TagRow label="Other" items={p.symptoms} />}
          {p.note && <p className="mt-2 whitespace-pre-wrap text-sm">{p.note}</p>}
        </Card>
      ))}
      {(log.heat ?? []).map((h) => (
        <Card key={h.id} icon={h.kind === "cold" ? "❄️" : "🔥"} title={`${h.kind === "cold" ? "Cold" : "Heat"} · ${h.minutes} min`}
          subtitle={`Started ${h.start}`} onRemove={() => removeHeat(h.id)}>
          {h.note && <p className="mt-1 text-sm">{h.note}</p>}
        </Card>
      ))}
      {(log.food ?? []).map((f) => (
        <Card key={f.id} icon="🍽️" title={f.what} subtitle={f.time} onRemove={() => removeFood(f.id)}>
          {f.feelings.length > 0 && <TagRow label="Feel" items={f.feelings} />}
          {f.after && <p className="mt-1 text-sm">{f.after}</p>}
        </Card>
      ))}
      {(log.bowel ?? []).map((b) => {
        const info = BRISTOL[b.bristol - 1];
        return (
          <Card key={b.id} icon="💩" title={`Type ${b.bristol} — ${info?.label ?? ""}`} subtitle={b.time} onRemove={() => removeBowel(b.id)}>
            {b.note && <p className="mt-1 text-sm">{b.note}</p>}
          </Card>
        );
      })}
      {(log.sex ?? []).map((s) => (
        <Card key={s.id} icon="❤️" title="ŠukŠuk!" subtitle={`${s.time} · ${sexLabel(s.kind)}`} onRemove={() => removeSex(s.id)}>
          {s.note && <p className="mt-1 text-sm">{s.note}</p>}
        </Card>
      ))}
      {(log.workout ?? []).map((w) => (
        <Card key={w.id} icon="🧘🏼‍♀️" title={`${w.kind} · ${w.minutes} min`}
          subtitle={[w.time, w.weightKg != null ? `${w.weightKg} kg` : null, w.feeling].filter(Boolean).join(" · ")}
          onRemove={() => removeWorkout(w.id)}>
          {w.note && <p className="mt-1 text-sm">{w.note}</p>}
        </Card>
      ))}
      {medsTaken.length > 0 && (
        <Card icon="💊" title="Meds taken today">
          <ul className="mt-1 space-y-1 text-sm">
            {medsTaken.map((m) => <li key={m.id}>• {m.time} — {m.name}{m.dose ? ` (${m.dose})` : ""}</li>)}
          </ul>
        </Card>
      )}
      {(log.extraMeds ?? []).map((e) => (
        <Card key={e.id} icon="💊" title={`Extra: ${e.name}`} subtitle={`${e.time}${e.dose ? ` · ${e.dose}` : ""}`} onRemove={() => removeExtra(e.id)} />
      ))}
      {(log.temperature != null || log.weight != null || log.sleepHours != null) && (
        <Card icon="🌡️" title="Body metrics"
          subtitle={[
            log.temperature != null ? `${log.temperature}°C` : null,
            log.weight != null ? `${log.weight} kg` : null,
            log.sleepHours != null ? `${log.sleepHours} h sleep` : null,
          ].filter(Boolean).join(" · ")}
          onRemove={clearTempWeight}
        />
      )}
      {notes.length > 0 && (
        <Card icon="📝" title="Notes">
          <ul className="mt-2 space-y-2">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span className="whitespace-pre-wrap">{n}</span>
                <button onClick={() => removeNote(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Card({ icon, title, subtitle, children, onRemove, accent, action }:
  { icon: string; title: string; subtitle?: string; children?: React.ReactNode; onRemove?: () => void; accent?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border" style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
        {onRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

function TagRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}: </span>
      <span className="text-sm">{items.join(", ")}</span>
    </div>
  );
}

function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const painMax = log.pain?.reduce((m, p) => Math.max(m, p.score), 0);
    const parts = [
      `BIXBO — ${fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`,
      painMax != null ? `Pain: ${painMax}/10 (${PAIN_DESCRIPTIONS[Math.round(painMax)]})` : "Pain: none",
      log.periodInfo?.level || log.period ? `Period: ${periodLabel(log.periodInfo?.level ?? log.period!)}` : null,
      log.sleepHours != null ? `Sleep: ${log.sleepHours}h` : null,
    ].filter(Boolean);
    const text = parts.join("\n");
    if (navigator.share) {
      try { await navigator.share({ title: "How I feel today", text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); alert("Copied to clipboard"); } catch { alert(text); }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> Share day
    </Button>
  );
}
