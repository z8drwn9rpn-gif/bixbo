import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, fromKey, EMPTY, type PeriodLevel, type SexActivity, type DayLog } from "@/lib/storage";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/day/$date")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.date} — BIXBO` },
      { name: "description", content: "Detail dňa v BIXBO." },
    ],
  }),
  component: DayPage,
});

const PERIOD_OPTS: { value: PeriodLevel; label: string; color: string }[] = [
  { value: "spotting", label: "Špinenie", color: "var(--period-spotting)" },
  { value: "light", label: "Slabá", color: "var(--period-light)" },
  { value: "medium", label: "Stredná", color: "var(--period-medium)" },
  { value: "heavy", label: "Silná", color: "var(--period-heavy)" },
  { value: "veryheavy", label: "Veľmi silná", color: "var(--period-veryheavy)" },
];

const SEX_OPTS: { value: SexActivity; label: string }[] = [
  { value: "none", label: "Žiadna" },
  { value: "with_condom", label: "S kondómom" },
  { value: "without_condom", label: "Bez kondómu" },
];

function DayPage() {
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const log = view.dayLogs[date] ?? {};
  const notes = view.dayNotes[date] ?? [];
  const todos = view.todos[date] ?? [];

  const setLog = (patch: Partial<DayLog>) => {
    update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...(d.dayLogs[date] ?? {}), ...patch } } }));
  };

  const displayDate = fromKey(date).toLocaleDateString("sk-SK", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Späť
        </button>
      }
    >
      <div className="px-5 pt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Deň</p>
        <h2 className="font-serif text-2xl capitalize">{displayDate}</h2>
      </div>

      <Tabs defaultValue="symptoms" className="mt-4">
        <div className="px-5">
          <TabsList className="w-full">
            <TabsTrigger value="symptoms" className="flex-1">Symptómy</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Poznámky</TabsTrigger>
            <TabsTrigger value="todo" className="flex-1">Úlohy</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="symptoms" className="mt-4 space-y-4 px-5">
          <Card>
            <Label>Bolesť: <b>{log.pain ?? 0}/10</b></Label>
            <Slider
              value={[log.pain ?? 0]}
              max={10}
              step={1}
              onValueChange={(v) => setLog({ pain: v[0] })}
              className="mt-3"
            />
          </Card>

          <Card>
            <Label>Perióda</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERIOD_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setLog({ period: log.period === o.value ? "" : o.value })}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${log.period === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: o.color }} />
                  {o.label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Návaly tepla</Label>
            <div className="mt-2 flex gap-2">
              {["Žiadne", "Mierne", "Stredné", "Silné"].map((lbl, i) => (
                <button
                  key={lbl}
                  onClick={() => setLog({ heat: log.heat === i ? undefined : i })}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-xs ${log.heat === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
                >{lbl}</button>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Stolica</Label>
            <div className="mt-2 flex gap-2">
              {[
                { v: true, l: "Áno" },
                { v: false, l: "Nie" },
              ].map((o) => (
                <button
                  key={o.l}
                  onClick={() => setLog({ bowel: log.bowel === o.v ? undefined : o.v })}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-xs ${log.bowel === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
                >{o.l}</button>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Sexuálna aktivita</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SEX_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setLog({ sex: log.sex === o.value ? "" : o.value })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${log.sex === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
                >{o.label}</button>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Teplota (°C) a Váha (kg)</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                type="number" step="0.1" placeholder="36.6"
                value={log.temperature ?? ""}
                onChange={(e) => setLog({ temperature: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
              <Input
                type="number" step="0.1" placeholder="65.0"
                value={log.weight ?? ""}
                onChange={(e) => setLog({ weight: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
          </Card>

          <Card>
            <Label>Jedlo</Label>
            <div className="mt-2 space-y-2">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
                <div key={meal}>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {{ breakfast: "Raňajky", lunch: "Obed", dinner: "Večera", snack: "Snack" }[meal]}
                  </p>
                  <Textarea
                    rows={2}
                    placeholder="Čo si jedla..."
                    value={log.food?.[meal] ?? ""}
                    onChange={(e) => setLog({ food: { ...(log.food ?? {}), [meal]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 px-5">
          <NotesEditor
            notes={notes}
            onAdd={(t) => update((d) => ({ ...d, dayNotes: { ...d.dayNotes, [date]: [...(d.dayNotes[date] ?? []), t] } }))}
            onRemove={(i) => update((d) => ({ ...d, dayNotes: { ...d.dayNotes, [date]: (d.dayNotes[date] ?? []).filter((_, idx) => idx !== i) } }))}
          />
        </TabsContent>

        <TabsContent value="todo" className="mt-4 px-5">
          <TodoEditor
            todos={todos}
            onAdd={(t) => update((d) => ({ ...d, todos: { ...d.todos, [date]: [...(d.todos[date] ?? []), { id: crypto.randomUUID(), text: t, done: false }] } }))}
            onToggle={(id) => update((d) => ({ ...d, todos: { ...d.todos, [date]: (d.todos[date] ?? []).map((t) => t.id === id ? { ...t, done: !t.done } : t) } }))}
            onRemove={(id) => update((d) => ({ ...d, todos: { ...d.todos, [date]: (d.todos[date] ?? []).filter((t) => t.id !== id) } }))}
          />
        </TabsContent>
      </Tabs>

      <div className="px-5 pt-8">
        <Link to="/" className="text-xs text-muted-foreground underline">← Späť na kalendár</Link>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-foreground">{children}</p>;
}

function NotesEditor({ notes, onAdd, onRemove }: { notes: string[]; onAdd: (t: string) => void; onRemove: (i: number) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-3">
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT(""); } }} className="flex gap-2">
          <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Napr. Idem k lekárovi o 15:00" />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </Card>
      {notes.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">Žiadne poznámky.</p>
      ) : (
        notes.map((n, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <p className="text-sm">{n}</p>
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive" aria-label="Odstrániť">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function TodoEditor({ todos, onAdd, onToggle, onRemove }: { todos: { id: string; text: string; done: boolean }[]; onAdd: (t: string) => void; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-3">
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT(""); } }} className="flex gap-2">
          <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Nová úloha…" />
          <Button type="submit"><Plus className="h-4 w-4" /></Button>
        </form>
      </Card>
      {todos.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">Žiadne úlohy.</p>
      ) : (
        todos.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <button
              onClick={() => onToggle(t.id)}
              className={`h-5 w-5 shrink-0 rounded-full border-2 ${t.done ? "border-primary bg-primary" : "border-muted-foreground"}`}
              aria-label="Prepnúť"
            />
            <p className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</p>
            <button onClick={() => onRemove(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Odstrániť">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
