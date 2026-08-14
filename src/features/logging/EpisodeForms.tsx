import { Children, isValidElement, useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { TrText } from "@/features/logging/TrText";
import { CATEGORIES, type Category } from "@/features/logging/logCategories";
import { LogSchemaContext, useLogSchema, type LogSchemaContextValue } from "@/features/logging/LogSchemaContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Ico, IcoText } from "@/components/icons/BixboExtraIcons";
import { CustomLogForm } from "@/components/CustomLogForm";
import { CoreFeatureCustomFieldInput } from "@/components/CoreFeatureCustomFieldsForm";
import { POSTPARTUM_SYMPTOMS } from "@/lib/health";
import { BIXBO_LOG_FIELDS, getRegistryFeature, getRegistryField, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryFieldsForFeature, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ChevronLeft, Check, Pencil, Trash2 } from "@/components/icons/BixboExtraIcons";
import {
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  BODY_PARTS_DEFAULT,
  PAIN_QUALITY_DEFAULT,
  OTHER_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT,
  WORKOUT_KINDS_DEFAULT,
  BRISTOL,
  DISCHARGE_OPTS,
  MOODS_DEFAULT,
  TETANY_TYPES,
  TETANY_TYPE_DESC,
  TETANY_LOCATIONS_DEFAULT,
  TETANY_TRIGGERS,
  TETANY_HELPED_DEFAULT,
  HEADACHE_TYPES,
  HEADACHE_TYPE_DESC,
  PRESSURE_TYPES,
  NAUSEA_TYPES,
  NAUSEA_TYPE_DESC,
  NAUSEA_SEVERITY_DESC,
  NAUSEA_TRIGGERS,
  NAUSEA_SYMPTOMS,
  NAUSEA_HELPED,
  PANIC_PHYSICAL,
  PANIC_COGNITIVE,
  PANIC_HELPED_DEFAULT,
  SEX_TYPES_DEFAULT,
  BODY_BATTERY,
  SLEEP_QUALITY,
  SEX_FEELINGS_DEFAULT,
  EVENT_COLORS,
  BOWEL_FEELINGS_DEFAULT,
  BOWEL_SYMPTOMS_DEFAULT,
  PCOS_SYMPTOMS,
  HISTAMINE_SYMPTOMS,
  FOOD_SYMPTOMS_AFTER,
  todayKey,
  nowHHMM,
  updateDayLog,
  asArr,
  workoutHasDistance,
  workoutIsHike,
  workoutIsStrength,
  pregnancyInfo,
  isCycleTrackingHidden,
  URINARY_DEFAULT,
  ALLERGENS_DEFAULT,
  type BixboData,
  type DayLog,
  type PainEntry,
  type PeriodLevel,
  type FoodEntry,
  type BowelEntry,
  type ThermoSession,
  type ThermoKind,
  type SexEntry,
  type SexKind,
  type ExtraMed,
  type WorkoutEntry,
  type WorkoutExercise,
  type EventEntry,
  type TaskEntry,
  type TetanyEpisode,
  type PanicAttack,
  type PainfulWhen,
  type PostpartumDayLog,
  type CustomLogEntry,
  type CustomLogValue,
  withCustomTombstones,
  withoutCustomTombstones,
} from "@/lib/storage";
import { getScaleDesc } from "@/lib/scaleDescriptions";
import { Chip, CustomChipList, DurationField, Field, IntensityScale, SaveBar, toggleIn } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";

export function EpisodeWizardNav({
  step,
  steps,
  onBack,
  onNext,
  onSave,
}: {
  step: number;
  steps: string[];
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const last = step >= steps.length - 1;
  return (
    <div className="sticky top-0 z-30 -mx-5 mb-4 flex h-[60px] items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur">
      {step > 0 ? (
        <button type="button" onClick={onBack} className="flex min-w-[64px] items-center gap-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground">
          <span aria-hidden="true" className="text-base leading-none">←</span>
          <span>{t("Back")}</span>
        </button>
      ) : (
        <span className="min-w-[64px]" aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <div className="flex gap-1">
          {steps.map((label, index) => (
            <span key={label} className={`h-1.5 w-5 rounded-full transition-colors ${index <= step ? "bg-primary" : "bg-tint"}`} />
          ))}
        </div>
        <span className="min-w-0 truncate text-xs font-semibold text-foreground/75">{t(steps[step] ?? "")}</span>
        <span className="shrink-0 text-xs font-semibold text-foreground/75">{step + 1}/{steps.length}</span>
      </div>
      <button type="button" onClick={last ? onSave : onNext} className="flex h-[52px] min-w-[64px] flex-col items-center justify-center rounded-[1.15rem] bg-primary px-3 text-primary-foreground shadow-sm transition active:scale-[0.98]">
        <span className="text-sm font-semibold leading-none">{t(last ? "Save" : "Next")}</span>
        <span aria-hidden="true" className="mt-0.5 text-base leading-none">{last ? "✓" : "→"}</span>
      </button>
    </div>
  );
}

export function PanicForm({ date, data, update, onDone, initialEntry, embedded = false, onDraftChange }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: PanicAttack; embedded?: boolean; onDraftChange?: (entry: PanicAttack) => void; }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [minutes, setMinutes] = useState(initialEntry?.minutes != null ? String(initialEntry.minutes) : "10");
  const [ongoing, setOngoing] = useState(initialEntry?.minutes == null && !!initialEntry);
  const [intensity, setIntensity] = useState(initialEntry?.intensity ?? 5);
  const [physical, setPhysical] = useState<string[]>(initialEntry?.physical ?? []);
  const [cognitive, setCognitive] = useState<string[]>(initialEntry?.cognitive ?? []);
  const [trigger, setTrigger] = useState(initialEntry?.trigger ?? "");
  const [place, setPlace] = useState(initialEntry?.place ?? "");
  const [hyper, setHyper] = useState<"no" | "before" | "during" | "unknown">(initialEntry?.hyperventilation ?? "unknown");
  const [tetanyPresent, setTetanyPresent] = useState(initialEntry?.tetanyPresent ?? false);
  const [helped, setHelped] = useState<string[]>(initialEntry?.helped ?? []);
  const [rescueMed, setRescueMed] = useState<string>(initialEntry?.rescueMed ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const draftId = useRef(initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID()).current;
  const panicDraft = useMemo<PanicAttack>(() => ({
    id: draftId, time,
    minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes), intensity, physical, cognitive,
    trigger: trigger.trim(), place: place.trim() || undefined, hyperventilation: hyper, tetanyPresent, helped,
    rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined,
  }), [draftId, time, ongoing, minutes, intensity, physical, cognitive, trigger, place, hyper, tetanyPresent, helped, rescueMed, note]);
  useEffect(() => { if (embedded) onDraftChange?.(panicDraft); }, [embedded, onDraftChange, panicDraft]);
  const addHelped = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, panicHelped: [...d.custom.panicHelped, v] } }));
  const rmHelped = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, panicHelped: d.custom.panicHelped.filter((x) => x !== v) } }));
    setHelped((a) => a.filter((x) => x !== v));
  };
  const save = () => {
    const editing = !!initialEntry;
    const p = panicDraft;
    updateDayLog(update, date, (l) => ({ ...l, panic: editing ? (l.panic ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.panic ?? []), p] }));
    schema?.saveAdminCustomFields();
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      {!embedded && <SaveBar onCancel={onDone} onSave={save} />}
      <div className="space-y-4">
        <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" /></Field>
        <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />
        <Field label={`Intensity ${intensity}/10`} schemaFieldId="intensity"><IntensityScale value={intensity} onChange={setIntensity} max={10} from={1} step={1} compactSingleRow descriptions={getScaleDesc(data, "panic")} legendTitle="Panic intensity scale" schemaFieldId="intensity" /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Physical symptoms" schemaFieldId="physical"><CustomChipList base={PANIC_PHYSICAL} custom={data.custom.panicPhysical}
          onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: [...d.custom.panicPhysical, v] } }))}
          onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.filter((x) => x !== v) } })); setPhysical((a) => a.filter((x) => x !== v)); }}
          onRenameCustom={(o,n) => { update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.map((x) => x === o ? n : x) } })); setPhysical((a) => a.map((x) => x === o ? n : x)); }}
          selected={physical} onToggle={(v) => setPhysical((a) => toggleIn(a,v))} schemaFieldId="physical" /></Field>
        <Field label="Cognitive symptoms" schemaFieldId="cognitive"><CustomChipList base={PANIC_COGNITIVE} custom={data.custom.panicCognitive}
          onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: [...d.custom.panicCognitive, v] } }))}
          onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.filter((x) => x !== v) } })); setCognitive((a) => a.filter((x) => x !== v)); }}
          onRenameCustom={(o,n) => { update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.map((x) => x === o ? n : x) } })); setCognitive((a) => a.map((x) => x === o ? n : x)); }}
          selected={cognitive} onToggle={(v) => setCognitive((a) => toggleIn(a,v))} schemaFieldId="cognitive" /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Trigger (or 'no obvious trigger')" schemaFieldId="trigger"><Textarea rows={2} value={trigger} onChange={(e) => setTrigger(e.target.value)} /></Field>
        <Field label="Place (optional)" schemaFieldId="place"><Input value={place} onChange={(e) => setPlace(e.target.value)} /></Field>
        <Field label="Hyperventilation" schemaFieldId="hyperventilation"><div className="mt-2 flex flex-wrap gap-2">{(["no","before","during","unknown"] as const).map((v) => <Chip key={v} active={hyper===v} onClick={() => setHyper(v)}>{v}</Chip>)}</div></Field>
        <Field label="Tetany present?" schemaFieldId="tetanyPresent"><div className="mt-2 flex gap-2"><Chip active={!tetanyPresent} onClick={() => setTetanyPresent(false)}>No</Chip><Chip active={tetanyPresent} onClick={() => setTetanyPresent(true)}>Yes</Chip></div></Field>
        <Field label="What helped" schemaFieldId="helped"><CustomChipList base={PANIC_HELPED_DEFAULT} custom={data.custom.panicHelped} onAddCustom={addHelped} onRemoveCustom={rmHelped} selected={helped} onToggle={(v) => setHelped((a) => toggleIn(a,v))} /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Rescue med (what you took)" schemaFieldId="rescueMed"><Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Frontin 0.25 mg")} />{data.meds.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{data.meds.map((m) => <button key={m.id} type="button" onClick={() => setRescueMed(m.dose ? `${m.name} ${m.dose}` : m.name)} className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">{m.name}{m.dose ? ` ${m.dose}` : ""}</button>)}</div>}</Field>
        <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </div>
  );
}

export function TetanyForm({ date, data, update, onDone, initialEntry, embedded = false, onDraftChange }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: TetanyEpisode; embedded?: boolean; onDraftChange?: (entry: TetanyEpisode) => void; }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [types, setTypes] = useState<string[]>(initialEntry?.types ?? []);
  const [loc, setLoc] = useState<string[]>(initialEntry?.location ?? []);
  const [intensity, setIntensity] = useState(initialEntry?.intensity ?? 1);
  const [minutes, setMinutes] = useState(initialEntry?.minutes != null ? String(initialEntry.minutes) : "5");
  const [ongoing, setOngoing] = useState(initialEntry?.minutes == null && !!initialEntry);
  const [triggers, setTriggers] = useState<string[]>(initialEntry?.triggers ?? []);
  const [helped, setHelped] = useState<string[]>(initialEntry?.helped ?? []);
  const [rescueMed, setRescueMed] = useState<string>(initialEntry?.rescueMed ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const draftId = useRef(initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID()).current;
  const tetanyDraft = useMemo<TetanyEpisode>(() => ({
    id: draftId, time, types, location: loc, intensity,
    minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes),
    triggers, helped, rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined,
  }), [draftId, time, types, loc, intensity, ongoing, minutes, triggers, helped, rescueMed, note]);
  useEffect(() => { if (embedded) onDraftChange?.(tetanyDraft); }, [embedded, onDraftChange, tetanyDraft]);
  type CK = "tetanyTypes" | "tetanyLocations" | "tetanyTriggers" | "tetanyHelped";
  const addC = (k: CK, v: string) => update((d) => withoutCustomTombstones({ ...d, custom: { ...d.custom, [k]: [...d.custom[k], v] } }, k, [v]));
  const rmC = (k: CK, v: string) => update((d) => withCustomTombstones({ ...d, custom: { ...d.custom, [k]: d.custom[k].filter((x) => x !== v) } }, k, [v]));
  const rnC = (k: CK, o: string, n: string) => update((d) => withoutCustomTombstones(withCustomTombstones({ ...d, custom: { ...d.custom, [k]: d.custom[k].map((x) => x === o ? n : x) } }, k, [o]), k, [n]));
  const save = () => {
    const editing = !!initialEntry;
    const entry = tetanyDraft;
    updateDayLog(update, date, (l) => ({ ...l, tetany: editing ? (l.tetany ?? []).map((x) => x.id === entry.id ? entry : x) : [...(l.tetany ?? []), entry] }));
    schema?.saveAdminCustomFields();
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      {!embedded && <SaveBar onCancel={onDone} onSave={save} />}
      <div className="space-y-4">
        <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />
        <Field label={`Intensity ${intensity}/5`} schemaFieldId="intensity"><IntensityScale value={intensity} onChange={setIntensity} max={5} from={1} step={1} compactSingleRow descriptions={getScaleDesc(data,"tetany")} legendTitle="Tetany intensity scale" schemaFieldId="intensity" /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Type" schemaFieldId="types"><CustomChipList base={TETANY_TYPES} custom={data.custom.tetanyTypes} descriptions={TETANY_TYPE_DESC} onAddCustom={(v) => addC("tetanyTypes",v)} onRemoveCustom={(v) => { rmC("tetanyTypes",v); setTypes((a) => a.filter((x) => x!==v)); }} onRenameCustom={(o,n) => { rnC("tetanyTypes",o,n); setTypes((a) => a.map((x) => x===o?n:x)); }} selected={types} onToggle={(v) => setTypes((a) => toggleIn(a,v))} /></Field>
        <Field label="Location" schemaFieldId="location"><CustomChipList base={TETANY_LOCATIONS_DEFAULT} custom={data.custom.tetanyLocations} onAddCustom={(v) => addC("tetanyLocations",v)} onRemoveCustom={(v) => { rmC("tetanyLocations",v); setLoc((a) => a.filter((x) => x!==v)); }} onRenameCustom={(o,n) => { rnC("tetanyLocations",o,n); setLoc((a) => a.map((x) => x===o?n:x)); }} selected={loc} onToggle={(v) => setLoc((a) => toggleIn(a,v))} /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Triggers" schemaFieldId="triggers"><CustomChipList base={TETANY_TRIGGERS} custom={data.custom.tetanyTriggers} onAddCustom={(v) => addC("tetanyTriggers",v)} onRemoveCustom={(v) => { rmC("tetanyTriggers",v); setTriggers((a) => a.filter((x) => x!==v)); }} onRenameCustom={(o,n) => { rnC("tetanyTriggers",o,n); setTriggers((a) => a.map((x) => x===o?n:x)); }} selected={triggers} onToggle={(v) => setTriggers((a) => toggleIn(a,v))} /></Field>
        <Field label="What helped" schemaFieldId="helped"><CustomChipList base={TETANY_HELPED_DEFAULT} custom={data.custom.tetanyHelped} onAddCustom={(v) => addC("tetanyHelped",v)} onRemoveCustom={(v) => { rmC("tetanyHelped",v); setHelped((a) => a.filter((x) => x!==v)); }} onRenameCustom={(o,n) => { rnC("tetanyHelped",o,n); setHelped((a) => a.map((x) => x===o?n:x)); }} selected={helped} onToggle={(v) => setHelped((a) => toggleIn(a,v))} /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Rescue med (what you took)" schemaFieldId="rescueMed"><Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Magnesium 400 mg")} />{data.meds.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{data.meds.map((m) => <button key={m.id} type="button" onClick={() => setRescueMed(m.dose ? `${m.name} ${m.dose}` : m.name)} className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">{m.name}{m.dose ? ` ${m.dose}` : ""}</button>)}</div>}</Field>
        <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </div>
  );
}
