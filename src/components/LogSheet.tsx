import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus } from "lucide-react";
import {
  updateDayLog, nowHHMM, PAIN_DESCRIPTIONS, BODY_PARTS, PAIN_QUALITY,
  OTHER_SYMPTOMS, BRISTOL, todayKey,
  type BixboData, type PainEntry, type HeatSession, type FoodEntry,
  type BowelEntry, type SexType, type ExtraMed, type PeriodLevel,
} from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

type Category =
  | "menu" | "pain" | "heat" | "period" | "food" | "bowel"
  | "sex" | "temp" | "meds" | "note" | "task";

const CATEGORIES: { key: Category; label: string; icon: string; desc: string }[] = [
  { key: "pain",   label: "Pain",              icon: "🔥", desc: "0–10, body parts, notes" },
  { key: "period", label: "Period",            icon: "🩸", desc: "Flow intensity" },
  { key: "heat",   label: "Heat session",      icon: "♨️", desc: "Heating pad time" },
  { key: "food",   label: "Food",              icon: "🍽️", desc: "What and how you felt" },
  { key: "bowel",  label: "Bowel",             icon: "💩", desc: "Bristol type" },
  { key: "temp",   label: "Temp & weight",     icon: "🌡️", desc: "°C & kg" },
  { key: "sex",    label: "Sexual activity",   icon: "❤️", desc: "With/without protection" },
  { key: "meds",   label: "Meds",              icon: "💊", desc: "Mark taken, add extra dose" },
  { key: "note",   label: "Note",              icon: "📝", desc: "Anything about today" },
  { key: "task",   label: "To-do",             icon: "✅", desc: "Task for the day" },
];

export function LogSheet({
  date, data, update,
}: { date: string; data: BixboData; update: UpdateFn }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Category>("menu");

  const close = () => { setOpen(false); setTimeout(() => setCat("menu"), 200); };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTimeout(() => setCat("menu"), 200); }}>
      <SheetTrigger asChild>
        <Button size="lg" className="rounded-full shadow-lg">
          <Plus className="h-5 w-5" /> Log
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-none p-0">
        <div className="mx-auto w-full max-w-[430px]">
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            {cat !== "menu" && (
              <button
                onClick={() => setCat("menu")}
                className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}
            <SheetTitle className="font-serif text-2xl">
              {cat === "menu" ? "What do you want to log?" : titleFor(cat)}
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pt-4 pb-8">
            {cat === "menu" && <CategoryGrid onPick={setCat} />}
            {cat === "pain"   && <PainWizard   date={date} update={update} onDone={close} />}
            {cat === "period" && <PeriodForm   date={date} data={data} update={update} onDone={close} />}
            {cat === "heat"   && <HeatForm     date={date} update={update} onDone={close} />}
            {cat === "food"   && <FoodForm     date={date} update={update} onDone={close} />}
            {cat === "bowel"  && <BowelForm    date={date} update={update} onDone={close} />}
            {cat === "temp"   && <TempForm     date={date} data={data} update={update} onDone={close} />}
            {cat === "sex"    && <SexForm      date={date} data={data} update={update} onDone={close} />}
            {cat === "meds"   && <MedsForm     date={date} data={data} update={update} onDone={close} />}
            {cat === "note"   && <NoteForm     date={date} update={update} onDone={close} />}
            {cat === "task"   && <TaskForm     date={date} update={update} onDone={close} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function titleFor(c: Category) {
  return CATEGORIES.find((x) => x.key === c)?.label ?? "";
}

function CategoryGrid({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          onClick={() => onPick(c.key)}
          className="flex flex-col items-start gap-1 rounded-3xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/50 active:scale-[0.98]"
        >
          <span className="text-2xl">{c.icon}</span>
          <span className="font-serif text-lg leading-tight">{c.label}</span>
          <span className="text-[11px] text-muted-foreground">{c.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------- Shared UI ------------------- */
function Chip({ active, onClick, children, color }:
  { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
      }`}
    >
      {color && <span className="mr-1.5 inline-block h-2.5 w-2.5 -translate-y-[1px] rounded-full align-middle" style={{ background: color }} />}
      {children}
    </button>
  );
}
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-3 bg-border"}`} />
      ))}
    </div>
  );
}
function SaveBar({ onCancel, onSave, disabled }:
  { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <SheetFooter className="mt-6 flex-row gap-2">
      <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
      <Button className="flex-1" onClick={onSave} disabled={disabled}>Save</Button>
    </SheetFooter>
  );
}

