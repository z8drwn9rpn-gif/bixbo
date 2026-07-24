import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, todayKey, EMPTY, type Med } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/meds")({
  head: () => ({
    meta: [
      { title: "Lieky — BIXBO" },
      { name: "description", content: "Sleduj svoje lieky a dostávaj pripomienky." },
      { property: "og:title", content: "Lieky — BIXBO" },
      { property: "og:description", content: "Sleduj svoje lieky a dostávaj pripomienky." },
    ],
  }),
  component: MedsPage,
});

function MedsPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const tKey = todayKey();
  const taken = view.medLog[tKey] ?? {};

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifPermission("unsupported"); return; }
    setNotifPermission(Notification.permission);
  }, []);

  // Schedule same-day reminders while page is open
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = new Date();
    for (const m of view.meds) {
      if (m.asNeeded) continue;
      for (const t of m.times) {
        const [h, mi] = t.split(":").map(Number);
        const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, 0);
        const delta = when.getTime() - now.getTime();
        if (delta > 0 && delta < 24 * 60 * 60 * 1000) {
          timers.push(setTimeout(() => {
            try { new Notification(`Čas na liek: ${m.name}`, { body: `${t} — ${m.dose ?? ""}`.trim(), icon: "/favicon.ico" }); } catch {}
          }, delta));
        }
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [view.meds]);

  const groups = useMemo(() => {
    const map = new Map<string, { time: string; entries: { med: Med; key: string }[] }>();
    for (const m of view.meds) {
      if (m.asNeeded) continue;
      for (const t of m.times) {
        if (!map.has(t)) map.set(t, { time: t, entries: [] });
        map.get(t)!.entries.push({ med: m, key: `${m.id}@${t}` });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [view.meds]);

  const asNeeded = view.meds.filter((m) => m.asNeeded);

  const toggleTaken = (key: string) => {
    update((d) => {
      const day = { ...(d.medLog[tKey] ?? {}) };
      day[key] = !day[key];
      return { ...d, medLog: { ...d.medLog, [tKey]: day } };
    });
  };

  const addMed = (m: Med) => update((d) => ({ ...d, meds: [...d.meds, m] }));
  const removeMed = (id: string) => update((d) => ({ ...d, meds: d.meds.filter((m) => m.id !== id) }));

  return (
    <AppShell title="Lieky" right={<AddMedButton onAdd={addMed} />}>
      <div className="space-y-4 px-5 pt-4">
        {notifPermission === "default" && (
          <button
            onClick={() => Notification.requestPermission().then(setNotifPermission)}
            className="flex w-full items-center gap-2 rounded-2xl bg-primary/10 p-3 text-left text-sm text-primary"
          >
            <Bell className="h-4 w-4" /> Zapnúť pripomienky na lieky
          </button>
        )}
        {notifPermission === "granted" && (
          <p className="text-xs text-muted-foreground">🔔 Pripomienky sú zapnuté (fungujú pokiaľ je apka otvorená).</p>
        )}

        <section>
          <h2 className="font-serif text-xl">Dnešný rozvrh</h2>
          {groups.length === 0 && asNeeded.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Zatiaľ žiadne lieky. Pridaj svoj prvý.</p>
          )}
          <div className="mt-3 space-y-3">
            {groups.map((g) => (
              <div key={g.time} className="rounded-3xl bg-surface p-4 ring-1 ring-border">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-serif text-lg">{g.time}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.entries.filter((e) => taken[e.key]).length} / {g.entries.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {g.entries.map(({ med, key }) => (
                    <li key={key} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaken(key)}
                        className={`h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center ${taken[key] ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}
                        aria-label="Prepnúť"
                      >
                        {taken[key] ? "✓" : ""}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${taken[key] ? "line-through text-muted-foreground" : ""}`}>{med.name}</p>
                        {med.dose && <p className="text-xs text-muted-foreground">{med.dose}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {asNeeded.length > 0 && (
              <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Podľa potreby</p>
                <ul className="space-y-2">
                  {asNeeded.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaken(`${m.id}@asneeded`)}
                        className={`h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center ${taken[`${m.id}@asneeded`] ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}
                      >
                        {taken[`${m.id}@asneeded`] ? "✓" : ""}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="pt-2">
          <h2 className="font-serif text-xl">Moje lieky</h2>
          <div className="mt-2 space-y-2">
            {view.meds.length === 0 && <p className="text-sm text-muted-foreground">Žiadne lieky.</p>}
            {view.meds.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.dose ? `${m.dose} · ` : ""}
                    {m.asNeeded ? "podľa potreby" : m.times.join(", ")}
                  </p>
                </div>
                <button onClick={() => removeMed(m.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AddMedButton({ onAdd }: { onAdd: (m: Med) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [asNeeded, setAsNeeded] = useState(false);

  const save = () => {
    if (!name.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      dose: dose.trim() || undefined,
      times: asNeeded ? [] : times.filter(Boolean),
      asNeeded,
    });
    setName(""); setDose(""); setTimes(["09:00"]); setAsNeeded(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full"><Plus className="h-4 w-4" /> Pridať</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový liek</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Názov</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Napr. Ibuprofen" />
          </div>
          <div>
            <label className="text-xs font-medium">Dávka (nepovinné)</label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="200 mg" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-tint p-3">
            <span className="text-sm">Podľa potreby</span>
            <Switch checked={asNeeded} onCheckedChange={setAsNeeded} />
          </div>
          {!asNeeded && (
            <div>
              <label className="text-xs font-medium">Časy</label>
              <div className="mt-2 space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => j === i ? e.target.value : x))} />
                    <Button variant="outline" size="icon" onClick={() => setTimes(times.filter((_, j) => j !== i))}>−</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setTimes([...times, "12:00"])}><Plus className="h-3 w-3" /> Ďalší čas</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Zrušiť</Button>
          <Button onClick={save}>Uložiť</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
