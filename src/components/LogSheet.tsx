import { useState, useMemo, type ReactNode } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Plus, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Check, Pencil } from "lucide-react";
import {
  PAIN_DESCRIPTIONS, painColor, BODY_PARTS_DEFAULT, PAIN_QUALITY_DEFAULT, OTHER_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT, WORKOUT_KINDS_DEFAULT, BRISTOL, DISCHARGE_OPTS, MOODS_DEFAULT,
  TETANY_TYPES, TETANY_LOCATIONS_DEFAULT, TETANY_TRIGGERS, TETANY_HELPED_DEFAULT,
  PANIC_PHYSICAL, PANIC_COGNITIVE, PANIC_HELPED_DEFAULT, SEX_TYPES_DEFAULT,
  BODY_BATTERY, SLEEP_QUALITY, EVENT_COLORS,
  BOWEL_FEELINGS_DEFAULT, BOWEL_SYMPTOMS_DEFAULT,
  todayKey, nowHHMM, updateDayLog, asArr,
  type BixboData, type DayLog, type PainEntry, type PeriodLevel, type FoodEntry,
  type BowelEntry, type ThermoSession, type ThermoKind, type SexEntry, type SexKind,
  type ExtraMed, type WorkoutEntry, type EventEntry, type TaskEntry,
  type TetanyEpisode, type PanicAttack, type PainfulWhen,
} from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;
type Category =
  | "meds" | "pain" | "panic" | "period" | "sex" | "heat"
  | "food" | "bowel" | "workout" | "temp" | "task" | "event" | "note";

const CATEGORIES: { id: Category; label: string; emoji: string; hint: string }[] = [
  { id: "pain",    label: "Pain",             emoji: "🔥", hint: "0–10, body, quality" },
  { id: "period",  label: "Blueberry 🫐",     emoji: "🫐", hint: "Flow · discharge · notes" },
  { id: "heat",    label: "Heat / Cold",      emoji: "♨️", hint: "Heating or ice session" },
  { id: "food",    label: "Food",             emoji: "🍽️", hint: "What & how you feel" },
  { id: "bowel",   label: "Bowel",            emoji: "💩", hint: "Bristol type" },
  { id: "sex",     label: "ŠukŠuk! ❤️",       emoji: "❤️", hint: "All kinds of activity" },
  { id: "workout", label: "Workout",          emoji: "🧘🏼‍♀️", hint: "Type · duration · weight" },
  { id: "temp",    label: "Temp & Sleep",     emoji: "🌡️", hint: "°C · kg · hours" },
  { id: "meds",    label: "Meds",             emoji: "💊", hint: "Taken · extra dose" },
  { id: "event",   label: "Event",            emoji: "📅", hint: "Multi-day · time · note" },
  { id: "task",    label: "Task",             emoji: "✅", hint: "To-do with date & time" },
  { id: "note",    label: "Note",             emoji: "📝", hint: "Any thought for today" },
];

