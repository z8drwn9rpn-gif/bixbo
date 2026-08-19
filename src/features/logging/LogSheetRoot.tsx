import { SemanticIco } from "@/components/icons/BixboFoodIcons";
import { Children, isValidElement, useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useKeyboardViewport } from "@/hooks/useKeyboardViewport";
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
import { SaveBar, type UpdateFn } from "./LogFormPrimitives";
import { EventForm, NoteForm, PostpartumSymptomsForm, TaskForm } from "./CalendarForms";
import { PainWizard } from "./PainWizard";
import { PanicForm, TetanyForm } from "./EpisodeForms";
import { PeriodForm, SexForm, ThermoForm } from "./CycleForms";
import { BowelForm, FoodForm, TempForm } from "./LifestyleForms";
import { MedsForm, WorkoutForm } from "./MedsWorkoutForms";

function BodyRecoveryForm({
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
  const schema = useLogSchema();
  const cur = data.dayLogs[date] ?? {};
  const [mode, setMode] = useState<"body" | "recovery">("body");
  const [time, setTime] = useState(nowHHMM());
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [sleepHours, setSleepHours] = useState(cur.sleepHours != null ? String(cur.sleepHours).replace(".", ",") : "");
  const [sleepQuality, setSleepQuality] = useState<string[]>(asArr(cur.sleepQuality));
  const [therapyKind, setTherapyKind] = useState<ThermoKind>("heat");
  const [therapyStart, setTherapyStart] = useState(nowHHMM());
  const [therapyMinutes, setTherapyMinutes] = useState("20");
  const [therapyOngoing, setTherapyOngoing] = useState(false);
  const [therapyNote, setTherapyNote] = useState("");

  const parseNumber = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
  };

  const temperatureEntries = cur.temperatureEntries?.length
    ? cur.temperatureEntries
    : cur.temperature != null
      ? [{ id: `legacy-temperature-${date}`, time: "", value: cur.temperature }]
      : [];
  const weightEntries = cur.weightEntries?.length
    ? cur.weightEntries
    : cur.weight != null
      ? [{ id: `legacy-weight-${date}`, time: "", value: cur.weight }]
      : [];

  const deleteTemperature = (id: string) => updateDayLog(update, date, (log) => {
    const entries = log.temperatureEntries?.length
      ? log.temperatureEntries
      : log.temperature != null
        ? [{ id: `legacy-temperature-${date}`, time: "", value: log.temperature }]
        : [];
    const next = entries.filter((entry) => entry.id !== id);
    return {
      ...log,
      temperatureEntries: next.length ? next : undefined,
      temperature: next.at(-1)?.value,
    };
  });

  const deleteWeight = (id: string) => updateDayLog(update, date, (log) => {
    const entries = log.weightEntries?.length
      ? log.weightEntries
      : log.weight != null
        ? [{ id: `legacy-weight-${date}`, time: "", value: log.weight }]
        : [];
    const next = entries.filter((entry) => entry.id !== id);
    return {
      ...log,
      weightEntries: next.length ? next : undefined,
      weight: next.at(-1)?.value,
    };
  });

  const sleepOptions = [
    ["Awful", "🙁"], ["Terrible", "🙁"], ["Restless", "🌀"], ["Poor", "🙁"],
    ["Ok", "😐"], ["Broken sleep", "💤"], ["Woke up a lot", "⏰"],
    ["Good", "🙂"], ["Refreshed", "🌿"], ["Great", "🙂"], ["Perfect", "❤️"],
    ["Slept in", "🛏️"], ["Too short", "🕒"], ["Too long", "🕒"],
    ["Groggy", "🙂"], ["Foggy head", "😵"], ["Nightmares", "😵"],
    ["Vivid dreams", "✨"], ["Sweaty night", "🌡️"], ["Cold night", "❄️"],
    ["Woke with headache", "🎯"], ["Cramps at night", "⚡"], ["Up to the toilet", "💩"],
    ["Fell asleep late", "📝"], ["Woke up early", "⭐"], ["Hard to get up", "🌿"],
    ["Deep & calm", "👟"], ["Best sleep ever", "❤️"],
  ] as const;

  const save = () => {
    schema?.saveAdminCustomFields();
    if (mode === "body") {
      const temp = parseNumber(temperature);
      const bodyWeight = parseNumber(weight);
      const sleep = parseNumber(sleepHours);
      updateDayLog(update, date, (log) => {
        const nextTempEntries = temp != null
          ? [...(log.temperatureEntries ?? []), { id: crypto.randomUUID(), time, value: temp }]
          : log.temperatureEntries;
        const nextWeightEntries = bodyWeight != null
          ? [...(log.weightEntries ?? []), { id: crypto.randomUUID(), time, value: bodyWeight }]
          : log.weightEntries;
        return {
          ...log,
          temperatureEntries: nextTempEntries,
          weightEntries: nextWeightEntries,
          temperature: temp ?? log.temperature,
          weight: bodyWeight ?? log.weight,
          sleepHours: sleep ?? log.sleepHours,
          sleepQuality: sleepQuality.length ? sleepQuality : log.sleepQuality,
        };
      });
    } else {
      const minutes = therapyOngoing ? 0 : Math.max(0, Number(therapyMinutes) || 0);
      const entry: ThermoSession = {
        id: crypto.randomUUID(),
        kind: therapyKind,
        start: therapyStart || time,
        minutes,
        ongoing: therapyOngoing || undefined,
        note: therapyNote.trim() || undefined,
      };
      updateDayLog(update, date, (log) => ({ ...log, heat: [...(log.heat ?? []), entry] }));
    }
    onDone();
  };

  const selectedClass = "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/65";
  const plainClass = "bg-tint text-foreground ring-1 ring-border";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-3">
      <SaveBar onCancel={onDone} onSave={save} />

      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t("Type")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("body")}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold ${mode === "body" ? selectedClass : plainClass}`}
          >
            <Ico e="🌿" size={17} />
            <span>{t("Temp / Sleep / Weight")}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("recovery")}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold ${mode === "recovery" ? selectedClass : plainClass}`}
          >
            <Ico e="♨️" size={17} />
            <span>{t("Heat / Cold / TENS")}</span>
          </button>
        </div>
      </section>

      <section className="max-w-[270px] space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("Time")}</p>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-2xl" />
      </section>

      {mode === "body" && (
      <section className="border-t border-border pt-4" onFocusCapture={() => setMode("body")}>
        <h3 className="mb-3 text-sm font-bold">{t("If Temp / Sleep / Weight")}</h3>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("New temperature measurement")}</p>
            <div className="relative">
              <Input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="36,6 °C" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
            </div>
            {temperatureEntries.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("Saved temperature measurements")}</p>
                {temperatureEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border/70">
                    <Ico e="🌡️" size={16} />
                    <span className="min-w-0 flex-1 text-xs font-semibold">{String(entry.value).replace(".", ",")} °C</span>
                    {entry.time ? <span className="text-[10px] text-muted-foreground">{entry.time}</span> : null}
                    <button type="button" onClick={() => deleteTemperature(entry.id)} aria-label={t("Delete")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("New weight measurement")}</p>
            <div className="relative">
              <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="62,5 kg" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
            {weightEntries.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("Saved weight measurements")}</p>
                {weightEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border/70">
                    <Ico e="⚖️" size={16} />
                    <span className="min-w-0 flex-1 text-xs font-semibold">{String(entry.value).replace(".", ",")} kg</span>
                    {entry.time ? <span className="text-[10px] text-muted-foreground">{entry.time}</span> : null}
                    <button type="button" onClick={() => deleteWeight(entry.id)} aria-label={t("Delete")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Sleep (hours)")}</p>
            <Input inputMode="decimal" value={sleepHours} onChange={(e) => setSleepHours(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="8" className="h-10 rounded-2xl" />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("How I slept")}</p>
            <div className="flex flex-wrap gap-2">
              {sleepOptions.map(([label, icon]) => {
                const active = sleepQuality.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMode("body");
                      setSleepQuality((current) => active ? current.filter((item) => item !== label) : [...current, label]);
                    }}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${active ? selectedClass : plainClass}`}
                  >
                    <SemanticIco label={t(label)} fallbackEmoji={icon} size={14} />
                    <span>{t(label)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      )}

      {mode === "recovery" && (
      <section className="border-t border-border pt-4" onFocusCapture={() => setMode("recovery")}>
        <h3 className="mb-3 text-sm font-bold">{t("If Heat / Cold / TENS")}</h3>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("Type")}</p>
            <div className="flex flex-wrap gap-2">
              {([ ["heat", "♨️", "Heat"], ["cold", "❄️", "Cold"], ["tens", "⭐", "TENS"] ] as const).map(([value, icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMode("recovery"); setTherapyKind(value); }}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${therapyKind === value && mode === "recovery" ? selectedClass : plainClass}`}
                >
                  <Ico e={icon} size={16} />
                  <span>{t(label)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Start")}</p>
            <Input type="time" value={therapyStart} onChange={(e) => { setMode("recovery"); setTherapyStart(e.target.value); }} className="h-10 rounded-2xl" />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Duration (min)")}</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input type="number" min={0} inputMode="numeric" value={therapyOngoing ? "" : therapyMinutes} onChange={(e) => { setMode("recovery"); setTherapyOngoing(false); setTherapyMinutes(e.target.value); }} className="h-10 rounded-2xl" />
              <button type="button" onClick={() => { setMode("recovery"); setTherapyOngoing((value) => !value); }} className={`rounded-full px-4 text-xs font-semibold ${therapyOngoing ? selectedClass : plainClass}`}>{t("Ongoing")}</button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Note (optional)")}</p>
            <Textarea rows={3} value={therapyNote} onChange={(e) => { setMode("recovery"); setTherapyNote(e.target.value); }} className="rounded-2xl" />
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

const DAY_LEVEL_ADMIN_FEATURES = new Set<RegistryFeatureId>(["period", "temp", "meds", "postpartum"]);

export function LogSheet({
  open,
  onOpenChange,
  date,
  data,
  update,
  initial,
  initialPain,
  editEntry,
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
  const { t } = useI18n();
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const [openToken, setOpenToken] = useState(0);
  useEffect(() => {
    if (open) setOpenToken((t) => t + 1);
  }, [open]);
  const [editingOrder, setEditingOrder] = useState(false);
  const [customEditEntry, setCustomEditEntry] = useState<CustomLogEntry | null | undefined>();
  const close = () => {
    setCat(null);
    setEditingOrder(false);
    setCustomEditEntry(undefined);
    onOpenChange(false);
  };
  const back = () => {
    setCustomEditEntry(undefined);
    if (initial) {
      close();
      return;
    }
    setCat(null);
  };
  const active = cat ?? initial;
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (open && !active) body.dataset.bixboLogMenuOpen = "true";
    else delete body.dataset.bixboLogMenuOpen;
    return () => { delete body.dataset.bixboLogMenuOpen; };
  }, [active, open]);
  // Mirror the iOS visible viewport (keyboard + suggestion + accessory bar) into
  // CSS vars while a full-screen log form is open.
  useKeyboardViewport(open && Boolean(active));
  const edit = editEntry;
  const editSource = edit && typeof edit === "object" ? edit as { id?: unknown; time?: unknown } : null;
  const editSourceId = typeof editSource?.id === "string" ? editSource.id : undefined;
  const editSourceTime = typeof editSource?.time === "string" ? editSource.time : undefined;
  const [adminFieldValues, setAdminFieldValues] = useState<Record<string, CustomLogValue>>({});

  const activeRegistryFeature = active && !active.startsWith("custom:") ? active as RegistryFeatureId : null;
  const draftSourceKey = `${active ?? ""}:${date}:${openToken}`;
  const draftSourceEntryId = useMemo(
    () => globalThis.crypto?.randomUUID?.() ?? `core-entry-${encodeURIComponent(draftSourceKey)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [draftSourceKey],
  );
  const activeSourceEntryId = activeRegistryFeature
    ? editSourceId ?? (DAY_LEVEL_ADMIN_FEATURES.has(activeRegistryFeature) ? `day:${activeRegistryFeature}:${date}` : draftSourceEntryId)
    : draftSourceEntryId;
  const activeAdminFields = activeRegistryFeature ? registryCustomFieldsForFeature(data, activeRegistryFeature) : [];
  useEffect(() => {
    if (!activeRegistryFeature) {
      setAdminFieldValues({});
      return;
    }
    const entries = data.dayLogs[date]?.adminFields?.[activeRegistryFeature] ?? [];
    const linked = entries.find((entry) => entry.sourceEntryId === activeSourceEntryId);
    const legacyByTime = editSourceTime
      ? [...entries].reverse().find((entry) => !entry.sourceEntryId && entry.time === editSourceTime)
      : undefined;
    const legacyDayLevel = DAY_LEVEL_ADMIN_FEATURES.has(activeRegistryFeature)
      ? [...entries].reverse().find((entry) => !entry.sourceEntryId)
      : undefined;
    setAdminFieldValues((linked ?? legacyByTime ?? legacyDayLevel)?.values ?? {});
  }, [active, activeRegistryFeature, activeSourceEntryId, data.dayLogs, date, editSourceTime, openToken]);

  const saveAdminCustomFields = () => {
    if (!activeRegistryFeature || !activeAdminFields.length) return;
    const editableFieldIds = new Set(activeAdminFields.map((field) => field.id));
    update((current) => {
      const day = current.dayLogs[date] ?? {};
      const adminFields = day.adminFields ?? {};
      const existing = adminFields[activeRegistryFeature] ?? [];
      const linkedIndex = existing.findIndex((entry) => entry.sourceEntryId === activeSourceEntryId);
      let legacyIndex = -1;
      if (linkedIndex < 0) {
        for (let index = existing.length - 1; index >= 0; index -= 1) {
          const entry = existing[index];
          const legacyTimeMatch = Boolean(editSourceTime && !entry.sourceEntryId && entry.time === editSourceTime);
          const legacyDayMatch = DAY_LEVEL_ADMIN_FEATURES.has(activeRegistryFeature) && !entry.sourceEntryId;
          if (legacyTimeMatch || legacyDayMatch) {
            legacyIndex = index;
            break;
          }
        }
      }
      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;
      const previousValues = matchIndex >= 0 ? existing[matchIndex]?.values ?? {} : {};
      const values: Record<string, CustomLogValue> = { ...previousValues };
      editableFieldIds.forEach((fieldId) => {
        const value = adminFieldValues[fieldId];
        if (value === "" || value === undefined) delete values[fieldId];
        else values[fieldId] = value;
      });
      let nextEntries = existing;
      if (!Object.keys(values).length) {
        if (matchIndex >= 0) nextEntries = existing.filter((_, index) => index !== matchIndex);
        else return current;
      } else if (matchIndex >= 0) {
        nextEntries = existing.map((entry, index) => index === matchIndex
          ? { ...entry, values, sourceEntryId: activeSourceEntryId }
          : entry);
      } else {
        const entry = {
          id: globalThis.crypto?.randomUUID?.() ?? `admin-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: editSourceTime ?? nowHHMM(),
          values,
          sourceEntryId: activeSourceEntryId,
        };
        nextEntries = [...existing, entry];
      }
      return {
        ...current,
        dayLogs: {
          ...current.dayLogs,
          [date]: {
            ...day,
            adminFields: {
              ...adminFields,
              [activeRegistryFeature]: nextEntries,
            },
          },
        },
      };
    });
  };

  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const postpartumActive = Boolean(data.postpartum?.active);

  const orderedCats = useMemo(() => {
    const saved = data.settings.logOrder ?? [];
    const builtins = CATEGORIES
      .map((category) => {
        const feature = getRegistryFeature(data, category.id as RegistryFeatureId);
        if (category.id === "tetany") {
          return { ...category, label: "Episodes", emoji: "⭐", registryOrder: feature.order };
        }
        if (category.id === "event") {
          return { ...category, label: "Note & plan", emoji: "📝", registryOrder: feature.order };
        }
        return { ...category, label: feature.label, emoji: feature.icon, registryOrder: feature.order };
      })
      .filter((category) => {
        if (category.id === "panic") return false;
        if (category.id === "task" || category.id === "note") return false;
        if (category.id === "heat") return false;
        if (category.id === "tetany") {
          const anyEpisodeEnabled =
            isRegistrySurfaceEnabled(data, "tetany", "log") || isRegistrySurfaceEnabled(data, "panic", "log");
          if (!anyEpisodeEnabled) return false;
        } else if (category.id === "event") {
          const anyNotePlanEnabled =
            isRegistrySurfaceEnabled(data, "event", "log") ||
            isRegistrySurfaceEnabled(data, "task", "log") ||
            isRegistrySurfaceEnabled(data, "note", "log");
          if (!anyNotePlanEnabled) return false;
        } else if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;
        if (category.id === "period" && cycleTrackingHidden) return false;
        if (category.id === "postpartum" && !postpartumActive) return false;
        return true;
      });
    const customs = customLogDefinitions(data).map((definition) => ({
      id: `custom:${definition.id}` as Category,
      label: definition.label,
      emoji: definition.icon,
      hint: "Custom log",
      registryOrder: 1000 + definition.order,
    }));
    const source = [...builtins, ...customs].sort((a, b) => a.registryOrder - b.registryOrder);
    const byId = new Map(source.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: typeof source = [];
    for (const id of saved) {
      const c = byId.get(id as Category);
      if (c && !seen.has(id)) {
        out.push(c);
        seen.add(id);
      }
    }
    for (const c of source) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [cycleTrackingHidden, data, postpartumActive]);

  const [draggingCat, setDraggingCat] = useState<Category | null>(null);
  const draggingCatRef = useRef<Category | null>(null);
  const dragOrderRef = useRef<Category[]>([]);
  const lastDragTargetRef = useRef<Category | null>(null);

  const persistVisibleOrder = (nextVisible: Category[]) => {
    update((d) => {
      const visible = new Set(nextVisible);
      const hiddenSaved = (d.settings.logOrder ?? []).filter((id) => !visible.has(id as Category));
      return {
        ...d,
        settings: {
          ...d.settings,
          logOrder: [...nextVisible, ...hiddenSaved],
        },
      };
    });
  };

  const startDirectReorder = (e: React.PointerEvent<HTMLButtonElement>, id: Category) => {
    if (!editingOrder) return;
    e.preventDefault();
    e.stopPropagation();
    draggingCatRef.current = id;
    dragOrderRef.current = orderedCats.map((c) => c.id);
    lastDragTargetRef.current = id;
    setDraggingCat(id);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is optional on browsers that do not support it.
    }
  };

  const moveDirectReorder = (e: React.PointerEvent<HTMLButtonElement>) => {
    const fromId = draggingCatRef.current;
    if (!editingOrder || !fromId) return;
    e.preventDefault();
    e.stopPropagation();
    const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = hit?.closest<HTMLElement>("[data-log-category]");
    const toId = target?.dataset.logCategory as Category | undefined;
    if (!toId || toId === fromId || toId === lastDragTargetRef.current) return;
    const next = dragOrderRef.current.slice();
    const from = next.indexOf(fromId);
    const to = next.indexOf(toId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    dragOrderRef.current = next;
    lastDragTargetRef.current = toId;
    persistVisibleOrder(next);
  };

  const endDirectReorder = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    draggingCatRef.current = null;
    dragOrderRef.current = [];
    lastDragTargetRef.current = null;
    setDraggingCat(null);
  };

  return (
    <Sheet open={open} onOpenChange={(b) => { if (!b) close(); }}>
      <SheetContent
        side="bottom"
        overlayClassName={active ? undefined : "!bg-transparent !backdrop-blur-none !transition-none data-[state=open]:!animate-none data-[state=closed]:!animate-none"}
        className={
          (active
            ? `fixed !left-0 !right-0 !bottom-auto !top-[var(--bixbo-viewport-offset,0px)] flex !h-[var(--bixbo-viewport-height,100svh)] !max-h-[var(--bixbo-viewport-height,100svh)] !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 bg-background p-0 pt-[env(safe-area-inset-top)] !shadow-none !transition-none !animate-none`
            : "fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100dvh] !max-h-none !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !shadow-none !transition-none data-[state=open]:!animate-none data-[state=closed]:!animate-none") + " [&>button.absolute]:hidden"
        }
      >
        {!active ? (
          <>
            <SheetTitle className="sr-only">{t("Log")}</SheetTitle>
            <div
              data-bixbo-log-menu
              className="pointer-events-auto fixed left-3 right-3 z-20 mx-auto max-w-[365px] rounded-[26px] border border-border/70 bg-background px-3 pb-5 pt-4 shadow-xl dark:bg-surface-elevated"
              style={{ bottom: "calc(92px + env(safe-area-inset-bottom))" }}
            >
              <div className={`grid gap-x-1 gap-y-3 ${orderedCats.length === 9 ? "grid-cols-10" : "grid-cols-5"}`}>
                {orderedCats.map((c, index) => (
                  <button
                    key={c.id}
                    type="button"
                    data-log-category={c.id}
                    onPointerDown={(event) => startDirectReorder(event, c.id)}
                    onPointerMove={moveDirectReorder}
                    onPointerUp={endDirectReorder}
                    onPointerCancel={endDirectReorder}
                    onClick={(event) => {
                      if (editingOrder) { event.preventDefault(); event.stopPropagation(); return; }
                      setCat(c.id);
                    }}
                    aria-label={editingOrder ? `${t("Drag")} ${t(c.label)} ${t("to reorder")}` : `${t("Log")} ${t(c.label)}`}
                    className={`flex min-h-[82px] min-w-0 touch-none select-none flex-col items-center justify-start gap-1.5 rounded-2xl px-0.5 py-1 text-foreground outline-none transition-[background-color,transform,opacity] focus-visible:ring-2 focus-visible:ring-ring ${orderedCats.length === 9 ? "col-span-2" : ""} ${orderedCats.length === 9 && index === 5 ? "col-start-2" : ""} ${editingOrder ? "cursor-grab active:cursor-grabbing" : "active:scale-[0.97]"} ${draggingCat === c.id ? "z-30 scale-[1.03] bg-tint shadow-md" : "hover:bg-tint/60"}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center">
                      <Ico e={c.id === "workout" ? "👟" : c.emoji} size={30} />
                    </span>
                    <span className="min-h-[30px] w-full text-center text-[11px] font-semibold leading-[1.18] text-foreground">
                      {t(c.label)}
                    </span>
                  </button>
                ))}
              </div>

              <span aria-hidden="true" className="pointer-events-none absolute bottom-[-10px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b border-r border-border/70 bg-background dark:bg-surface-elevated" />

              <button
                type="button"
                onClick={() => { endDirectReorder(); setEditingOrder((value) => !value); }}
                aria-label={editingOrder ? t("Finish reordering log categories") : t("Reorder log categories")}
                className="pointer-events-auto absolute -top-10 right-2 grid h-[30px] w-[30px] place-items-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm transition active:scale-95 dark:bg-surface-elevated"
              >
                {editingOrder ? <Check className="h-4 w-4 text-foreground" strokeWidth={2.6} /> : <span className="grid grid-cols-2 gap-[2px]" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <span key={index} className="h-[3px] w-[3px] rounded-full bg-muted-foreground" />)}</span>}
              </button>

              {editingOrder ? (
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border/70 bg-background px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm dark:bg-surface-elevated">
                  {t("Drag items to reorder")}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="h-14 shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 pt-0">
              <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5 shrink-0" /> {t("Back to Log")}</button>
              <SheetTitle className="font-serif text-lg">
                {t(active === "tetany" || active === "panic" ? "Episodes" : active === "event" || active === "task" || active === "note" ? "Note & plan" : orderedCats.find((c) => c.id === active)?.label ?? CATEGORIES.find((c) => c.id === active)?.label ?? "")}
              </SheetTitle>
              <button onClick={close} aria-label={t("Close")} className="rounded-full p-1 hover:bg-tint"><X className="h-5 w-5" /></button>
            </SheetHeader>
            <LogSchemaContext.Provider value={activeRegistryFeature ? {
              data,
              featureId: activeRegistryFeature,
              adminFields: activeAdminFields,
              adminFieldValues,
              setAdminFieldValue: (fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value })),
              saveAdminCustomFields,
              sourceEntryId: activeSourceEntryId,
            } : null}>
            <div key={`${active}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`} data-bixbo-log-surface={active === "pain" ? "pain" : "standard"} className={`min-h-0 flex-1 overflow-y-auto ${active === "pain" ? "" : active === "meds" ? "px-5 pb-4" : "bixbo-unified-log px-4 pb-5 sm:px-5"}`}>
              {active?.startsWith("custom:") && (() => {
                const id = active.slice("custom:".length);
                const definition = customLogDefinitions(data).find((item) => item.id === id);
                if (!definition) return null;
                const savedEntries = data.dayLogs[date]?.customLogs?.[id] ?? [];
                const initialCustomEntry = customEditEntry === null ? undefined : customEditEntry ?? (edit as CustomLogEntry | undefined);
                return (
                  <div className="space-y-4">
                    {savedEntries.length ? (
                      <section className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">
                        <div className="flex items-center justify-between gap-3">
                          <div><p className="text-xs font-bold">{t("Saved entries")}</p><p className="text-[10px] text-muted-foreground">{t("Tap an entry to edit it without creating a duplicate.")}</p></div>
                          {initialCustomEntry ? <button type="button" onClick={() => setCustomEditEntry(null)} className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border">{t("New entry")}</button> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {savedEntries.map((entry, index) => (
                            <div key={entry.id} className="inline-flex items-center gap-1">
                              <button type="button" onClick={() => setCustomEditEntry(entry)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border ${initialCustomEntry?.id === entry.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}><Pencil className="h-3 w-3" />{entry.time || `${t("Entry")} ${index + 1}`}</button>
                              <button type="button" aria-label={`${t("Delete")} ${entry.time || `${t("Entry")} ${index + 1}`}`} onClick={() => {
                                if (!window.confirm(t("Delete this saved entry? Other entries and the selected day will stay unchanged."))) return;
                                update((current) => {
                                  const day = current.dayLogs[date];
                                  if (!day) return current;
                                  const customLogs = { ...(day.customLogs ?? {}) };
                                  const existing = customLogs[id] ?? [];
                                  const nextEntries = existing.filter((saved) => saved.id !== entry.id);
                                  if (nextEntries.length) customLogs[id] = nextEntries; else delete customLogs[id];
                                  return { ...current, dayLogs: { ...current.dayLogs, [date]: { ...day, customLogs } } };
                                });
                                if (initialCustomEntry?.id === entry.id) setCustomEditEntry(null);
                              }} className="grid h-7 w-7 place-items-center rounded-full bg-background text-destructive ring-1 ring-border"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    <CustomLogForm key={`${definition.id}:${initialCustomEntry?.id ?? "new"}`} definition={definition} date={date} data={data} update={update} onDone={close} initialEntry={initialCustomEntry} />
                  </div>
                );
              })()}
              {active === "postpartum" && <PostpartumSymptomsForm date={date} data={data} update={update} onDone={close} />}
              {active === "pain" && <PainWizard date={date} data={data} update={update} onDone={close} initialEntry={initialPain ?? (edit as PainEntry | undefined)} />}
              {(active === "tetany" || active === "panic") && (
                <div className="bixbo-log-flow mx-auto flex w-full max-w-xl flex-col gap-4 py-4">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-tint p-1">
                    {isRegistrySurfaceEnabled(data, "tetany", "log") && <button type="button" onClick={() => setCat("tetany")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active === "tetany" ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-2"><Ico e="⭐" size={18} /> {t("Tetany")}</span></button>}
                    {isRegistrySurfaceEnabled(data, "panic", "log") && <button type="button" onClick={() => setCat("panic")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active === "panic" ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-2"><Ico e="✨" size={18} /> {t("Panic attack")}</span></button>}
                  </div>
                  {active === "panic" ? <PanicForm date={date} data={data} update={update} onDone={close} initialEntry={edit as PanicAttack | undefined} /> : <TetanyForm date={date} data={data} update={update} onDone={close} initialEntry={edit as TetanyEpisode | undefined} />}
                </div>
              )}
              {active === "period" && <PeriodForm date={date} data={data} update={update} onDone={close} />}
              {active === "sex" && <SexForm date={date} data={data} update={update} onDone={close} initialEntry={edit as SexEntry | undefined} />}
              {active === "heat" && <ThermoForm date={date} update={update} onDone={close} initialEntry={edit as ThermoSession | undefined} />}
              {active === "food" && <FoodForm date={date} data={data} update={update} onDone={close} initialEntry={edit as FoodEntry | undefined} />}
              {active === "bowel" && <BowelForm date={date} data={data} update={update} onDone={close} initialEntry={edit as BowelEntry | undefined} />}
              {active === "workout" && <WorkoutForm date={date} data={data} update={update} onDone={close} initialEntry={edit as WorkoutEntry | undefined} />}
              {active === "temp" && <BodyRecoveryForm date={date} data={data} update={update} onDone={close} />}
              {active === "meds" && <MedsForm date={date} data={data} update={update} onDone={close} />}
              {(active === "event" || active === "task" || active === "note") && (
                <div className="bixbo-log-flow mx-auto flex w-full max-w-xl flex-col gap-4 py-4">
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-tint p-1">
                    {isRegistrySurfaceEnabled(data, "event", "log") && <button type="button" onClick={() => setCat("event")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${active === "event" ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Ico e="📅" size={16} /> {t("Event")}</span></button>}
                    {isRegistrySurfaceEnabled(data, "task", "log") && <button type="button" onClick={() => setCat("task")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${active === "task" ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Ico e="✅" size={16} /> {t("To do")}</span></button>}
                    {isRegistrySurfaceEnabled(data, "note", "log") && <button type="button" onClick={() => setCat("note")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${active === "note" ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Ico e="📝" size={16} /> {t("Note")}</span></button>}
                  </div>
                  {active === "event" && <EventForm date={date} update={update} onDone={close} initialEntry={edit as EventEntry | undefined} />}
                  {active === "task" && <TaskForm date={date} update={update} onDone={close} initialEntry={edit as TaskEntry | undefined} />}
                  {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
                </div>
              )}
            </div>
            </LogSchemaContext.Provider>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}