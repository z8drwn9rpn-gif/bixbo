import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, type Med } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/meds")({
  head: () => ({
    meta: [
      { title: "Medications — BIXBO" },
      { name: "description", content: "Manage your medications and daily schedule." },
      { property: "og:title", content: "Medications — BIXBO" },
      { property: "og:description", content: "Manage your medications and daily schedule." },
    ],
  }),
  component: MedsPage,
});

function MedsPage() {
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  const addMed = (m: Med) => update((d) => ({ ...d, meds: [...d.meds, m] }));
  const removeMed = (id: string) => update((d) => ({ ...d, meds: d.meds.filter((m) => m.id !== id) }));

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Medications
        </button>
      }
      right={<AddMedButton onAdd={addMed} />}
    >
      <div className="space-y-4 px-5 pt-4 pb-24">
        <p className="text-xs text-muted-foreground">
          Set up the meds you take on a schedule (typically 3× a day). One-off extra doses can be added from the Log button on Home.
        </p>

        <section>
          <h2 className="font-serif text-xl">My medications</h2>
          <div className="mt-2 space-y-2">
            {view.meds.length === 0 && <p className="text-sm text-muted-foreground">No medications yet. Tap “Add”.</p>}
            {view.meds.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.dose ? `${m.dose} · ` : ""}
                    {m.asNeeded ? "as needed" : m.times.join(", ")}
                  </p>
                </div>
                <button onClick={() => removeMed(m.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
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
  const [times, setTimes] = useState<string[]>(["09:00", "15:00", "21:00"]);
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
    setName(""); setDose(""); setTimes(["09:00", "15:00", "21:00"]); setAsNeeded(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full"><Plus className="h-4 w-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New medication</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ibuprofen" />
          </div>
          <div>
            <label className="text-xs font-medium">Dose (optional)</label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="200 mg" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-tint p-3">
            <span className="text-sm">As needed</span>
            <Switch checked={asNeeded} onCheckedChange={setAsNeeded} />
          </div>
          {!asNeeded && (
            <div>
              <label className="text-xs font-medium">Times</label>
              <div className="mt-2 space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => j === i ? e.target.value : x))} />
                    <Button variant="outline" size="icon" onClick={() => setTimes(times.filter((_, j) => j !== i))}>−</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setTimes([...times, "12:00"])}><Plus className="h-3 w-3" /> Add time</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
