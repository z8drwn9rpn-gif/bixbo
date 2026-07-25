import { useState, type ReactNode } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Plus, ChevronLeft } from "lucide-react";
import {
  PAIN_DESCRIPTIONS, painColor, BODY_PARTS_DEFAULT, PAIN_QUALITY_DEFAULT, OTHER_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT, WORKOUT_KINDS_DEFAULT, BRISTOL, DISCHARGE_OPTS, MOODS_DEFAULT,
  TETANY_TYPES, TETANY_LOCATIONS_DEFAULT, TETANY_TRIGGERS, TETANY_HELPED_DEFAULT,
  PANIC_PHYSICAL, PANIC_COGNITIVE, PANIC_HELPED_DEFAULT, SEX_TYPES_DEFAULT,
  BODY_BATTERY, SLEEP_QUALITY, EVENT_COLORS,
  todayKey, nowHHMM, updateDayLog,
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
  { id: "panic",   label: "Panic attack",     emoji: "⚡", hint: "Trigger & symptoms" },
  { id: "event",   label: "Event",            emoji: "📅", hint: "Multi-day · time · note" },
  { id: "task",    label: "Task",             emoji: "✅", hint: "To-do with date & time" },
  { id: "note",    label: "Note",             emoji: "📝", hint: "Any thought for today" },
];

