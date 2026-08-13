import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Ico } from "@/components/icons/BixboIcons";
import {
  ALLERGENS_DEFAULT,
  BOWEL_FEELINGS_DEFAULT,
  BOWEL_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT,
  FOOD_SYMPTOMS_AFTER,
  HISTAMINE_SYMPTOMS,
  SEX_FEELINGS_DEFAULT,
  SEX_TYPES_DEFAULT,
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
import { AddCustomInline, BristolIcon } from "./CycleForms";

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

type VitalRowV2 = { id: string; time: string; value: number; location?: string; bodyFatPercent?: number };
type DayLogV2 = {
  temperatureEntries?: VitalRowV2[];
  weightEntries?: VitalRowV2[];
  temperature?: number;
  weight?: number;
  sleepHours?: number;
  sleepQuality?: string | string[];
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
  const [kind, setKind] = useState<SexKind>(initial?.kind ?? "sex");
  const [activity, setActivity] = useState(initial?.activity ?? "Vaginal");
  const [protection, setProtection] = useState(initial?.protection ?? "");
  const [contraception, setContraception] = useState(initial?.contraception ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [painScore, setPainScore] = useState<number | undefined>(initial?.painScore);
  const [painLocation, setPainLocation] = useState(initial?.painLocation ?? "");
  const [bleedingLevel, setBleedingLevel] = useState(initial?.bleedingLevel ?? "");
  const [orgasm, setOrgasm] = useState(initial?.orgasm ?? "");
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initial?.feelingAfter));
  const [note, setNote] = useState(initial?.note ?? "");

  const save = () => {
    const e = {
      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      kind,
      activity,
      protection: protection || undefined,
      contraception: contraception || undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      painScore: symptoms.includes("Pain") ? painScore : undefined,
      painLocation: symptoms.includes("Pain") && painLocation ? painLocation : undefined,
      bleedingLevel: symptoms.includes("Bleeding") && bleedingLevel ? bleedingLevel : undefined,
      orgasm: orgasm || undefined,
      feelingAfter: feelingAfter.length ? feelingAfter : undefined,
      painful: symptoms.includes("Pain") ? "during" : "no",
      note: note.trim() || undefined,
    } as SexEntryV2;
    updateDayLog(update, date, (l) => ({ ...l, sex: initial ? (l.sex ?? []).map((x) => x.id === e.id ? e : x) : [...(l.sex ?? []), e] }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    <Field label="Activity" schemaFieldId="type"><div className="mt-2 flex flex-wrap gap-2">{SEX_ACTIVITY_TYPES.map((v) => <Chip key={v} active={activity === v} onClick={() => setActivity(v)}>{v}</Chip>)}</div></Field>
    <Field label="Protection"><div className="mt-2 flex flex-wrap gap-2">{SEX_PROTECTION.map((v) => <Chip key={v} active={protection === v} onClick={() => setProtection(protection === v ? "" : v)}>{v}</Chip>)}</div></Field>
    <Field label="Contraception"><div className="mt-2 flex flex-wrap gap-2">{["Pill taken correctly", "Late / missed pill", "Emergency contraception", "Not tracked"].map((v) => <Chip key={v} active={contraception === v} onClick={() => setContraception(contraception === v ? "" : v)}>{v}</Chip>)}</div></Field>
    <Field label="Symptoms after sex"><div className="mt-2 flex flex-wrap gap-2">{SEX_SYMPTOMS.map((v) => <Chip key={v} active={symptoms.includes(v)} onClick={() => setSymptoms((a) => toggleIn(a, v))}>{v}</Chip>)}</div></Field>
    {symptoms.includes("Pain") && <div className="rounded-2xl border border-border p-3 space-y-3"><Field label={`Pain ${painScore ?? "—"}/10`}><IntensityScale value={painScore ?? -1} onChange={(n) => setPainScore(painScore === n ? undefined : n)} from={1} max={10} step={1} compactSingleRow /></Field><Field label="Pain location"><div className="mt-2 flex flex-wrap gap-2">{BODY_AREAS.map((v) => <Chip key={v} active={painLocation === v} onClick={() => setPainLocation(v)}>{v}</Chip>)}</div></Field></div>}
    {symptoms.includes("Bleeding") && <Field label="Bleeding"><div className="mt-2 flex flex-wrap gap-2">{["Spotting", "Light", "Medium", "Heavy"].map((v) => <Chip key={v} active={bleedingLevel === v} onClick={() => setBleedingLevel(v)}>{v}</Chip>)}</div></Field>}
    <Field label="Orgasm (optional)"><div className="mt-2 flex flex-wrap gap-2">{["Yes", "No", "Multiple", "Not tracked"].map((v) => <Chip key={v} active={orgasm === v} onClick={() => setOrgasm(orgasm === v ? "" : v)}>{v}</Chip>)}</div></Field>
    <Field label="How I feel after" schemaFieldId="feelingAfter"><CustomChipList base={SEX_FEELINGS_DEFAULT} custom={data.custom.sexFeelings ?? []} onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: [...(d.custom.sexFeelings ?? []), v] } }))} onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).filter((x) => x !== v) } })); setFeelingAfter((a) => a.filter((x) => x !== v)); }} selected={feelingAfter} onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))} /></Field>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
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
    const e = { id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), kind, start, minutes: ongoing ? 0 : Number(minutes || 0), ongoing: ongoing || undefined, bodyArea: bodyArea || undefined, level, effectiveness, painBefore, painAfter, note: note.trim() || undefined } as ThermoSessionV2;
    updateDayLog(update, date, (l) => ({ ...l, heat: initial ? (l.heat ?? []).map((x) => x.id === e.id ? e : x) : [...(l.heat ?? []), e] }));
    schema?.saveAdminCustomFields();
    onDone();
  };
  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Therapy" schemaFieldId="type"><div className="mt-2 flex gap-2"><Chip active={kind === "heat"} onClick={() => setKind("heat")}><Ico e="♨️" size={16}/> Heat</Chip><Chip active={kind === "cold"} onClick={() => setKind("cold")}><Ico e="🧊" size={16}/> Cold</Chip><Chip active={kind === "tens"} onClick={() => setKind("tens")}><Ico e="⭐" size={16}/> TENS</Chip></div></Field>
    <Field label="Body area"><div className="mt-2 flex flex-wrap gap-2">{BODY_AREAS.map((v) => <Chip key={v} active={bodyArea === v} onClick={() => setBodyArea(v)}>{v}</Chip>)}</div></Field>
    <Field label="Start" schemaFieldId="start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
    <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />
    <div className="flex flex-wrap gap-2">{[10,15,20,30,45].map((v) => <Chip key={v} active={!ongoing && Number(minutes) === v} onClick={() => { setOngoing(false); setMinutes(String(v)); }}>{v} min</Chip>)}</div>
    <Field label={kind === "tens" ? "TENS intensity" : "Intensity"}><div className="mt-2 flex gap-2">{(["low","medium","high"] as const).map((v) => <Chip key={v} active={level === v} onClick={() => setLevel(level === v ? undefined : v)}>{v[0].toUpperCase()+v.slice(1)}</Chip>)}</div></Field>
    <Field label="Did it help?"><div className="mt-2 flex flex-wrap gap-2">{([['no','No'],['little','A little'],['moderate','Moderately'],['lot','A lot']] as const).map(([v,l]) => <Chip key={v} active={effectiveness === v} onClick={() => setEffectiveness(v)}>{l}</Chip>)}</div></Field>
    <div className="grid grid-cols-2 gap-3"><Field label={`Pain before ${painBefore ?? "—"}/10`}><Input type="number" min={0} max={10} value={painBefore ?? ""} onChange={(e) => setPainBefore(e.target.value === "" ? undefined : Number(e.target.value))}/></Field><Field label={`Pain after ${painAfter ?? "—"}/10`}><Input type="number" min={0} max={10} value={painAfter ?? ""} onChange={(e) => setPainAfter(e.target.value === "" ? undefined : Number(e.target.value))}/></Field></div>
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
  const [reactionSeverity, setReactionSeverity] = useState<"mild"|"moderate"|"severe"|undefined>(initialEntry?.reactionSeverity);
  const allergensBase = data.settings.allergens ?? ALLERGENS_DEFAULT;
  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol && !histFlare && symptomsAfter.length === 0 && !allergicReaction) return;
    const e: FoodEntry = { id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time, what: what.trim(), feelings, after: after.trim() || undefined, hydrationMl: hydration === "" ? undefined : Number(hydration), caffeineMg: caffeine === "" ? undefined : Number(caffeine), alcoholDrinks: alcohol === "" ? undefined : Number(alcohol), symptomsAfter: symptomsAfter.length ? symptomsAfter : undefined, histamineFlare: histFlare || undefined, histamineSymptoms: histFlare && histSymptoms.length ? histSymptoms : undefined, highHistamine: highHist || undefined, allergensInMeal: allergensInMeal.length ? allergensInMeal : undefined, allergicReaction: allergicReaction || undefined, reactionSeverity: allergicReaction ? reactionSeverity : undefined };
    updateDayLog(update, date, (l) => ({ ...l, food: initialEntry ? (l.food ?? []).map((x) => x.id === e.id ? e : x) : [...(l.food ?? []), e] }));
    schema?.saveAdminCustomFields();
    onDone();
  };
  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    <Field label="What did you eat?" schemaFieldId="what"><Textarea rows={2} value={what} onChange={(e) => setWhat(e.target.value)} /></Field>
    <Field label="How do I feel after food?" schemaFieldId="feelings"><CustomChipList base={FOOD_FEELINGS_DEFAULT} custom={data.custom.foodFeelings} onAddCustom={(v) => update((d) => ({...d, custom:{...d.custom, foodFeelings:[...d.custom.foodFeelings,v]}}))} onRemoveCustom={(v) => { update((d) => ({...d, custom:{...d.custom, foodFeelings:d.custom.foodFeelings.filter((x)=>x!==v)}})); setFeelings((a)=>a.filter((x)=>x!==v)); }} selected={feelings} onToggle={(v)=>setFeelings((a)=>toggleIn(a,v))}/></Field>
    <Field label="Symptoms after food" schemaFieldId="symptomsAfter"><CustomChipList base={FOOD_SYMPTOMS_AFTER} custom={data.custom.foodSymptomsAfter ?? []} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,foodSymptomsAfter:[...(d.custom.foodSymptomsAfter??[]),v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,foodSymptomsAfter:(d.custom.foodSymptomsAfter??[]).filter((x)=>x!==v)}}));setSymptomsAfter((a)=>a.filter((x)=>x!==v));}} selected={symptomsAfter} onToggle={(v)=>setSymptomsAfter((a)=>toggleIn(a,v))}/></Field>
    <Field label="High histamine food?" schemaFieldId="highHistamine"><div className="mt-2 flex gap-2"><Chip active={!highHist} onClick={()=>setHighHist(false)}>No</Chip><Chip active={highHist} onClick={()=>setHighHist(true)}>Yes</Chip></div></Field>
    <Field label="Histamine flare?" schemaFieldId="histamineFlare"><div className="mt-2 flex gap-2"><Chip active={!histFlare} onClick={()=>setHistFlare(false)}>No</Chip><Chip active={histFlare} onClick={()=>setHistFlare(true)}>Yes</Chip></div></Field>
    {histFlare && <Field label="Histamine flare symptoms"><CustomChipList base={HISTAMINE_SYMPTOMS} custom={data.custom.histamineSymptoms ?? []} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,histamineSymptoms:[...(d.custom.histamineSymptoms??[]),v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,histamineSymptoms:(d.custom.histamineSymptoms??[]).filter((x)=>x!==v)}}));setHistSymptoms((a)=>a.filter((x)=>x!==v));}} selected={histSymptoms} onToggle={(v)=>setHistSymptoms((a)=>toggleIn(a,v))}/></Field>}
    <Field label="Allergens in this meal" schemaFieldId="allergens"><CustomChipList base={allergensBase} custom={data.custom.allergens} onAddCustom={(v)=>update((d)=>({...d,settings:{...d.settings,allergens:[...(d.settings.allergens??ALLERGENS_DEFAULT),v]},custom:{...d.custom,allergens:[...d.custom.allergens,v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,allergens:d.custom.allergens.filter((x)=>x!==v)}}));setAllergensInMeal((a)=>a.filter((x)=>x!==v));}} selected={allergensInMeal} onToggle={(v)=>setAllergensInMeal((a)=>toggleIn(a,v))}/></Field>
    <Field label="Reaction?" schemaFieldId="reaction"><div className="mt-2 flex gap-2"><Chip active={!allergicReaction} onClick={()=>setAllergicReaction(false)}>No</Chip><Chip active={allergicReaction} onClick={()=>setAllergicReaction(true)}>Yes</Chip></div>{allergicReaction && <div className="mt-2 flex gap-2">{(["mild","moderate","severe"] as const).map((v)=><Chip key={v} active={reactionSeverity===v} onClick={()=>setReactionSeverity(v)}>{v[0].toUpperCase()+v.slice(1)}</Chip>)}</div>}</Field>
    <RegistryFieldBlock fieldId="intake"><div className="grid grid-cols-3 gap-2"><Field label="Water (ml)"><Input type="number" value={hydration} onChange={(e)=>setHydration(e.target.value)} /></Field><Field label="Caffeine (mg)"><Input type="number" value={caffeine} onChange={(e)=>setCaffeine(e.target.value)} /></Field><Field label="Alcohol (drinks)"><Input type="number" value={alcohol} onChange={(e)=>setAlcohol(e.target.value)} /></Field></div></RegistryFieldBlock>
    <Field label="Additional note (optional)" schemaFieldId="note"><Textarea rows={2} value={after} onChange={(e)=>setAfter(e.target.value)} /></Field>
  </div>;
}

