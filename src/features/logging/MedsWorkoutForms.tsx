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

export function MedsForm({
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
  const meds = data.meds;
  const taken = data.medLog[date] ?? {};
  const takenTimes = data.medLogTimes?.[date] ?? {};
  const medNotes = data.medLogNotes?.[date] ?? {};
  const medItems = data.medLogItems?.[date] ?? {};
  const [editingScheduledKey, setEditingScheduledKey] = useState<string | null>(null);
  const setMedNote = (key: string, note: string) =>
    update((d) => {
      const notes = { ...(d.medLogNotes?.[date] ?? {}) };
      const clean = note.trimStart();
      if (clean) notes[key] = clean;
      else delete notes[key];
      return { ...d, medLogNotes: { ...(d.medLogNotes ?? {}), [date]: notes } };
    });
  const toggle = (key: string, defaultTime?: string) =>
    update((d) => {
      const day = { ...(d.medLog[date] ?? {}) };
      const times = { ...(d.medLogTimes?.[date] ?? {}) };
      const nextOn = !day[key];
      day[key] = nextOn;
      if (nextOn && defaultTime && !times[key]) times[key] = defaultTime;
      if (!nextOn) delete times[key];
      return { ...d, medLog: { ...d.medLog, [date]: day }, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
    });
  const setTakenTime = (key: string, time: string) =>
    update((d) => {
      const times = { ...(d.medLogTimes?.[date] ?? {}) };
      times[key] = time;
      return { ...d, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
    });

  const [extraName, setExtraName] = useState("");
  const [extraDose, setExtraDose] = useState("");
  const [extraTime, setExtraTime] = useState(nowHHMM());
  const [extraNote, setExtraNote] = useState("");
  const addExtra = () => {
    if (!extraName.trim()) return;
    const e: ExtraMed = {
      id: crypto.randomUUID(),
      time: extraTime,
      name: extraName.trim(),
      dose: extraDose.trim() || undefined,
      note: extraNote.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({ ...l, extraMeds: [...(l.extraMeds ?? []), e] }));
    setExtraName("");
    setExtraDose("");
    setExtraNote("");
    setExtraTime(nowHHMM());
  };
  const today = date === todayKey();
  const extras = data.dayLogs[date]?.extraMeds ?? [];
  const scheduledField = getRegistryField(data, "meds", "scheduled");
  const extraDoseField = getRegistryField(data, "meds", "extraDose");
  const dateLabel = today ? t("Today") : date;
  const scheduledHeading = scheduledField?.label && scheduledField.label !== "Scheduled meds"
    ? `${t(scheduledField.label)} · ${dateLabel}`
    : dateLabel;
  const extraDoseHeading = t(extraDoseField?.label ?? "Extra dose (one-off)");

  return (
    <div className="flex flex-col gap-4">
      <SaveBar onCancel={onDone} onSave={() => { schema?.saveAdminCustomFields(); onDone(); }} />
      <div className="flex flex-col gap-4">
      <RegistryFieldBlock fieldId="scheduled">
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No medications yet. Add them from Meds settings.")}</p>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{scheduledHeading}</p>
          <div className="mt-2 space-y-2">
            {meds.map((m) =>
              m.asNeeded ? (
                <label key={m.id} className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 ring-1 ring-border">
                  <input
                    type="checkbox"
                    checked={!!taken[`${m.id}@asneeded`]}
                    onChange={() => toggle(`${m.id}@asneeded`, nowHHMM())}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight">{m.name}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{t("As needed")}{m.dose ? ` · ${m.dose}` : ""}</p>
                    {m.note && (
                      <p className="text-[11px] text-muted-foreground">
                        <Ico e="📝" size={13} /> <IcoText text={m.note} size={12} />
                      </p>
                    )}
                  </div>
                  {taken[`${m.id}@asneeded`] && (
                    <Input
                      type="time"
                      value={takenTimes[`${m.id}@asneeded`] ?? nowHHMM()}
                      onChange={(e) => setTakenTime(`${m.id}@asneeded`, e.target.value)}
                      className="h-7 w-20 px-2 text-xs"
                    />
                  )}
                  <Input
                    value={medNotes[`${m.id}@asneeded`] ?? ""}
                    onChange={(e) => setMedNote(`${m.id}@asneeded`, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t("Note (optional)")}
                    className="h-7 min-w-0 flex-[0_1_125px] px-2 text-xs"
                  />
                </label>
              ) : (
                m.times.map((scheduledTime) => {
                  const k = `${m.id}@${scheduledTime}`;
                  const isTaken = !!taken[k];
                  const items = medScheduleItems(m);
                  const grouped = items.length > 1;
                  const selectedItems = medItems[k] ?? (isTaken ? items : []);
                  const partial = grouped && selectedItems.length > 0 && selectedItems.length < items.length;
                  return (
                    <div key={k} className="rounded-xl bg-surface px-2.5 py-2 ring-1 ring-border">
                      <div className="flex items-center gap-2">
                        {grouped ? (
                          <button type="button" onClick={() => setEditingScheduledKey(editingScheduledKey === k ? null : k)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold ${selectedItems.length ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                            {selectedItems.length === items.length ? "✓" : selectedItems.length ? "–" : ""}
                          </button>
                        ) : (
                          <input type="checkbox" checked={isTaken} onChange={() => toggle(k, nowHHMM())} className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <button type="button" onClick={() => grouped && setEditingScheduledKey(editingScheduledKey === k ? null : k)} className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-medium leading-tight">{m.name} <span className="text-[10px] font-normal text-muted-foreground">· scheduled {scheduledTime}</span></p>
                          {grouped && selectedItems.length > 0 && <p className="mt-0.5 text-[10px] leading-tight text-primary">{partial ? `${t("Taken")}: ${selectedItems.join(", ")}` : t("All taken")}</p>}
                          {m.dose && <p className="text-[10px] leading-tight text-muted-foreground">{m.dose}</p>}
                        </button>
                        {isTaken && <Input type="time" value={takenTimes[k] ?? scheduledTime} onChange={(e) => setTakenTime(k, e.target.value)} className="h-7 w-20 px-2 text-xs" title={t("Actual time taken")} />}
                      </div>
                      {grouped && editingScheduledKey === k ? (
                        <div className="mt-2 rounded-xl bg-tint/70 p-2 ring-1 ring-border/60">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("What did you take?")}</p>
                          <div className="space-y-1">
                            {items.map((item) => {
                              const checked = selectedItems.includes(item);
                              return (
                                <label key={item} className="flex items-center gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-xs">
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked ? selectedItems.filter((x) => x !== item) : [...selectedItems, item];
                                    update((d) => {
                                      const day = { ...(d.medLog[date] ?? {}) };
                                      const allItems = { ...(d.medLogItems?.[date] ?? {}) };
                                      const times = { ...(d.medLogTimes?.[date] ?? {}) };
                                      if (next.length) { day[k] = true; allItems[k] = next; if (!times[k]) times[k] = nowHHMM(); }
                                      else { delete day[k]; delete allItems[k]; delete times[k]; }
                                      return { ...d, medLog: { ...d.medLog, [date]: day }, medLogItems: { ...(d.medLogItems ?? {}), [date]: allItems }, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
                                    });
                                  }} className="h-3.5 w-3.5" />
                                  <span>{item}</span>
                                </label>
                              );
                            })}
                          </div>
                          <Input value={medNotes[k] ?? ""} onChange={(e) => setMedNote(k, e.target.value)} placeholder={t("Note (optional)")} className="mt-2 h-7 px-2 text-xs" />
                          <button type="button" onClick={() => setEditingScheduledKey(null)} className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{t("Done")}</button>
                        </div>
                      ) : !grouped ? (
                        <Input value={medNotes[k] ?? ""} onChange={(e) => setMedNote(k, e.target.value)} placeholder={t("Note (optional)")} className="mt-1.5 h-7 px-2 text-xs" />
                      ) : null}
                    </div>
                  );
                })
              ),
            )}
          </div>
        </div>
      )}
      </RegistryFieldBlock>
      <RegistryFieldBlock fieldId="extraDose">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{extraDoseHeading}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input
            placeholder={t("Name")}
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className="col-span-2"
          />
          <Input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input placeholder={t("Dose (optional)")} value={extraDose} onChange={(e) => setExtraDose(e.target.value)} />
          <Input placeholder={t("Note (optional)")} value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
        </div>
        <Button className="mt-2 w-full" onClick={addExtra} disabled={!extraName.trim()}>
          {t("Add extra dose")}
        </Button>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {extras.map((e) => (
              <li key={e.id}>
                • {e.time} — {e.name}
                {e.dose ? ` (${e.dose})` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      </RegistryFieldBlock>
      </div>
    </div>
  );
}

export function WorkoutForm({
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
  initialEntry?: WorkoutEntry;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [kind, setKind] = useState<string>(
    initialEntry?.kind ? stripEmoji(initialEntry.kind) : WORKOUT_KINDS_DEFAULT[0],
  );
  const [minutes, setMinutes] = useState<number>(initialEntry?.minutes ?? 30);
  const [weight, setWeight] = useState<string>(initialEntry?.weightKg != null ? String(initialEntry.weightKg) : "");
  const [distance, setDistance] = useState<string>(
    initialEntry?.distanceKm != null ? String(initialEntry.distanceKm) : "",
  );
  const [elevation, setElevation] = useState<string>(
    initialEntry?.elevationM != null ? String(initialEntry.elevationM) : "",
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialEntry?.exercises ?? []);
  const [rpe, setRpe] = useState<number | undefined>(initialEntry?.rpe);
  const [magnesium, setMagnesium] = useState<boolean>(initialEntry?.magnesiumBefore ?? false);
  const [trigger, setTrigger] = useState<WorkoutEntry["triggeredSymptom"]>(initialEntry?.triggeredSymptom);
  const [feeling, setFeeling] = useState<string[]>(asArr(initialEntry?.feeling).map(stripEmoji));
  const [note, setNote] = useState<string>(initialEntry?.note ?? "");
  const addKind = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: [...d.custom.workoutKinds, v] } }));
  const rmKind = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: d.custom.workoutKinds.filter((x) => x !== v) } }));
    if (kind === v) setKind(WORKOUT_KINDS_DEFAULT[0]);
  };

  const log = data.dayLogs[date];
  const symptomOptions = [
    ...(log?.tetany ?? []).map((t) => ({
      type: "tetany" as const,
      id: t.id,
      label: `${t.time} tetany ${t.intensity}/5`,
    })),
    ...(log?.pain ?? []).map((p) => ({ type: "pain" as const, id: p.id, label: `${p.time} pain ${p.score}/10` })),
  ];

  const save = () => {
    const editing = !!initialEntry;
    const e: WorkoutEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time: initialEntry?.time ?? nowHHMM(),
      kind,
      minutes,
      weightKg: weight === "" ? undefined : Number(weight),
      distanceKm: workoutHasDistance(kind) && distance !== "" ? Number(distance) : undefined,
      elevationM: workoutIsHike(kind) && elevation !== "" ? Number(elevation) : undefined,
      exercises: workoutIsStrength(kind) && exercises.length ? exercises : undefined,
      rpe,
      magnesiumBefore: magnesium || undefined,
      triggeredSymptom: trigger,
      feeling: feeling.length ? feeling : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      workout: editing ? (l.workout ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.workout ?? []), e],
    }));
    // NOTE: workout "weight after" is stored on the workout entry only — it must not
    // overwrite the day's body-weight metric used by the Weight chart.
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Type" schemaFieldId="kind">
        <CustomChipList
          base={WORKOUT_KINDS_DEFAULT}
          custom={data.custom.workoutKinds}
          onAddCustom={addKind}
          onRemoveCustom={rmKind}
          selected={[kind]}
          onToggle={(v) => setKind(v)}
        />
      </Field>
      <Field label="Duration (minutes)" schemaFieldId="minutes">
        <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </Field>

      {workoutHasDistance(kind) && (
        <RegistryFieldBlock fieldId="distance">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Distance (km)">
            <Input type="number" step="0.1" min={0} value={distance} onChange={(e) => setDistance(e.target.value)} />
          </Field>
          {workoutIsHike(kind) && (
            <Field label="Elevation gain (m)">
              <Input type="number" step="1" min={0} value={elevation} onChange={(e) => setElevation(e.target.value)} />
            </Field>
          )}
        </div>
        </RegistryFieldBlock>
      )}

      {workoutIsStrength(kind) && (
        <Field label="Exercises" schemaFieldId="exercises">
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={ex.id} className="rounded-2xl border border-border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={ex.name}
                    placeholder={t("Exercise name")}
                    onChange={(e) =>
                      setExercises((a) => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    aria-label={t("Remove exercise")}
                    onClick={() => setExercises((a) => a.filter((_, j) => j !== i))}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder={t("Sets")}
                    value={ex.sets ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, sets: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder={t("Reps")}
                    value={ex.reps ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, reps: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder={t("kg")}
                    value={ex.weightKg ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, weightKg: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExercises((a) => [...a, { id: crypto.randomUUID(), name: "" }])}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /><TrText value="Add exercise" /></Button>
          </div>
        </Field>
      )}

      <Field label={`${t("Intensity (RPE)")} ${rpe ?? "—"} / 10`} schemaFieldId="rpe">
        <div className="mt-2 flex flex-nowrap items-center justify-center gap-0.5 px-0">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const active = rpe === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(rpe === n ? undefined : n)}
                aria-label={`RPE ${n}`}
                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${
                  active ? "text-white ring-2 ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Magnesium before workout?" schemaFieldId="magnesiumBefore">
        <div className="mt-1 flex gap-2">
          <Chip active={!magnesium} onClick={() => setMagnesium(false)}>
            No
          </Chip>
          <Chip active={magnesium} onClick={() => setMagnesium(true)}>
            Yes
          </Chip>
        </div>
      </Field>

      <Field label="Triggered a symptom? (optional)" schemaFieldId="triggeredSymptom">
        {symptomOptions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">{t("No tetany or pain entries logged for this day yet.")}</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            <Chip active={!trigger} onClick={() => setTrigger(undefined)}>
              No
            </Chip>
            {symptomOptions.map((o) => (
              <Chip
                key={o.id}
                active={trigger?.id === o.id}
                onClick={() =>
                  setTrigger(trigger?.id === o.id ? undefined : { type: o.type, id: o.id, label: o.label })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field label="Weight after (kg, optional)" schemaFieldId="weightKg">
        <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("Saved with this workout only — it doesn't change your daily weight.")}
        </p>
      </Field>
      <Field label="How you feel" schemaFieldId="feel">
        <div className="mt-2 flex flex-wrap gap-2">
          {["Great", "Good", "Ok", "Tired", "Sore"].map((f) => (
            <Chip key={f} active={feeling.includes(f)} onClick={() => setFeeling((a) => toggleIn(a, f))}>
              {f}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}
