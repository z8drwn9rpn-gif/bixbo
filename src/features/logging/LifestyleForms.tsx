import { Children, isValidElement, useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { TrText } from "@/features/logging/TrText";
import { CATEGORIES, type Category } from "@/features/logging/logCategories";
import { LogSchemaContext, useLogSchema, type LogSchemaContextValue } from "@/features/logging/LogSchemaContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Ico, IcoText } from "@/components/icons/BixboIcons";
import { CustomLogForm } from "@/components/CustomLogForm";
import { CoreFeatureCustomFieldInput } from "@/components/CoreFeatureCustomFieldsForm";
import { POSTPARTUM_SYMPTOMS } from "@/lib/health";
import { BIXBO_LOG_FIELDS, getRegistryFeature, getRegistryField, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryFieldsForFeature, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ChevronLeft, Check, Pencil, Trash2 } from "@/components/icons/BixboIcons";
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
import { Chip, CustomChipList, Field, RegistryFieldBlock, SaveBar, stripEmoji, toggleIn } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";
import { AddCustomInline } from "./CycleForms";

export function FoodForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: FoodEntry;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [what, setWhat] = useState(initialEntry?.what ?? "");
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [after, setAfter] = useState(initialEntry?.after ?? "");
  const [hydration, setHydration] = useState<string>(
    initialEntry?.hydrationMl != null ? String(initialEntry.hydrationMl) : "",
  );
  const [caffeine, setCaffeine] = useState<string>(
    initialEntry?.caffeineMg != null ? String(initialEntry.caffeineMg) : "",
  );
  const [alcohol, setAlcohol] = useState<string>(
    initialEntry?.alcoholDrinks != null ? String(initialEntry.alcoholDrinks) : "",
  );
  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(initialEntry?.symptomsAfter ?? []);
  const [histFlare, setHistFlare] = useState<boolean>(!!initialEntry?.histamineFlare);
  const [histSymptoms, setHistSymptoms] = useState<string[]>(initialEntry?.histamineSymptoms ?? []);
  const [highHist, setHighHist] = useState<boolean>(!!initialEntry?.highHistamine);
  const [allergensInMeal, setAllergensInMeal] = useState<string[]>(initialEntry?.allergensInMeal ?? []);
  const [allergicReaction, setAllergicReaction] = useState<boolean>(!!initialEntry?.allergicReaction);
  const [reactionSeverity, setReactionSeverity] = useState<"mild" | "moderate" | "severe" | undefined>(
    initialEntry?.reactionSeverity,
  );
  const allergensBase = data.settings.allergens ?? ALLERGENS_DEFAULT;
  const addCustom = (v: string) =>
    update((d) =>
      withoutCustomTombstones(
        { ...d, custom: { ...d.custom, foodFeelings: [...d.custom.foodFeelings, v] } },
        "foodFeelings",
        [v],
      ),
    );
  const addCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", v: string) =>
    update((d) => withoutCustomTombstones({ ...d, custom: { ...d.custom, [k]: [...(d.custom[k] ?? []), v] } }, k, [v]));
  const removeCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", v: string) =>
    update((d) =>
      withCustomTombstones({ ...d, custom: { ...d.custom, [k]: (d.custom[k] ?? []).filter((x) => x !== v) } }, k, [v]),
    );
  const renameCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", o: string, n: string) =>
    update((d) =>
      withoutCustomTombstones(
        withCustomTombstones(
          { ...d, custom: { ...d.custom, [k]: (d.custom[k] ?? []).map((x) => (x === o ? n : x)) } },
          k,
          [o],
        ),
        k,
        [n],
      ),
    );
  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol && !histFlare && symptomsAfter.length === 0) return;
    const editing = !!initialEntry;
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
    updateDayLog(update, date, (l) => ({
      ...l,
      food: editing ? (l.food ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.food ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time" schemaFieldId="time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="What did you eat?" schemaFieldId="what">
        <Textarea
          rows={2}
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder={t("e.g. chicken, rice, tomato")}
        />
      </Field>
      <Field label="Quick add" schemaFieldId="quickAdd">
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { l: "🍵 Matcha", w: "Matcha", caf: 70 },
            { l: "☕ Coffee", w: "Coffee", caf: 95 },
            { l: "🫖 Tea", w: "Tea", caf: 40 },
            { l: "💧 Water", w: "Water", hyd: 250 },
            { l: "🥑 Avocado", w: "Avocado" },
          ].map((q) => (
            <button
              key={q.l}
              type="button"
              onClick={() => {
                setWhat((w) => (w ? `${w}, ${q.w}` : q.w));
                if (q.caf) setCaffeine(String((Number(caffeine) || 0) + q.caf));
                if (q.hyd) setHydration(String((Number(hydration) || 0) + q.hyd));
              }}
              className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10"
            >
              <IcoText text={q.l} size={14} />
            </button>
          ))}
          {data.custom.foodQuickAdd.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setWhat((w) => (w ? `${w}, ${c}` : c))}
                className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10"
              >
                <IcoText text={c} size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${c}" from quick add?`))
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, foodQuickAdd: d.custom.foodQuickAdd.filter((x) => x !== c) },
                    }));
                }}
                aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline
            onAdd={(v) =>
              update((d) => ({ ...d, custom: { ...d.custom, foodQuickAdd: [...d.custom.foodQuickAdd, v] } }))
            }
          />
        </div>
      </Field>
      <Field label="How do I feel after food?" schemaFieldId="feelings">
        <CustomChipList
          base={FOOD_FEELINGS_DEFAULT}
          custom={data.custom.foodFeelings}
          onAddCustom={addCustom}
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, foodFeelings: d.custom.foodFeelings.filter((x) => x !== v) },
            }));
            setFeelings((a) => a.filter((x) => x !== v));
          }}
          selected={feelings}
          onToggle={(v) => setFeelings((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Symptoms after food" schemaFieldId="symptomsAfter">
        <CustomChipList
          base={FOOD_SYMPTOMS_AFTER}
          custom={data.custom.foodSymptomsAfter ?? []}
          onAddCustom={(v) => addCustomList("foodSymptomsAfter", v)}
          onRemoveCustom={(v) => {
            removeCustomList("foodSymptomsAfter", v);
            setSymptomsAfter((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            renameCustomList("foodSymptomsAfter", o, n);
            setSymptomsAfter((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={symptomsAfter}
          onToggle={(v) => setSymptomsAfter((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="High histamine food?" schemaFieldId="highHistamine">
        <div className="mt-1 flex gap-2">
          <Chip active={!highHist} onClick={() => setHighHist(false)}>
            No
          </Chip>
          <Chip active={highHist} onClick={() => setHighHist(true)}>
            Yes
          </Chip>
        </div>
      </Field>
      <Field label="Histamine flare?" schemaFieldId="histamineFlare">
        <div className="mt-1 flex gap-2">
          <Chip active={!histFlare} onClick={() => setHistFlare(false)}>
            No
          </Chip>
          <Chip active={histFlare} onClick={() => setHistFlare(true)}>
            Yes — log it
          </Chip>
        </div>
      </Field>
      {histFlare && (
        <div className="rounded-2xl border border-border p-3">
          <Field label="Histamine flare symptoms">
            <CustomChipList
              base={HISTAMINE_SYMPTOMS}
              custom={data.custom.histamineSymptoms ?? []}
              onAddCustom={(v) => addCustomList("histamineSymptoms", v)}
              onRemoveCustom={(v) => {
                removeCustomList("histamineSymptoms", v);
                setHistSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustomList("histamineSymptoms", o, n);
                setHistSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={histSymptoms}
              onToggle={(v) => setHistSymptoms((a) => toggleIn(a, v))}
            />
          </Field>
        </div>
      )}
      <Field label="Allergens in this meal" schemaFieldId="allergens">
        <CustomChipList
          base={allergensBase}
          custom={data.custom.allergens}
          onAddCustom={(v) =>
            update((d) => ({
              ...d,
              settings: { ...d.settings, allergens: [...(d.settings.allergens ?? ALLERGENS_DEFAULT), v] },
              custom: { ...d.custom, allergens: [...d.custom.allergens, v] },
            }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({ ...d, custom: { ...d.custom, allergens: d.custom.allergens.filter((x) => x !== v) } }));
            setAllergensInMeal((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, allergens: d.custom.allergens.map((x) => (x === o ? n : x)) },
            }));
            setAllergensInMeal((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={allergensInMeal}
          onToggle={(v) => setAllergensInMeal((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Reaction?" schemaFieldId="reaction">
        <div className="mt-1 flex gap-2">
          <Chip active={!allergicReaction} onClick={() => setAllergicReaction(false)}>
            No / not sure
          </Chip>
          <Chip active={allergicReaction} onClick={() => setAllergicReaction(true)}>
            Yes — log it
          </Chip>
        </div>
        {allergicReaction && (
          <div className="mt-2 flex gap-2">
            {(["mild", "moderate", "severe"] as const).map((s2) => (
              <Chip key={s2} active={reactionSeverity === s2} onClick={() => setReactionSeverity(s2)}>
                {s2[0].toUpperCase() + s2.slice(1)}
              </Chip>
            ))}
          </div>
        )}
      </Field>
      <RegistryFieldBlock fieldId="intake">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Water (ml)">
          <Input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} placeholder="300" />
        </Field>
        <Field label="Caffeine (mg)">
          <Input type="number" value={caffeine} onChange={(e) => setCaffeine(e.target.value)} placeholder="80" />
        </Field>
        <Field label="Alcohol (drinks)">
          <Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder="0" />
        </Field>
      </div>
      </RegistryFieldBlock>
      <Field label="Additional note (optional)" schemaFieldId="note">
        <Textarea rows={2} value={after} onChange={(e) => setAfter(e.target.value)} />
      </Field>
    </div>
  );
}

export function BristolIcon({ shape, color }: { shape: string; color: string }) {
  const s = shape;
  return (
    <svg viewBox="0 0 60 40" className="h-8 w-14 shrink-0">
      {s === "lumps" &&
        Array.from({ length: 5 }).map((_, i) => <circle key={i} cx={8 + i * 11} cy={20} r={4.5} fill={color} />)}
      {s === "lumpy" && (
        <rect x={4} y={12} width={52} height={16} rx={7} fill={color} stroke="#0002" strokeDasharray="4 3" />
      )}
      {s === "cracked" && (
        <>
          <rect x={4} y={12} width={52} height={16} rx={8} fill={color} />
          {[16, 26, 36, 46].map((x) => (
            <line key={x} x1={x} y1={13} x2={x} y2={27} stroke="#0004" strokeWidth={1.5} />
          ))}
        </>
      )}
      {s === "smooth" && <rect x={4} y={13} width={52} height={14} rx={7} fill={color} />}
      {s === "blobs" && (
        <>
          <ellipse cx={16} cy={20} rx={10} ry={7} fill={color} />
          <ellipse cx={32} cy={20} rx={9} ry={6} fill={color} />
          <ellipse cx={46} cy={20} rx={8} ry={6} fill={color} />
        </>
      )}
      {s === "mushy" && <path d="M4 22 Q10 10 20 22 T36 22 T56 22 L56 30 L4 30 Z" fill={color} />}
      {s === "liquid" && (
        <>
          <rect x={4} y={22} width={52} height={8} rx={4} fill={color} />
          {[12, 24, 36, 48].map((x) => (
            <circle key={x} cx={x} cy={16} r={2} fill={color} opacity={0.6} />
          ))}
        </>
      )}
    </svg>
  );
}

export function BowelForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: BowelEntry;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [bristol, setBristol] = useState<number | null>(initialEntry?.urinaryOnly ? null : (initialEntry?.bristol ?? null));
  const [feelings, setFeelings] = useState<string[]>((initialEntry?.feelings ?? []).map(stripEmoji));
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [urinary, setUrinary] = useState<string[]>(initialEntry?.urinary ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addUrinary = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, urinary: [...d.custom.urinary, v] } }));
  const rmUrinary = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, urinary: d.custom.urinary.filter((x) => x !== v) } }));
    setUrinary((a) => a.filter((x) => x !== v));
  };
  const rnUrinary = (o: string, n: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, urinary: d.custom.urinary.map((x) => (x === o ? n : x)) } }));
    setUrinary((a) => a.map((x) => (x === o ? n : x)));
  };
  const addFeel = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: [...d.custom.bowelFeelings, v] } }));
  const rmFeel = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: d.custom.bowelFeelings.filter((x) => x !== v) } }));
    setFeelings((a) => a.filter((x) => x !== v));
  };
  const addSym = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: [...d.custom.bowelSymptoms, v] } }));
  const rmSym = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: d.custom.bowelSymptoms.filter((x) => x !== v) } }));
    setSymptoms((a) => a.filter((x) => x !== v));
  };
  const save = () => {
    if (bristol == null && urinary.length === 0) return;
    const editing = !!initialEntry;
    const urinaryOnly = bristol == null && urinary.length > 0;
    const entry: BowelEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      bristol: urinaryOnly ? -2 : (bristol as number),
      urinaryOnly: urinaryOnly || undefined,
      feelings: feelings.length ? feelings : undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      urinary: urinary.length ? urinary : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      bowel: editing ? (l.bowel ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.bowel ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time" schemaFieldId="time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Bristol stool scale" schemaFieldId="bristol">
        <div className="mt-1 space-y-1.5">
          <button
            onClick={() => setBristol(-1)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              bristol === -1 ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              ∅
            </span>
            <span className="flex-1">
              <span className="font-medium">{t("No bowel movement")}</span>
              <br />
              <span className="text-[11px] text-muted-foreground">{t("Didn't go today")}</span>
            </span>
          </button>
          <button
            onClick={() => setBristol(0)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              bristol === 0 ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)" }}
            >
              0
            </span>
            <span className="flex-1">
              <span className="font-medium">{t("Type 0 — Mystery")}</span>
              <br />
              <span className="text-[11px] text-muted-foreground">{t("Unknown / mixed")}</span>
            </span>
          </button>

          {BRISTOL.map((b) => (
            <button
              key={b.n}
              onClick={() => setBristol(b.n)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                bristol === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                style={{ background: b.color }}
              >
                {b.n}
              </span>
              <BristolIcon shape={b.shape} color={b.color} />
              <div className="flex-1">
                <p className="font-medium">
                  <IcoText text={t(b.label)} size={14} />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <IcoText text={t(b.sub)} size={12} />
                </p>
              </div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Urinary" schemaFieldId="urinary">
        <CustomChipList
          base={URINARY_DEFAULT}
          custom={data.custom.urinary}
          onAddCustom={addUrinary}
          onRemoveCustom={rmUrinary}
          onRenameCustom={rnUrinary}
          selected={urinary}
          onToggle={(v) => setUrinary((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="How do you feel?" schemaFieldId="feelings">
        <CustomChipList
          base={BOWEL_FEELINGS_DEFAULT}
          custom={data.custom.bowelFeelings}
          onAddCustom={addFeel}
          onRemoveCustom={rmFeel}
          selected={feelings}
          onToggle={(v) => setFeelings((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Symptoms" schemaFieldId="symptoms">
        <CustomChipList
          base={BOWEL_SYMPTOMS_DEFAULT}
          custom={data.custom.bowelSymptoms}
          onAddCustom={addSym}
          onRemoveCustom={rmSym}
          selected={symptoms}
          onToggle={(v) => setSymptoms((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

export function TempForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  const { t } = useI18n();
  type VitalRow = {
    id: string;
    time: string;
    value: number;
  };

  const cur = data.dayLogs[date] ?? {};

  const [temperature, setTemperature] = useState("");
  const [temperatureTime, setTemperatureTime] = useState(nowHHMM());

  const [weight, setWeight] = useState("");
  const [weightTime, setWeightTime] = useState(nowHHMM());

  const [sleep, setSleep] = useState(cur.sleepHours != null ? String(cur.sleepHours) : "");

  const [quality, setQuality] = useState<string[]>(asArr(cur.sleepQuality));

  const sortVitals = (entries: VitalRow[]): VitalRow[] =>
    entries.slice().sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

  const latestVitalValue = (entries: VitalRow[]): number | undefined => {
    const sorted = sortVitals(entries);

    return sorted.length ? sorted[sorted.length - 1].value : undefined;
  };

  const existingVitals = (
    entries: VitalRow[] | undefined,
    legacyValue: number | undefined,
    legacyId: string,
  ): VitalRow[] => {
    if (entries?.length) {
      return sortVitals(entries);
    }

    if (legacyValue != null && Number.isFinite(legacyValue)) {
      return [
        {
          id: legacyId,
          time: "00:00",
          value: legacyValue,
        },
      ];
    }

    return [];
  };

  const temperatureEntries = useMemo(
    () => existingVitals(cur.temperatureEntries, cur.temperature, `${date}-legacy-temperature`),
    [cur.temperatureEntries, cur.temperature, date],
  );

  const weightEntries = useMemo(
    () => existingVitals(cur.weightEntries, cur.weight, `${date}-legacy-weight`),
    [cur.weightEntries, cur.weight, date],
  );

  const deleteTemperature = (id: string) => {
    updateDayLog(update, date, (log) => {
      const current = existingVitals(log.temperatureEntries, log.temperature, `${date}-legacy-temperature`);

      const next = sortVitals(current.filter((entry) => entry.id !== id));

      return {
        ...log,
        temperatureEntries: next.length ? next : undefined,
        temperature: latestVitalValue(next),
      };
    });
  };

  const deleteWeight = (id: string) => {
    updateDayLog(update, date, (log) => {
      const current = existingVitals(log.weightEntries, log.weight, `${date}-legacy-weight`);

      const next = sortVitals(current.filter((entry) => entry.id !== id));

      return {
        ...log,
        weightEntries: next.length ? next : undefined,
        weight: latestVitalValue(next),
      };
    });
  };

  const save = () => {
    const temperatureValue = temperature.trim() === "" ? undefined : Number(temperature.replace(",", "."));

    const weightValue = weight.trim() === "" ? undefined : Number(weight.replace(",", "."));

    const sleepValue = sleep.trim() === "" ? undefined : Number(sleep.replace(",", "."));

    updateDayLog(update, date, (log) => {
      const currentTemperatures = existingVitals(log.temperatureEntries, log.temperature, `${date}-legacy-temperature`);

      const currentWeights = existingVitals(log.weightEntries, log.weight, `${date}-legacy-weight`);

      const nextTemperatures =
        temperatureValue != null && Number.isFinite(temperatureValue)
          ? sortVitals([
              ...currentTemperatures,
              {
                id: crypto.randomUUID(),
                time: temperatureTime || nowHHMM(),
                value: temperatureValue,
              },
            ])
          : currentTemperatures;

      const nextWeights =
        weightValue != null && Number.isFinite(weightValue)
          ? sortVitals([
              ...currentWeights,
              {
                id: crypto.randomUUID(),
                time: weightTime || nowHHMM(),
                value: weightValue,
              },
            ])
          : currentWeights;

      return {
        ...log,

        temperatureEntries: nextTemperatures.length ? nextTemperatures : undefined,

        weightEntries: nextWeights.length ? nextWeights : undefined,

        // Posledná hodnota zostáva aj v starom poli,
        // aby fungoval Home, Calendar a staršie grafy.
        temperature: latestVitalValue(nextTemperatures),

        weight: latestVitalValue(nextWeights),

        sleepHours: sleepValue != null && Number.isFinite(sleepValue) ? sleepValue : undefined,

        sleepQuality: quality.length ? quality : undefined,
      };
    });

    onDone();
  };

  return (
    <div className="flex flex-col gap-5">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="New temperature measurement" schemaFieldId="temperature">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
            placeholder={t("36,6 °C")}
          />

          <Input type="time" value={temperatureTime} onChange={(e) => setTemperatureTime(e.target.value)} />
        </div>

        {temperatureEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Saved temperature measurements
            </p>

            {temperatureEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-tint">
                  <Ico e="🌡️" size={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.value.toFixed(1).replace(".", ",")} °C</p>

                  <p className="text-xs text-muted-foreground">{entry.time}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteTemperature(entry.id)}
                  aria-label={`Delete temperature ${entry.value}`}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="New weight measurement" schemaFieldId="weight">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
            placeholder={t("62,5 kg")}
          />

          <Input type="time" value={weightTime} onChange={(e) => setWeightTime(e.target.value)} />
        </div>

        {weightEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Saved weight measurements")}</p>

            {weightEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-tint">
                  <Ico e="⚖️" size={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.value.toFixed(1).replace(".", ",")} kg</p>

                  <p className="text-xs text-muted-foreground">{entry.time}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteWeight(entry.id)}
                  aria-label={`Delete weight ${entry.value}`}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="Sleep (hours)" schemaFieldId="sleepHours">
        <Input
          type="text"
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
          placeholder="8"
        />
      </Field>

      <Field label="How I slept" schemaFieldId="sleepQuality">
        <div className="mt-2 flex flex-wrap gap-2">
          {SLEEP_QUALITY.map((item) => (
            <Chip
              key={item}
              active={quality.includes(item)}
              onClick={() => setQuality((current) => toggleIn(current, item))}
            >
              {item}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}