export function EnhancedBowelForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: BowelEntry }) {
  const schema = useLogSchema();
  const [mode, setMode] = useState<"bowel"|"urinary">(initialEntry ? "bowel" : "bowel");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [bristol, setBristol] = useState<number>(initialEntry?.bristol ?? 4);
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [urinary, setUrinary] = useState<string[]>(initialEntry?.urinary ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    if (mode === "urinary") {
      if (!urinary.length && !note.trim()) return;
      updateDayLog(update, date, (log) => {
        const ext = log as typeof log & DayLogV2;
        return { ...log, urinaryEntries: [...(ext.urinaryEntries ?? []), { id: crypto.randomUUID(), time, urinary, note: note.trim() || undefined }] } as typeof log;
      });
    } else {
      const e: BowelEntry = { id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time, bristol, feelings: feelings.length ? feelings : undefined, symptoms: symptoms.length ? symptoms : undefined, note: note.trim() || undefined };
      updateDayLog(update, date, (l) => ({ ...l, bowel: initialEntry ? (l.bowel ?? []).map((x) => x.id === e.id ? e : x) : [...(l.bowel ?? []), e] }));
    }
    schema?.saveAdminCustomFields();
    onDone();
  };
  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="What do you want to log?"><div className="mt-2 grid grid-cols-2 gap-2"><Chip active={mode==="bowel"} onClick={()=>setMode("bowel")}>Bowel</Chip><Chip active={mode==="urinary"} onClick={()=>setMode("urinary")}>Urinary</Chip></div></Field>
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e)=>setTime(e.target.value)} /></Field>
    {mode === "bowel" ? <>
      <Field label="Bristol stool scale" schemaFieldId="bristol"><div className="mt-2 space-y-1.5"><button type="button" onClick={()=>setBristol(-1)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol===-1?"border-primary bg-primary/10":"border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-muted">∅</span><span>No bowel movement</span></button><button type="button" onClick={()=>setBristol(0)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol===0?"border-primary bg-primary/10":"border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{background:"linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)"}}>0</span><span>Type 0 — Mystery</span></button>{[1,2,3,4,5,6,7].map((n)=>{const row=(data as any) && null; return <button key={n} type="button" onClick={()=>setBristol(n)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${bristol===n?"border-primary bg-primary/10":"border-border bg-surface"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white">{n}</span><span>Type {n}</span></button>;})}</div></Field>
      <Field label="How do you feel?" schemaFieldId="feelings"><CustomChipList base={BOWEL_FEELINGS_DEFAULT} custom={data.custom.bowelFeelings} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,bowelFeelings:[...d.custom.bowelFeelings,v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,bowelFeelings:d.custom.bowelFeelings.filter((x)=>x!==v)}}));setFeelings((a)=>a.filter((x)=>x!==v));}} selected={feelings} onToggle={(v)=>setFeelings((a)=>toggleIn(a,v))}/></Field>
      <Field label="Symptoms" schemaFieldId="symptoms"><CustomChipList base={BOWEL_SYMPTOMS_DEFAULT} custom={data.custom.bowelSymptoms} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,bowelSymptoms:[...d.custom.bowelSymptoms,v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,bowelSymptoms:d.custom.bowelSymptoms.filter((x)=>x!==v)}}));setSymptoms((a)=>a.filter((x)=>x!==v));}} selected={symptoms} onToggle={(v)=>setSymptoms((a)=>toggleIn(a,v))}/></Field>
    </> : <Field label="Urinary" schemaFieldId="urinary"><CustomChipList base={URINARY_DEFAULT} custom={data.custom.urinary} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,urinary:[...d.custom.urinary,v]}}))} onRemoveCustom={(v)=>{update((d)=>({...d,custom:{...d.custom,urinary:d.custom.urinary.filter((x)=>x!==v)}}));setUrinary((a)=>a.filter((x)=>x!==v));}} selected={urinary} onToggle={(v)=>setUrinary((a)=>toggleIn(a,v))}/></Field>}
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} value={note} onChange={(e)=>setNote(e.target.value)} /></Field>
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
    const e: WorkoutEntry = { id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time: initialEntry?.time ?? nowHHMM(), kind, minutes, distanceKm: workoutHasDistance(kind)&&distance!==""?Number(distance):undefined, elevationM: workoutIsHike(kind)&&elevation!==""?Number(elevation):undefined, exercises: workoutIsStrength(kind)&&exercises.length?exercises:undefined, rpe, feeling: feeling.length?feeling:undefined, note: note.trim()||undefined };
    updateDayLog(update,date,(l)=>({...l,workout:initialEntry?(l.workout??[]).map((x)=>x.id===e.id?e:x):[...(l.workout??[]),e]}));
    schema?.saveAdminCustomFields();
    onDone();
  };
  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save}/>
    <Field label="Workout type" schemaFieldId="kind"><CustomChipList base={WORKOUT_KINDS_DEFAULT} custom={data.custom.workoutKinds} onAddCustom={(v)=>update((d)=>({...d,custom:{...d.custom,workoutKinds:[...d.custom.workoutKinds,v]}}))} onRemoveCustom={(v)=>update((d)=>({...d,custom:{...d.custom,workoutKinds:d.custom.workoutKinds.filter((x)=>x!==v)}}))} selected={[kind]} onToggle={setKind}/></Field>
    <Field label="Duration"><div className="mt-2 flex flex-wrap gap-2">{[15,30,45,60].map((v)=><Chip key={v} active={minutes===v} onClick={()=>setMinutes(v)}>{v} min</Chip>)}</div><Input className="mt-2" type="number" min={1} value={minutes} onChange={(e)=>setMinutes(Number(e.target.value))}/></Field>
    <Field label="Intensity"><div className="mt-2 grid grid-cols-3 gap-2"><Chip active={rpe!=null&&rpe<=3} onClick={()=>setRpe(3)}>Easy</Chip><Chip active={rpe!=null&&rpe>=4&&rpe<=7} onClick={()=>setRpe(6)}>Moderate</Chip><Chip active={rpe!=null&&rpe>=8} onClick={()=>setRpe(9)}>Hard</Chip></div></Field>
    {workoutHasDistance(kind)&&<RegistryFieldBlock fieldId="distance"><div className="grid grid-cols-2 gap-2"><Field label="Distance (km)"><Input type="number" step="0.1" value={distance} onChange={(e)=>setDistance(e.target.value)}/></Field>{workoutIsHike(kind)&&<Field label="Elevation gain (m)"><Input type="number" value={elevation} onChange={(e)=>setElevation(e.target.value)}/></Field>}</div></RegistryFieldBlock>}
    {workoutIsStrength(kind)&&<Field label="Exercises" schemaFieldId="exercises"><div className="space-y-2">{exercises.map((ex,i)=><div key={ex.id} className="rounded-2xl border border-border p-2 space-y-2"><Input value={ex.name} placeholder="Exercise name" onChange={(e)=>setExercises((a)=>a.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><div className="grid grid-cols-3 gap-2"><Input type="number" placeholder="Sets" value={ex.sets??""} onChange={(e)=>setExercises((a)=>a.map((x,j)=>j===i?{...x,sets:e.target.value===""?undefined:Number(e.target.value)}:x))}/><Input type="number" placeholder="Reps" value={ex.reps??""} onChange={(e)=>setExercises((a)=>a.map((x,j)=>j===i?{...x,reps:e.target.value===""?undefined:Number(e.target.value)}:x))}/><Input type="number" placeholder="kg" value={ex.weightKg??""} onChange={(e)=>setExercises((a)=>a.map((x,j)=>j===i?{...x,weightKg:e.target.value===""?undefined:Number(e.target.value)}:x))}/></div></div>)}<button type="button" className="w-full rounded-2xl bg-tint py-2 text-sm font-semibold" onClick={()=>setExercises((a)=>[...a,{id:crypto.randomUUID(),name:""}])}>+ Add exercise</button></div></Field>}
    <Field label="Body response"><div className="mt-2 flex flex-wrap gap-2">{WORKOUT_FEELINGS.map((v)=><Chip key={v} active={feeling.includes(v)} onClick={()=>setFeeling((a)=>toggleIn(a,v))}>{v}</Chip>)}</div></Field>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} value={note} onChange={(e)=>setNote(e.target.value)}/></Field>
  </div>;
}

