import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Ico } from "@/components/icons/BixboIcons";
import {
  ALLERGENS_DEFAULT,
  BOWEL_FEELINGS_DEFAULT,
  BOWEL_SYMPTOMS_DEFAULT,
  BRISTOL,
  FOOD_FEELINGS_DEFAULT,
  FOOD_SYMPTOMS_AFTER,
  HISTAMINE_SYMPTOMS,
  SEX_FEELINGS_DEFAULT,
  URINARY_DEFAULT,
  WORKOUT_KINDS_DEFAULT,
  asArr,
  nowHHMM,
  updateDayLog,
  workoutHasDistance,
  workoutIsHike,
  workoutIsStrength,
  type BixboData,
  type BowelEntry,
  type FoodEntry,
  type SexEntry,
  type SexKind,
  type ThermoKind,
  type ThermoSession,
  type WorkoutEntry,
  type WorkoutExercise,
} from "@/lib/storage";
import { useLogSchema } from "./LogSchemaContext";
import {
  Chip,
  CustomChipList,
  DurationField,
  Field,
  IntensityScale,
  RegistryFieldBlock,
  SaveBar,
  stripEmoji,
  toggleIn,
  type UpdateFn,
} from "./LogFormPrimitives";

const BODY_AREAS = ["Lower belly", "Lower back", "Pelvis", "Abdomen", "Legs", "Head", "Neck", "Shoulders", "Other"];
const SEX_ACTIVITY_TYPES = ["Vaginal", "Oral", "Anal", "Intimacy", "Other"];
const SEX_PROTECTION = ["Condom", "No condom", "Other", "N/A"];
const SEX_SYMPTOMS = ["Pain", "Cramping", "Bleeding", "Burning", "Dryness", "Nausea", "Other"];
const WORKOUT_FEELINGS = ["Great", "Good", "Okay", "Tired", "Sore", "Dizzy", "Nausea", "Tetany symptoms", "Pain"];
const SLEEP_SYMPTOMS = ["Trouble falling asleep", "Woke too early", "Restless", "Nightmares", "Sweating / hot flashes", "Pain", "Bathroom", "Panic / anxiety"];

type SexEntryV2 = SexEntry & {
  activity?: string;
  protection?: string;
  contraception?: string;
  symptoms?: string[];
  painScore?: number;
  painLocation?: string;
  bleedingLevel?: string;
  orgasm?: string;
};

type ThermoSessionV2 = ThermoSession & {
  bodyArea?: string;
  level?: "low" | "medium" | "high";
  effectiveness?: "no" | "little" | "moderate" | "lot";
  painBefore?: number;
  painAfter?: number;
};

type VitalRowV2 = {
  id: string;
  time: string;
  value: number;
  location?: string;
  bodyFatPercent?: number;
};

type DayLogV2 = {
  temperatureEntries?: VitalRowV2[];
  weightEntries?: VitalRowV2[];
  temperature?: number;
  weight?: number;
  sleepHours?: number;
  sleepQuality?: unknown;
  sleepStartedAt?: string;
  sleepEndedAt?: string;
  sleepWakeups?: number;
  sleepWakeFeeling?: string;
  sleepSymptoms?: string[];
  urinaryEntries?: Array<{ id: string; time: string; urinary: string[]; note?: string }>;
};