/* ------------------- PAIN (4-step wizard) ------------------- */
function PainWizard({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState<number>(5);
  const [parts, setParts] = useState<string[]>([]);
  const [quality, setQuality] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    const entry: PainEntry = {
      id: crypto.randomUUID(), time: nowHHMM(),
      score, parts, quality, symptoms, note: note.trim(),
    };
    updateDayLog(update, date, (l) => ({ ...l, pain: [...(l.pain ?? []), entry] }));
    onDone();
  };

  return (
    <div>
      <StepDots step={step} total={4} />
      {step === 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pain scale</p>
          <div className="mt-3 text-center">
            <p className="font-serif text-6xl">{score}</p>
            <p className="mt-2 text-sm text-muted-foreground">{PAIN_DESCRIPTIONS[Math.round(score)]}</p>
          </div>
          <div className="mt-5">
            <input
              type="range" min={0} max={10} step={0.5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-[hsl(var(--primary))]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0</span><span>5</span><span>10</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`h-8 min-w-9 rounded-full px-2 text-xs ${
                  score === n ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"
                }`}
              >{n}</button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Where does it hurt?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BODY_PARTS.map((p) => (
              <Chip key={p} active={parts.includes(p)} onClick={() => toggle(parts, setParts, p)}>{p}</Chip>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">How does it hurt?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAIN_QUALITY.map((p) => (
              <Chip key={p} active={quality.includes(p)} onClick={() => toggle(quality, setQuality, p)}>{p}</Chip>
            ))}
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Other symptoms</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OTHER_SYMPTOMS.map((p) => (
                <Chip key={p} active={symptoms.includes(p)} onClick={() => toggle(symptoms, setSymptoms, p)}>{p}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">How do you feel?</p>
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any details you want to remember…" className="mt-2" />
          </div>
        </div>
      )}
      <SheetFooter className="mt-6 flex-row gap-2">
        {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 3 && <Button className="flex-1" onClick={() => setStep(step + 1)}>Next</Button>}
        {step === 3 && <Button className="flex-1" onClick={save}>Save</Button>}
      </SheetFooter>
    </div>
  );
}

/* ------------------- PERIOD ------------------- */
const PERIOD_OPTS: { value: PeriodLevel; label: string; color: string }[] = [
  { value: "spotting",  label: "Spotting",   color: "var(--period-spotting)" },
  { value: "light",     label: "Light",      color: "var(--period-light)" },
  { value: "medium",    label: "Medium",     color: "var(--period-medium)" },
  { value: "heavy",     label: "Heavy",      color: "var(--period-heavy)" },
  { value: "veryheavy", label: "Very heavy", color: "var(--period-veryheavy)" },
];
function PeriodForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [value, setValue] = useState<PeriodLevel>(data.dayLogs[date]?.period ?? "");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTS.map((o) => (
          <Chip key={o.value} active={value === o.value} onClick={() => setValue(value === o.value ? "" : o.value)} color={o.color}>
            {o.label}
          </Chip>
        ))}
      </div>
      <SaveBar
        onCancel={onDone}
        onSave={() => { updateDayLog(update, date, (l) => ({ ...l, period: value })); onDone(); }}
      />
    </div>
  );
}

