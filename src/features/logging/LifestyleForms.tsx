import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
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
            { l: "Matcha", w: "Matcha", caf: 70 },
            { l: "Coffee", w: "Coffee", caf: 95 },
            { l: "Tea", w: "Tea", caf: 40 },
            { l: "Water", w: "Water", hyd: 250 },
            { l: "🥑 Avocado", w: "Avocado" },
            { l: "Coca-Cola", w: "Coca-Cola" },
            { l: "Banana", w: "Banana" },
            { l: "Apple", w: "Apple" },
            { l: "Bread", w: "Bread" },
            { l: "Pasta", w: "Pasta" },
            { l: "Rice", w: "Rice" },
            { l: "Pizza", w: "Pizza" },
            { l: "Egg", w: "Egg" },
            { l: "Cheese", w: "Cheese" },
            { l: "Chicken", w: "Chicken" },
            { l: "Salmon", w: "Salmon" },
            { l: "Salad", w: "Salad" },
            { l: "Soup", w: "Soup" },
            { l: "Milk", w: "Milk" },
            { l: "Sandwich", w: "Sandwich" },
            { l: "Cake", w: "Cake" },
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
              <SemanticIcoText text={q.l} size={14} />
            </button>
          ))}
          {data.custom.foodQuickAdd.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setWhat((w) => (w ? `${w}, ${c}` : c))
                }
                className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10"
              >
                <SemanticIcoText text={c} size={14} />
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
                  <SemanticIcoText text={t(b.label)} size={14} />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <SemanticIcoText text={t(b.sub)} size={12} />
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
  type VitalRow = { id: string; time: string; value: number; method?: "basal" | "oral" | "other"; note?: string; bodyFatPercent?: number };
  type Tab = "temperature" | "sleep" | "weight";
  const cur = data.dayLogs[date] ?? {};
  const [tab, setTab] = useState<Tab>("sleep");
  const [temperature, setTemperature] = useState("");
  const [temperatureTime, setTemperatureTime] = useState(nowHHMM());
  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F">("C");
  const [temperatureMethod, setTemperatureMethod] = useState<"basal" | "oral" | "other">("basal");
  const [temperatureNote, setTemperatureNote] = useState("");
  const [weight, setWeight] = useState("");
  const [weightTime, setWeightTime] = useState(nowHHMM());
  const [bodyFat, setBodyFat] = useState("");
  const [weightNote, setWeightNote] = useState("");
  const [weightRange, setWeightRange] = useState<7 | 30 | 90>(7);
  const [bedtime, setBedtime] = useState(cur.sleepBedtime ?? "");
  const [wakeTime, setWakeTime] = useState(cur.sleepWakeTime ?? "");
  const [sleepHours, setSleepHours] = useState(cur.sleepHours != null ? String(cur.sleepHours) : "");
  const currentQuality = Array.isArray(cur.sleepQuality) ? cur.sleepQuality[0] : cur.sleepQuality;
  const [quality, setQuality] = useState(currentQuality ?? "");
  const [awakenings, setAwakenings] = useState(cur.sleepAwakenings ?? 0);
  const [sleepEnergy, setSleepEnergy] = useState(cur.sleepEnergy ?? 3);
  const [sleepNote, setSleepNote] = useState(cur.sleepNote ?? "");

  const sortVitals = (entries: VitalRow[]) => entries.slice().sort((a,b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  const latestVitalValue = (entries: VitalRow[]) => entries.length ? sortVitals(entries).at(-1)?.value : undefined;
  const existingVitals = (entries: VitalRow[] | undefined, legacyValue: number | undefined, legacyId: string): VitalRow[] => {
    if (entries?.length) return sortVitals(entries);
    if (legacyValue != null && Number.isFinite(legacyValue)) return [{ id: legacyId, time: "00:00", value: legacyValue }];
    return [];
  };
  const temperatureEntries = existingVitals(cur.temperatureEntries, cur.temperature, `${date}-legacy-temperature`);
  const weightEntries = existingVitals(cur.weightEntries, cur.weight, `${date}-legacy-weight`);
  const daySeries = (kind: "temperature" | "weight", days: number) => Object.entries(data.dayLogs)
    .filter(([k]) => k <= date)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-days)
    .map(([k,log]) => {
      const entries = kind === "temperature" ? log.temperatureEntries : log.weightEntries;
      const legacy = kind === "temperature" ? log.temperature : log.weight;
      const rows = existingVitals(entries, legacy, `${k}-legacy-${kind}`);
      return rows.length ? { date:k, value: rows.at(-1)!.value } : null;
    }).filter((x): x is {date:string; value:number} => !!x);
  const temperatureTrend = daySeries("temperature", 14);
  const weightTrend = daySeries("weight", weightRange);
  const previousWeight = daySeries("weight", 90).filter(x => x.date < date).at(-1)?.value;
  const currentWeight = weightEntries.at(-1)?.value ?? cur.weight;
  const weightDelta = currentWeight != null && previousWeight != null ? currentWeight - previousWeight : undefined;
  const minutesBetween = (start: string, end: string) => {
    if (!start || !end) return undefined;
    const [sh,sm]=start.split(":").map(Number), [eh,em]=end.split(":").map(Number);
    let m=(eh*60+em)-(sh*60+sm); if (m<0) m+=1440; return m;
  };
  const calculatedSleepMinutes = minutesBetween(bedtime,wakeTime);
  const effectiveSleepHours = calculatedSleepMinutes != null ? calculatedSleepMinutes / 60 : Number(sleepHours.replace(",",".")) || 0;
  const parseValue = (v:string) => v.trim()==="" ? undefined : Number(v.replace(",","."));
  const toCelsius = (v:number) => temperatureUnit === "F" ? (v - 32) * 5 / 9 : v;
  const save = () => {
    const tv=parseValue(temperature), wv=parseValue(weight), bf=parseValue(bodyFat);
    updateDayLog(update,date,(log)=>{
      const temps=existingVitals(log.temperatureEntries,log.temperature,`${date}-legacy-temperature`);
      const weights=existingVitals(log.weightEntries,log.weight,`${date}-legacy-weight`);
      const nextTemps = tv != null && Number.isFinite(tv) ? sortVitals([...temps,{id:crypto.randomUUID(),time:temperatureTime||nowHHMM(),value:toCelsius(tv),method:temperatureMethod,note:temperatureNote.trim()||undefined}]) : temps;
      const nextWeights = wv != null && Number.isFinite(wv) ? sortVitals([...weights,{id:crypto.randomUUID(),time:weightTime||nowHHMM(),value:wv,bodyFatPercent:bf != null && Number.isFinite(bf) ? bf : undefined,note:weightNote.trim()||undefined}]) : weights;
      return {...log, temperatureEntries:nextTemps.length?nextTemps:undefined, weightEntries:nextWeights.length?nextWeights:undefined, temperature:latestVitalValue(nextTemps), weight:latestVitalValue(nextWeights), sleepHours:effectiveSleepHours>0?Number(effectiveSleepHours.toFixed(2)):undefined, sleepQuality:quality||undefined, sleepBedtime:bedtime||undefined, sleepWakeTime:wakeTime||undefined, sleepAwakenings:awakenings||undefined, sleepEnergy:sleepEnergy||undefined, sleepNote:sleepNote.trim()||undefined};
    });
    onDone();
  };
  const deleteTemperature=(id:string)=>updateDayLog(update,date,(log)=>{const next=existingVitals(log.temperatureEntries,log.temperature,`${date}-legacy-temperature`).filter(x=>x.id!==id); return {...log,temperatureEntries:next.length?next:undefined,temperature:latestVitalValue(next)}});
  const deleteWeight=(id:string)=>updateDayLog(update,date,(log)=>{const next=existingVitals(log.weightEntries,log.weight,`${date}-legacy-weight`).filter(x=>x.id!==id); return {...log,weightEntries:next.length?next:undefined,weight:latestVitalValue(next)}});
  const MiniTrend = ({points,unit}:{points:{date:string;value:number}[];unit:string}) => {
    if (!points.length) return <p className="py-5 text-center text-xs text-muted-foreground">No trend data yet.</p>;
    const vals=points.map(p=>p.value), min=Math.min(...vals), max=Math.max(...vals), span=Math.max(.1,max-min);
    const coords=points.map((p,i)=>`${points.length===1?50:(i/(points.length-1))*100},${36-((p.value-min)/span)*28}`).join(" ");
    return <div className="mt-3"><svg viewBox="0 0 100 40" className="h-28 w-full overflow-visible"><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary" />{points.map((p,i)=>{const x=points.length===1?50:(i/(points.length-1))*100,y=36-((p.value-min)/span)*28;return <circle key={p.date} cx={x} cy={y} r="1.8" fill="currentColor" className="text-primary"/>})}</svg><div className="flex justify-between text-[10px] text-muted-foreground"><span>{points[0]?.date.slice(5)}</span><span>{min.toFixed(1)}–{max.toFixed(1)} {unit}</span><span>{points.at(-1)?.date.slice(5)}</span></div></div>;
  };

  return <div className="flex flex-col gap-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <div className="grid grid-cols-3 rounded-2xl bg-tint p-1">{([ ["temperature","thermometer"], ["sleep","sleep"], ["weight","weight"] ] as const).map(([x,icon])=><button key={x} type="button" onClick={()=>setTab(x)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold capitalize ${tab===x?"bg-surface shadow-sm ring-1 ring-border":"text-muted-foreground"}`}><Ico name={icon} size={17}/><span>{x}</span></button>)}</div>
    {tab==="temperature"&&<>
      <div className="flex items-start gap-2 rounded-2xl bg-tint p-3 text-xs text-muted-foreground"><Ico name="star" size={17}/><span>Body temperature can shift during your cycle. Track it consistently for better insights.</span></div>
      <Field label="Time"><Input type="time" value={temperatureTime} onChange={e=>setTemperatureTime(e.target.value)}/></Field>
      <Field label="Temperature"><div className="grid grid-cols-[1fr_auto] gap-2"><div className="relative"><Input inputMode="decimal" value={temperature} onChange={e=>setTemperature(e.target.value.replace(/[^0-9.,]/g,""))} placeholder={temperatureUnit==="C"?"36.68":"98.02"}/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°{temperatureUnit}</span></div><div className="flex rounded-full bg-tint p-1"><button type="button" onClick={()=>setTemperatureUnit("C")} className={`rounded-full px-3 py-1.5 text-xs ${temperatureUnit==="C"?"bg-primary text-primary-foreground":""}`}>°C</button><button type="button" onClick={()=>setTemperatureUnit("F")} className={`rounded-full px-3 py-1.5 text-xs ${temperatureUnit==="F"?"bg-primary text-primary-foreground":""}`}>°F</button></div></div></Field>
      <Field label="Method"><div className="mt-2 grid grid-cols-3 gap-2">{([['basal','Basal (morning)'],['oral','Oral'],['other','Other']] as const).map(([v,l])=><Chip key={v} active={temperatureMethod===v} onClick={()=>setTemperatureMethod(v)}>{l}</Chip>)}</div></Field>
      <Field label="Notes (optional)"><Textarea rows={3} maxLength={200} value={temperatureNote} onChange={e=>setTemperatureNote(e.target.value)} placeholder="How did you feel when you measured?"/><p className="mt-1 text-right text-[10px] text-muted-foreground">{temperatureNote.length}/200</p></Field>
      <div className="rounded-2xl bg-surface p-3 ring-1 ring-border"><p className="text-xs font-semibold">Your recent trend</p><MiniTrend points={temperatureTrend} unit="°C"/></div>
      {temperatureEntries.length>0&&<div className="space-y-2">{temperatureEntries.map(e=><div key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><Ico name="thermometer" size={19}/><div className="flex-1"><p className="text-sm font-semibold">{e.value.toFixed(2)} °C</p><p className="text-xs text-muted-foreground">{e.time}{e.method?` · ${e.method}`:""}</p></div><button type="button" onClick={()=>deleteTemperature(e.id)} className="rounded-full p-2 text-muted-foreground"><X className="h-4 w-4"/></button></div>)}</div>}
      <div className="rounded-2xl bg-tint p-3 text-xs"><p className="flex items-center gap-1.5 font-semibold"><Ico name="star" size={16}/><span>Tips</span></p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground"><li>Measure at about the same time every morning.</li><li>For basal tracking, measure before getting out of bed.</li><li>Small changes are normal.</li></ul></div>
    </>}
    {tab==="sleep"&&<>
      <Field label="Bedtime / Wake up"><div className="grid grid-cols-2 gap-2"><div><p className="mb-1 text-[10px] text-muted-foreground">Bedtime</p><Input type="time" value={bedtime} onChange={e=>setBedtime(e.target.value)}/></div><div><p className="mb-1 text-[10px] text-muted-foreground">Wake up</p><Input type="time" value={wakeTime} onChange={e=>setWakeTime(e.target.value)}/></div></div>{!bedtime&&!wakeTime&&<div className="mt-2"><p className="mb-1 text-[10px] text-muted-foreground">Or enter total sleep manually</p><Input inputMode="decimal" value={sleepHours} onChange={e=>setSleepHours(e.target.value.replace(/[^0-9.,]/g,""))} placeholder="8"/></div>}</Field>
      <Field label="Sleep quality"><div className="mt-2 grid grid-cols-5 gap-1">{([ ["Very poor","sad"], ["Poor","sad"], ["Okay","neutral"], ["Good","happy"], ["Excellent","happy"] ] as const).map(([q,icon])=><button key={q} type="button" onClick={()=>setQuality(q)} className={`flex min-w-0 flex-col items-center rounded-2xl px-1 py-3 text-center text-[10px] ring-1 ${quality===q?"bg-primary/15 ring-primary":"bg-surface ring-border"}`}><Ico name={icon} size={24}/><span className="mt-1 leading-tight">{q}</span></button>)}</div></Field>
      <Field label="Night awakenings"><div className="mt-1 flex items-center justify-between rounded-2xl bg-surface p-2 ring-1 ring-border"><button type="button" onClick={()=>setAwakenings(v=>Math.max(0,v-1))} className="grid h-10 w-10 place-items-center rounded-full bg-tint text-xl">−</button><span className="text-lg font-semibold">{awakenings}</span><button type="button" onClick={()=>setAwakenings(v=>Math.min(20,v+1))} className="grid h-10 w-10 place-items-center rounded-full bg-tint text-xl">+</button></div></Field>
      <Field label="Energy on waking"><div className="mt-2 grid grid-cols-5 gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setSleepEnergy(n)} className={`h-10 rounded-xl ring-1 ${sleepEnergy===n?"bg-primary/15 ring-primary":"bg-surface ring-border"}`}>{n}</button>)}</div><p className="mt-1 text-center text-[10px] text-muted-foreground">{["","Very low","Low","Moderate","Good","High"][sleepEnergy]}</p></Field>
      <Field label="Notes (optional)"><Textarea rows={3} maxLength={200} value={sleepNote} onChange={e=>setSleepNote(e.target.value)} placeholder="How was your sleep?"/><p className="mt-1 text-right text-[10px] text-muted-foreground">{sleepNote.length}/200</p></Field>
    </>}
    {tab==="weight"&&<>
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-border"><p className="flex items-center gap-1.5 text-xs font-semibold"><Ico name="weight" size={17}/><span>Current weight</span></p><div className="mt-2 flex items-end justify-between"><p className="font-serif text-4xl">{currentWeight!=null?currentWeight.toFixed(1):'—'} <span className="text-lg">kg</span></p>{weightDelta!=null&&<p className="text-xs font-semibold text-primary">{weightDelta>0?'+':'−'}{Math.abs(weightDelta).toFixed(1)} kg<br/><span className="font-normal text-muted-foreground">vs previous</span></p>}</div></div>
      <Field label="New weight"><div className="grid grid-cols-[1fr_120px] gap-2"><Input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value.replace(/[^0-9.,]/g,""))} placeholder="62.4 kg"/><Input type="time" value={weightTime} onChange={e=>setWeightTime(e.target.value)}/></div></Field>
      <div className="rounded-2xl bg-surface p-3 ring-1 ring-border"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Trend</p><div className="flex rounded-full bg-tint p-1">{([7,30,90] as const).map(n=><button key={n} type="button" onClick={()=>setWeightRange(n)} className={`rounded-full px-2 py-1 text-[10px] ${weightRange===n?"bg-primary text-primary-foreground":""}`}>{n} days</button>)}</div></div><MiniTrend points={weightTrend} unit="kg"/>{weightTrend.length>0&&<div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-[10px] text-muted-foreground">Average</p><p className="text-xs font-semibold">{(weightTrend.reduce((a,b)=>a+b.value,0)/weightTrend.length).toFixed(1)} kg</p></div><div><p className="text-[10px] text-muted-foreground">Highest</p><p className="text-xs font-semibold">{Math.max(...weightTrend.map(x=>x.value)).toFixed(1)} kg</p></div><div><p className="text-[10px] text-muted-foreground">Lowest</p><p className="text-xs font-semibold">{Math.min(...weightTrend.map(x=>x.value)).toFixed(1)} kg</p></div></div>}</div>
      <Field label="Body fat % (optional)"><Input inputMode="decimal" value={bodyFat} onChange={e=>setBodyFat(e.target.value.replace(/[^0-9.,]/g,""))} placeholder="e.g. 24.5"/></Field>
      <Field label="Notes (optional)"><Textarea rows={3} maxLength={200} value={weightNote} onChange={e=>setWeightNote(e.target.value)} placeholder="How are you feeling?"/><p className="mt-1 text-right text-[10px] text-muted-foreground">{weightNote.length}/200</p></Field>
      {weightEntries.length>0&&<div className="space-y-2">{weightEntries.map(e=><div key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"><Ico name="weight" size={19}/><div className="flex-1"><p className="text-sm font-semibold">{e.value.toFixed(1)} kg</p><p className="text-xs text-muted-foreground">{e.time}{e.bodyFatPercent!=null?` · ${e.bodyFatPercent}% body fat`:""}</p></div><button type="button" onClick={()=>deleteWeight(e.id)} className="rounded-full p-2 text-muted-foreground"><X className="h-4 w-4"/></button></div>)}</div>}
      <div className="rounded-2xl bg-tint p-3 text-xs"><p className="flex items-center gap-1.5 font-semibold"><Ico name="star" size={16}/><span>Good to know</span></p><p className="mt-1 text-muted-foreground">Weight naturally fluctuates because of hormones, water retention, salt and food. Focus on trends, not daily changes.</p></div>
    </>}
  </div>;
}