export function EnhancedSexForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: SexEntry }) {
  const schema = useLogSchema();
  const initial = initialEntry as SexEntryV2 | undefined;
  const [time, setTime] = useState(initial?.time ?? nowHHMM());
  const [kind] = useState<SexKind>(initial?.kind ?? "sex");
  const [activity, setActivity] = useState(initial?.activity ?? "Vaginal");
  const [protection, setProtection] = useState(initial?.protection ?? "");
  const [contraception, setContraception] = useState(initial?.contraception ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [orgasm, setOrgasm] = useState(initial?.orgasm ?? "");
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initial?.feelingAfter));

  const save = () => {
    const entry = {
      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      kind,
      activity,
      orgasm: orgasm || undefined,
      protection: protection || undefined,
      contraception: contraception || undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      feelingAfter: feelingAfter.length ? feelingAfter : undefined,
      painful: symptoms.includes("Pain") ? "during" : "no",
    } as SexEntryV2;
    updateDayLog(update, date, (log) => ({
      ...log,
      sex: initial ? (log.sex ?? []).map((item) => item.id === entry.id ? entry : item) : [...(log.sex ?? []), entry],
    }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    <Field label="Type" schemaFieldId="type"><div className="mt-2 flex flex-wrap gap-2">{SEX_ACTIVITY_TYPES.map((value) => <Chip key={value} active={activity === value} onClick={() => setActivity(value)}>{value}</Chip>)}</div></Field>
    <Field label="Orgasm"><div className="mt-2 flex flex-wrap gap-2">{["Yes", "No", "Multiple", "Not tracked"].map((value) => <Chip key={value} active={orgasm === value} onClick={() => setOrgasm(orgasm === value ? "" : value)}>{value}</Chip>)}</div></Field>
    <Field label="Protection"><div className="mt-2 flex flex-wrap gap-2">{SEX_PROTECTION.map((value) => <Chip key={value} active={protection === value} onClick={() => setProtection(protection === value ? "" : value)}>{value}</Chip>)}</div></Field>
    <Field label="Contraception"><div className="mt-2 flex flex-wrap gap-2">{["Pill taken correctly", "Late / missed pill", "Emergency contraception", "Not tracked"].map((value) => <Chip key={value} active={contraception === value} onClick={() => setContraception(contraception === value ? "" : value)}>{value}</Chip>)}</div></Field>
    <Field label="Symptoms after"><div className="mt-2 flex flex-wrap gap-2">{SEX_SYMPTOMS.map((value) => <Chip key={value} active={symptoms.includes(value)} onClick={() => setSymptoms((current) => toggleIn(current, value))}>{value}</Chip>)}</div></Field>
    <Field label="How I feel" schemaFieldId="feelingAfter"><CustomChipList base={SEX_FEELINGS_DEFAULT} custom={data.custom.sexFeelings ?? []} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, sexFeelings: [...(current.custom.sexFeelings ?? []), value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, sexFeelings: (current.custom.sexFeelings ?? []).filter((item) => item !== value) } })); setFeelingAfter((current) => current.filter((item) => item !== value)); }} selected={feelingAfter} onToggle={(value) => setFeelingAfter((current) => toggleIn(current, value))} /></Field>
  </div>;
}

