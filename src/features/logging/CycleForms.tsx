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
import { Chip, CustomChipList, DurationField, Field, IntensityScale, SaveBar, toggleIn } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";

export function PeriodForm({
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
  const cur = data.dayLogs[date]?.periodInfo;
  const [level, setLevel] = useState<PeriodLevel>(cur?.level ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");
  const [cramps, setCramps] = useState<number | undefined>(cur?.cramps == null ? undefined : Math.max(1, Math.min(10, Math.round(cur.cramps))));
  const painDesc = getScaleDesc(data, "pain");

  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: level || undefined,
      periodInfo: {
        level,
        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        note: note.trim() || undefined,
        cramps,
      },
    }));
    onDone();
  };
  const LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
    { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
    { v: "light", label: "Light", color: "var(--period-light)" },
    { v: "medium", label: "Medium", color: "var(--period-medium)" },
    { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
    { v: "very-heavy", label: "Very heavy", color: "var(--period-veryheavy)" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Flow" schemaFieldId="flow">
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {LEVELS.map((L) => (
            <button
              key={L.v}
              onClick={() => setLevel(L.v)}
              className={`rounded-2xl p-2 text-[11px] font-medium ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`}
              style={level === L.v ? { background: L.color } : undefined}
            >
              {t(L.label)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`} schemaFieldId="cramps">
        <IntensityScale
          value={cramps ?? -1}
          onChange={(n) => setCramps(cramps === n ? undefined : n)}
          max={10}
          from={1}
          step={1}
          descriptions={painDesc}
          legendTitle="Cramp pain scale"
          compactSingleRow
          schemaFieldId="cramps"
        />
      </Field>
      <Field label="Discharge (optional)" schemaFieldId="discharge">
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => (
            <Chip
              key={d.value}
              active={discharge === d.value}
              onClick={() => setDischarge(discharge === d.value ? "" : d.value)}
              color={d.color}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Discharge note (optional)" schemaFieldId="dischargeNote">
        <Input value={dNote} onChange={(e) => setDNote(e.target.value)} />
      </Field>
      <Field label="Day note (optional)" schemaFieldId="note">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Birth control since (optional)" schemaFieldId="birthControlSince">
        <Input
          type="date"
          value={data.settings.birthControlSince ?? ""}
          onChange={(e) =>
            update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))
          }
        />
        {data.settings.birthControlSince && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Taking birth control since {data.settings.birthControlSince}
          </p>
        )}
      </Field>
      <div className="rounded-2xl bg-tint p-3 text-[11px] leading-relaxed text-muted-foreground">
        Cycle prediction is based on your last period and cycle length (edit in Settings later).
      </div>
      {cur && (
        <button
          type="button"
          onClick={() => {
            update((current) => {
              const day = current.dayLogs[date] ?? {};
              const { period: _p, periodInfo: _pi, ...rest } = day;
              void _p;
              void _pi;
              const adminFields = { ...(rest.adminFields ?? {}) };
              const periodAdmin = adminFields.period ?? [];
              const nextPeriodAdmin = periodAdmin.filter((entry) => entry.sourceEntryId !== `day:period:${date}`);
              if (nextPeriodAdmin.length) adminFields.period = nextPeriodAdmin;
              else delete adminFields.period;
              return {
                ...current,
                dayLogs: {
                  ...current.dayLogs,
                  [date]: { ...rest, adminFields: Object.keys(adminFields).length ? adminFields : undefined },
                },
              };
            });
            onDone();
          }}
          className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30"
        >
          Delete Blueberry entry
        </button>
      )}
      <Field label="Pregnant?" schemaFieldId="pregnant">
        <div className="mt-1 flex gap-2">
          <Chip
            active={!data.pregnancy?.active}
            onClick={() =>
              update((d) => ({
                ...d,
                pregnancy: {
                  ...(d.pregnancy ?? { active: false, hospitalBag: [], vaccinations: [], supplements: [], appointments: [] }),
                  active: false,
                  endedAt: d.pregnancy?.active ? todayKey() : d.pregnancy?.endedAt,
                },
                settings: { ...d.settings, pregnantSince: undefined },
              }))
            }
          >
            No
          </Chip>
          <Chip
            active={!!data.pregnancy?.active}
            onClick={() =>
              update((d) => ({
                ...d,
                pregnancy: {
                  ...(d.pregnancy ?? { active: false, hospitalBag: [], vaccinations: [], supplements: [], appointments: [] }),
                  active: true,
                  lmp: d.pregnancy?.lmp,
                  endedAt: undefined,
                },
                postpartum: {
                  ...(d.postpartum ?? { active: false, visits: [] }),
                  active: false,
                  endedAt: d.postpartum?.active ? (d.postpartum.endedAt ?? todayKey()) : d.postpartum?.endedAt,
                },
                settings: { ...d.settings, pregnantSince: undefined },
              }))
            }
          >
            Yes
          </Chip>
        </div>
        {data.pregnancy?.active && (
          <div className="mt-2">
            <span className="text-xs font-medium text-muted-foreground">{t("First day of last menstrual period")}</span>
            <Input
              type="date"
              className="mt-1"
              value={data.pregnancy?.lmp ?? ""}
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  pregnancy: {
                    ...(d.pregnancy ?? { active: true, hospitalBag: [], vaccinations: [], supplements: [], appointments: [] }),
                    active: true,
                    lmp: e.target.value || undefined,
                    endedAt: undefined,
                  },
                  settings: { ...d.settings, pregnantSince: undefined },
                }))
              }
            />
            {(() => {
              const p = pregnancyInfo(data.pregnancy?.lmp);
              return p ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Week {p.week} · Trimester {p.trimester} — cycle predictions are paused.
                </p>
              ) : null;
            })()}
          </div>
        )}
      </Field>
    </div>
  );
}

export function SexForm({
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
  initialEntry?: SexEntry;
}) {
  const schema = useLogSchema();
  const [kind, setKind] = useState<SexKind>(initialEntry?.kind ?? "sex");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initialEntry?.feelingAfter));
  const [painful, setPainful] = useState<PainfulWhen>(initialEntry?.painful ?? "no");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addCustom = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, sexTypes: [...d.custom.sexTypes, v] } }));
  const rmCustom = (v: string) => {
    if (!confirm(`Remove "${v}" from your list?`)) return;
    update((d) => ({ ...d, custom: { ...d.custom, sexTypes: d.custom.sexTypes.filter((x) => x !== v) } }));
    if (kind === (`other:${v}` as SexKind)) setKind("sex");
  };
  const custom = data.custom.sexTypes;
  const save = () => {
    const editing = !!initialEntry;
    const e: SexEntry = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time,
      kind,
      feelingAfter: feelingAfter.length ? feelingAfter : undefined,
      painful,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      sex: editing ? (l.sex ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.sex ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time" schemaFieldId="time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Type" schemaFieldId="type">
        <div className="mt-2 flex flex-wrap gap-2">
          {SEX_TYPES_DEFAULT.map((o) => (
            <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>
              {o.label}
            </Chip>
          ))}
          {custom.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <Chip active={kind === (`other:${c}` as SexKind)} onClick={() => setKind(`other:${c}` as SexKind)}>
                {c}
              </Chip>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rmCustom(c);
                }}
                aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline onAdd={addCustom} />
        </div>
      </Field>
      <Field label="How I feel after" schemaFieldId="feelingAfter">
        <CustomChipList
          base={SEX_FEELINGS_DEFAULT}
          custom={data.custom.sexFeelings ?? []}
          onAddCustom={(v) =>
            update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: [...(d.custom.sexFeelings ?? []), v] } }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).filter((x) => x !== v) },
            }));
            setFeelingAfter((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).map((x) => (x === o ? n : x)) },
            }));
            setFeelingAfter((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={feelingAfter}
          onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))}
          schemaFieldId="feelingAfter"
        />
      </Field>
      <Field label="Painful?" schemaFieldId="painful">
        <div className="mt-2 flex gap-2">
          {(["no", "before", "during", "after"] as const).map((v) => (
            <Chip key={v} active={painful === v} onClick={() => setPainful(v)}>
              {v}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

export function AddCustomInline({ onAdd }: { onAdd: (v: string) => void }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  if (!adding)
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground"
      >
        <Plus className="h-3 w-3" /> {t("Add")}
      </button>
    );
  const commit = () => {
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
      setAdding(false);
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-8 w-32"
        placeholder={t("Custom…")}
        autoFocus
      />
      <Button type="button" size="sm" onClick={commit}>
        {t("Add")}
      </Button>
    </div>
  );
}

export function ThermoForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: ThermoSession;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [kind, setKind] = useState<ThermoKind>(initialEntry?.kind ?? "heat");
  const [start, setStart] = useState(initialEntry?.start ?? nowHHMM());
  const [minutes, setMinutes] = useState<string>(
    initialEntry ? (initialEntry.minutes != null ? String(initialEntry.minutes) : "") : "20",
  );
  const [ongoing, setOngoing] = useState(!!initialEntry?.ongoing);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    const editing = !!initialEntry;
    const mins = ongoing ? 0 : minutes === "" ? 0 : Number(minutes);
    const e: ThermoSession = {
      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      kind,
      start,
      minutes: mins,
      ongoing: ongoing || undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      heat: editing ? (l.heat ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.heat ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Type" schemaFieldId="type">
        <div className="mt-2 flex gap-2">
          <Chip active={kind === "heat"} onClick={() => setKind("heat")}>
            <Ico e="♨️" size={16} /> {t("Heat")}
          </Chip>
          <Chip active={kind === "cold"} onClick={() => setKind("cold")}>
            <Ico e="🧊" size={16} /> {t("Cold")}
          </Chip>
          <Chip active={kind === "tens"} onClick={() => setKind("tens")}>
            <Ico e="⭐" size={16} /> {t("TENS")}
          </Chip>
        </div>
      </Field>
      <Field label="Start" schemaFieldId="start">
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
      </Field>
      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />
      <Field label="Note (optional)" schemaFieldId="note">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}
