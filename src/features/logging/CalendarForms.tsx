import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { TrText } from "@/features/logging/TrText";
import { useLogSchema } from "@/features/logging/LogSchemaContext";
import { Ico } from "@/components/icons/BixboIcons";
import { POSTPARTUM_SYMPTOMS } from "@/lib/health";
import { getRegistryField } from "@/lib/appRegistry";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EVENT_COLORS,
  updateDayLog,
  type BixboData,
  type EventEntry,
  type TaskEntry,
  type PostpartumDayLog,
} from "@/lib/storage";
import { Chip, Field, RegistryFieldBlock, SaveBar } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";

type PlanType = "note" | "task" | "event";

function PlanTypeSelector({ value, onChange }: { value: PlanType; onChange: (value: PlanType) => void }) {
  const { t } = useI18n();
  const items: { id: PlanType; label: string; icon: string }[] = [
    { id: "note", label: "Note", icon: "📝" },
    { id: "task", label: "Task", icon: "✅" },
    { id: "event", label: "Event", icon: "📅" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{t("Type")}</p>
      <div className="grid grid-cols-3 rounded-[1.65rem] border border-border/70 bg-transparent p-1.5">
        {items.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-[1.35rem] px-2 text-sm font-medium transition-colors ${
                active ? "bg-primary/25 text-foreground" : "text-foreground/80"
              }`}
            >
              <Ico e={item.icon} size={20} />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const [kind, setKind] = useState<PlanType>("event");

  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [color, setColor] = useState(initialEntry?.color ?? EVENT_COLORS[0]);

  const [noteText, setNoteText] = useState("");
  const [noteTime, setNoteTime] = useState("");

  const noteTextPlaceholder = schema
    ? (getRegistryField(schema.data, "note", "text")?.label ?? "Anything about today…")
    : "Anything about today…";

  const isValid = kind === "note" ? Boolean(noteText.trim()) : Boolean(title.trim());

  const save = () => {
    if (!isValid) return;

    if (kind === "note") {
      update((d) => {
        const list = (d.dayNotes[date] ?? []) as (string | { id?: string; text: string; time?: string })[];
        const next = list.map((x) => (typeof x === "string" ? { text: x } : x));
        next.push({
          id: schema?.sourceEntryId,
          text: noteText.trim(),
          time: noteTime || undefined,
        });
        return { ...d, dayNotes: { ...d.dayNotes, [date]: next } };
      });
      onDone();
      return;
    }

    if (kind === "task") {
      const task: TaskEntry = {
        id: schema?.sourceEntryId ?? crypto.randomUUID(),
        title: title.trim(),
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        time: time || undefined,
        timeEnd: timeEnd || undefined,
        done: false,
        note: note.trim() || undefined,
      };
      update((d) => ({ ...d, tasks: [...d.tasks, task] }));
      onDone();
      return;
    }

    const editing = Boolean(initialEntry);
    const event: EventEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      note: note.trim() || undefined,
      color,
    };
    update((d) => ({
      ...d,
      events: editing ? d.events.map((x) => (x.id === event.id ? event : x)) : [...d.events, event],
    }));
    onDone();
  };

  return (
    <div className="flex flex-col gap-4">
      <SaveBar onCancel={onDone} onSave={save} disabled={!isValid} />

      {!initialEntry ? <PlanTypeSelector value={kind} onChange={setKind} /> : null}

      {kind === "note" ? (
        <div className="flex flex-col gap-3">
          <Field label="Time (optional)" schemaFieldId="time">
            <Input type="time" value={noteTime} onChange={(e) => setNoteTime(e.target.value)} />
          </Field>
          <RegistryFieldBlock fieldId="text">
            <Textarea
              rows={6}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t(noteTextPlaceholder)}
            />
          </RegistryFieldBlock>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Field label={kind === "task" ? "Task" : "Title"} schemaFieldId="title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(kind === "task" ? "What to do…" : "e.g. Doctor visit")}
            />
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

          {kind === "event" ? (
            <Field label="Color" schemaFieldId="color">
              <div className="mt-2 flex flex-wrap gap-2.5">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={t("Select color")}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
          ) : null}

          <Field label="Note (optional)" schemaFieldId="note">
            <Textarea rows={kind === "task" ? 4 : 3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      )}
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
    const editing = Boolean(initialEntry);
    const task: TaskEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      done: initialEntry?.done ?? false,
      note: note.trim() || undefined,
    };
    update((d) => ({
      ...d,
      tasks: editing ? d.tasks.map((x) => (x.id === task.id ? task : x)) : [...d.tasks, task],
    }));
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
  const noteTextPlaceholder = schema
    ? (getRegistryField(schema.data, schema.featureId, "text")?.label ?? "Anything about today…")
    : "Anything about today…";
  const [text, setText] = useState("");
  const [time, setTime] = useState("");

  const save = () => {
    if (!text.trim()) return;
    update((d) => {
      const list = (d.dayNotes[date] ?? []) as (string | { id?: string; text: string; time?: string })[];
      const next: { id?: string; text: string; time?: string }[] = list.map((x) =>
        typeof x === "string" ? { text: x } : x,
      );
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
              <Chip key={symptom} active={symptoms.includes(symptom)} onClick={() => toggleSymptom(symptom)}>
                <TrText value={symptom} />
              </Chip>
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
            update((currentData) => {
              const dayLog = currentData.dayLogs[date] ?? {};
              const adminFields = { ...(dayLog.adminFields ?? {}) };
              const postpartumAdmin = adminFields.postpartum ?? [];
              const nextPostpartumAdmin = postpartumAdmin.filter(
                (entry) => entry.sourceEntryId !== `day:postpartum:${date}`,
              );
              if (nextPostpartumAdmin.length) adminFields.postpartum = nextPostpartumAdmin;
              else delete adminFields.postpartum;
              return {
                ...currentData,
                dayLogs: {
                  ...currentData.dayLogs,
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