export function EnhancedThermoForm({ date, update, onDone, initialEntry }: { date: string; update: UpdateFn; onDone: () => void; initialEntry?: ThermoSession }) {
  const schema = useLogSchema();
  const initial = initialEntry as ThermoSessionV2 | undefined;
  const [kind, setKind] = useState<ThermoKind>(initial?.kind ?? "heat");
  const [start, setStart] = useState(initial?.start ?? nowHHMM());
  const [minutes, setMinutes] = useState(initial?.minutes != null ? String(initial.minutes) : "20");
  const [ongoing, setOngoing] = useState(!!initial?.ongoing);
  const [bodyArea, setBodyArea] = useState(initial?.bodyArea ?? "");
  const [level, setLevel] = useState<ThermoSessionV2["level"]>(initial?.level);
  const [effectiveness, setEffectiveness] = useState<ThermoSessionV2["effectiveness"]>(initial?.effectiveness);
  const [painBefore, setPainBefore] = useState<number | undefined>(initial?.painBefore);
  const [painAfter, setPainAfter] = useState<number | undefined>(initial?.painAfter);
  const [note, setNote] = useState(initial?.note ?? "");

  const save = () => {
    const entry = {
      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      kind,
      start,
      minutes: ongoing ? 0 : Number(minutes || 0),
      ongoing: ongoing || undefined,
      bodyArea: bodyArea || undefined,
      level,
      effectiveness,
      painBefore,
      painAfter,
      note: note.trim() || undefined,
    } as ThermoSessionV2;
    updateDayLog(update, date, (log) => ({
      ...log,
      heat: initial ? (log.heat ?? []).map((item) => item.id === entry.id ? entry : item) : [...(log.heat ?? []), entry],
    }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Therapy" schemaFieldId="type"><div className="mt-2 flex gap-2"><Chip active={kind === "heat"} onClick={() => setKind("heat")}><Ico e="♨️" size={16} /> Heat</Chip><Chip active={kind === "cold"} onClick={() => setKind("cold")}><Ico e="🧊" size={16} /> Cold</Chip><Chip active={kind === "tens"} onClick={() => setKind("tens")}><Ico e="⭐" size={16} /> TENS</Chip></div></Field>
    <Field label="Body area"><div className="mt-2 flex flex-wrap gap-2">{BODY_AREAS.map((value) => <Chip key={value} active={bodyArea === value} onClick={() => setBodyArea(value)}>{value}</Chip>)}</div></Field>
    <Field label="Start" schemaFieldId="start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
    <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />
    <div className="flex flex-wrap gap-2">{[10, 15, 20, 30, 45].map((value) => <Chip key={value} active={!ongoing && Number(minutes) === value} onClick={() => { setOngoing(false); setMinutes(String(value)); }}>{value} min</Chip>)}</div>
    <Field label={kind === "tens" ? "TENS intensity" : "Intensity"}><div className="mt-2 flex gap-2">{(["low", "medium", "high"] as const).map((value) => <Chip key={value} active={level === value} onClick={() => setLevel(level === value ? undefined : value)}>{value[0].toUpperCase() + value.slice(1)}</Chip>)}</div></Field>
    <Field label="Did it help?"><div className="mt-2 flex flex-wrap gap-2">{([['no', 'No'], ['little', 'A little'], ['moderate', 'Moderately'], ['lot', 'A lot']] as const).map(([value, label]) => <Chip key={value} active={effectiveness === value} onClick={() => setEffectiveness(value)}>{label}</Chip>)}</div></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Pain before"><Input type="number" min={0} max={10} value={painBefore ?? ""} onChange={(e) => setPainBefore(e.target.value === "" ? undefined : Number(e.target.value))} /></Field><Field label="Pain after"><Input type="number" min={0} max={10} value={painAfter ?? ""} onChange={(e) => setPainAfter(e.target.value === "" ? undefined : Number(e.target.value))} /></Field></div>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
  </div>;
}

export function EnhancedFoodForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: FoodEntry }) {
  const schema = useLogSchema();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [what, setWhat] = useState(initialEntry?.what ?? "");
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [after, setAfter] = useState(initialEntry?.after ?? "");
  const [hydration, setHydration] = useState(initialEntry?.hydrationMl != null ? String(initialEntry.hydrationMl) : "");
  const [caffeine, setCaffeine] = useState(initialEntry?.caffeineMg != null ? String(initialEntry.caffeineMg) : "");
  const [alcohol, setAlcohol] = useState(initialEntry?.alcoholDrinks != null ? String(initialEntry.alcoholDrinks) : "");
  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(initialEntry?.symptomsAfter ?? []);
  const [histFlare, setHistFlare] = useState(!!initialEntry?.histamineFlare);
  const [histSymptoms, setHistSymptoms] = useState<string[]>(initialEntry?.histamineSymptoms ?? []);
  const [highHist, setHighHist] = useState(!!initialEntry?.highHistamine);
  const [allergensInMeal, setAllergensInMeal] = useState<string[]>(initialEntry?.allergensInMeal ?? []);
  const [allergicReaction, setAllergicReaction] = useState(!!initialEntry?.allergicReaction);
  const [reactionSeverity, setReactionSeverity] = useState<"mild" | "moderate" | "severe" | undefined>(initialEntry?.reactionSeverity);
  const allergensBase = data.settings.allergens ?? ALLERGENS_DEFAULT;

  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol && !histFlare && symptomsAfter.length === 0 && !allergicReaction) return;
    const entry: FoodEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      what: what.trim(),
      feelings,
      after: after.trim() || undefined,
      hydrationMl: hydration === "" ? undefined : Number(hydration),
      caffeineMg: caffeine === "" ? undefined : Number(caffeine),
      alcoholDrinks: alcohol === "" ? undefined : Number(alcohol),
      symptomsAfter: symptomsAfter.length ? symptomsAfter : undefined,
      histamineFlare: histFlare || undefined,
      histamineSymptoms: histFlare && histSymptoms.length ? histSymptoms : undefined,
      highHistamine: highHist || undefined,
      allergensInMeal: allergensInMeal.length ? allergensInMeal : undefined,
      allergicReaction: allergicReaction || undefined,
      reactionSeverity: allergicReaction ? reactionSeverity : undefined,
    };
    updateDayLog(update, date, (log) => ({
      ...log,
      food: initialEntry ? (log.food ?? []).map((item) => item.id === entry.id ? entry : item) : [...(log.food ?? []), entry],
    }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  const addCustom = (key: "foodSymptomsAfter" | "histamineSymptoms", value: string) => update((current) => ({ ...current, custom: { ...current.custom, [key]: [...(current.custom[key] ?? []), value] } }));
  const removeCustom = (key: "foodSymptomsAfter" | "histamineSymptoms", value: string) => update((current) => ({ ...current, custom: { ...current.custom, [key]: (current.custom[key] ?? []).filter((item) => item !== value) } }));

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    <Field label="What did you eat?" schemaFieldId="what"><Textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} /></Field>
    <Field label="How do I feel after food?" schemaFieldId="feelings"><CustomChipList base={FOOD_FEELINGS_DEFAULT} custom={data.custom.foodFeelings} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, foodFeelings: [...current.custom.foodFeelings, value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, foodFeelings: current.custom.foodFeelings.filter((item) => item !== value) } })); setFeelings((current) => current.filter((item) => item !== value)); }} selected={feelings} onToggle={(value) => setFeelings((current) => toggleIn(current, value))} /></Field>
    <Field label="Symptoms after food" schemaFieldId="symptomsAfter"><CustomChipList base={FOOD_SYMPTOMS_AFTER} custom={data.custom.foodSymptomsAfter ?? []} onAddCustom={(value) => addCustom("foodSymptomsAfter", value)} onRemoveCustom={(value) => { removeCustom("foodSymptomsAfter", value); setSymptomsAfter((current) => current.filter((item) => item !== value)); }} selected={symptomsAfter} onToggle={(value) => setSymptomsAfter((current) => toggleIn(current, value))} /></Field>
    <Field label="High histamine food?" schemaFieldId="highHistamine"><div className="mt-2 flex gap-2"><Chip active={!highHist} onClick={() => setHighHist(false)}>No</Chip><Chip active={highHist} onClick={() => setHighHist(true)}>Yes</Chip></div></Field>
    <Field label="Histamine flare?" schemaFieldId="histamineFlare"><div className="mt-2 flex gap-2"><Chip active={!histFlare} onClick={() => setHistFlare(false)}>No</Chip><Chip active={histFlare} onClick={() => setHistFlare(true)}>Yes</Chip></div></Field>
    {histFlare && <Field label="Histamine flare symptoms"><CustomChipList base={HISTAMINE_SYMPTOMS} custom={data.custom.histamineSymptoms ?? []} onAddCustom={(value) => addCustom("histamineSymptoms", value)} onRemoveCustom={(value) => { removeCustom("histamineSymptoms", value); setHistSymptoms((current) => current.filter((item) => item !== value)); }} selected={histSymptoms} onToggle={(value) => setHistSymptoms((current) => toggleIn(current, value))} /></Field>}
    <Field label="Allergens in this meal" schemaFieldId="allergens"><CustomChipList base={allergensBase} custom={data.custom.allergens} onAddCustom={(value) => update((current) => ({ ...current, settings: { ...current.settings, allergens: [...(current.settings.allergens ?? ALLERGENS_DEFAULT), value] }, custom: { ...current.custom, allergens: [...current.custom.allergens, value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, allergens: current.custom.allergens.filter((item) => item !== value) } })); setAllergensInMeal((current) => current.filter((item) => item !== value)); }} selected={allergensInMeal} onToggle={(value) => setAllergensInMeal((current) => toggleIn(current, value))} /></Field>
    <Field label="Reaction?" schemaFieldId="reaction"><div className="mt-2 flex gap-2"><Chip active={!allergicReaction} onClick={() => setAllergicReaction(false)}>No</Chip><Chip active={allergicReaction} onClick={() => setAllergicReaction(true)}>Yes</Chip></div>{allergicReaction && <div className="mt-2 flex gap-2">{(["mild", "moderate", "severe"] as const).map((value) => <Chip key={value} active={reactionSeverity === value} onClick={() => setReactionSeverity(value)}>{value[0].toUpperCase() + value.slice(1)}</Chip>)}</div>}</Field>
    <RegistryFieldBlock fieldId="intake"><div className="grid grid-cols-3 gap-2"><Field label="Water (ml)"><Input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} /></Field><Field label="Caffeine (mg)"><Input type="number" value={caffeine} onChange={(e) => setCaffeine(e.target.value)} /></Field><Field label="Alcohol (drinks)"><Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} /></Field></div></RegistryFieldBlock>
    <Field label="Additional note (optional)" schemaFieldId="note"><Textarea rows={2} value={after} onChange={(e) => setAfter(e.target.value)} /></Field>
  </div>;
}