export function LogSheet({
  open, onOpenChange, date, data, update, initial, initialPain, editEntry,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
  initial?: Category;
  initialPain?: PainEntry;
  editEntry?: unknown;
}) {
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const [editingOrder, setEditingOrder] = useState(false);
  const close = () => { setCat(null); setEditingOrder(false); onOpenChange(false); };
  const back = () => setCat(null);
  const active = cat ?? initial;
  const edit = editEntry;

  const orderedCats = useMemo(() => {
    const saved = data.settings.logOrder ?? [];
    const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: typeof CATEGORIES = [];
    for (const id of saved) {
      const c = byId.get(id as Category);
      if (c && !seen.has(id)) { out.push(c); seen.add(id); }
    }
    for (const c of CATEGORIES) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [data.settings.logOrder]);

  const moveCat = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= orderedCats.length) return;
    const next = orderedCats.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    update((d) => ({ ...d, settings: { ...d.settings, logOrder: next.map((c) => c.id) } }));
  };

  return (
    <Sheet open={open} onOpenChange={(b) => { if (!b) close(); }}>
      <SheetContent
        side="bottom"
        className={
          (active
            ? "flex h-[100dvh] max-h-[100dvh] flex-col rounded-t-none bg-background p-0"
            : "flex h-[88vh] max-h-[88vh] flex-col rounded-t-3xl bg-background p-0") +
          " [&>button.absolute]:hidden"
        }
      >
        {!active ? (
          <>
            <SheetHeader className="shrink-0 relative px-5 pt-5 pb-2">
              <SheetTitle className="text-center font-serif text-2xl">Log</SheetTitle>
              <button onClick={() => setEditingOrder((v) => !v)}
                className="absolute left-4 top-4 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-tint">
                {editingOrder ? <><Check className="h-4 w-4" /> Done</> : <><GripVertical className="h-4 w-4" /> Reorder</>}
              </button>
              <button onClick={close} aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-1 hover:bg-tint">
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-border border-t border-border">
              {orderedCats.map((c, i) => (
                <li key={c.id}>
                  {editingOrder ? (
                    <div className="flex w-full items-center gap-3 bg-surface px-5 py-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-tint text-xl">{c.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">{c.label}</p>
                      </div>
                      <button onClick={() => moveCat(i, -1)} disabled={i === 0}
                        className="rounded-full p-2 hover:bg-tint disabled:opacity-30" aria-label="Move up">
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button onClick={() => moveCat(i, 1)} disabled={i === orderedCats.length - 1}
                        className="rounded-full p-2 hover:bg-tint disabled:opacity-30" aria-label="Move down">
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setCat(c.id)}
                      className="flex w-full items-center gap-3 bg-surface px-5 py-3 text-left transition hover:bg-tint">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-tint text-xl">{c.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">{c.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.hint}</p>
                      </div>
                      <span className="text-muted-foreground">›</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="shrink-0 flex-row items-center justify-between border-b border-border px-5 py-3">
              <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground">
                <ChevronLeft className="h-4 w-4" /> Back to Log
              </button>
              <SheetTitle className="font-serif text-lg">{CATEGORIES.find((c) => c.id === active)?.label}</SheetTitle>
              <button onClick={close} aria-label="Close" className="rounded-full p-1 hover:bg-tint">
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <div className={`min-h-0 flex-1 overflow-y-auto ${active === "pain" ? "" : "px-5 py-4"}`}>
              {active === "pain"    && <PainWizard    date={date} data={data} update={update} onDone={close} initialEntry={initialPain ?? (edit as PainEntry | undefined)} />}
              {active === "panic"   && <PanicForm     date={date} data={data} update={update} onDone={close} initialEntry={edit as PanicAttack | undefined} />}
              {active === "period"  && <PeriodForm    date={date} data={data} update={update} onDone={close} />}
              {active === "sex"     && <SexForm       date={date} data={data} update={update} onDone={close} initialEntry={edit as SexEntry | undefined} />}
              {active === "heat"    && <ThermoForm    date={date} update={update} onDone={close} initialEntry={edit as ThermoSession | undefined} />}
              {active === "food"    && <FoodForm      date={date} data={data} update={update} onDone={close} initialEntry={edit as FoodEntry | undefined} />}
              {active === "bowel"   && <BowelForm     date={date} data={data} update={update} onDone={close} initialEntry={edit as BowelEntry | undefined} />}
              {active === "workout" && <WorkoutForm   date={date} data={data} update={update} onDone={close} initialEntry={edit as WorkoutEntry | undefined} />}
              {active === "temp"    && <TempForm      date={date} data={data} update={update} onDone={close} />}
              {active === "meds"    && <MedsForm      date={date} data={data} update={update} onDone={close} />}
              {active === "task"    && <TaskForm      date={date} update={update} onDone={close} initialEntry={edit as TaskEntry | undefined} />}
              {active === "event"   && <EventForm     date={date} update={update} onDone={close} initialEntry={edit as EventEntry | undefined} />}
              {active === "note"    && <NoteForm     date={date} update={update} onDone={close} />}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------- Primitives ------------------- */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Chip({
  active, onClick, children, color,
}: { active: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "text-white shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background scale-[1.03]"
          : "bg-tint text-foreground ring-1 ring-border"
      }`}
      style={active && color ? { background: color } : active ? { background: "var(--primary)" } : undefined}
    >
      {children}
    </button>
  );
}
function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <SheetFooter className="mt-4 gap-2 sm:flex-row">
      <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      <Button onClick={onSave} disabled={disabled} className="flex-1">Save</Button>
    </SheetFooter>
  );
}
function CustomChipList({
  base, custom, onAddCustom, onRemoveCustom, onRenameCustom, selected, onToggle,
}: {
  base: string[]; custom: string[];
  onAddCustom: (v: string) => void;
  onRemoveCustom?: (v: string) => void;
  onRenameCustom?: (oldV: string, newV: string) => void;
  selected: string[]; onToggle: (v: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {base.map((v) => (
        <Chip key={v} active={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>
      ))}
      {custom.map((v) => (
        <span key={v} className="relative inline-flex items-center">
          <Chip active={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>
          {onRenameCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = prompt(`Rename "${v}" to:`, v);
                if (next && next.trim() && next.trim() !== v) onRenameCustom(v, next.trim());
              }}
              aria-label={`Rename ${v}`}
              className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-primary/15 hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onRemoveCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove "${v}" from your custom list?`)) onRemoveCustom(v);
              }}
              aria-label={`Remove ${v}`}
              className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {adding ? (
        <div className="flex items-center gap-1">
          <Input value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-32" placeholder="Custom…" />
          <Button size="sm" onClick={() => { if (text.trim()) { onAddCustom(text.trim()); setText(""); setAdding(false); } }}>Add</Button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Plus className="h-3 w-3" /> Add
        </button>
      )}
    </div>
  );
}
const toggleIn = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/* ------------------- PAIN wizard ------------------- */
function PainWizard({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: PainEntry }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(initialEntry?.score ?? 0);
  const [parts, setParts] = useState<string[]>(initialEntry?.parts ?? []);
  const [quality, setQuality] = useState<string[]>(initialEntry?.quality ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  // Extended
  const [tetany, setTetany] = useState(false);
  const [tetanyTypes, setTetanyTypes] = useState<string[]>([]);
  const [tetanyLoc, setTetanyLoc] = useState<string[]>([]);
  const [tetanyIntensity, setTetanyIntensity] = useState(1);
  const [tetanyMin, setTetanyMin] = useState(5);
  const [tetanyTriggers, setTetanyTriggers] = useState<string[]>([]);
  const [tetanyHelped, setTetanyHelped] = useState<string[]>([]);
  const [tetanyNote, setTetanyNote] = useState("");
  // Panic (full inline log — under Tetany)
  const [panic, setPanic] = useState(false);
  const [panicTime, setPanicTime] = useState(nowHHMM());
  const [panicIntensity, setPanicIntensity] = useState(5);
  const [panicMinutes, setPanicMinutes] = useState(10);
  const [panicPhysical, setPanicPhysical] = useState<string[]>([]);
  const [panicCognitive, setPanicCognitive] = useState<string[]>([]);
  const [panicTrigger, setPanicTrigger] = useState("");
  const [panicPlace, setPanicPlace] = useState("");
  const [panicHyper, setPanicHyper] = useState<"no" | "before" | "during" | "unknown">("unknown");
  const [panicTetany, setPanicTetany] = useState(false);
  const [panicHelped, setPanicHelped] = useState<string[]>([]);
  const [panicNote, setPanicNote] = useState("");
  const [bodyBattery, setBodyBattery] = useState<number | undefined>(initialEntry?.bodyBattery);
  const [stress, setStress] = useState<number | undefined>(initialEntry?.stress);
  const [mood, setMood] = useState<string[]>(initialEntry?.mood ?? []);

  type CKey = "bodyParts" | "quality" | "symptoms" | "moods"
    | "tetanyTypes" | "tetanyLocations" | "tetanyTriggers" | "tetanyHelped";
  const addCustom = (key: CKey, v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, [key]: [...d.custom[key], v] } }));
  const removeCustom = (key: CKey, v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, [key]: d.custom[key].filter((x) => x !== v) } }));
  const renameCustom = (key: CKey, oldV: string, newV: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, [key]: d.custom[key].map((x) => x === oldV ? newV : x) } }));

  const save = () => {
    const editing = !!initialEntry;
    const p: PainEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time: initialEntry?.time ?? nowHHMM(),
      score, parts, quality, symptoms, note: note.trim(),
      bodyBattery, stress, mood: mood.length ? mood : undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      pain: editing
        ? (l.pain ?? []).map((x) => x.id === p.id ? p : x)
        : [...(l.pain ?? []), p],
    }));
    if (tetany) {
      const t: TetanyEpisode = {
        id: crypto.randomUUID(), time: nowHHMM(),
        types: tetanyTypes, location: tetanyLoc, intensity: tetanyIntensity,
        minutes: tetanyMin, triggers: tetanyTriggers, helped: tetanyHelped,
        note: tetanyNote.trim() || undefined,
      };
      updateDayLog(update, date, (l) => ({ ...l, tetany: [...(l.tetany ?? []), t] }));
    }
    if (panic) {
      const pk: PanicAttack = {
        id: crypto.randomUUID(), time: panicTime, minutes: panicMinutes, intensity: panicIntensity,
        physical: panicPhysical, cognitive: panicCognitive, trigger: panicTrigger.trim(),
        place: panicPlace.trim() || undefined,
        hyperventilation: panicHyper, tetanyPresent: panicTetany, helped: panicHelped,
        note: panicNote.trim() || undefined,
      };
      updateDayLog(update, date, (l) => ({ ...l, panic: [...(l.panic ?? []), pk] }));
    }
    onDone();
  };

  const bg = painColor(score);
  const bgFill = `color-mix(in oklab, ${bg} 35%, white)`;

  return (
    <div className="flex min-h-full flex-col px-5 py-4 transition-colors" style={{ background: bgFill }}>

      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-primary" : "bg-tint"}`} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{step + 1}/5</span>
      </div>

      {step === 0 && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="grid h-32 w-32 place-items-center rounded-full text-5xl font-bold text-white"
               style={{ background: bg }}>
            {Number.isInteger(score) ? score : score.toFixed(1)}
          </div>
          <p className="text-center font-medium">{PAIN_DESCRIPTIONS[Math.round(score)]}</p>
          <div className="w-full px-4">
            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 px-4">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button key={n} onClick={() => setScore(n)}
                className={`h-8 w-8 rounded-full text-[11px] font-semibold ${
                  score === n ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"
                }`}
                style={score === n ? { background: painColor(n) } : undefined}>
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <Field label="Where does it hurt?">
          <CustomChipList base={BODY_PARTS_DEFAULT} custom={data.custom.bodyParts}
            onAddCustom={(v) => addCustom("bodyParts", v)}
            onRemoveCustom={(v) => { removeCustom("bodyParts", v); setParts((a) => a.filter((x) => x !== v)); }}
            onRenameCustom={(o, n) => { renameCustom("bodyParts", o, n); setParts((a) => a.map((x) => x === o ? n : x)); }}
            selected={parts} onToggle={(v) => setParts((a) => toggleIn(a, v))} />
        </Field>
      )}
      {step === 2 && (
        <Field label="How does it hurt?">
          <CustomChipList base={PAIN_QUALITY_DEFAULT} custom={data.custom.quality}
            onAddCustom={(v) => addCustom("quality", v)}
            onRemoveCustom={(v) => { removeCustom("quality", v); setQuality((a) => a.filter((x) => x !== v)); }}
            onRenameCustom={(o, n) => { renameCustom("quality", o, n); setQuality((a) => a.map((x) => x === o ? n : x)); }}
            selected={quality} onToggle={(v) => setQuality((a) => toggleIn(a, v))} />
        </Field>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <Field label="Other symptoms">
            <CustomChipList base={OTHER_SYMPTOMS_DEFAULT} custom={data.custom.symptoms}
              onAddCustom={(v) => addCustom("symptoms", v)}
              onRemoveCustom={(v) => { removeCustom("symptoms", v); setSymptoms((a) => a.filter((x) => x !== v)); }}
              onRenameCustom={(o, n) => { renameCustom("symptoms", o, n); setSymptoms((a) => a.map((x) => x === o ? n : x)); }}
              selected={symptoms} onToggle={(v) => setSymptoms((a) => toggleIn(a, v))} />
          </Field>
          <Field label="Tetany episode?">
            <div className="mt-1 flex gap-2">
              <Chip active={!tetany} onClick={() => setTetany(false)}>No</Chip>
              <Chip active={tetany} onClick={() => setTetany(true)}>Yes — log it</Chip>
            </div>
          </Field>
          {tetany && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label="Type">
                <CustomChipList base={TETANY_TYPES} custom={data.custom.tetanyTypes}
                  onAddCustom={(v) => addCustom("tetanyTypes", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyTypes", v); setTetanyTypes((a) => a.filter((x) => x !== v)); }}
                  onRenameCustom={(o, n) => { renameCustom("tetanyTypes", o, n); setTetanyTypes((a) => a.map((x) => x === o ? n : x)); }}
                  selected={tetanyTypes} onToggle={(v) => setTetanyTypes((a) => toggleIn(a, v))} />
              </Field>
              <Field label="Location">
                <CustomChipList base={TETANY_LOCATIONS_DEFAULT} custom={data.custom.tetanyLocations}
                  onAddCustom={(v) => addCustom("tetanyLocations", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyLocations", v); setTetanyLoc((a) => a.filter((x) => x !== v)); }}
                  onRenameCustom={(o, n) => { renameCustom("tetanyLocations", o, n); setTetanyLoc((a) => a.map((x) => x === o ? n : x)); }}
                  selected={tetanyLoc} onToggle={(v) => setTetanyLoc((a) => toggleIn(a, v))} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Intensity ${tetanyIntensity}/5`}>
                  <Slider value={[tetanyIntensity]} min={1} max={5} step={1} onValueChange={([v]) => setTetanyIntensity(v)} />
                </Field>
                <Field label="Duration (min)">
                  <Input type="number" min={1} value={tetanyMin} onChange={(e) => setTetanyMin(Number(e.target.value))} />
                </Field>
              </div>
              <Field label="Triggers">
                <CustomChipList base={TETANY_TRIGGERS} custom={data.custom.tetanyTriggers}
                  onAddCustom={(v) => addCustom("tetanyTriggers", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyTriggers", v); setTetanyTriggers((a) => a.filter((x) => x !== v)); }}
                  onRenameCustom={(o, n) => { renameCustom("tetanyTriggers", o, n); setTetanyTriggers((a) => a.map((x) => x === o ? n : x)); }}
                  selected={tetanyTriggers} onToggle={(v) => setTetanyTriggers((a) => toggleIn(a, v))} />
              </Field>
              <Field label="What helped">
                <CustomChipList base={TETANY_HELPED_DEFAULT} custom={data.custom.tetanyHelped}
                  onAddCustom={(v) => addCustom("tetanyHelped", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyHelped", v); setTetanyHelped((a) => a.filter((x) => x !== v)); }}
                  onRenameCustom={(o, n) => { renameCustom("tetanyHelped", o, n); setTetanyHelped((a) => a.map((x) => x === o ? n : x)); }}
                  selected={tetanyHelped} onToggle={(v) => setTetanyHelped((a) => toggleIn(a, v))} />
              </Field>
              <Field label="Note (optional)">
                <Textarea rows={2} value={tetanyNote} onChange={(e) => setTetanyNote(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Panic attack?">
            <div className="mt-1 flex gap-2">
              <Chip active={!panic} onClick={() => setPanic(false)}>No</Chip>
              <Chip active={panic} onClick={() => setPanic(true)}>Yes — log it</Chip>
            </div>
          </Field>
          {panic && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Intensity ${panicIntensity}/10`}>
                  <Slider value={[panicIntensity]} min={1} max={10} step={1} onValueChange={([v]) => setPanicIntensity(v)} />
                </Field>
                <Field label="Duration (min)">
                  <Input type="number" min={1} value={panicMinutes} onChange={(e) => setPanicMinutes(Number(e.target.value))} />
                </Field>
              </div>
              <Field label="Trigger (optional)">
                <Input value={panicTrigger} onChange={(e) => setPanicTrigger(e.target.value)} placeholder="What set it off?" />
              </Field>
              <p className="text-[11px] text-muted-foreground">For full details use the Panic attack log entry.</p>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Field label={`Stress ${stress ?? "-"} / 10`}>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, n) => {
                const hue = 130 - n * 13;
                const bg = `hsl(${hue} 70% 50%)`;
                const active = stress === n;
                return (
                  <button key={n} onClick={() => setStress(stress === n ? undefined : n)}
                    className={`h-9 w-9 rounded-full text-xs font-bold transition ${
                      active ? "text-white ring-2 ring-foreground scale-110" : "text-white/90"
                    }`}
                    style={{ background: bg, opacity: active || stress == null ? 1 : 0.55 }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Body battery">
            <div className="mt-2 flex justify-between gap-2">
              {BODY_BATTERY.map((b) => (
                <button key={b.n} onClick={() => setBodyBattery(bodyBattery === b.n ? undefined : b.n)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border p-2 transition ${bodyBattery === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                  <div className="grid h-10 w-6 place-items-end rounded-md border-2 border-foreground/60 p-0.5">
                    <div className="w-full rounded" style={{ height: `${b.n * 18}%`, background: b.color }} />
                  </div>
                  <span className="text-[10px]">{b.emoji}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Mood">
            <CustomChipList base={MOODS_DEFAULT} custom={data.custom.moods}
              onAddCustom={(v) => addCustom("moods", v)}
              onRemoveCustom={(v) => { removeCustom("moods", v); setMood((a) => a.filter((x) => x !== v)); }}
              onRenameCustom={(o, n) => { renameCustom("moods", o, n); setMood((a) => a.map((x) => x === o ? n : x)); }}
              selected={mood} onToggle={(v) => setMood((a) => toggleIn(a, v))} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else…" />
          </Field>
        </div>
      )}


      <SheetFooter className="mt-4 flex-row gap-2">
        {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} className="flex-1">Next</Button>
        ) : (
          <Button onClick={save} className="flex-1">Save</Button>
        )}
      </SheetFooter>
    </div>
  );
}

/* ------------------- PANIC attack ------------------- */
function PanicForm({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: PanicAttack }) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [minutes, setMinutes] = useState(initialEntry?.minutes ?? 10);
  const [intensity, setIntensity] = useState(initialEntry?.intensity ?? 5);
  const [physical, setPhysical] = useState<string[]>(initialEntry?.physical ?? []);
  const [cognitive, setCognitive] = useState<string[]>(initialEntry?.cognitive ?? []);
  const [trigger, setTrigger] = useState(initialEntry?.trigger ?? "");
  const [place, setPlace] = useState(initialEntry?.place ?? "");
  const [hyper, setHyper] = useState<"no" | "before" | "during" | "unknown">(initialEntry?.hyperventilation ?? "unknown");
  const [tetanyPresent, setTetanyPresent] = useState(initialEntry?.tetanyPresent ?? false);
  const [helped, setHelped] = useState<string[]>(initialEntry?.helped ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addHelped = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, panicHelped: [...d.custom.panicHelped, v] } }));
  const rmHelped = (v: string) => { update((d) => ({ ...d, custom: { ...d.custom, panicHelped: d.custom.panicHelped.filter((x) => x !== v) } })); setHelped((a) => a.filter((x) => x !== v)); };

  const save = () => {
    const editing = !!initialEntry;
    const p: PanicAttack = {
      id: initialEntry?.id ?? crypto.randomUUID(), time, minutes, intensity,
      physical, cognitive, trigger: trigger.trim(), place: place.trim() || undefined,
      hyperventilation: hyper, tetanyPresent, helped, note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      panic: editing ? (l.panic ?? []).map((x) => x.id === p.id ? p : x) : [...(l.panic ?? []), p],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" /></Field>
        <Field label="Duration (min)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full" /></Field>
      </div>
      <Field label={`Intensity ${intensity}/10`}>
        <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={([v]) => setIntensity(v)} />
      </Field>
      <Field label="Physical symptoms">
        <CustomChipList base={PANIC_PHYSICAL} custom={data.custom.panicPhysical}
          onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: [...d.custom.panicPhysical, v] } }))}
          onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.filter((x) => x !== v) } })); setPhysical((a) => a.filter((x) => x !== v)); }}
          onRenameCustom={(o, n) => { update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.map((x) => x === o ? n : x) } })); setPhysical((a) => a.map((x) => x === o ? n : x)); }}
          selected={physical} onToggle={(v) => setPhysical((a) => toggleIn(a, v))} />
      </Field>
      <Field label="Cognitive symptoms">
        <CustomChipList base={PANIC_COGNITIVE} custom={data.custom.panicCognitive}
          onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: [...d.custom.panicCognitive, v] } }))}
          onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.filter((x) => x !== v) } })); setCognitive((a) => a.filter((x) => x !== v)); }}
          onRenameCustom={(o, n) => { update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.map((x) => x === o ? n : x) } })); setCognitive((a) => a.map((x) => x === o ? n : x)); }}
          selected={cognitive} onToggle={(v) => setCognitive((a) => toggleIn(a, v))} />
      </Field>
      <Field label="Trigger (or 'no obvious trigger')">
        <Textarea rows={2} value={trigger} onChange={(e) => setTrigger(e.target.value)} />
      </Field>
      <Field label="Place (optional)">
        <Input value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      <Field label="Hyperventilation">
        <div className="mt-2 flex flex-wrap gap-2">
          {(["no", "before", "during", "unknown"] as const).map((v) =>
            <Chip key={v} active={hyper === v} onClick={() => setHyper(v)}>{v}</Chip>)}
        </div>
      </Field>
      <Field label="Tetany present?">
        <div className="mt-2 flex gap-2">
          <Chip active={!tetanyPresent} onClick={() => setTetanyPresent(false)}>No</Chip>
          <Chip active={tetanyPresent} onClick={() => setTetanyPresent(true)}>Yes</Chip>
        </div>
      </Field>
      <Field label="What helped">
        <CustomChipList base={PANIC_HELPED_DEFAULT} custom={data.custom.panicHelped}
          onAddCustom={addHelped} onRemoveCustom={rmHelped}
          selected={helped} onToggle={(v) => setHelped((a) => toggleIn(a, v))} />
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- PERIOD (Blueberry) ------------------- */
function PeriodForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date]?.periodInfo;
  const [level, setLevel] = useState<PeriodLevel>(cur?.level ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");

  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: level || undefined,
      periodInfo: { level, discharge: discharge || undefined, dischargeNote: dNote.trim() || undefined, note: note.trim() || undefined },
    }));
    onDone();
  };
  const LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
    { v: "spotting",  label: "Spotting",  color: "var(--period-spotting)" },
    { v: "light",     label: "Light",     color: "var(--period-light)" },
    { v: "medium",    label: "Medium",    color: "var(--period-medium)" },
    { v: "heavy",     label: "Heavy",     color: "var(--period-heavy)" },
    { v: "veryheavy", label: "Very heavy",color: "var(--period-veryheavy)" },
  ];
  return (
    <div className="space-y-3">
      <Field label="Flow">
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {LEVELS.map((L) => (
            <button key={L.v} onClick={() => setLevel(L.v)}
              className={`rounded-2xl p-2 text-[11px] font-medium ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`}
              style={level === L.v ? { background: L.color } : undefined}>
              {L.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Discharge (optional)">
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => (
            <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? "" : d.value)} color={d.color}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Discharge note (optional)">
        <Input value={dNote} onChange={(e) => setDNote(e.target.value)} />
      </Field>
      <Field label="Day note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="rounded-xl bg-tint p-3 text-xs text-muted-foreground">
        Cycle prediction is based on your last period and cycle length (edit in Settings later).
      </div>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- ŠukŠuk (Sex) ------------------- */
function SexForm({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: SexEntry }) {
  const [kind, setKind] = useState<SexKind>(initialEntry?.kind ?? "sex");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initialEntry?.feelingAfter));
  const [painful, setPainful] = useState<PainfulWhen>(initialEntry?.painful ?? "no");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addCustom = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, sexTypes: [...d.custom.sexTypes, v] } }));
  const rmCustom = (v: string) => {
    if (!confirm(`Remove "${v}" from your list?`)) return;
    update((d) => ({ ...d, custom: { ...d.custom, sexTypes: d.custom.sexTypes.filter((x) => x !== v) } }));
    if (kind === (`other:${v}` as SexKind)) setKind("sex");
  };
  const custom = data.custom.sexTypes;
  const save = () => {
    const editing = !!initialEntry;
    const e: SexEntry = { id: initialEntry?.id ?? crypto.randomUUID(), time, kind,
      feelingAfter: feelingAfter.length ? feelingAfter : undefined, painful, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({
      ...l,
      sex: editing ? (l.sex ?? []).map((x) => x.id === e.id ? e : x) : [...(l.sex ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Type">
        <div className="mt-2 flex flex-wrap gap-2">
          {SEX_TYPES_DEFAULT.map((o) => <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>{o.label}</Chip>)}
          {custom.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <Chip active={kind === (`other:${c}` as SexKind)} onClick={() => setKind(`other:${c}` as SexKind)}>{c}</Chip>
              <button onClick={(e) => { e.stopPropagation(); rmCustom(c); }} aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline onAdd={addCustom} />
        </div>
      </Field>
      <Field label="How I feel after">
        <div className="mt-2 flex flex-wrap gap-2">
          {["😊 Great","🙂 Good","😐 Meh","😞 Down","🤕 Sore","😴 Sleepy"].map((f) =>
            <Chip key={f} active={feelingAfter.includes(f)} onClick={() => setFeelingAfter((a) => toggleIn(a, f))}>{f}</Chip>)}
        </div>
      </Field>
      <Field label="Painful?">
        <div className="mt-2 flex gap-2">
          {(["no","before","during","after"] as const).map((v) =>
            <Chip key={v} active={painful === v} onClick={() => setPainful(v)}>{v}</Chip>)}
        </div>
      </Field>
      <Field label="Note (optional)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}
function AddCustomInline({ onAdd }: { onAdd: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  if (!adding) return (
    <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Plus className="h-3 w-3" /> Add
    </button>
  );
  return (
    <div className="flex items-center gap-1">
      <Input value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-32" placeholder="Custom…" />
      <Button size="sm" onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); setAdding(false); } }}>Add</Button>
    </div>
  );
}

/* ------------------- Heat / Cold / TENS ------------------- */
function ThermoForm({ date, update, onDone, initialEntry }:
  { date: string; update: UpdateFn; onDone: () => void; initialEntry?: ThermoSession }) {
  const [kind, setKind] = useState<ThermoKind>(initialEntry?.kind ?? "heat");
  const [start, setStart] = useState(initialEntry?.start ?? nowHHMM());
  const [minutes, setMinutes] = useState(initialEntry?.minutes ?? 20);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    const editing = !!initialEntry;
    const e: ThermoSession = { id: initialEntry?.id ?? crypto.randomUUID(), kind, start, minutes, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({
      ...l,
      heat: editing ? (l.heat ?? []).map((x) => x.id === e.id ? e : x) : [...(l.heat ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Type">
        <div className="mt-2 flex gap-2">
          <Chip active={kind === "heat"} onClick={() => setKind("heat")}>🔥 Heat</Chip>
          <Chip active={kind === "cold"} onClick={() => setKind("cold")}>🧊 Cold</Chip>
          <Chip active={kind === "tens"} onClick={() => setKind("tens")}>⚡ TENS</Chip>
        </div>
      </Field>
      <div className="flex gap-2">
        <Field label="Start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" /></Field>
        <Field label="Duration (min)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full" /></Field>
      </div>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- FOOD ------------------- */
function FoodForm({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: FoodEntry }) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [what, setWhat] = useState(initialEntry?.what ?? "");
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [after, setAfter] = useState(initialEntry?.after ?? "");
  const [hydration, setHydration] = useState<string>(initialEntry?.hydrationMl != null ? String(initialEntry.hydrationMl) : "");
  const [caffeine, setCaffeine] = useState<string>(initialEntry?.caffeineMg != null ? String(initialEntry.caffeineMg) : "");
  const [alcohol, setAlcohol] = useState<string>(initialEntry?.alcoholDrinks != null ? String(initialEntry.alcoholDrinks) : "");
  const addCustom = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, foodFeelings: [...d.custom.foodFeelings, v] } }));
  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol) return;
    const editing = !!initialEntry;
    const entry: FoodEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(), time, what: what.trim(), feelings, after: after.trim() || undefined,
      hydrationMl: hydration === "" ? undefined : Number(hydration),
      caffeineMg:  caffeine  === "" ? undefined : Number(caffeine),
      alcoholDrinks: alcohol === "" ? undefined : Number(alcohol),
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      food: editing ? (l.food ?? []).map((x) => x.id === entry.id ? entry : x) : [...(l.food ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Quick add">
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { l: "🍵 Matcha", w: "Matcha", caf: 70 },
            { l: "☕ Coffee", w: "Coffee", caf: 95 },
            { l: "🫖 Tea",    w: "Tea",    caf: 40 },
            { l: "💧 Water",  w: "Water",  hyd: 250 },
            { l: "🥑 Avocado",w: "Avocado" },
          ].map((q) => (
            <button key={q.l} type="button"
              onClick={() => {
                setWhat((w) => w ? `${w}, ${q.w}` : q.w);
                if (q.caf) setCaffeine(String((Number(caffeine) || 0) + q.caf));
                if (q.hyd) setHydration(String((Number(hydration) || 0) + q.hyd));
              }}
              className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10">
              {q.l}
            </button>
          ))}
          {data.custom.foodQuickAdd.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <button type="button"
                onClick={() => setWhat((w) => w ? `${w}, ${c}` : c)}
                className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10">
                {c}
              </button>
              <button onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove "${c}" from quick add?`))
                  update((d) => ({ ...d, custom: { ...d.custom, foodQuickAdd: d.custom.foodQuickAdd.filter((x) => x !== c) } }));
              }} aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline onAdd={(v) => update((d) => ({ ...d, custom: { ...d.custom, foodQuickAdd: [...d.custom.foodQuickAdd, v] } }))} />
        </div>
      </Field>
      <Field label="What did you eat?">
        <Textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. chicken, rice, tomato" />
      </Field>
      <Field label="How do you feel?">
        <CustomChipList base={FOOD_FEELINGS_DEFAULT} custom={data.custom.foodFeelings}
          onAddCustom={addCustom}
          onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, foodFeelings: d.custom.foodFeelings.filter((x) => x !== v) } })); setFeelings((a) => a.filter((x) => x !== v)); }}
          selected={feelings} onToggle={(v) => setFeelings((a) => toggleIn(a, v))} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Water (ml)"><Input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} placeholder="300" /></Field>
        <Field label="Caffeine (mg)"><Input type="number" value={caffeine} onChange={(e) => setCaffeine(e.target.value)} placeholder="80" /></Field>
        <Field label="Alcohol (drinks)"><Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder="0" /></Field>
      </div>
      <Field label="Additional note (optional)">
        <Textarea rows={2} value={after} onChange={(e) => setAfter(e.target.value)} />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- BOWEL ------------------- */
function BristolIcon({ shape, color }: { shape: string; color: string }) {
  const s = shape;
  return (
    <svg viewBox="0 0 60 40" className="h-8 w-14 shrink-0">
      {s === "lumps" && Array.from({ length: 5 }).map((_, i) => (
        <circle key={i} cx={8 + i * 11} cy={20} r={4.5} fill={color} />
      ))}
      {s === "lumpy" && <rect x={4} y={12} width={52} height={16} rx={7} fill={color} stroke="#0002" strokeDasharray="4 3" />}
      {s === "cracked" && <>
        <rect x={4} y={12} width={52} height={16} rx={8} fill={color} />
        {[16, 26, 36, 46].map((x) => <line key={x} x1={x} y1={13} x2={x} y2={27} stroke="#0004" strokeWidth={1.5} />)}
      </>}
      {s === "smooth" && <rect x={4} y={13} width={52} height={14} rx={7} fill={color} />}
      {s === "blobs" && <>
        <ellipse cx={16} cy={20} rx={10} ry={7} fill={color} />
        <ellipse cx={32} cy={20} rx={9} ry={6} fill={color} />
        <ellipse cx={46} cy={20} rx={8} ry={6} fill={color} />
      </>}
      {s === "mushy" && <path d="M4 22 Q10 10 20 22 T36 22 T56 22 L56 30 L4 30 Z" fill={color} />}
      {s === "liquid" && <>
        <rect x={4} y={22} width={52} height={8} rx={4} fill={color} />
        {[12, 24, 36, 48].map((x) => <circle key={x} cx={x} cy={16} r={2} fill={color} opacity={0.6} />)}
      </>}
    </svg>
  );
}
function BowelForm({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: BowelEntry }) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [bristol, setBristol] = useState<number>(initialEntry?.bristol ?? 4);
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addFeel = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: [...d.custom.bowelFeelings, v] } }));
  const rmFeel = (v: string) => { update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: d.custom.bowelFeelings.filter((x) => x !== v) } })); setFeelings((a) => a.filter((x) => x !== v)); };
  const addSym = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: [...d.custom.bowelSymptoms, v] } }));
  const rmSym = (v: string) => { update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: d.custom.bowelSymptoms.filter((x) => x !== v) } })); setSymptoms((a) => a.filter((x) => x !== v)); };
  const save = () => {
    const editing = !!initialEntry;
    const entry: BowelEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(), time, bristol,
      feelings: feelings.length ? feelings : undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      bowel: editing ? (l.bowel ?? []).map((x) => x.id === entry.id ? entry : x) : [...(l.bowel ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Bristol stool scale">
        <div className="mt-1 space-y-1.5">
          <button onClick={() => setBristol(0)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              bristol === 0 ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white bg-muted-foreground">–</span>
            <span className="flex-1">No bowel movement</span>
          </button>
          {BRISTOL.map((b) => (
            <button key={b.n} onClick={() => setBristol(b.n)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                bristol === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}>
              <span className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: b.color }}>{b.n}</span>
              <BristolIcon shape={b.shape} color={b.color} />
              <div className="flex-1">
                <p className="font-medium">{b.label}</p>
                <p className="text-[11px] text-muted-foreground">{b.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="How do you feel?">
        <CustomChipList base={BOWEL_FEELINGS_DEFAULT} custom={data.custom.bowelFeelings}
          onAddCustom={addFeel} onRemoveCustom={rmFeel}
          selected={feelings} onToggle={(v) => setFeelings((a) => toggleIn(a, v))} />
      </Field>
      <Field label="Symptoms">
        <CustomChipList base={BOWEL_SYMPTOMS_DEFAULT} custom={data.custom.bowelSymptoms}
          onAddCustom={addSym} onRemoveCustom={rmSym}
          selected={symptoms} onToggle={(v) => setSymptoms((a) => toggleIn(a, v))} />
      </Field>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- TEMP / WEIGHT / SLEEP ------------------- */
function TempForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date] ?? {};
  const [temperature, setTemperature] = useState<string>(cur.temperature != null ? String(cur.temperature) : "");
  const [weight, setWeight] = useState<string>(cur.weight != null ? String(cur.weight) : "");
  const [sleep, setSleep] = useState<string>(cur.sleepHours != null ? String(cur.sleepHours) : "");
  const [quality, setQuality] = useState<string[]>(asArr(cur.sleepQuality));
  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      temperature: temperature === "" ? undefined : Number(temperature),
      weight: weight === "" ? undefined : Number(weight),
      sleepHours: sleep === "" ? undefined : Number(sleep),
      sleepQuality: quality.length ? quality : undefined,
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Temperature (°C)"><Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.6" /></Field>
      <Field label="Weight (kg)"><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.0" /></Field>
      <Field label="Sleep (hours)"><Input type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="8" /></Field>
      <Field label="How I slept">
        <div className="mt-2 flex flex-wrap gap-2">
          {SLEEP_QUALITY.map((q) => <Chip key={q} active={quality.includes(q)} onClick={() => setQuality((a) => toggleIn(a, q))}>{q}</Chip>)}
        </div>
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- MEDS ------------------- */
function MedsForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const meds = data.meds;
  const taken = data.medLog[date] ?? {};
  const takenTimes = data.medLogTimes?.[date] ?? {};
  const toggle = (key: string, defaultTime?: string) => update((d) => {
    const day = { ...(d.medLog[date] ?? {}) };
    const times = { ...(d.medLogTimes?.[date] ?? {}) };
    const nextOn = !day[key];
    day[key] = nextOn;
    if (nextOn && defaultTime && !times[key]) times[key] = defaultTime;
    if (!nextOn) delete times[key];
    return { ...d, medLog: { ...d.medLog, [date]: day }, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
  });
  const setTakenTime = (key: string, time: string) => update((d) => {
    const times = { ...(d.medLogTimes?.[date] ?? {}) };
    times[key] = time;
    return { ...d, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
  });

  const [extraName, setExtraName] = useState("");
  const [extraDose, setExtraDose] = useState("");
  const [extraTime, setExtraTime] = useState(nowHHMM());
  const [extraNote, setExtraNote] = useState("");
  const addExtra = () => {
    if (!extraName.trim()) return;
    const e: ExtraMed = { id: crypto.randomUUID(), time: extraTime, name: extraName.trim(), dose: extraDose.trim() || undefined, note: extraNote.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, extraMeds: [...(l.extraMeds ?? []), e] }));
    setExtraName(""); setExtraDose(""); setExtraNote(""); setExtraTime(nowHHMM());
  };
  const today = date === todayKey();
  const extras = data.dayLogs[date]?.extraMeds ?? [];

  return (
    <div className="space-y-4">
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medications yet. Add them from Meds settings.</p>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{today ? "Today" : date}</p>
          <div className="mt-2 space-y-2">
            {meds.map((m) => m.asNeeded ? (
              <label key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                <input type="checkbox" checked={!!taken[`${m.id}@asneeded`]} onChange={() => toggle(`${m.id}@asneeded`, nowHHMM())} className="h-4 w-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">As needed{m.dose ? ` · ${m.dose}` : ""}</p>
                  {m.note && <p className="text-[11px] text-muted-foreground">📝 {m.note}</p>}
                </div>
                {taken[`${m.id}@asneeded`] && (
                  <Input type="time" value={takenTimes[`${m.id}@asneeded`] ?? nowHHMM()}
                    onChange={(e) => setTakenTime(`${m.id}@asneeded`, e.target.value)} className="h-8 w-24" />
                )}
              </label>
            ) : (
              m.times.map((t) => {
                const k = `${m.id}@${t}`;
                const isTaken = !!taken[k];
                return (
                  <label key={k} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                    <input type="checkbox" checked={isTaken} onChange={() => toggle(k, t)} className="h-4 w-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name} <span className="text-xs text-muted-foreground">· scheduled {t}</span></p>
                      {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                      {m.note && <p className="text-[11px] text-muted-foreground">📝 {m.note}</p>}
                    </div>
                    {isTaken && (
                      <Input type="time" value={takenTimes[k] ?? t}
                        onChange={(e) => setTakenTime(k, e.target.value)} className="h-8 w-24"
                        title="Actual time taken" />
                    )}
                  </label>
                );
              })
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Extra dose (one-off)</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input placeholder="Name" value={extraName} onChange={(e) => setExtraName(e.target.value)} className="col-span-2" />
          <Input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input placeholder="Dose (optional)" value={extraDose} onChange={(e) => setExtraDose(e.target.value)} />
          <Input placeholder="Note (optional)" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
        </div>
        <Button className="mt-2 w-full" onClick={addExtra} disabled={!extraName.trim()}>Add extra dose</Button>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {extras.map((e) => <li key={e.id}>• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}{e.note ? ` — ${e.note}` : ""}</li>)}
          </ul>
        )}
      </div>
      <SheetFooter className="mt-2">
        <Button className="w-full" onClick={onDone}>Done</Button>
      </SheetFooter>
    </div>
  );
}

/* ------------------- WORKOUT ------------------- */
function WorkoutForm({ date, data, update, onDone, initialEntry }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: WorkoutEntry }) {
  const [kind, setKind] = useState<string>(initialEntry?.kind ?? WORKOUT_KINDS_DEFAULT[0]);
  const [minutes, setMinutes] = useState<number>(initialEntry?.minutes ?? 30);
  const [weight, setWeight] = useState<string>(initialEntry?.weightKg != null ? String(initialEntry.weightKg) : "");
  const [feeling, setFeeling] = useState<string[]>(asArr(initialEntry?.feeling));
  const [note, setNote] = useState<string>(initialEntry?.note ?? "");
  const addKind = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: [...d.custom.workoutKinds, v] } }));
  const rmKind = (v: string) => { update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: d.custom.workoutKinds.filter((x) => x !== v) } })); if (kind === v) setKind(WORKOUT_KINDS_DEFAULT[0]); };

  const save = () => {
    const editing = !!initialEntry;
    const e: WorkoutEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(), time: initialEntry?.time ?? nowHHMM(), kind, minutes,
      weightKg: weight === "" ? undefined : Number(weight),
      feeling: feeling.length ? feeling : undefined, note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      workout: editing ? (l.workout ?? []).map((x) => x.id === e.id ? e : x) : [...(l.workout ?? []), e],
    }));
    if (weight !== "") updateDayLog(update, date, (l) => ({ ...l, weight: Number(weight) }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Type">
        <CustomChipList base={WORKOUT_KINDS_DEFAULT} custom={data.custom.workoutKinds}
          onAddCustom={addKind} onRemoveCustom={rmKind} selected={[kind]} onToggle={(v) => setKind(v)} />
      </Field>
      <Field label="Duration (minutes)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
      <Field label="Weight after (kg, optional)"><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
      <Field label="How you feel">
        <div className="mt-2 flex flex-wrap gap-2">
          {["😊 Great","🙂 Good","😐 Ok","😩 Tired","🤕 Sore"].map((f) =>
            <Chip key={f} active={feeling.includes(f)} onClick={() => setFeeling((a) => toggleIn(a, f))}>{f}</Chip>)}
        </div>
      </Field>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- EVENT ------------------- */
function EventForm({ date, update, onDone, initialEntry }:
  { date: string; update: UpdateFn; onDone: () => void; initialEntry?: EventEntry }) {
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [color, setColor] = useState(initialEntry?.color ?? EVENT_COLORS[0]);
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const e: EventEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, timeEnd: timeEnd || undefined, note: note.trim() || undefined, color,
    };
    update((d) => ({ ...d, events: editing ? d.events.map((x) => x.id === e.id ? e : x) : [...d.events, e] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Doctor visit" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time from"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Time to"><Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} /></Field>
      </div>
      <Field label="Color">
        <div className="mt-2 flex gap-2 flex-wrap">
          {EVENT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c }} />
          ))}
        </div>
      </Field>
      <Field label="Note (optional)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
    </div>
  );
}

/* ------------------- TASK ------------------- */
function TaskForm({ date, update, onDone, initialEntry }:
  { date: string; update: UpdateFn; onDone: () => void; initialEntry?: TaskEntry }) {
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const t: TaskEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, timeEnd: timeEnd || undefined,
      done: initialEntry?.done ?? false, note: note.trim() || undefined,
    };
    update((d) => ({ ...d, tasks: editing ? d.tasks.map((x) => x.id === t.id ? t : x) : [...d.tasks, t] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Task"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to do…" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time from"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Time to"><Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} /></Field>
      </div>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
    </div>
  );
}

/* ------------------- NOTE ------------------- */
function NoteForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [t, setT] = useState("");
  const [time, setTime] = useState("");
  const save = () => {
    if (!t.trim()) return;
    update((d) => {
      const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
      const next: { text: string; time?: string }[] = list.map((x) => typeof x === "string" ? { text: x } : x);
      next.push({ text: t.trim(), time: time || undefined });
      return { ...d, dayNotes: { ...d.dayNotes, [date]: next } };
    });
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time (optional)"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} placeholder="Anything about today…" />
      <SaveBar onCancel={onDone} onSave={save} disabled={!t.trim()} />
    </div>
  );
}
