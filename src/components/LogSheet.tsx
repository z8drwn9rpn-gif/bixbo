import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus } from "lucide-react";
import {
  updateDayLog, nowHHMM, PAIN_DESCRIPTIONS, painColor,
  BODY_PARTS_DEFAULT, PAIN_QUALITY_DEFAULT, OTHER_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT, WORKOUT_KINDS_DEFAULT, DISCHARGE_OPTS, BRISTOL,
  todayKey,
  type BixboData, type PainEntry, type ThermoSession, type ThermoKind,
  type FoodEntry, type BowelEntry, type SexKind, type SexEntry, type ExtraMed,
  type PeriodLevel, type WorkoutEntry, type EventEntry, type TaskEntry,
} from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

type Category =
  | "menu" | "pain" | "period" | "heat" | "food" | "bowel"
  | "sex" | "temp" | "meds" | "workout" | "event" | "task" | "note";

const CATEGORIES: { key: Category; label: string; icon: string; desc: string }[] = [
  { key: "pain",    label: "Pain",             icon: "🔥",  desc: "0–10, body, quality" },
  { key: "period",  label: "Blueberry 🫐",     icon: "🫐",  desc: "Flow · discharge · notes" },
  { key: "heat",    label: "Heat / Cold",      icon: "♨️",  desc: "Heating or ice session" },
  { key: "food",    label: "Food",             icon: "🍽️",  desc: "What & how you feel" },
  { key: "bowel",   label: "Bowel",            icon: "💩",  desc: "Bristol type" },
  { key: "sex",     label: "ŠukŠuk! ❤️",       icon: "❤️",  desc: "All kinds of activity" },
  { key: "workout", label: "Workout",          icon: "🧘🏼‍♀️", desc: "Type · duration · weight" },
  { key: "temp",    label: "Temp & Sleep",     icon: "🌡️", desc: "°C · kg · hours" },
  { key: "meds",    label: "Meds",             icon: "💊",  desc: "Taken · extra dose" },
  { key: "event",   label: "Event",            icon: "📅",  desc: "Multi-day, time, note" },
  { key: "task",    label: "To-do",            icon: "✅",  desc: "Task with date & time" },
  { key: "note",    label: "Note",             icon: "📝",  desc: "Anything about today" },
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
      <SheetContent
        side="bottom"
        className={`overflow-y-auto border-none p-0 ${
          cat === "menu" ? "max-h-[80dvh] rounded-t-3xl" : "h-[100dvh] max-h-[100dvh] rounded-none"
        }`}
      >
        <div className="mx-auto w-full max-w-[430px]">
          <SheetHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
            {cat !== "menu" && (
              <button
                onClick={() => setCat("menu")}
                className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Log
              </button>
            )}
            <SheetTitle className="font-serif text-2xl">
              {cat === "menu" ? "Log" : titleFor(cat)}
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pt-4 pb-16">
            {cat === "menu"    && <CategoryList onPick={setCat} />}
            {cat === "pain"    && <PainWizard date={date} data={data} update={update} onDone={close} />}
            {cat === "period"  && <PeriodForm date={date} data={data} update={update} onDone={close} />}
            {cat === "heat"    && <HeatForm date={date} update={update} onDone={close} />}
            {cat === "food"    && <FoodForm date={date} data={data} update={update} onDone={close} />}
            {cat === "bowel"   && <BowelForm date={date} update={update} onDone={close} />}
            {cat === "sex"     && <SexForm date={date} update={update} onDone={close} />}
            {cat === "temp"    && <TempForm date={date} data={data} update={update} onDone={close} />}
            {cat === "meds"    && <MedsForm date={date} data={data} update={update} onDone={close} />}
            {cat === "workout" && <WorkoutForm date={date} data={data} update={update} onDone={close} />}
            {cat === "event"   && <EventForm date={date} update={update} onDone={close} />}
            {cat === "task"    && <TaskForm date={date} update={update} onDone={close} />}
            {cat === "note"    && <NoteForm date={date} update={update} onDone={close} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function titleFor(c: Category) {
  return CATEGORIES.find((x) => x.key === c)?.label ?? "";
}

function CategoryList({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          onClick={() => onPick(c.key)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-tint"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-lg">{c.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="truncate text-[11px] text-muted-foreground">{c.desc}</p>
          </div>
          <span className="text-muted-foreground">›</span>
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

function CustomChipList({
  base, custom, onAddCustom, selected, onToggle,
}: {
  base: string[]; custom: string[];
  onAddCustom: (s: string) => void;
  selected: string[];
  onToggle: (s: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState("");
  const all = [...base, ...custom];
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {all.map((p) => (
        <Chip key={p} active={selected.includes(p)} onClick={() => onToggle(p)}>{p}</Chip>
      ))}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-primary/60 px-3 py-1.5 text-xs text-primary"
        >
          <Plus className="mr-1 inline h-3 w-3" /> Add
        </button>
      ) : (
        <div className="flex gap-1">
          <Input
            autoFocus value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (txt.trim()) { onAddCustom(txt.trim()); onToggle(txt.trim()); } setTxt(""); setAdding(false); } }}
            placeholder="Add your own…"
            className="h-8 w-40 text-xs"
          />
          <Button size="sm" className="h-8" onClick={() => { if (txt.trim()) { onAddCustom(txt.trim()); onToggle(txt.trim()); } setTxt(""); setAdding(false); }}>Add</Button>
        </div>
      )}
    </div>
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
function SaveBar({ onCancel, onSave, disabled, label = "Save" }:
  { onCancel: () => void; onSave: () => void; disabled?: boolean; label?: string }) {
  return (
    <SheetFooter className="mt-6 flex-row gap-2">
      <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
      <Button className="flex-1" onClick={onSave} disabled={disabled}>{label}</Button>
    </SheetFooter>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
const toggleIn = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/* ------------------- PAIN (4-step wizard, colored) ------------------- */
function PainWizard({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState<number>(5);
  const [parts, setParts] = useState<string[]>([]);
  const [quality, setQuality] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const addCustom = (kind: "bodyParts" | "quality" | "symptoms") => (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, [kind]: [...d.custom[kind], v] } }));

  const save = () => {
    const entry: PainEntry = {
      id: crypto.randomUUID(), time: nowHHMM(),
      score, parts, quality, symptoms, note: note.trim(),
    };
    updateDayLog(update, date, (l) => ({ ...l, pain: [...(l.pain ?? []), entry] }));
    onDone();
  };

  const color = painColor(score);

  return (
    <div>
      <StepDots step={step} total={4} />
      {step === 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pain scale</p>
          <div className="mt-6 flex flex-col items-center">
            <div
              className="grid h-40 w-40 place-items-center rounded-full text-6xl font-bold text-white shadow-lg"
              style={{ background: color }}
            >
              {score}
            </div>
            <p className="mt-4 max-w-xs text-center text-sm font-medium">{PAIN_DESCRIPTIONS[Math.round(score)]}</p>
          </div>
          <div className="mt-6">
            <input
              type="range" min={0} max={10} step={0.5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--primary)" }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0 Normal</span><span>5</span><span>10 Extreme</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`h-9 min-w-9 rounded-full px-2 text-xs font-semibold text-white ${score === n ? "ring-2 ring-foreground" : ""}`}
                style={{ background: painColor(n) }}
              >{n}</button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Where does it hurt?</p>
          <CustomChipList
            base={BODY_PARTS_DEFAULT}
            custom={data.custom.bodyParts}
            onAddCustom={addCustom("bodyParts")}
            selected={parts}
            onToggle={(v) => setParts((a) => toggleIn(a, v))}
          />
        </div>
      )}
      {step === 2 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">How does it hurt?</p>
          <CustomChipList
            base={PAIN_QUALITY_DEFAULT}
            custom={data.custom.quality}
            onAddCustom={addCustom("quality")}
            selected={quality}
            onToggle={(v) => setQuality((a) => toggleIn(a, v))}
          />
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Other symptoms</p>
            <CustomChipList
              base={OTHER_SYMPTOMS_DEFAULT}
              custom={data.custom.symptoms}
              onAddCustom={addCustom("symptoms")}
              selected={symptoms}
              onToggle={(v) => setSymptoms((a) => toggleIn(a, v))}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">How do you feel?</p>
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any details…" className="mt-2" />
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

/* ------------------- PERIOD (Blueberry) ------------------- */
const PERIOD_OPTS: { value: PeriodLevel; label: string; color: string }[] = [
  { value: "spotting",  label: "Spotting",   color: "var(--period-spotting)" },
  { value: "light",     label: "Light",      color: "var(--period-light)" },
  { value: "medium",    label: "Medium",     color: "var(--period-medium)" },
  { value: "heavy",     label: "Heavy",      color: "var(--period-heavy)" },
  { value: "veryheavy", label: "Very heavy", color: "var(--period-veryheavy)" },
];
function PeriodForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date]?.periodInfo;
  const [value, setValue] = useState<PeriodLevel>(cur?.level ?? data.dayLogs[date]?.period ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dischargeNote, setDischargeNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");

  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: value || undefined,
      periodInfo: value ? { level: value, discharge: discharge || undefined, dischargeNote: dischargeNote.trim() || undefined, note: note.trim() || undefined } : undefined,
    }));
    onDone();
  };
  return (
    <div className="space-y-4">
      <Field label="Flow intensity">
        <div className="mt-2 flex flex-wrap gap-2">
          {PERIOD_OPTS.map((o) => (
            <Chip key={o.value} active={value === o.value} onClick={() => setValue(value === o.value ? "" : o.value)} color={o.color}>
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Discharge type">
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => (
            <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? "" : d.value)} color={d.color}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Discharge note (optional)">
        <Input value={dischargeNote} onChange={(e) => setDischargeNote(e.target.value)} placeholder="Consistency, smell, amount…" />
      </Field>
      <Field label="Note about the day (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- HEAT / COLD ------------------- */
function HeatForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [kind, setKind] = useState<ThermoKind>("heat");
  const [start, setStart] = useState(nowHHMM());
  const [minutes, setMinutes] = useState<number>(20);
  const [note, setNote] = useState("");
  const save = () => {
    const entry: ThermoSession = { id: crypto.randomUUID(), kind, start, minutes, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, heat: [...(l.heat ?? []), entry] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Type">
        <div className="mt-2 flex gap-2">
          <Chip active={kind === "heat"} onClick={() => setKind("heat")}>🔥 Heat</Chip>
          <Chip active={kind === "cold"} onClick={() => setKind("cold")}>❄️ Cold</Chip>
        </div>
      </Field>
      <Field label="Start time"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Duration (minutes)">
        <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
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
  const addCustom = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, foodFeelings: [...d.custom.foodFeelings, v] } }));
  const save = () => {
    if (!what.trim()) return;
    const entry: FoodEntry = { id: crypto.randomUUID(), time, what: what.trim(), feelings, after: after.trim() || undefined };
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
        <CustomChipList
          base={FOOD_FEELINGS_DEFAULT}
          custom={data.custom.foodFeelings}
          onAddCustom={addCustom}
          selected={feelings}
          onToggle={(v) => setFeelings((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Additional note (optional)">
        <Textarea rows={2} value={after} onChange={(e) => setAfter(e.target.value)} placeholder="Reaction, bloating, itching…" />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} disabled={!what.trim()} />
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
              <BristolIcon shape={b.shape} color={b.color} />
              <span className="flex-1">{b.label}</span>
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

/* ------------------- TEMP / WEIGHT / SLEEP ------------------- */
function TempForm({ date, data, update, onDone }:
  { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date] ?? {};
  const [temperature, setTemperature] = useState<string>(cur.temperature != null ? String(cur.temperature) : "");
  const [weight, setWeight] = useState<string>(cur.weight != null ? String(cur.weight) : "");
  const [sleep, setSleep] = useState<string>(cur.sleepHours != null ? String(cur.sleepHours) : "");
  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      temperature: temperature === "" ? undefined : Number(temperature),
      weight: weight === "" ? undefined : Number(weight),
      sleepHours: sleep === "" ? undefined : Number(sleep),
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
      <Field label="Sleep (hours)">
        <Input type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="8" />
      </Field>
      <SaveBar onCancel={onDone} onSave={save} />
    </div>
  );
}

/* ------------------- SEX (ŠukŠuk!) ------------------- */
const SEX_OPTS: { value: SexKind; label: string }[] = [
  { value: "sex_with_condom",    label: "Sex — with condom" },
  { value: "sex_without_condom", label: "Sex — without condom" },
  { value: "fingering",          label: "Fingering" },
  { value: "oral_giving",        label: "Oral — giving" },
  { value: "oral_receiving",     label: "Oral — receiving" },
  { value: "other",              label: "Other" },
];
function SexForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [kind, setKind] = useState<SexKind>("sex_with_condom");
  const [note, setNote] = useState("");
  const save = () => {
    const e: SexEntry = { id: crypto.randomUUID(), time: nowHHMM(), kind, note: note.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, sex: [...(l.sex ?? []), e] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <Field label="Type">
        <div className="mt-2 flex flex-wrap gap-2">
          {SEX_OPTS.map((o) => (
            <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>{o.label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
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
    const e: ExtraMed = { id: crypto.randomUUID(), time: extraTime, name: extraName.trim(), dose: extraDose.trim() || undefined };
    updateDayLog(update, date, (l) => ({ ...l, extraMeds: [...(l.extraMeds ?? []), e] }));
    setExtraName(""); setExtraDose(""); setExtraTime(nowHHMM());
  };
  const today = date === todayKey();
  const extras = data.dayLogs[date]?.extraMeds ?? [];

  return (
    <div className="space-y-4">
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No medications set up yet. Add your regimen in Medications settings.
        </p>
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
        <CustomChipList
          base={WORKOUT_KINDS_DEFAULT}
          custom={data.custom.workoutKinds}
          onAddCustom={addKind}
          selected={[kind]}
          onToggle={(v) => setKind(v)}
        />
      </Field>
      <Field label="Duration (minutes)">
        <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </Field>
      <Field label="Weight after (kg, optional)">
        <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.0" />
      </Field>
      <Field label="How you feel">
        <div className="mt-2 flex flex-wrap gap-2">
          {["😊 Great","🙂 Good","😐 Ok","😩 Tired","🤕 Sore"].map((f) => (
            <Chip key={f} active={feeling === f} onClick={() => setFeeling(feeling === f ? "" : f)}>{f}</Chip>
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

/* ------------------- EVENT ------------------- */
function EventForm({ date, update, onDone }:
  { date: string; update: UpdateFn; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("var(--primary)");
  const COLORS = ["var(--primary)", "var(--pain-4)", "var(--pain-8)", "var(--period-medium)", "var(--predicted)"];
  const save = () => {
    if (!title.trim()) return;
    const e: EventEntry = {
      id: crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, note: note.trim() || undefined, color,
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
      <Field label="Time (optional)"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Color">
        <div className="mt-2 flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c} onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
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
  const [note, setNote] = useState("");
  const save = () => {
    if (!title.trim()) return;
    const t: TaskEntry = {
      id: crypto.randomUUID(), title: title.trim(),
      startDate, endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined, done: false, note: note.trim() || undefined,
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
      <Field label="Time (optional)"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
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
      <Textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} placeholder="Anything about today…" />
      <SaveBar onCancel={onDone} onSave={save} disabled={!t.trim()} />
    </div>
  );
}