export function EnhancedBowelForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: BowelEntry }) {
  const schema = useLogSchema();
  const [mode, setMode] = useState<"bowel" | "urinary">("bowel");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [bristol, setBristol] = useState(initialEntry?.bristol ?? 4);
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [urinary, setUrinary] = useState<string[]>(initialEntry?.urinary ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");

  const save = () => {
    if (mode === "urinary") {
      if (!urinary.length && !note.trim()) return;
      updateDayLog(update, date, (log) => {
        const ext = log as typeof log & DayLogV2;
        return {
          ...log,
          urinaryEntries: [...(ext.urinaryEntries ?? []), { id: crypto.randomUUID(), time, urinary, note: note.trim() || undefined }],
        } as typeof log;
      });
    } else {
      const entry: BowelEntry = {
        id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
        time,
        bristol,
        feelings: feelings.length ? feelings : undefined,
        symptoms: symptoms.length ? symptoms : undefined,
        note: note.trim() || undefined,
      };
      updateDayLog(update, date, (log) => ({
        ...log,
        bowel: initialEntry ? (log.bowel ?? []).map((item) => item.id === entry.id ? entry : item) : [...(log.bowel ?? []), entry],
      }));
    }
    schema?.saveAdminCustomFields();
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="What do you want to log?"><div className="mt-2 grid grid-cols-2 gap-2"><Chip active={mode === "bowel"} onClick={() => setMode("bowel")}>Bowel</Chip><Chip active={mode === "urinary"} onClick={() => setMode("urinary")}>Urinary</Chip></div></Field>
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    {mode === "bowel" ? <>
      <Field label="Bristol stool scale" schemaFieldId="bristol"><div className="mt-2 space-y-1.5"><button type="button" onClick={() => setBristol(-1)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol === -1 ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-muted">∅</span><span>No bowel movement</span></button><button type="button" onClick={() => setBristol(0)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol === 0 ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)" }}>0</span><span>Type 0 — Mystery</span></button>{BRISTOL.map((item) => <button key={item.n} type="button" onClick={() => setBristol(item.n)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol === item.n ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: item.color }}>{item.n}</span><span>{item.label}</span></button>)}</div></Field>
      <Field label="How do you feel?" schemaFieldId="feelings"><CustomChipList base={BOWEL_FEELINGS_DEFAULT} custom={data.custom.bowelFeelings} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, bowelFeelings: [...current.custom.bowelFeelings, value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, bowelFeelings: current.custom.bowelFeelings.filter((item) => item !== value) } })); setFeelings((current) => current.filter((item) => item !== value)); }} selected={feelings} onToggle={(value) => setFeelings((current) => toggleIn(current, value))} /></Field>
      <Field label="Symptoms" schemaFieldId="symptoms"><CustomChipList base={BOWEL_SYMPTOMS_DEFAULT} custom={data.custom.bowelSymptoms} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, bowelSymptoms: [...current.custom.bowelSymptoms, value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, bowelSymptoms: current.custom.bowelSymptoms.filter((item) => item !== value) } })); setSymptoms((current) => current.filter((item) => item !== value)); }} selected={symptoms} onToggle={(value) => setSymptoms((current) => toggleIn(current, value))} /></Field>
    </> : <Field label="Urinary" schemaFieldId="urinary"><CustomChipList base={URINARY_DEFAULT} custom={data.custom.urinary} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, urinary: [...current.custom.urinary, value] } }))} onRemoveCustom={(value) => { update((current) => ({ ...current, custom: { ...current.custom, urinary: current.custom.urinary.filter((item) => item !== value) } })); setUrinary((current) => current.filter((item) => item !== value)); }} selected={urinary} onToggle={(value) => setUrinary((current) => toggleIn(current, value))} /></Field>}
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
  </div>;
}