export function LogSheet({
  open, onOpenChange, date, data, update, initial, initialPain,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
  initial?: Category;
  initialPain?: PainEntry;
}) {
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const close = () => { setCat(null); onOpenChange(false); };
  const back = () => setCat(null);
  const active = cat ?? initial;

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
              <button onClick={close} aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-1 hover:bg-tint">
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-border border-t border-border">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setCat(c.id)}
                    className="flex w-full items-center gap-3 bg-surface px-5 py-3 text-left transition hover:bg-tint">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-tint text-xl">{c.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">{c.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.hint}</p>
                    </div>
                    <span className="text-muted-foreground">›</span>
                  </button>
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
              {active === "pain"    && <PainWizard    date={date} data={data} update={update} onDone={close} initialEntry={initialPain} />}
              {active === "panic"   && <PanicForm     date={date} data={data} update={update} onDone={close} />}
              {active === "period"  && <PeriodForm    date={date} data={data} update={update} onDone={close} />}
              {active === "sex"     && <SexForm       date={date} data={data} update={update} onDone={close} />}
              {active === "heat"    && <ThermoForm    date={date} update={update} onDone={close} />}
              {active === "food"    && <FoodForm      date={date} data={data} update={update} onDone={close} />}
              {active === "bowel"   && <BowelForm     date={date} update={update} onDone={close} />}
              {active === "workout" && <WorkoutForm   date={date} data={data} update={update} onDone={close} />}
              {active === "temp"    && <TempForm      date={date} data={data} update={update} onDone={close} />}
              {active === "meds"    && <MedsForm      date={date} data={data} update={update} onDone={close} />}
              {active === "task"    && <TaskForm      date={date} update={update} onDone={close} />}
              {active === "event"   && <EventForm     date={date} update={update} onDone={close} />}
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
  base, custom, onAddCustom, onRemoveCustom, selected, onToggle,
}: {
  base: string[]; custom: string[];
  onAddCustom: (v: string) => void;
  onRemoveCustom?: (v: string) => void;
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
  const [bodyBattery, setBodyBattery] = useState<number | undefined>(initialEntry?.bodyBattery);
  const [stress, setStress] = useState<number | undefined>(initialEntry?.stress);
  const [mood, setMood] = useState<string[]>(initialEntry?.mood ?? []);

  const addCustom = (key: "bodyParts" | "quality" | "symptoms" | "moods" | "tetanyLocations" | "tetanyHelped", v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, [key]: [...d.custom[key], v] } }));
  const removeCustom = (key: "bodyParts" | "quality" | "symptoms" | "moods" | "tetanyLocations" | "tetanyHelped", v: string) =>
    update((d) => ({
      ...d,
      custom: { ...d.custom, [key]: d.custom[key].filter((x) => x !== v) },
    }));

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
            selected={parts} onToggle={(v) => setParts((a) => toggleIn(a, v))} />
        </Field>
      )}
      {step === 2 && (
        <Field label="How does it hurt?">
          <CustomChipList base={PAIN_QUALITY_DEFAULT} custom={data.custom.quality}
            onAddCustom={(v) => addCustom("quality", v)}
            onRemoveCustom={(v) => { removeCustom("quality", v); setQuality((a) => a.filter((x) => x !== v)); }}
            selected={quality} onToggle={(v) => setQuality((a) => toggleIn(a, v))} />
        </Field>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <Field label="Other symptoms">
            <CustomChipList base={OTHER_SYMPTOMS_DEFAULT} custom={data.custom.symptoms}
              onAddCustom={(v) => addCustom("symptoms", v)}
              onRemoveCustom={(v) => { removeCustom("symptoms", v); setSymptoms((a) => a.filter((x) => x !== v)); }}
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {TETANY_TYPES.map((v) => <Chip key={v} active={tetanyTypes.includes(v)} onClick={() => setTetanyTypes((a) => toggleIn(a, v))}>{v}</Chip>)}
                </div>
              </Field>
              <Field label="Location">
                <CustomChipList base={TETANY_LOCATIONS_DEFAULT} custom={data.custom.tetanyLocations}
                  onAddCustom={(v) => addCustom("tetanyLocations", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyLocations", v); setTetanyLoc((a) => a.filter((x) => x !== v)); }}
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {TETANY_TRIGGERS.map((v) => <Chip key={v} active={tetanyTriggers.includes(v)} onClick={() => setTetanyTriggers((a) => toggleIn(a, v))}>{v}</Chip>)}
                </div>
              </Field>
              <Field label="What helped">
                <CustomChipList base={TETANY_HELPED_DEFAULT} custom={data.custom.tetanyHelped}
                  onAddCustom={(v) => addCustom("tetanyHelped", v)}
                  onRemoveCustom={(v) => { removeCustom("tetanyHelped", v); setTetanyHelped((a) => a.filter((x) => x !== v)); }}
                  selected={tetanyHelped} onToggle={(v) => setTetanyHelped((a) => toggleIn(a, v))} />
              </Field>
              <Field label="Note (optional)">
                <Textarea rows={2} value={tetanyNote} onChange={(e) => setTetanyNote(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Field label={`Stress ${stress ?? "-"} / 10`}>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, n) => {
                const hue = 130 - n * 13; // green (130) -> red (0)
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
              selected={mood} onToggle={(v) => setMood((a) => toggleIn(a, v))} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else…" />
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
function PanicForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [time, setTime] = useState(nowHHMM());
  const [minutes, setMinutes] = useState(10);
  const [intensity, setIntensity] = useState(5);
  const [physical, setPhysical] = useState<string[]>([]);
  const [cognitive, setCognitive] = useState<string[]>([]);
  const [trigger, setTrigger] = useState("");
  const [place, setPlace] = useState("");
  const [hyper, setHyper] = useState<"no" | "before" | "during" | "unknown">("unknown");
  const [tetanyPresent, setTetanyPresent] = useState(false);
  const [helped, setHelped] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const addHelped = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, panicHelped: [...d.custom.panicHelped, v] } }));

  const save = () => {
    const p: PanicAttack = {
      id: crypto.randomUUID(), time, minutes, intensity,
      physical, cognitive, trigger: trigger.trim(), place: place.trim() || undefined,
      hyperventilation: hyper, tetanyPresent, helped, note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({ ...l, panic: [...(l.panic ?? []), p] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Duration (min)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
      </div>
      <Field label={`Intensity ${intensity}/10`}>
        <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={([v]) => setIntensity(v)} />
      </Field>
      <Field label="Physical symptoms">
        <div className="mt-2 flex flex-wrap gap-2">
          {PANIC_PHYSICAL.map((v) => <Chip key={v} active={physical.includes(v)} onClick={() => setPhysical((a) => toggleIn(a, v))}>{v}</Chip>)}
        </div>
      </Field>
      <Field label="Cognitive symptoms">
        <div className="mt-2 flex flex-wrap gap-2">
          {PANIC_COGNITIVE.map((v) => <Chip key={v} active={cognitive.includes(v)} onClick={() => setCognitive((a) => toggleIn(a, v))}>{v}</Chip>)}
        </div>
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
          onAddCustom={addHelped}
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
function SexForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [kind, setKind] = useState<SexKind>("sex");
  const [time, setTime] = useState(nowHHMM());
  const [feelingAfter, setFeelingAfter] = useState("");
  const [painful, setPainful] = useState<PainfulWhen>("no");
  const [note, setNote] = useState("");
  const addCustom = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, sexTypes: [...d.custom.sexTypes, v] } }));
  const custom = data.custom.sexTypes;
  const save = () => {
    const e: SexEntry = { id: crypto.randomUUID(), time, kind,
      feelingAfter: feelingAfter || undefined, painful, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, sex: [...(l.sex ?? []), e] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Type">
        <div className="mt-2 flex flex-wrap gap-2">
          {SEX_TYPES_DEFAULT.map((o) => <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>{o.label}</Chip>)}
          {custom.map((c) => <Chip key={c} active={kind === (`other:${c}` as SexKind)} onClick={() => setKind(`other:${c}` as SexKind)}>{c}</Chip>)}
          <AddCustomInline onAdd={addCustom} />
        </div>
      </Field>
      <Field label="How I feel after">
        <div className="mt-2 flex flex-wrap gap-2">
          {["😊 Great","🙂 Good","😐 Meh","😞 Down","🤕 Sore","😴 Sleepy"].map((f) =>
            <Chip key={f} active={feelingAfter === f} onClick={() => setFeelingAfter(feelingAfter === f ? "" : f)}>{f}</Chip>)}
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
function ThermoForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [kind, setKind] = useState<ThermoKind>("heat");
  const [start, setStart] = useState(nowHHMM());
  const [minutes, setMinutes] = useState(20);
  const [note, setNote] = useState("");
  const save = () => {
    const e: ThermoSession = { id: crypto.randomUUID(), kind, start, minutes, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, heat: [...(l.heat ?? []), e] }));
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
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Duration (min)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
      </div>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- FOOD ------------------- */
function FoodForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [time, setTime] = useState(nowHHMM());
  const [what, setWhat] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [after, setAfter] = useState("");
  const [hydration, setHydration] = useState<string>("");
  const [caffeine, setCaffeine] = useState<string>("");
  const [alcohol, setAlcohol] = useState<string>("");
  const addCustom = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, foodFeelings: [...d.custom.foodFeelings, v] } }));
  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol) return;
    const entry: FoodEntry = {
      id: crypto.randomUUID(), time, what: what.trim(), feelings, after: after.trim() || undefined,
      hydrationMl: hydration === "" ? undefined : Number(hydration),
      caffeineMg:  caffeine  === "" ? undefined : Number(caffeine),
      alcoholDrinks: alcohol === "" ? undefined : Number(alcohol),
    };
    updateDayLog(update, date, (l) => ({ ...l, food: [...(l.food ?? []), entry] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="What did you eat?">
        <Textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. chicken, rice, tomato" />
      </Field>
      <Field label="How do you feel?">
        <CustomChipList base={FOOD_FEELINGS_DEFAULT} custom={data.custom.foodFeelings}
          onAddCustom={addCustom} selected={feelings} onToggle={(v) => setFeelings((a) => toggleIn(a, v))} />
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
function BowelForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [time, setTime] = useState(nowHHMM());
  const [bristol, setBristol] = useState<number>(4);
  const [note, setNote] = useState("");
  const save = () => {
    const entry: BowelEntry = { id: crypto.randomUUID(), time, bristol, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, bowel: [...(l.bowel ?? []), entry] }));
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
  const [quality, setQuality] = useState<string>(cur.sleepQuality ?? "");
  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      temperature: temperature === "" ? undefined : Number(temperature),
      weight: weight === "" ? undefined : Number(weight),
      sleepHours: sleep === "" ? undefined : Number(sleep),
      sleepQuality: quality || undefined,
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
          {SLEEP_QUALITY.map((q) => <Chip key={q} active={quality === q} onClick={() => setQuality(quality === q ? "" : q)}>{q}</Chip>)}
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
  const toggle = (key: string) => update((d) => {
    const day = { ...(d.medLog[date] ?? {}) };
    day[key] = !day[key];
    return { ...d, medLog: { ...d.medLog, [date]: day } };
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
                <input type="checkbox" checked={!!taken[`${m.id}@asneeded`]} onChange={() => toggle(`${m.id}@asneeded`)} className="h-4 w-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">As needed{m.dose ? ` · ${m.dose}` : ""}</p>
                  {m.note && <p className="text-[11px] text-muted-foreground">📝 {m.note}</p>}
                </div>
              </label>
            ) : (
              m.times.map((t) => {
                const k = `${m.id}@${t}`;
                return (
                  <label key={k} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                    <input type="checkbox" checked={!!taken[k]} onChange={() => toggle(k)} className="h-4 w-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name} <span className="text-xs text-muted-foreground">· {t}</span></p>
                      {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                      {m.note && <p className="text-[11px] text-muted-foreground">📝 {m.note}</p>}
                    </div>
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
function WorkoutForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [kind, setKind] = useState<string>(WORKOUT_KINDS_DEFAULT[0]);
  const [minutes, setMinutes] = useState<number>(30);
  const [weight, setWeight] = useState<string>("");
  const [feeling, setFeeling] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const addKind = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: [...d.custom.workoutKinds, v] } }));

  const save = () => {
    const e: WorkoutEntry = {
      id: crypto.randomUUID(), time: nowHHMM(), kind, minutes,
      weightKg: weight === "" ? undefined : Number(weight),
      feeling: feeling || undefined, note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({ ...l, workout: [...(l.workout ?? []), e] }));
    if (weight !== "") updateDayLog(update, date, (l) => ({ ...l, weight: Number(weight) }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Type">
        <CustomChipList base={WORKOUT_KINDS_DEFAULT} custom={data.custom.workoutKinds}
          onAddCustom={addKind} selected={[kind]} onToggle={(v) => setKind(v)} />
      </Field>
      <Field label="Duration (minutes)"><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
      <Field label="Weight after (kg, optional)"><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
      <Field label="How you feel">
        <div className="mt-2 flex flex-wrap gap-2">
          {["😊 Great","🙂 Good","😐 Ok","😩 Tired","🤕 Sore"].map((f) =>
            <Chip key={f} active={feeling === f} onClick={() => setFeeling(feeling === f ? "" : f)}>{f}</Chip>)}
        </div>
      </Field>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- EVENT ------------------- */
function EventForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [time, setTime] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const save = () => {
    if (!title.trim()) return;
    const e: EventEntry = {
      id: crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, timeEnd: timeEnd || undefined, note: note.trim() || undefined, color,
    };
    update((d) => ({ ...d, events: [...d.events, e] }));
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
function TaskForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [time, setTime] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [note, setNote] = useState("");
  const save = () => {
    if (!title.trim()) return;
    const t: TaskEntry = {
      id: crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, timeEnd: timeEnd || undefined,
      done: false, note: note.trim() || undefined,
    };
    update((d) => ({ ...d, tasks: [...d.tasks, t] }));
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