/* ------------------- HEAT SESSION ------------------- */
function HeatForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [start, setStart] = useState(nowHHMM());
  const [minutes, setMinutes] = useState<number>(20);
  const [note, setNote] = useState("");
  const save = () => {
    const entry: HeatSession = { id: crypto.randomUUID(), start, minutes, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, heat: [...(l.heat ?? []), entry] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Start time"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Duration (minutes)">
        <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where you placed it, how it helped…" />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- FOOD ------------------- */
function FoodForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [time, setTime] = useState(nowHHMM());
  const [what, setWhat] = useState("");
  const [after, setAfter] = useState("");
  const save = () => {
    if (!what.trim()) return;
    const entry: FoodEntry = { id: crypto.randomUUID(), time, what: what.trim(), after: after.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, food: [...(l.food ?? []), entry] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="What did you eat?">
        <Textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. chicken, rice, tomato" />
      </Field>
      <Field label="How did you feel after? (histamine)">
        <Textarea rows={3} value={after} onChange={(e) => setAfter(e.target.value)} placeholder="Any reaction, bloating, itching…" />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} disabled={!what.trim()} />
    </div>
  );
}

/* ------------------- BOWEL ------------------- */
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
          {BRISTOL.map((b) => (
            <button
              key={b.n}
              onClick={() => setBristol(b.n)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                bristol === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: b.color }}>
                {b.n}
              </span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- TEMP & WEIGHT ------------------- */
function TempForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date] ?? {};
  const [temperature, setTemperature] = useState<string>(cur.temperature != null ? String(cur.temperature) : "");
  const [weight, setWeight] = useState<string>(cur.weight != null ? String(cur.weight) : "");
  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      temperature: temperature === "" ? undefined : Number(temperature),
      weight: weight === "" ? undefined : Number(weight),
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Temperature (°C)">
        <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.6" />
      </Field>
      <Field label="Weight (kg)">
        <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.0" />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- SEX ------------------- */
const SEX_OPTS: { value: SexType; label: string }[] = [
  { value: "none",            label: "None" },
  { value: "with_condom",     label: "With condom" },
  { value: "without_condom",  label: "Without condom" },
];
function SexForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date]?.sex;
  const [type, setType] = useState<SexType>(cur?.type ?? "none");
  const [note, setNote] = useState<string>(cur?.note ?? "");
  const save = () => {
    updateDayLog(update, date, (l) => ({ ...l, sex: { type, note: note.trim() || undefined } }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SEX_OPTS.map((o) => (
          <Chip key={o.value} active={type === o.value} onClick={() => setType(o.value)}>{o.label}</Chip>
        ))}
      </div>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you want to remember…" />
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

  const addExtra = () => {
    if (!extraName.trim()) return;
    const e: ExtraMed = {
      id: crypto.randomUUID(), time: extraTime,
      name: extraName.trim(), dose: extraDose.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({ ...l, extraMeds: [...(l.extraMeds ?? []), e] }));
    setExtraName(""); setExtraDose(""); setExtraTime(nowHHMM());
  };

  const today = date === todayKey();
  const extras = data.dayLogs[date]?.extraMeds ?? [];

  return (
    <div className="space-y-4">
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No medications set up yet. Add your regimen in Medications settings (from Home).
        </p>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{today ? "Today" : date}</p>
          <div className="mt-2 space-y-2">
            {meds.map((m) => m.asNeeded ? (
              <label key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                <input
                  type="checkbox" checked={!!taken[`${m.id}@asneeded`]}
                  onChange={() => toggle(`${m.id}@asneeded`)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">As needed{m.dose ? ` · ${m.dose}` : ""}</p>
                </div>
              </label>
            ) : (
              m.times.map((t) => {
                const k = `${m.id}@${t}`;
                return (
                  <label key={k} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                    <input
                      type="checkbox" checked={!!taken[k]}
                      onChange={() => toggle(k)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name} <span className="text-xs text-muted-foreground">· {t}</span></p>
                      {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
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
        <div className="mt-2 flex gap-2">
          <Input placeholder="Dose (optional)" value={extraDose} onChange={(e) => setExtraDose(e.target.value)} />
          <Button onClick={addExtra} disabled={!extraName.trim()}>Add</Button>
        </div>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {extras.map((e) => <li key={e.id}>• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}</li>)}
          </ul>
        )}
      </div>

      <SheetFooter className="mt-2">
        <Button className="w-full" onClick={onDone}>Done</Button>
      </SheetFooter>
    </div>
  );
}

/* ------------------- NOTE ------------------- */
function NoteForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [t, setT] = useState("");
  const save = () => {
    if (!t.trim()) return;
    update((d) => ({ ...d, dayNotes: { ...d.dayNotes, [date]: [...(d.dayNotes[date] ?? []), t.trim()] } }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Textarea rows={5} value={t} onChange={(e) => setT(e.target.value)} placeholder="Anything about today…" />
      <SaveBar onCancel={onDone} onSave={save} disabled={!t.trim()} />
    </div>
  );
}

/* ------------------- TASK ------------------- */
function TaskForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [t, setT] = useState("");
  const save = () => {
    if (!t.trim()) return;
    update((d) => ({
      ...d,
      todos: { ...d.todos, [date]: [...(d.todos[date] ?? []), { id: crypto.randomUUID(), text: t.trim(), done: false }] },
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Task for the day…" />
      <SaveBar onCancel={onDone} onSave={save} disabled={!t.trim()} />
    </div>
  );
}

/* ------------------- Field wrapper ------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