export function EnhancedWorkoutForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: WorkoutEntry }) {
  const schema = useLogSchema();
  const [kind, setKind] = useState(initialEntry?.kind ? stripEmoji(initialEntry.kind) : WORKOUT_KINDS_DEFAULT[0]);
  const [minutes, setMinutes] = useState(initialEntry?.minutes ?? 30);
  const [distance, setDistance] = useState(initialEntry?.distanceKm != null ? String(initialEntry.distanceKm) : "");
  const [elevation, setElevation] = useState(initialEntry?.elevationM != null ? String(initialEntry.elevationM) : "");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialEntry?.exercises ?? []);
  const [rpe, setRpe] = useState<number | undefined>(initialEntry?.rpe);
  const [feeling, setFeeling] = useState<string[]>(asArr(initialEntry?.feeling).map(stripEmoji));
  const [note, setNote] = useState(initialEntry?.note ?? "");

  const save = () => {
    const entry: WorkoutEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time: initialEntry?.time ?? nowHHMM(),
      kind,
      minutes,
      distanceKm: workoutHasDistance(kind) && distance !== "" ? Number(distance) : undefined,
      elevationM: workoutIsHike(kind) && elevation !== "" ? Number(elevation) : undefined,
      exercises: workoutIsStrength(kind) && exercises.length ? exercises : undefined,
      rpe,
      feeling: feeling.length ? feeling : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (log) => ({
      ...log,
      workout: initialEntry ? (log.workout ?? []).map((item) => item.id === entry.id ? entry : item) : [...(log.workout ?? []), entry],
    }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Workout type" schemaFieldId="kind"><CustomChipList base={WORKOUT_KINDS_DEFAULT} custom={data.custom.workoutKinds} onAddCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, workoutKinds: [...current.custom.workoutKinds, value] } }))} onRemoveCustom={(value) => update((current) => ({ ...current, custom: { ...current.custom, workoutKinds: current.custom.workoutKinds.filter((item) => item !== value) } }))} selected={[kind]} onToggle={setKind} /></Field>
    <Field label="Duration"><div className="mt-2 flex flex-wrap gap-2">{[15, 30, 45, 60].map((value) => <Chip key={value} active={minutes === value} onClick={() => setMinutes(value)}>{value} min</Chip>)}</div><Input className="mt-2" type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
    <Field label="Intensity"><div className="mt-2 grid grid-cols-3 gap-2"><Chip active={rpe != null && rpe <= 3} onClick={() => setRpe(3)}>Easy</Chip><Chip active={rpe != null && rpe >= 4 && rpe <= 7} onClick={() => setRpe(6)}>Moderate</Chip><Chip active={rpe != null && rpe >= 8} onClick={() => setRpe(9)}>Hard</Chip></div></Field>
    {workoutHasDistance(kind) && <RegistryFieldBlock fieldId="distance"><div className="grid grid-cols-2 gap-2"><Field label="Distance (km)"><Input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} /></Field>{workoutIsHike(kind) && <Field label="Elevation gain (m)"><Input type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} /></Field>}</div></RegistryFieldBlock>}
    {workoutIsStrength(kind) && <Field label="Exercises" schemaFieldId="exercises"><div className="space-y-2">{exercises.map((exercise, index) => <div key={exercise.id} className="space-y-2 rounded-2xl border border-border p-2"><Input value={exercise.name} placeholder="Exercise name" onChange={(e) => setExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} /><div className="grid grid-cols-3 gap-2"><Input type="number" placeholder="Sets" value={exercise.sets ?? ""} onChange={(e) => setExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sets: e.target.value === "" ? undefined : Number(e.target.value) } : item))} /><Input type="number" placeholder="Reps" value={exercise.reps ?? ""} onChange={(e) => setExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reps: e.target.value === "" ? undefined : Number(e.target.value) } : item))} /><Input type="number" placeholder="kg" value={exercise.weightKg ?? ""} onChange={(e) => setExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, weightKg: e.target.value === "" ? undefined : Number(e.target.value) } : item))} /></div></div>)}<button type="button" className="w-full rounded-2xl bg-tint py-2 text-sm font-semibold" onClick={() => setExercises((current) => [...current, { id: crypto.randomUUID(), name: "" }])}>+ Add exercise</button></div></Field>}
    <Field label="Body response"><div className="mt-2 flex flex-wrap gap-2">{WORKOUT_FEELINGS.map((value) => <Chip key={value} active={feeling.includes(value)} onClick={() => setFeeling((current) => toggleIn(current, value))}>{value}</Chip>)}</div></Field>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
  </div>;
}