export function EnhancedTempForm({ date, data, update, onDone }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const cur = data.dayLogs[date] as typeof data.dayLogs[string] & DayLogV2;
  const [tab, setTab] = useState<"temperature"|"weight"|"sleep">("temperature");
  const [temperature, setTemperature] = useState("");
  const [temperatureTime, setTemperatureTime] = useState(nowHHMM());
  const [temperatureLocation, setTemperatureLocation] = useState("Oral");
  const [weight, setWeight] = useState("");
  const [weightTime, setWeightTime] = useState(nowHHMM());
  const [bodyFat, setBodyFat] = useState("");
  const [sleepStart, setSleepStart] = useState(cur?.sleepStartedAt ?? "");
  const [sleepEnd, setSleepEnd] = useState(cur?.sleepEndedAt ?? "");
  const [quality, setQuality] = useState<number>(() => { const q = asArr(cur?.sleepQuality); const n = Number(q[0]); return Number.isFinite(n) ? n : 3; });
  const [wakeups, setWakeups] = useState(cur?.sleepWakeups ?? 0);
  const [wakeFeeling, setWakeFeeling] = useState(cur?.sleepWakeFeeling ?? "");
  const [sleepSymptoms, setSleepSymptoms] = useState<string[]>(cur?.sleepSymptoms ?? []);
  const sleepHours = useMemo(()=>{ if(!sleepStart||!sleepEnd)return undefined; const [sh,sm]=sleepStart.split(":").map(Number); const [eh,em]=sleepEnd.split(":").map(Number); let mins=(eh*60+em)-(sh*60+sm); if(mins<0)mins+=1440; return Math.round((mins/60)*100)/100; },[sleepStart,sleepEnd]);
  const save = () => {
    updateDayLog(update,date,(log)=>{
      const ext=log as typeof log & DayLogV2;
      const temps=[...(ext.temperatureEntries??[])];
      const weights=[...(ext.weightEntries??[])];
      const tv=temperature.trim()===""?undefined:Number(temperature.replace(",","."));
      const wv=weight.trim()===""?undefined:Number(weight.replace(",","."));
      if(tv!=null&&Number.isFinite(tv))temps.push({id:crypto.randomUUID(),time:temperatureTime,value:tv,location:temperatureLocation});
      if(wv!=null&&Number.isFinite(wv))weights.push({id:crypto.randomUUID(),time:weightTime,value:wv,bodyFatPercent:bodyFat===""?undefined:Number(bodyFat)});
      return { ...log, temperatureEntries: temps.length?temps:undefined, weightEntries:weights.length?weights:undefined, temperature:temps.length?temps[temps.length-1].value:ext.temperature, weight:weights.length?weights[weights.length-1].value:ext.weight, sleepStartedAt:sleepStart||undefined, sleepEndedAt:sleepEnd||undefined, sleepHours:sleepHours??ext.sleepHours, sleepQuality:String(quality), sleepWakeups:wakeups, sleepWakeFeeling:wakeFeeling||undefined, sleepSymptoms:sleepSymptoms.length?sleepSymptoms:undefined } as typeof log;
    });
    onDone();
  };
  return <div className="flex flex-col gap-4"><SaveBar onCancel={onDone} onSave={save}/><div className="grid grid-cols-3 gap-2">{([['temperature','Temperature'],['weight','Weight'],['sleep','Sleep']] as const).map(([v,l])=><Chip key={v} active={tab===v} onClick={()=>setTab(v)}>{l}</Chip>)}</div>
    {tab==="temperature"&&<><Field label="Temperature"><div className="grid grid-cols-[1fr_120px] gap-2"><Input inputMode="decimal" value={temperature} onChange={(e)=>setTemperature(e.target.value)} placeholder="36.7 °C"/><Input type="time" value={temperatureTime} onChange={(e)=>setTemperatureTime(e.target.value)}/></div></Field><Field label="Measurement location"><div className="mt-2 flex flex-wrap gap-2">{["Oral","Ear","Forehead","Armpit","Other"].map((v)=><Chip key={v} active={temperatureLocation===v} onClick={()=>setTemperatureLocation(v)}>{v}</Chip>)}</div></Field>{(cur?.temperatureEntries??[]).map((e)=><div key={e.id} className="rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><b>{e.value.toFixed(1)} °C</b><div className="text-xs text-muted-foreground">{e.time}{e.location?` · ${e.location}`:""}</div></div>)}</>}
    {tab==="weight"&&<><Field label="Weight"><div className="grid grid-cols-[1fr_120px] gap-2"><Input inputMode="decimal" value={weight} onChange={(e)=>setWeight(e.target.value)} placeholder="62.5 kg"/><Input type="time" value={weightTime} onChange={(e)=>setWeightTime(e.target.value)}/></div></Field><Field label="Body fat % (optional)"><Input inputMode="decimal" value={bodyFat} onChange={(e)=>setBodyFat(e.target.value)}/></Field>{(cur?.weightEntries??[]).map((e)=><div key={e.id} className="rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><b>{e.value.toFixed(1)} kg</b><div className="text-xs text-muted-foreground">{e.time}{e.bodyFatPercent!=null?` · ${e.bodyFatPercent}% body fat`:""}</div></div>)}</>}
    {tab==="sleep"&&<><div className="grid grid-cols-2 gap-3"><Field label="Fell asleep"><Input type="time" value={sleepStart} onChange={(e)=>setSleepStart(e.target.value)}/></Field><Field label="Woke up"><Input type="time" value={sleepEnd} onChange={(e)=>setSleepEnd(e.target.value)}/></Field></div>{sleepHours!=null&&<div className="rounded-2xl bg-tint p-3 text-center"><div className="text-2xl font-semibold">{Math.floor(sleepHours)} h {Math.round((sleepHours%1)*60)} min</div><div className="text-xs text-muted-foreground">Calculated sleep duration</div></div>}<Field label={`Sleep quality ${quality}/5`}><IntensityScale value={quality} onChange={setQuality} from={1} max={5} step={1} compactSingleRow/></Field><Field label="Wake-ups"><div className="mt-2 flex gap-2">{[0,1,2,3,4].map((v)=><Chip key={v} active={wakeups===v} onClick={()=>setWakeups(v)}>{v===4?"4+":v}</Chip>)}</div></Field><Field label="During sleep"><div className="mt-2 flex flex-wrap gap-2">{SLEEP_SYMPTOMS.map((v)=><Chip key={v} active={sleepSymptoms.includes(v)} onClick={()=>setSleepSymptoms((a)=>toggleIn(a,v))}>{v}</Chip>)}</div></Field><Field label="How do you feel after waking?"><div className="mt-2 flex flex-wrap gap-2">{["Rested","Okay","Tired","Exhausted"].map((v)=><Chip key={v} active={wakeFeeling===v} onClick={()=>setWakeFeeling(v)}>{v}</Chip>)}</div></Field></>}
  </div>;
}
