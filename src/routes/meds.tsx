import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil } from "@/components/icons/BixboExtraIcons";
import { AppShell } from "@/components/AppShell";
import { Ico, IcoText } from "@/components/icons/BixboExtraIcons";
import { useBixbo, EMPTY, type Med } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/hooks/useI18n";

export const Route = createFileRoute("/meds")({
  head: () => ({
    meta: [
      { title: "BIXBO — Medications" },
      { name: "description", content: "Manage your medications and daily schedule." },
      { property: "og:title", content: "BIXBO — Medications" },
      { property: "og:description", content: "Manage your medications and daily schedule." },
    ],
  }),
  component: MedsPage,
});

function MedsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  const addMed = (m: Med) =>
    update((d) => ({
      ...d,
      meds: [...d.meds, m],
      medNames: { ...(d.medNames ?? {}), [m.id]: m.dose ? `${m.name} ${m.dose}` : m.name },
    }));
  const saveMed = (m: Med) =>
    update((d) => ({
      ...d,
      meds: d.meds.map((x) => (x.id === m.id ? m : x)),
      medNames: { ...(d.medNames ?? {}), [m.id]: m.dose ? `${m.name} ${m.dose}` : m.name },
    }));
  // Keep a name snapshot so historical adherence stays readable after deletion.
  const removeMed = (id: string) =>
    update((d) => {
      const gone = d.meds.find((m) => m.id === id);
      return {
        ...d,
        meds: d.meds.filter((m) => m.id !== id),
        medNames: gone
          ? { ...(d.medNames ?? {}), [id]: gone.dose ? `${gone.name} ${gone.dose}` : gone.name }
          : d.medNames,
      };
    });

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> {t("Medications")}
        </button>
      }
      right={<AddMedButton onAdd={addMed} />}
    >
      <div className="space-y-4 px-5 pt-4 pb-24">
        <p className="text-xs text-muted-foreground">
          {t("Set up the meds you take on a schedule. One-off extra doses can be added from the Log button.")}
        </p>
        <section>
          <h2 className="font-serif text-xl">{t("My medications")}</h2>
          <div className="mt-2 space-y-2">
            {view.meds.length === 0 && <p className="text-sm text-muted-foreground">{t("No medications yet. Tap Add.")}</p>}
            {view.meds.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-2 rounded-2xl bg-surface p-3 ring-1 ring-border"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.dose ? `${m.dose} · ` : ""}
                    {m.asNeeded ? t("as needed") : m.times.join(", ")}
                  </p>
                  {m.note && (
                    <p className="mt-1 flex items-start gap-1 text-xs whitespace-pre-wrap text-muted-foreground">
                      <Ico e="📝" size={14} />
                      <SemanticIcoText text={m.note} size={12} />
                    </p>
                  )}
                </div>
                <MedItemActions med={m} onSave={saveMed} onDelete={() => removeMed(m.id)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MedItemActions({ med, onSave, onDelete }: { med: Med; onSave: (m: Med) => void; onDelete: () => void }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold leading-none text-muted-foreground transition hover:bg-tint hover:text-foreground"
        aria-label={t("More options")}
        aria-expanded={menuOpen}
      >
        ⋯
      </button>
      {menuOpen ? (
        <>
          <button type="button" aria-label={t("Close")} className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-9 z-50 min-w-[132px] rounded-2xl border border-border/70 bg-background p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setEditOpen(true); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:bg-tint"
            >
              <Pencil className="h-3.5 w-3.5" /> {t("Edit")}
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("Delete")}
            </button>
          </div>
        </>
      ) : null}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Edit medication")}</DialogTitle>
          </DialogHeader>
          {editOpen && (
            <MedFields
              key={med.id}
              initial={med}
              onCancel={() => setEditOpen(false)}
              onSave={(m) => {
                onSave({ ...m, id: med.id });
                setEditOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MedFields({ initial, onSave, onCancel }: { initial?: Med; onSave: (m: Med) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [times, setTimes] = useState<string[]>(initial?.times?.length ? initial.times : ["09:00", "15:00", "21:00"]);
  const [asNeeded, setAsNeeded] = useState(!!initial?.asNeeded);

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      dose: dose.trim() || undefined,
      times: asNeeded ? [] : times.filter(Boolean),
      asNeeded,
      note: note.trim() || undefined,
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium">{t("Name")}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Magnerot")} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("Dose (optional)")}</label>
          <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="500 mg" />
        </div>
        <div>
          <label className="text-xs font-medium">{t("Note (optional)")}</label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Take with food, side effects…")}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-tint p-3">
          <span className="text-sm">{t("As needed")}</span>
          <Switch checked={asNeeded} onCheckedChange={setAsNeeded} />
        </div>
        {!asNeeded && (
          <div>
            <label className="text-xs font-medium">{t("Times")}</label>
            <div className="mt-2 space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="time"
                    value={t}
                    onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <Button variant="outline" size="icon" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                    −
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setTimes([...times, "12:00"])}>
                <Plus className="h-3 w-3" /> {t("Add time")}
              </Button>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button onClick={save}>{t("Save")}</Button>
      </DialogFooter>
    </>
  );
}

function AddMedButton({ onAdd }: { onAdd: (m: Med) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="h-4 w-4" /> {t("Add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("New medication")}</DialogTitle>
        </DialogHeader>
        {open && (
          <MedFields
            onCancel={() => setOpen(false)}
            onSave={(m) => {
              onAdd(m);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}