export function EnhancedTempForm({ date, data, update, onDone }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = (data.dayLogs[date] ?? {}) as DayLogV2;
  const [tab, setTab] = useState<"temperature" | "weight" | "sleep">("temperature");
  const [temperature, setTemperature] = useState("");
  const [temperatureTime, setTemperatureTime] = useState(nowHHMM());
  const [temperatureLocation, setTemperatureLocation] = useState("Oral");
  const [weight, setWeight] = useState("");
  const [weightTime, setWeightTime] = useState(nowHHMM());
  const [bodyFat, setBodyFat] = useState("");
  const [sleepStart, setSleepStart] = useState(cur.sleepStartedAt ?? "");
  const [sleepEnd, setSleepEnd] = useState(cur.sleepEndedAt ?? "");
  const [quality, setQuality] = useState(3);
  const [wakeups, setWakeups] = useState(cur.sleepWakeups ?? 0);
  const [wakeFeeling, setWakeFeeling] = useState(cur.sleepWakeFeeling ?? "");
  const [sleepSymptoms, setSleepSymptoms] = useState<string[]>(cur.sleepSymptoms ?? []);

  const sleepHours = useMemo(() => {
    if (!sleepStart || !sleepEnd) return undefined;
    const [startHour, startMinute] = sleepStart.split(":").map(Number);
    const [endHour, endMinute] = sleepEnd.split(":").map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 1440;
    return Math.round((minutes / 60) * 100) / 100;
  }, [sleepStart, sleepEnd]);

  const save = () => {
    updateDayLog(update, date, (log) => {
      const ext = log as typeof log & DayLogV2;
      const temperatures = [...(ext.temperatureEntries ?? [])];
      const weights = [...(ext.weightEntries ?? [])];
      const temperatureValue = temperature.trim() === "" ? undefined : Number(temperature.replace(",", "."));
      const weightValue = weight.trim() === "" ? undefined : Number(weight.replace(",", "."));
      if (temperatureValue != null && Number.isFinite(temperatureValue)) temperatures.push({ id: crypto.randomUUID(), time: temperatureTime, value: temperatureValue, location: temperatureLocation });
      if (weightValue != null && Number.isFinite(weightValue)) weights.push({ id: crypto.randomUUID(), time: weightTime, value: weightValue, bodyFatPercent: bodyFat === "" ? undefined : Number(bodyFat) });
      return {
        ...log,
        temperatureEntries: temperatures.length ? temperatures : undefined,
        weightEntries: weights.length ? weights : undefined,
        temperature: temperatures.length ? temperatures[temperatures.length - 1].value : ext.temperature,
        weight: weights.length ? weights[weights.length - 1].value : ext.weight,
        sleepStartedAt: sleepStart || undefined,
        sleepEndedAt: sleepEnd || undefined,
        sleepHours: sleepHours ?? ext.sleepHours,
        sleepQuality: [String(quality)],
        sleepWakeups: wakeups,
        sleepWakeFeeling: wakeFeeling || undefined,
        sleepSymptoms: sleepSymptoms.length ? sleepSymptoms : undefined,
      } as typeof log;
    });
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <div className="grid grid-cols-3 gap-2">{([['temperature', 'Temperature'], ['weight', 'Weight'], ['sleep', 'Sleep']] as const).map(([value, label]) => <Chip key={value} active={tab === value} onClick={() => setTab(value)}>{label}</Chip>)}</div>
    {tab === "temperature" && <><Field label="Temperature"><div className="grid grid-cols-[1fr_120px] gap-2"><Input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.7 °C" /><Input type="time" value={temperatureTime} onChange={(e) => setTemperatureTime(e.target.value)} /></div></Field><Field label="Measurement location"><div className="mt-2 flex flex-wrap gap-2">{["Oral", "Ear", "Forehead", "Armpit", "Other"].map((value) => <Chip key={value} active={temperatureLocation === value} onClick={() => setTemperatureLocation(value)}>{value}</Chip>)}</div></Field>{(cur.temperatureEntries ?? []).map((entry) => <div key={entry.id} className="rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><b>{entry.value.toFixed(1)} °C</b><div className="text-xs text-muted-foreground">{entry.time}{entry.location ? ` · ${entry.location}` : ""}</div></div>)}</>}
    {tab === "weight" && <><Field label="Weight"><div className="grid grid-cols-[1fr_120px] gap-2"><Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="62.5 kg" /><Input type="time" value={weightTime} onChange={(e) => setWeightTime(e.target.value)} /></div></Field><Field label="Body fat % (optional)"><Input inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></Field>{(cur.weightEntries ?? []).map((entry) => <div key={entry.id} className="rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><b>{entry.value.toFixed(1)} kg</b><div className="text-xs text-muted-foreground">{entry.time}{entry.bodyFatPercent != null ? ` · ${entry.bodyFatPercent}% body fat` : ""}</div></div>)}</>}
    {tab === "sleep" && <><div className="grid grid-cols-2 gap-3"><Field label="Fell asleep"><Input type="time" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} /></Field><Field label="Woke up"><Input type="time" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} /></Field></div>{sleepHours != null && <div className="rounded-2xl bg-tint p-3 text-center"><div className="text-2xl font-semibold">{Math.floor(sleepHours)} h {Math.round((sleepHours % 1) * 60)} min</div><div className="text-xs text-muted-foreground">Calculated sleep duration</div></div>}<Field label={`Sleep quality ${quality}/5`}><IntensityScale value={quality} onChange={setQuality} from={1} max={5} step={1} compactSingleRow /></Field><Field label="Wake-ups"><div className="mt-2 flex gap-2">{[0, 1, 2, 3, 4].map((value) => <Chip key={value} active={wakeups === value} onClick={() => setWakeups(value)}>{value === 4 ? "4+" : value}</Chip>)}</div></Field><Field label="During sleep"><div className="mt-2 flex flex-wrap gap-2">{SLEEP_SYMPTOMS.map((value) => <Chip key={value} active={sleepSymptoms.includes(value)} onClick={() => setSleepSymptoms((current) => toggleIn(current, value))}>{value}</Chip>)}</div></Field><Field label="How do you feel after waking?"><div className="mt-2 flex flex-wrap gap-2">{["Rested", "Okay", "Tired", "Exhausted"].map((value) => <Chip key={value} active={wakeFeeling === value} onClick={() => setWakeFeeling(value)}>{value}</Chip>)}</div></Field></>}
  </div>;
}
