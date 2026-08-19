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
import { Chip, CustomChipList, DurationField, Field, IntensityScale, stripEmoji, toggleIn } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";
import { PanicForm, TetanyForm } from "./EpisodeForms";
import { EyesEpisodeField, type EyesEpisode } from "./EyesEpisodeField";

export function PainWizard({
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
  initialEntry?: PainEntry;
}) {
  const { t } = useI18n();
  // Latest real pain entry used by symptom-only follow-ups.
  const latestPain = useMemo(() => {
    if (initialEntry) return undefined;
    // Symptom-only follow-ups are children of a real pain entry, not new pain measurements.
    // Always attach repeated Add symptoms entries to the newest REAL pain entry.
    const entries = (data.dayLogs[date]?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
    if (!entries.length) return undefined;

    return entries.reduce((latest, entry) =>
      (entry.time ?? "").localeCompare(latest.time ?? "") >= 0 ? entry : latest,
    );
  }, [data.dayLogs, date, initialEntry]);

  const [step, setStep] = useState(0);
  const [painScaleInfoOpen, setPainScaleInfoOpen] = useState(false);
  const [tetanyOn, setTetanyOn] = useState(false);
  const [panicOn, setPanicOn] = useState(false);
  const [eyesOn, setEyesOn] = useState(false);
  const [tetanyDraft, setTetanyDraft] = useState<TetanyEpisode | undefined>();
  const [panicDraft, setPanicDraft] = useState<PanicAttack | undefined>();
  const [eyesDraft, setEyesDraft] = useState<EyesEpisode | undefined>();
  const schema = useLogSchema();
  const painSteps = useMemo(() => {
    const configured = [
      ...registryFieldsForFeature(data, "pain"),
      ...registryCustomFieldsForFeature(data, "pain"),
    ].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const base = configured.length ? configured : [
      { id: "score", label: "Pain scale", kind: "scale" as const, order: 10 },
      { id: "parts", label: "Where does it hurt?", kind: "chips" as const, order: 20 },
      { id: "quality", label: "How does it hurt?", kind: "chips" as const, order: 30 },
      { id: "symptoms", label: "Other symptoms", kind: "chips" as const, order: 40 },
      { id: "details", label: "Details", kind: "text" as const, order: 50 },
    ];
    const withoutEpisodes = base.filter((field) => field.id !== "episodes");
    const detailsIndex = withoutEpisodes.findIndex((field) => field.id === "details");
    const symptomsIndex = withoutEpisodes.findIndex((field) => field.id === "symptoms");
    const insertAt = detailsIndex >= 0 ? detailsIndex : symptomsIndex >= 0 ? symptomsIndex + 1 : withoutEpisodes.length;
    return [
      ...withoutEpisodes.slice(0, insertAt),
      { id: "episodes", label: "Episodes", kind: "chips" as const, order: 45 },
      ...withoutEpisodes.slice(insertAt),
    ];
  }, [data]);
  const safeStep = Math.min(step, Math.max(0, painSteps.length - 1));
  const activePainStep = painSteps[safeStep];
  const activePainStepId = activePainStep?.id ?? "score";
  const activePainStepIsCustom = !!activePainStep && activePainStep.id !== "episodes" && !(BIXBO_LOG_FIELDS.pain ?? []).some((field) => field.id === activePainStep.id);
  const symptomsStepIndex = painSteps.findIndex((field) => field.id === "symptoms");
  const episodesStepIndex = painSteps.findIndex((field) => field.id === "episodes");
  const [score, setScore] = useState(initialEntry?.score ?? 0);
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [parts, setParts] = useState<string[]>(initialEntry?.parts ?? []);
  const [quality, setQuality] = useState<string[]>(initialEntry?.quality ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [bodyBattery, setBodyBattery] = useState<number | undefined>(initialEntry?.bodyBattery);
  const [stress, setStress] = useState<number | undefined>(initialEntry?.stress);
  const [mood, setMood] = useState<string[]>(initialEntry?.mood ?? []);
  const [hotFlashesOn, setHotFlashesOn] = useState<boolean>(!!initialEntry?.hotFlashesOn);
  const [hotFlashes, setHotFlashes] = useState<number | undefined>(initialEntry?.hotFlashes);
  const [hotFlashesNote, setHotFlashesNote] = useState(initialEntry?.hotFlashesNote ?? "");
  const [headache, setHeadache] = useState<boolean>(!!initialEntry?.headache);
  const [headacheTypes, setHeadacheTypes] = useState<string[]>(initialEntry?.headacheTypes ?? []);
  const [headacheIntensity, setHeadacheIntensity] = useState<number | undefined>(initialEntry?.headacheIntensity);
  const [headacheMedOn, setHeadacheMedOn] = useState<boolean>(!!initialEntry?.headacheMed);
  const [headacheMed, setHeadacheMed] = useState<string>(initialEntry?.headacheMed ?? "");
  const [headacheMedTime, setHeadacheMedTime] = useState<string>(initialEntry?.headacheMedTime ?? nowHHMM());
  const [headacheNote, setHeadacheNote] = useState<string>(initialEntry?.headacheNote ?? "");
  const [pcosSymptoms, setPcosSymptoms] = useState<string[]>(initialEntry?.pcosSymptoms ?? []);
  const [fluNote, setFluNote] = useState<string>(initialEntry?.fluNote ?? "");
  // Pressure detail (shown when "Pressure" quality is selected)
  const [pressureTypes, setPressureTypes] = useState<string[]>(initialEntry?.pressureTypes ?? []);
  const [pressureIntensity, setPressureIntensity] = useState<number | undefined>(initialEntry?.pressureIntensity);
  // Nausea section
  const [nausea, setNausea] = useState<boolean>(!!initialEntry?.nausea);
  const [nauseaTypes, setNauseaTypes] = useState<string[]>((initialEntry?.nauseaTypes ?? []).map(stripEmoji));
  const [nauseaSeverity, setNauseaSeverity] = useState<number | undefined>(initialEntry?.nauseaSeverity);
  const [nauseaMinutes, setNauseaMinutes] = useState<string>(
    initialEntry?.nauseaMinutes != null ? String(initialEntry.nauseaMinutes) : "",
  );
  const [nauseaOngoing, setNauseaOngoing] = useState<boolean>(!!initialEntry?.nauseaOngoing);
  const [nauseaTriggers, setNauseaTriggers] = useState<string[]>((initialEntry?.nauseaTriggers ?? []).map(stripEmoji));
  const [nauseaSymptoms, setNauseaSymptoms] = useState<string[]>((initialEntry?.nauseaSymptoms ?? []).map(stripEmoji));
  const [nauseaHelped, setNauseaHelped] = useState<string[]>((initialEntry?.nauseaHelped ?? []).map(stripEmoji));
  const [nauseaNote, setNauseaNote] = useState(initialEntry?.nauseaNote ?? "");

  // Quick update: copy the latest state, use the current time and jump to symptoms.
  const editingSymptomUpdate = initialEntry?.entryKind === "symptom-update";
  const [quickSymptomUpdate, setQuickSymptomUpdate] = useState(editingSymptomUpdate);
  const sourcePainForEdit = editingSymptomUpdate
    ? (data.dayLogs[date]?.pain ?? []).find((entry) => entry.id === initialEntry?.sourcePainId)
    : undefined;
  const [copiedFromTime, setCopiedFromTime] = useState<string | undefined>(sourcePainForEdit?.time);
  const [copiedFromId, setCopiedFromId] = useState<string | undefined>(initialEntry?.sourcePainId);

  useEffect(() => {
    if (editingSymptomUpdate && symptomsStepIndex >= 0) setStep(symptomsStepIndex);
  }, [editingSymptomUpdate, symptomsStepIndex]);
  const startSymptomUpdate = () => {
    if (!latestPain) return;

    // NEW symptom-only follow-up: never clone the previous pain details.
    // score stays only as required internal context and is excluded from pain averages.
    setScore(latestPain.score);
    setParts([]);
    setQuality([]);
    setSymptoms([]);
    setPressureTypes([]);
    setPressureIntensity(undefined);
    setBodyBattery(undefined);
    setStress(undefined);
    setMood([]);
    setHotFlashesOn(false);
    setHotFlashes(undefined);
    setHotFlashesNote("");
    setPcosSymptoms([]);
    setFluNote("");
    setNausea(false);
    setNauseaTypes([]);
    setNauseaSeverity(undefined);
    setNauseaMinutes("");
    setNauseaOngoing(false);
    setNauseaTriggers([]);
    setNauseaSymptoms([]);
    setNauseaHelped([]);
    setNauseaNote("");
    setHeadache(false);
    setHeadacheTypes([]);
    setHeadacheIntensity(undefined);
    setHeadacheMedOn(false);
    setHeadacheMed("");
    setHeadacheMedTime(nowHHMM());
    setHeadacheNote("");
    setTetanyOn(false);
    setPanicOn(false);
    setEyesOn(false);
    setTetanyDraft(undefined);
    setPanicDraft(undefined);
    setEyesDraft(undefined);
    setNote("");
    setTime(nowHHMM());
    setCopiedFromId(latestPain.id);
    setCopiedFromTime(latestPain.time);
    setQuickSymptomUpdate(true);
    setStep(symptomsStepIndex >= 0 ? symptomsStepIndex : 0);
  };


  type CKey =
    | "bodyParts"
    | "quality"
    | "symptoms"
    | "moods"
    | "tetanyTypes"
    | "tetanyLocations"
    | "tetanyTriggers"
    | "tetanyHelped"
    | "pcosSymptoms"
    | "headacheTypes"
    | "pressureTypes"
    | "nauseaTypes"
    | "nauseaTriggers"
    | "nauseaSymptoms"
    | "nauseaHelped";
  const addCustom = (key: CKey, v: string) =>
    update((d) =>
      withoutCustomTombstones({ ...d, custom: { ...d.custom, [key]: [...(d.custom[key] ?? []), v] } }, key, [v]),
    );
  const removeCustom = (key: CKey, v: string) =>
    update((d) =>
      withCustomTombstones(
        { ...d, custom: { ...d.custom, [key]: (d.custom[key] ?? []).filter((x) => x !== v) } },
        key,
        [v],
      ),
    );
  const renameCustom = (key: CKey, oldV: string, newV: string) =>
    update((d) =>
      withoutCustomTombstones(
        withCustomTombstones(
          { ...d, custom: { ...d.custom, [key]: (d.custom[key] ?? []).map((x) => (x === oldV ? newV : x)) } },
          key,
          [oldV],
        ),
        key,
        [newV],
      ),
    );

  const save = () => {
    const editing = !!initialEntry;
    const p: PainEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      entryKind: quickSymptomUpdate || editingSymptomUpdate ? "symptom-update" : undefined,
      sourcePainId: quickSymptomUpdate || editingSymptomUpdate ? (copiedFromId ?? initialEntry?.sourcePainId) : undefined,
      score,
      parts,
      quality,
      symptoms,
      note: note.trim(),
      bodyBattery,
      stress,
      mood: mood.length ? mood : undefined,
      hotFlashesOn: hotFlashesOn || undefined,
      hotFlashes: hotFlashesOn ? hotFlashes : undefined,
      hotFlashesNote: hotFlashesOn && hotFlashesNote.trim() ? hotFlashesNote.trim() : undefined,
      headache: headache || undefined,
      headacheTypes: headache && headacheTypes.length ? headacheTypes : undefined,
      headacheIntensity: headache ? headacheIntensity : undefined,
      headacheMed: headache && headacheMedOn && headacheMed.trim() ? headacheMed.trim() : undefined,
      headacheMedTime: headache && headacheMedOn && headacheMed.trim() ? headacheMedTime : undefined,
      headacheNote: headache && headacheNote.trim() ? headacheNote.trim() : undefined,
      pressureTypes: quality.includes("Pressure") && pressureTypes.length ? pressureTypes : undefined,
      pressureIntensity: quality.includes("Pressure") ? pressureIntensity : undefined,
      nausea: nausea || undefined,
      nauseaTypes: nausea && nauseaTypes.length ? [...new Set(nauseaTypes.map(stripEmoji))] : undefined,
      nauseaSeverity: nausea ? nauseaSeverity : undefined,
      nauseaMinutes: nausea && !nauseaOngoing && nauseaMinutes !== "" ? Number(nauseaMinutes) : undefined,
      nauseaOngoing: nausea ? nauseaOngoing || undefined : undefined,
      nauseaTriggers: nausea && nauseaTriggers.length ? [...new Set(nauseaTriggers.map(stripEmoji))] : undefined,
      nauseaSymptoms: nausea && nauseaSymptoms.length ? [...new Set(nauseaSymptoms.map(stripEmoji))] : undefined,
      nauseaHelped: nausea && nauseaHelped.length ? [...new Set(nauseaHelped.map(stripEmoji))] : undefined,
      nauseaNote: nausea && nauseaNote.trim() ? nauseaNote.trim() : undefined,
      fluNote: symptoms.includes("Flu") && fluNote.trim() ? fluNote.trim() : undefined,
      pcosSymptoms: pcosSymptoms.length ? pcosSymptoms : undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      pain: editing ? (l.pain ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.pain ?? []), p],
      tetany: tetanyOn && tetanyDraft ? [...(l.tetany ?? []), tetanyDraft] : l.tetany,
      panic: panicOn && panicDraft ? [...(l.panic ?? []), panicDraft] : l.panic,
      eyes: eyesOn && eyesDraft ? [...(l.eyes ?? []), eyesDraft] : l.eyes,
    }));
    schema?.saveAdminCustomFields();
    onDone();
  };

  const bg = painColor(score);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStartRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,select,button,[role="slider"],.no-swipe')) return;
    if (quickSymptomUpdate) {
      if (dx < 0 && activePainStepId === "symptoms" && episodesStepIndex >= 0) setStep(episodesStepIndex);
      else if (dx > 0 && activePainStepId === "episodes" && symptomsStepIndex >= 0) setStep(symptomsStepIndex);
      return;
    }
    if (dx < 0 && safeStep < painSteps.length - 1) setStep(safeStep + 1);
    else if (dx > 0 && safeStep > 0) setStep(safeStep - 1);
  };

  return (
    <div
      className="flex min-h-full flex-col px-5 pb-4 pt-0 transition-colors touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {quickSymptomUpdate ? (
        <div className="flex items-center justify-between px-1 pb-3 pt-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {t("Add symptoms")}
          </span>
          <span className="text-xs text-muted-foreground">{t(editingSymptomUpdate ? "Editing ·" : "New entry ·")} {time}</span>
        </div>
      ) : (
        <div
          style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky z-30 -mx-5 h-[60px] flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"
        >
          {safeStep > 0 ? (
            <button
              type="button"
              onClick={() => setStep(safeStep - 1)}
              className="flex min-w-[68px] items-center gap-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true" className="text-base leading-none">←</span>
              <span>{t("Back")}</span>
            </button>
          ) : (
            <span className="min-w-[68px]" aria-hidden="true" />
          )}

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <div className="flex gap-1">
              {painSteps.map((painStep, i) => (
                <span
                  key={painStep.id}
                  className={`h-1.5 w-5 rounded-full transition-colors ${i <= safeStep ? "bg-primary" : "bg-tint"}`}
                />
              ))}
            </div>
            <span className="min-w-0 truncate text-xs font-semibold text-foreground/75">{t(activePainStep?.label ?? "")}</span>
            <span className="shrink-0 text-xs font-semibold text-foreground/75">{safeStep + 1}/{painSteps.length}</span>
          </div>

          <button
            type="button"
            onClick={safeStep < painSteps.length - 1 ? () => setStep(safeStep + 1) : save}
            className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="text-sm font-semibold leading-none">{t(safeStep < painSteps.length - 1 ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="text-base leading-none">{safeStep < painSteps.length - 1 ? "→" : "✓"}</span>
          </button>
        </div>
      )}

      {activePainStepIsCustom && activePainStep && schema ? (
        <CoreFeatureCustomFieldInput
          field={activePainStep}
          value={schema.adminFieldValues[activePainStep.id]}
          onChange={(value) => schema.setAdminFieldValue(activePainStep.id, value)}
          className="mx-1"
        />
      ) : null}

      {activePainStepId === "score" && (
        <div className="flex flex-1 flex-col items-center gap-5 px-1 pb-6 pt-5">
          {latestPain && !initialEntry && symptomsStepIndex >= 0 && (
            <div className="w-full rounded-2xl border border-primary/30 bg-surface/90 p-3 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t("Pain still feels the same?")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Last log:")} {latestPain.time} {t("· pain")} {latestPain.score}{t("/10. Reuse it and add only the new symptoms.")}
                  </p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                  <Ico e="🤕" size={22} />
                </span>
              </div>
              <Button type="button" onClick={startSymptomUpdate} className="w-full">
                {t("Same pain — add symptoms")}
              </Button>
            </div>
          )}

          <div className="mt-1 text-center">
            <h2 className="font-serif text-[22px] leading-tight text-foreground">{t("How intense is your pain right now?")}</h2>
            <p className="mt-1.5 text-sm text-foreground/80">{t("Rate from 0 (no pain) to 10 (worst pain imaginable).")}</p>
          </div>

          <div
            className="grid h-32 w-32 place-items-center rounded-full text-white shadow-sm"
            style={{ background: bg }}
          >
            <div className="text-5xl font-bold leading-none">{Number.isInteger(score) ? score : score.toFixed(1)}</div>
          </div>
          <p className="-mt-2 text-center text-sm font-semibold text-foreground">
            {t(getScaleDesc(data, "pain")[Math.round(score)])}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-center text-sm font-semibold text-foreground">{t("Pain scale")}</p>
            <button
              type="button"
              onClick={() => setPainScaleInfoOpen((open) => !open)}
              aria-label={t("Pain scale information")}
              aria-expanded={painScaleInfoOpen}
              className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[10px] font-bold leading-none text-primary ring-1 ring-primary/25"
            >
              i
            </button>
          </div>
          <div className="w-full max-w-md px-3">
            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />
          </div>
          <div className="grid w-fit max-w-full grid-cols-7 justify-center gap-2 px-1">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                title={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}
                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}
                className={`h-9 w-9 shrink-0 rounded-full text-xs font-semibold transition ${
                  score === n ? "text-white ring-[3px] ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </button>
            ))}
          </div>
          <div className="mt-1 flex max-w-[300px] items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 text-left text-xs leading-relaxed text-foreground/80">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-base">💡</span>
            <span>{t("Use this scale to track your pain and see patterns over time.")}</span>
          </div>
          {painScaleInfoOpen ? (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"
              role="presentation"
              onClick={() => setPainScaleInfoOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("The Pain Scale")}
                className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">i</span>
                    <h3 className="font-serif text-lg font-semibold">{t("The Pain Scale")}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPainScaleInfoOpen(false)}
                    aria-label={t("Close")}
                    className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[72dvh] overflow-y-auto rounded-2xl border border-border/60 bg-surface/40">
                  {[
                    [0, "Pain free", "You've been okay for the past 24 hours."],
                    [1, "Very minor annoyance", "Occasional minor twinges. No medication needed."],
                    [2, "Minor annoyance", "Occasional strong twinges. No medication needed."],
                    [3, "Annoying enough to be distracting", "Mild painkillers are effective (aspirin, ibuprofen)."],
                    [4, "Can be ignored if you are really involved in your work", "But still distracting. Mild painkillers relieve pain for 3–4 hours."],
                    [5, "Can't be ignored for more than 30 minutes", "Mild painkillers reduce pain for 3–4 hours."],
                    [6, "Can't be ignored for any length of time", "But you can still go to work and participate in social activities. Stronger painkillers (codeine) reduce pain for 3–4 hours."],
                    [7, "Makes it difficult to concentrate, interferes with sleep", "You can still function with effort. Stronger painkillers are only partially effective. Strongest painkillers relieve pain."],
                    [8, "Physical activity severely limited", "You can read and converse with effort. Nausea and dizziness are common. Strongest painkillers reduce pain for 3–4 hours."],
                    [9, "Unable to speak", "Crying out or moaning uncontrollably — near delirium. Strongest painkillers are only partially effective."],
                    [10, "Unconscious", "Pain makes you pass out. Strongest painkillers are only partially effective."],
                  ].map(([n, label, description]) => {
                    const level = Number(n);
                    const active = Math.round(score) === level;
                    return (
                      <div
                        key={level}
                        className={`flex gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0 ${active ? "bg-primary/10" : "bg-background/60"}`}
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                          style={{ background: painColor(level) }}
                        >
                          {level}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className={`text-sm leading-tight ${active ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                            {t(String(label))}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(String(description))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {activePainStepId === "parts" && (
        <Field label="Where does it hurt?">
          <CustomChipList
            base={BODY_PARTS_DEFAULT}
            custom={data.custom.bodyParts}
            onAddCustom={(v) => addCustom("bodyParts", v)}
            onRemoveCustom={(v) => {
              removeCustom("bodyParts", v);
              setParts((a) => a.filter((x) => x !== v));
            }}
            onRenameCustom={(o, n) => {
              renameCustom("bodyParts", o, n);
              setParts((a) => a.map((x) => (x === o ? n : x)));
            }}
            selected={parts}
            onToggle={(v) => setParts((a) => toggleIn(a, v))}
           schemaFieldId="parts"/>
        </Field>
      )}
      {activePainStepId === "quality" && (
        <div className="space-y-4">
          <Field label="How does it hurt?">
            <CustomChipList
              base={PAIN_QUALITY_DEFAULT}
              custom={data.custom.quality}
              onAddCustom={(v) => addCustom("quality", v)}
              onRemoveCustom={(v) => {
                removeCustom("quality", v);
                setQuality((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("quality", o, n);
                setQuality((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={quality}
              onToggle={(v) => setQuality((a) => toggleIn(a, v))}
             schemaFieldId="quality"/>
          </Field>
          {quality.includes("Pressure") && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label={`Pressure intensity ${pressureIntensity ?? "-"}/10`}>
                <IntensityScale
                  value={pressureIntensity ?? -1}
                  onChange={(n) => setPressureIntensity(pressureIntensity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "pressure")}
                  legendTitle="Pressure intensity scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Type of pressure">
                <CustomChipList
                  base={PRESSURE_TYPES}
                  custom={data.custom.pressureTypes ?? []}
                  onAddCustom={(v) => addCustom("pressureTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("pressureTypes", v);
                    setPressureTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("pressureTypes", o, n);
                    setPressureTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={pressureTypes}
                  onToggle={(v) => setPressureTypes((a) => toggleIn(a, v))}
                />
              </Field>
            </div>
          )}
        </div>
      )}
      {activePainStepId === "symptoms" && (
        <div className="space-y-4">
          {quickSymptomUpdate && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">
              <p className="font-semibold">
                {t("Pain")} {score}{t("/10 copied from")} {copiedFromTime ?? t("the latest log")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("This saves a new entry at")} {time}{t("; the older log stays unchanged. Add or adjust the symptoms below.")}
              </p>
            </div>
          )}

          <Field label="Other symptoms">
            <CustomChipList
              base={OTHER_SYMPTOMS_DEFAULT}
              custom={data.custom.symptoms}
              onAddCustom={(v) => addCustom("symptoms", v)}
              onRemoveCustom={(v) => {
                removeCustom("symptoms", v);
                setSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("symptoms", o, n);
                setSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={symptoms}
              onToggle={(v) => setSymptoms((a) => toggleIn(a, v))}
             schemaFieldId="symptoms"/>
          </Field>
          {symptoms.includes("Flu") && (
            <Field label="Flu symptoms note">
              <Textarea
                rows={2}
                value={fluNote}
                onChange={(e) => setFluNote(e.target.value)}
                placeholder={t("e.g. stuffy nose, sore throat")}
              />
            </Field>
          )}
          <Field label="PCOS symptoms">
            <CustomChipList
              base={PCOS_SYMPTOMS}
              custom={data.custom.pcosSymptoms ?? []}
              onAddCustom={(v) => addCustom("pcosSymptoms", v)}
              onRemoveCustom={(v) => {
                removeCustom("pcosSymptoms", v);
                setPcosSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("pcosSymptoms", o, n);
                setPcosSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={pcosSymptoms}
              onToggle={(v) => setPcosSymptoms((a) => toggleIn(a, v))}
            />
          </Field>
        </div>
      )}

      {activePainStepId === "episodes" && (
        <div className="space-y-4 pt-1">
          <div>
            <h2 className="font-serif text-xl text-foreground">{t("Episodes")}</h2>
          </div>
          <div>
            <Field label="Headache?">
              <div className="mt-1 flex gap-2">
                <Chip active={!headache} onClick={() => setHeadache(false)}>
                  No
                </Chip>
                <Chip active={headache} onClick={() => setHeadache(true)}>
                  Yes — log it
                </Chip>
              </div>
            </Field>
            {headache && (
              <div className="mt-3 rounded-2xl border border-border p-3 space-y-3">
                <Field label={`Headache intensity ${headacheIntensity ?? "-"}/10`}>
                  <IntensityScale
                    value={headacheIntensity ?? 0}
                    onChange={(n) => setHeadacheIntensity(headacheIntensity === n ? undefined : n)}
                    max={10}
                    from={1}
                    step={1}
                    descriptions={getScaleDesc(data, "headache")}
                    legendTitle="Headache scale"
                    compactSingleRow
                  />
                </Field>
                <Field label="Headache type">
                  <CustomChipList
                    base={HEADACHE_TYPES}
                    custom={data.custom.headacheTypes ?? []}
                    descriptions={HEADACHE_TYPE_DESC}
                    onAddCustom={(v) => addCustom("headacheTypes", v)}
                    onRemoveCustom={(v) => {
                      removeCustom("headacheTypes", v);
                      setHeadacheTypes((a) => a.filter((x) => x !== v));
                    }}
                    onRenameCustom={(o, n) => {
                      renameCustom("headacheTypes", o, n);
                      setHeadacheTypes((a) => a.map((x) => (x === o ? n : x)));
                    }}
                    selected={headacheTypes}
                    onToggle={(v) => setHeadacheTypes((a) => toggleIn(a, v))}
                  />
                </Field>
                <Field label="Medication taken">
                  <div className="mt-1 flex gap-2">
                    <Chip active={!headacheMedOn} onClick={() => setHeadacheMedOn(false)}>
                      No
                    </Chip>
                    <Chip active={headacheMedOn} onClick={() => setHeadacheMedOn(true)}>
                      Yes
                    </Chip>
                  </div>
                  {headacheMedOn && (
                    <div className="mt-2 space-y-2">
                      {data.meds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {data.meds.map((m) => {
                            const label = `${m.name}${m.dose ? ` ${m.dose}` : ""}`;
                            return (
                              <Chip
                                key={m.id}
                                active={headacheMed === label}
                                onClick={() => setHeadacheMed(headacheMed === label ? "" : label)}
                              ><TrText value={label} /></Chip>
                            );
                          })}
                        </div>
                      )}
                      <Input
                        value={headacheMed}
                        onChange={(e) => setHeadacheMed(e.target.value)}
                        placeholder={t("Medication + dose")}
                      />
                      <Input type="time" value={headacheMedTime} onChange={(e) => setHeadacheMedTime(e.target.value)} />
                    </div>
                  )}
                </Field>
                <Field label="Note (optional)"><Textarea rows={2} value={headacheNote} onChange={(e) => setHeadacheNote(e.target.value)} placeholder={t("Headache note…")} /></Field>
              </div>
            )}
          </div>
          <Field label="Nausea?">
            <div className="mt-1 flex gap-2">
              <Chip
                active={!nausea}
                onClick={() => {
                  setNausea(false);
                  setNauseaTypes([]);
                  setNauseaSeverity(undefined);
                  setNauseaMinutes("");
                  setNauseaOngoing(false);
                  setNauseaTriggers([]);
                  setNauseaSymptoms([]);
                  setNauseaHelped([]);
                  setNauseaNote("");
                }}
              >
                No
              </Chip>
              <Chip active={nausea} onClick={() => setNausea(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {nausea && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label={`Nausea severity ${nauseaSeverity ?? "-"}/10`}>
                <IntensityScale
                  value={nauseaSeverity ?? -1}
                  onChange={(n) => setNauseaSeverity(nauseaSeverity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "nausea")}
                  legendTitle="Nausea severity scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Type of nausea">
                <CustomChipList
                  base={NAUSEA_TYPES}
                  custom={data.custom.nauseaTypes ?? []}
                  descriptions={NAUSEA_TYPE_DESC}
                  onAddCustom={(v) => addCustom("nauseaTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTypes", v);
                    setNauseaTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTypes", o, n);
                    setNauseaTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTypes}
                  onToggle={(v) => setNauseaTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <DurationField
                minutes={nauseaMinutes}
                setMinutes={setNauseaMinutes}
                ongoing={nauseaOngoing}
                setOngoing={setNauseaOngoing}
              />
              <Field label="Triggers">
                <CustomChipList
                  base={NAUSEA_TRIGGERS}
                  custom={data.custom.nauseaTriggers ?? []}
                  onAddCustom={(v) => addCustom("nauseaTriggers", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTriggers", v);
                    setNauseaTriggers((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTriggers", o, n);
                    setNauseaTriggers((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTriggers}
                  onToggle={(v) => setNauseaTriggers((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Associated symptoms">
                <CustomChipList
                  base={NAUSEA_SYMPTOMS}
                  custom={data.custom.nauseaSymptoms ?? []}
                  onAddCustom={(v) => addCustom("nauseaSymptoms", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaSymptoms", v);
                    setNauseaSymptoms((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaSymptoms", o, n);
                    setNauseaSymptoms((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaSymptoms}
                  onToggle={(v) => setNauseaSymptoms((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Relieved by">
                <CustomChipList
                  base={NAUSEA_HELPED}
                  custom={data.custom.nauseaHelped ?? []}
                  onAddCustom={(v) => addCustom("nauseaHelped", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaHelped", v);
                    setNauseaHelped((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaHelped", o, n);
                    setNauseaHelped((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaHelped}
                  onToggle={(v) => setNauseaHelped((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Note (optional)"><Textarea rows={2} value={nauseaNote} onChange={(e) => setNauseaNote(e.target.value)} placeholder={t("Nausea note…")} /></Field>
            </div>
          )}
          <Field label="Hot flashes?">
            <div className="mt-1 flex gap-2">
              <Chip active={!hotFlashesOn} onClick={() => { setHotFlashesOn(false); setHotFlashes(undefined); setHotFlashesNote(""); }}>
                No
              </Chip>
              <Chip active={hotFlashesOn} onClick={() => setHotFlashesOn(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {hotFlashesOn && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label={`Hot flashes intensity ${hotFlashes ?? "-"}/5`}>
                <IntensityScale
                  value={hotFlashes ?? 0}
                  onChange={(n) => setHotFlashes(hotFlashes === n ? undefined : n)}
                  max={5}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "hotFlashes")}
                  legendTitle="Hot flashes scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Note (optional)"><Textarea rows={2} value={hotFlashesNote} onChange={(e) => setHotFlashesNote(e.target.value)} placeholder={t("Hot flashes note…")} /></Field>
            </div>
          )}
          <div>
            <Field label="Tetany episode?">
              <div className="mt-1 flex gap-2">
                <Chip active={!tetanyOn} onClick={() => { setTetanyOn(false); setTetanyDraft(undefined); }}>
                  No
                </Chip>
                <Chip active={tetanyOn} onClick={() => setTetanyOn(true)}>
                  Yes — log it
                </Chip>
              </div>
            </Field>
            {tetanyOn && (
              <div className="mt-3 rounded-2xl border border-border p-3">
                <LogSchemaContext.Provider value={null}>
                  <TetanyForm date={date} data={data} update={update} onDone={() => setTetanyOn(false)} embedded onDraftChange={setTetanyDraft} />
                </LogSchemaContext.Provider>
              </div>
            )}
          </div>
          <div>
            <Field label="Panic attack?">
              <div className="mt-1 flex gap-2">
                <Chip active={!panicOn} onClick={() => { setPanicOn(false); setPanicDraft(undefined); }}>
                  No
                </Chip>
                <Chip active={panicOn} onClick={() => setPanicOn(true)}>
                  Yes — log it
                </Chip>
              </div>
            </Field>
            {panicOn && (
              <div className="mt-3 rounded-2xl border border-border p-3">
                <LogSchemaContext.Provider value={null}>
                  <PanicForm date={date} data={data} update={update} onDone={() => setPanicOn(false)} embedded onDraftChange={setPanicDraft} />
                </LogSchemaContext.Provider>
              </div>
            )}
          </div>
          <EyesEpisodeField date={date} update={update} active={eyesOn} setActive={setEyesOn} setDraft={setEyesDraft} />
        </div>
      )}

      {activePainStepId === "details" && (
        <div className="space-y-4">
          {(() => {
            const STRESS_DESC = getScaleDesc(data, "stress");
            return (
              <Field label={`Stress ${stress ?? "-"} / 10`}>
                <IntensityScale
                  value={stress ?? -1}
                  onChange={(n) => setStress(stress === n ? undefined : n)}
                  max={10}
                  from={0}
                  step={1}
                  descriptions={STRESS_DESC}
                  legendTitle="Stress scale"
                  compactSingleRow
                />
              </Field>
            );
          })()}
          <Field label="Body battery">
            <div className="mt-2 flex justify-between gap-2">
              {BODY_BATTERY.map((b) => (
                <button
                  key={b.n}
                  type="button"
                  onClick={() => setBodyBattery(bodyBattery === b.n ? undefined : b.n)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border p-2 transition ${bodyBattery === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
                >
                  <div className="grid h-10 w-6 place-items-end rounded-md border-2 border-foreground/60 p-0.5">
                    <div className="w-full rounded" style={{ height: `${b.n * 18}%`, background: b.color }} />
                  </div>
                  <span className="text-[10px]">{b.emoji}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Mood">
            <CustomChipList
              base={MOODS_DEFAULT}
              custom={data.custom.moods}
              onAddCustom={(v) => addCustom("moods", v)}
              onRemoveCustom={(v) => {
                removeCustom("moods", v);
                setMood((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("moods", o, n);
                setMood((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={mood}
              onToggle={(v) => setMood((a) => toggleIn(a, v))}
            />
          </Field>
          <Field label="Time of entry">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Anything else…")} />
          </Field>
        </div>
      )}

      {quickSymptomUpdate && activePainStepId === "symptoms" && (
        <div className="mt-1 rounded-2xl border border-border/70 bg-surface/70 p-3">
          <Field label="Note (optional)">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("Add a note about what changed, what you were doing, or anything else…")}
            />
          </Field>
        </div>
      )}

      {quickSymptomUpdate && (activePainStepId === "symptoms" || activePainStepId === "episodes") && (
        <SheetFooter style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky order-first z-30 -mx-5 mt-0 h-[60px] flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => {
              if (activePainStepId === "episodes" && symptomsStepIndex >= 0) {
                setStep(symptomsStepIndex);
                return;
              }
              setQuickSymptomUpdate(false);
              setCopiedFromTime(undefined);
              setCopiedFromId(undefined);
              setStep(0);
            }}
            className="flex items-center gap-1 px-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="text-xl leading-none">←</span>
            <span>{t(activePainStepId === "episodes" ? "Back" : "Edit full log")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activePainStepId === "symptoms" && episodesStepIndex >= 0) {
                setStep(episodesStepIndex);
                return;
              }
              save();
            }}
            className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>{t(activePainStepId === "symptoms" ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="text-base leading-none">{activePainStepId === "symptoms" ? "→" : "✓"}</span>
          </button>
        </SheetFooter>
      )}
    </div>
  );
}
