import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LogSheet } from "@/components/LogSheet";
import { useBixbo, fromKey, EMPTY, BRISTOL, PAIN_DESCRIPTIONS } from "@/lib/storage";

export const Route = createFileRoute("/day/$date")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.date} — BIXBO` },
      { name: "description", content: "Day details in BIXBO." },
    ],
  }),
  component: DayPage,
});

function DayPage() {
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const log = view.dayLogs[date] ?? {};
  const notes = view.dayNotes[date] ?? [];
  const todos = view.todos[date] ?? [];

  const displayDate = fromKey(date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const painEntries = log.pain ?? [];
  const heatEntries = log.heat ?? [];
  const foodEntries = log.food ?? [];
  const bowelEntries = log.bowel ?? [];
  const extraMeds = log.extraMeds ?? [];
  const period = log.period;
  const sex = log.sex;

  const removePain = (id: string) => update((d) => ({
    ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), pain: (d.dayLogs[date]?.pain ?? []).filter((p) => p.id !== id) } },
  }));
  const removeHeat = (id: string) => update((d) => ({
    ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), heat: (d.dayLogs[date]?.heat ?? []).filter((p) => p.id !== id) } },
  }));
  const removeFood = (id: string) => update((d) => ({
    ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), food: (d.dayLogs[date]?.food ?? []).filter((p) => p.id !== id) } },
  }));
  const removeBowel = (id: string) => update((d) => ({
    ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), bowel: (d.dayLogs[date]?.bowel ?? []).filter((p) => p.id !== id) } },
  }));
  const removeExtra = (id: string) => update((d) => ({
    ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((p) => p.id !== id) } },
  }));
  const removeNote = (i: number) => update((d) => ({
    ...d, dayNotes: { ...d.dayNotes, [date]: (d.dayNotes[date] ?? []).filter((_, idx) => idx !== i) },
  }));
  const toggleTodo = (id: string) => update((d) => ({
    ...d, todos: { ...d.todos, [date]: (d.todos[date] ?? []).map((t) => t.id === id ? { ...t, done: !t.done } : t) },
  }));
  const removeTodo = (id: string) => update((d) => ({
    ...d, todos: { ...d.todos, [date]: (d.todos[date] ?? []).filter((t) => t.id !== id) },
  }));

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
      }
    >
      <div className="px-5 pt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Day</p>
        <h2 className="font-serif text-2xl">{displayDate}</h2>
      </div>

      <div className="mt-4 space-y-3 px-5 pb-40">
        {painEntries.length === 0 && heatEntries.length === 0 && foodEntries.length === 0 &&
         bowelEntries.length === 0 && !period && !sex && log.temperature == null && log.weight == null &&
         extraMeds.length === 0 && notes.length === 0 && todos.length === 0 && (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm text-muted-foreground">Nothing logged for this day yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Tap the Log button below.</p>
          </div>
        )}

        {period && (
          <Card icon="🩸" title="Period" subtitle={periodLabel(period)} />
        )}

        {painEntries.map((p) => (
          <Card key={p.id} icon="🔥" title={`Pain ${p.score}/10`} subtitle={`${p.time} · ${PAIN_DESCRIPTIONS[Math.round(p.score)]}`}
            onRemove={() => removePain(p.id)}>
            {p.parts.length > 0 && <TagRow label="Where" items={p.parts} />}
            {p.quality.length > 0 && <TagRow label="How" items={p.quality} />}
            {p.symptoms.length > 0 && <TagRow label="Other" items={p.symptoms} />}
            {p.note && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{p.note}</p>}
          </Card>
        ))}

        {heatEntries.map((h) => (
          <Card key={h.id} icon="♨️" title={`Heat session · ${h.minutes} min`} subtitle={`Started at ${h.start}`}
            onRemove={() => removeHeat(h.id)}>
            {h.note && <p className="mt-1 text-sm text-foreground/80">{h.note}</p>}
          </Card>
        ))}

        {foodEntries.map((f) => (
          <Card key={f.id} icon="🍽️" title={f.what} subtitle={f.time} onRemove={() => removeFood(f.id)}>
            {f.after && <p className="mt-1 text-sm text-foreground/80"><span className="text-xs text-muted-foreground">After: </span>{f.after}</p>}
          </Card>
        ))}

        {bowelEntries.map((b) => {
          const info = BRISTOL[b.bristol - 1];
          return (
            <Card key={b.id} icon="💩" title={`Type ${b.bristol} — ${info?.label ?? ""}`} subtitle={b.time}
              onRemove={() => removeBowel(b.id)}>
              {b.note && <p className="mt-1 text-sm text-foreground/80">{b.note}</p>}
            </Card>
          );
        })}

        {sex && (
          <Card icon="❤️" title="Sexual activity" subtitle={sexLabel(sex.type)}>
            {sex.note && <p className="mt-1 text-sm text-foreground/80">{sex.note}</p>}
          </Card>
        )}

        {(log.temperature != null || log.weight != null) && (
          <Card icon="🌡️" title="Body metrics"
            subtitle={[
              log.temperature != null ? `${log.temperature}°C` : null,
              log.weight != null ? `${log.weight} kg` : null,
            ].filter(Boolean).join(" · ")}
          />
        )}

        {extraMeds.map((e) => (
          <Card key={e.id} icon="💊" title={`Extra: ${e.name}`} subtitle={`${e.time}${e.dose ? ` · ${e.dose}` : ""}`}
            onRemove={() => removeExtra(e.id)} />
        ))}

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

        {todos.length > 0 && (
          <Card icon="✅" title="Tasks">
            <ul className="mt-2 space-y-2">
              {todos.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTodo(t.id)}
                    className={`h-5 w-5 shrink-0 rounded-full border-2 ${t.done ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    aria-label="Toggle"
                  />
                  <p className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</p>
                  <button onClick={() => removeTodo(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Link to="/" className="block px-1 pt-4 text-xs text-muted-foreground underline">← Back to calendar</Link>
      </div>

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <div className="pointer-events-auto flex justify-end">
          <LogSheet date={date} data={view} update={update} />
        </div>
      </div>
    </AppShell>
  );
}

function Card({ icon, title, subtitle, children, onRemove }:
  { icon: string; title: string; subtitle?: string; children?: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-lg">{icon}</span>
        <div className="flex-1">
          <p className="font-serif text-lg leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
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

function periodLabel(p: string) {
  return { spotting: "Spotting", light: "Light", medium: "Medium", heavy: "Heavy", veryheavy: "Very heavy" }[p] ?? "—";
}
function sexLabel(t: string) {
  return { none: "None", with_condom: "With condom", without_condom: "Without condom" }[t] ?? t;
}
