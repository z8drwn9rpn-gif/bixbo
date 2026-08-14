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
import { Chip, Field, RegistryFieldBlock, SaveBar } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";

export function EventForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: EventEntry;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [color, setColor] = useState(initialEntry?.color ?? EVENT_COLORS[0]);
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const e: EventEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      note: note.trim() || undefined,
      color,
    };
    update((d) => ({ ...d, events: editing ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
      <Field label="Title" schemaFieldId="title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. Doctor visit")} />
      </Field>
      <RegistryFieldBlock fieldId="dates">
      <div className="grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0">
        <Field label="From">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      </RegistryFieldBlock>
      <RegistryFieldBlock fieldId="times">
      <div className="grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0">
        <Field label="Time from">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Time to">
          <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      </RegistryFieldBlock>
      <Field label="Color" schemaFieldId="color">
        <div className="mt-2 flex gap-2 flex-wrap">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

export function TaskForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: TaskEntry;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const t: TaskEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      done: initialEntry?.done ?? false,
      note: note.trim() || undefined,
    };
    update((d) => ({ ...d, tasks: editing ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [...d.tasks, t] }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
      <Field label="Task" schemaFieldId="title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("What to do…")} />
      </Field>
      <RegistryFieldBlock fieldId="dates">
      <div className="grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0">
        <Field label="From">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      </RegistryFieldBlock>
      <RegistryFieldBlock fieldId="times">
      <div className="grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0">
        <Field label="Time from">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Time to">
          <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      </RegistryFieldBlock>
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

export function NoteForm({ date, update, onDone }: { date: string; update: UpdateFn; onDone: () => void }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const noteTextPlaceholder = schema ? (getRegistryField(schema.data, schema.featureId, "text")?.label ?? "Anything about today…") : "Anything about today…";
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const save = () => {
    if (!text.trim()) return;
    update((d) => {
      const list = (d.dayNotes[date] ?? []) as (string | { id?: string; text: string; time?: string })[];
      const next: { id?: string; text: string; time?: string }[] = list.map((x) => (typeof x === "string" ? { text: x } : x));
      next.push({ id: schema?.sourceEntryId, text: text.trim(), time: time || undefined });
      return { ...d, dayNotes: { ...d.dayNotes, [date]: next } };
    });
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!text.trim()} />
      <div className="flex flex-col gap-3">
      <Field label="Time (optional)" schemaFieldId="time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <RegistryFieldBlock fieldId="text">
        <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={t(noteTextPlaceholder)} />
      </RegistryFieldBlock>
      </div>
    </div>
  );
}

export function PostpartumSymptomsForm({
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
  const current: PostpartumDayLog = data.dayLogs[date]?.postpartum ?? {};
  const [symptoms, setSymptoms] = useState<string[]>(current.symptoms ?? []);
  const [note, setNote] = useState(current.note ?? "");

  const toggleSymptom = (symptom: string) => {
    setSymptoms((currentSymptoms) =>
      currentSymptoms.includes(symptom)
        ? currentSymptoms.filter((item) => item !== symptom)
        : [...currentSymptoms, symptom],
    );
  };

  const save = () => {
    updateDayLog(update, date, (dayLog) => ({
      ...dayLog,
      postpartum: {
        ...(dayLog.postpartum ?? {}),
        symptoms: symptoms.length ? symptoms : undefined,
        note: note.trim() || undefined,
      },
    }));

    onDone();
  };

  return (
    <div className="flex flex-col gap-5">
      <SaveBar onCancel={onDone} onSave={save} />
      <div className="flex items-start gap-3 rounded-3xl bg-tint p-4 ring-1 ring-border/50">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/50">
          <Ico e="🤱" size={30} />
        </span>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("Postpartum recovery")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("Select every symptom you experienced today.")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
      <Field label={t("Symptoms today")} schemaFieldId="symptoms">
        <div className="mt-2 flex flex-wrap gap-2">
          {POSTPARTUM_SYMPTOMS.map((symptom) => (
            <Chip key={symptom} active={symptoms.includes(symptom)} onClick={() => toggleSymptom(symptom)}><TrText value={symptom} /></Chip>
          ))}
        </div>
      </Field>

      <Field label={t("Recovery note (optional)")} schemaFieldId="note">
        <Textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("Add anything important about recovery, bleeding, feeding or how you feel.")}
        />
      </Field>
      </div>

      {current.symptoms?.length || current.note ? (
        <button
          type="button"
          onClick={() => {
            update((current) => {
              const dayLog = current.dayLogs[date] ?? {};
              const adminFields = { ...(dayLog.adminFields ?? {}) };
              const postpartumAdmin = adminFields.postpartum ?? [];
              const nextPostpartumAdmin = postpartumAdmin.filter((entry) => entry.sourceEntryId !== `day:postpartum:${date}`);
              if (nextPostpartumAdmin.length) adminFields.postpartum = nextPostpartumAdmin;
              else delete adminFields.postpartum;
              return {
                ...current,
                dayLogs: {
                  ...current.dayLogs,
                  [date]: {
                    ...dayLog,
                    postpartum: {
                      ...(dayLog.postpartum ?? {}),
                      symptoms: undefined,
                      note: undefined,
                    },
                    adminFields: Object.keys(adminFields).length ? adminFields : undefined,
                  },
                },
              };
            });
            onDone();
          }}
          className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30"
        >
          Clear postpartum symptoms
        </button>
      ) : null}
    </div>
  );
}
