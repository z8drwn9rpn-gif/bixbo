import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_ACCOUNT_PRIVACY_PREFS,
  DEFAULT_BACKUP_PREFS,
  DEFAULT_TRACKING_PREFS,
  DEFAULT_UNIT_PREFS,
  settingsFromLegacyHealthPreferences,
  type AccountPrivacyPreferences,
  type BackupPreferences,
  type TrackingPreferences,
  type UnitPreferences,
} from "../preferences";
import type { PeriodLevel } from "../domain/cycle";
import type { ArchivedPatternTreatment, BixboData, ChecklistItem, CustomLists, CustomQuickTag, CyclePrefs, DayLog, Diagnosis, DocEntry, EventEntry, HealthProfile, LabResult, Med, Note, NoteFolder, NotificationPrefs, PatternPersistenceState, PatternTreatment, PatternTreatmentKind, PatternTreatmentResult, PostpartumDayLog, PostpartumState, PregnancyAppointment, PregnancyState, Settings, SexKind, SyncMetadata, TaskEntry, Todo, VitalMeasurement } from "./types";
import { DEFAULT_FOLDERS, EMPTY } from "./defaults";

export type VitalField = "weightEntries" | "temperatureEntries";

export function normalizeVitalEntries(raw: unknown, dateKey: string, kind: "weight" | "temperature"): VitalMeasurement[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index): VitalMeasurement | null => {
      if (!item || typeof item !== "object") return null;

      const source = item as Partial<VitalMeasurement>;
      const value = Number(source.value);

      if (!Number.isFinite(value)) return null;

      return {
        id: typeof source.id === "string" && source.id.trim() ? source.id : `${dateKey}-${kind}-${index}`,
        time: typeof source.time === "string" && /^\d{2}:\d{2}$/.test(source.time) ? source.time : "00:00",
        value,
      };
    })
    .filter((entry): entry is VitalMeasurement => entry != null)
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
}

export function latestVitalValue(entries?: VitalMeasurement[]): number | undefined {
  if (!entries?.length) return undefined;

  const sorted = entries
    .filter((entry) => Number.isFinite(entry.value))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

  return sorted.length ? sorted[sorted.length - 1].value : undefined;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function safeRecord<T extends Record<string, unknown> = Record<string, unknown>>(value: unknown): T {
  return (isPlainRecord(value) ? value : {}) as T;
}

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function safeIdArray<T extends { id: string }>(value: unknown): T[] {
  return safeArray<unknown>(value).filter(
    (item): item is T => isPlainRecord(item) && typeof item.id === "string" && item.id.trim().length > 0,
  );
}

export const PATTERN_TREATMENT_KINDS = new Set<PatternTreatmentKind>([
  "medication",
  "supplement",
  "diet",
  "therapy",
  "exercise",
  "other",
]);

export const PATTERN_TREATMENT_RESULTS = new Set<PatternTreatmentResult>([
  "pain",
  "panicEpisodes",
  "tetanyEpisodes",
  "headache",
  "hotFlashes",
  "panicIntensity",
  "tetanyIntensity",
  "negativeMood",
]);

export function normalizePatternTreatment(value: unknown): PatternTreatment | undefined {
  if (!isPlainRecord(value)) return undefined;
  const kind = PATTERN_TREATMENT_KINDS.has(value.kind as PatternTreatmentKind)
    ? (value.kind as PatternTreatmentKind)
    : "medication";
  const result = PATTERN_TREATMENT_RESULTS.has(value.result as PatternTreatmentResult)
    ? (value.result as PatternTreatmentResult)
    : "pain";

  const date = typeof value.date === "string" ? value.date : "";
  const name = typeof value.name === "string" ? value.name : "";
  const notes = typeof value.notes === "string" ? value.notes : "";
  const custom = Boolean(value.custom);

  // A completely empty object is not an active treatment.
  if (!date && !name.trim() && !notes.trim()) return undefined;
  return { date, name, kind, result, notes, custom };
}

export function normalizeArchivedPatternTreatment(value: unknown): ArchivedPatternTreatment | null {
  if (!isPlainRecord(value) || typeof value.id !== "string" || !value.id.trim()) return null;
  const kind = PATTERN_TREATMENT_KINDS.has(value.kind as PatternTreatmentKind)
    ? (value.kind as PatternTreatmentKind)
    : "medication";
  const result = PATTERN_TREATMENT_RESULTS.has(value.result as PatternTreatmentResult)
    ? (value.result as PatternTreatmentResult)
    : undefined;

  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Unnamed treatment",
    kind,
    notes: typeof value.notes === "string" ? value.notes : "",
    startDate: typeof value.startDate === "string" ? value.startDate : "",
    archivedAt: typeof value.archivedAt === "string" ? value.archivedAt : "",
    custom: Boolean(value.custom),
    result,
  };
}

export function normalizePatternPersistence(value: unknown): PatternPersistenceState {
  const raw = safeRecord(value);
  return {
    activeTreatment: normalizePatternTreatment(raw.activeTreatment),
    treatmentArchive: safeArray<unknown>(raw.treatmentArchive)
      .map(normalizeArchivedPatternTreatment)
      .filter((item): item is ArchivedPatternTreatment => item != null),
  };
}

export function normalizeSyncTimestampMap(value: unknown): Record<string, number> {
  const raw = safeRecord<Record<string, unknown>>(value);
  const out: Record<string, number> = {};

  for (const [path, timestamp] of Object.entries(raw)) {
    const parsed = Number(timestamp);
    if (!path || !Number.isFinite(parsed) || parsed <= 0) continue;
    out[path] = parsed;
  }

  return out;
}

export function normalizeSyncMetadata(value: unknown): SyncMetadata {
  const raw = safeRecord<Record<string, unknown>>(value);
  return {
    updatedAt: normalizeSyncTimestampMap(raw.updatedAt),
    deletedAt: normalizeSyncTimestampMap(raw.deletedAt),
  };
}

export function normalizePostpartumDayLogForStorage(value: unknown): PostpartumDayLog | undefined {
  if (!isPlainRecord(value)) return undefined;

  const numberOrUndefined = (input: unknown) => {
    if (input === "" || input == null) return undefined;
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const bleeding =
    value.bleeding === "" ||
    value.bleeding === "none" ||
    value.bleeding === "spotting" ||
    value.bleeding === "light" ||
    value.bleeding === "medium" ||
    value.bleeding === "heavy"
      ? value.bleeding
      : undefined;

  return {
    bleeding,
    symptoms: safeArray<unknown>(value.symptoms).filter((item): item is string => typeof item === "string"),
    recovery: numberOrUndefined(value.recovery),
    csectionRecovery: numberOrUndefined(value.csectionRecovery),
    perinealHealing: numberOrUndefined(value.perinealHealing),
    mood: safeArray<unknown>(value.mood).filter((item): item is string => typeof item === "string"),
    sleepHours: numberOrUndefined(value.sleepHours),
    breastfeeding: safeIdArray<NonNullable<PostpartumDayLog["breastfeeding"]>[number]>(value.breastfeeding),
    pumping: safeIdArray<NonNullable<PostpartumDayLog["pumping"]>[number]>(value.pumping),
    bottle: safeIdArray<NonNullable<PostpartumDayLog["bottle"]>[number]>(value.bottle),
    diapers: safeIdArray<NonNullable<PostpartumDayLog["diapers"]>[number]>(value.diapers),
    babySleepHours: numberOrUndefined(value.babySleepHours),
    note: typeof value.note === "string" ? value.note : undefined,
  };
}

export const LEGACY_EVENT_COLOR_MAP: Record<string, string> = {
  "#22c55e": "#93A66A", // bright green -> sage
  "#3b82f6": "#7895B2", // blue -> dusty blue
  "#f97316": "#D89B72", // orange -> muted apricot
  "#eab308": "#C9A94D", // yellow -> soft mustard
  "#ec4899": "#C97D91", // pink -> dusty rose
  "#a855f7": "#9A82C4", // purple -> lavender
  "#06b6d4": "#76A9B7", // cyan -> muted sky
  "#ef4444": "#B96752", // red -> terracotta
};

export function normalizeEventColor(color?: string): string {
  if (!color) return "#93A66A";
  return LEGACY_EVENT_COLOR_MAP[color.toLowerCase()] ?? color;
}

export function migrate(raw: unknown): BixboData {
  const parsed = safeRecord<Partial<BixboData> & Record<string, unknown>>(raw);
  const src = safeRecord<Record<string, Record<string, unknown>>>(parsed.dayLogs);
  const dayLogs: Record<string, DayLog> = {};

  for (const [key, value] of Object.entries(src)) {
    if (!isPlainRecord(value)) continue;

    const legacyLog = value;
    const out: DayLog = { ...(value as DayLog) };

    const arrayFields: Array<keyof DayLog> = [
      "pain",
      "tetany",
      "panic",
      "heat",
      "food",
      "bowel",
      "sex",
      "extraMeds",
      "workout",
      "mood",
      "energy",
      "histamine",
    ];

    for (const field of arrayFields) {
      const rawValue = legacyLog[field as string];
      if (rawValue !== undefined && !Array.isArray(rawValue)) {
        delete (out as Record<string, unknown>)[field as string];
      }
    }

    out.postpartum = normalizePostpartumDayLogForStorage(legacyLog.postpartum);

    // Normalize the old period value so previously saved data keeps working.
    if (out.period === ("veryheavy" as PeriodLevel)) {
      out.period = "very-heavy";
    }

    if (out.periodInfo?.level === ("veryheavy" as PeriodLevel)) {
      out.periodInfo = {
        ...out.periodInfo,
        level: "very-heavy",
      };
    }

    const temperatureEntries = normalizeVitalEntries(legacyLog.temperatureEntries, key, "temperature");
    const weightEntries = normalizeVitalEntries(legacyLog.weightEntries, key, "weight");

    // Convert old one-value-per-day fields into time-stamped entries once.
    if (!temperatureEntries.length && typeof legacyLog.temperature === "number") {
      temperatureEntries.push({
        id: `${key}-legacy-temperature`,
        time: "00:00",
        value: legacyLog.temperature,
      });
    }

    if (!weightEntries.length && typeof legacyLog.weight === "number") {
      weightEntries.push({
        id: `${key}-legacy-weight`,
        time: "00:00",
        value: legacyLog.weight,
      });
    }

    if (temperatureEntries.length) {
      out.temperatureEntries = temperatureEntries;
      out.temperature = latestVitalValue(temperatureEntries);
    }

    if (weightEntries.length) {
      out.weightEntries = weightEntries;
      out.weight = latestVitalValue(weightEntries);
    }

    if (typeof legacyLog.pain === "number") {
      out.pain = [
        {
          id: `${key}-legacy`,
          time: "00:00",
          score: legacyLog.pain,
          parts: [],
          quality: [],
          symptoms: [],
          note: "",
        },
      ];
    }

    if (legacyLog.sex && typeof legacyLog.sex === "object" && !Array.isArray(legacyLog.sex)) {
      const legacySex = legacyLog.sex as {
        type?: string;
        note?: string;
      };

      if (legacySex.type && legacySex.type !== "none") {
        const map: Record<string, SexKind> = {
          with_condom: "sex",
          without_condom: "sex",
        };

        out.sex = [
          {
            id: `${key}-legacy-sex`,
            time: "00:00",
            kind: (map[legacySex.type] ?? "other") as SexKind,
            note: legacySex.note,
          },
        ];
      } else {
        out.sex = [];
      }
    }

    dayLogs[key] = out;
  }

  const rawCustom = safeRecord<Partial<CustomLists>>(parsed.custom);
  const custom = { ...EMPTY.custom } as CustomLists;

  for (const key of Object.keys(EMPTY.custom) as Array<keyof CustomLists>) {
    const value = rawCustom[key];
    (custom as unknown as Record<string, unknown>)[key] = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  const rawSettings = safeRecord<Partial<Settings>>(parsed.settings);
  const rawCycle = safeRecord<Partial<CyclePrefs>>(parsed.cycle);
  const rawProfile = safeRecord(parsed.profile) as HealthProfile;
  const rawPregnancy = safeRecord<Partial<PregnancyState>>(parsed.pregnancy);
  const rawPostpartum = safeRecord<Partial<PostpartumState>>(parsed.postpartum);
  const rawPatterns = normalizePatternPersistence(parsed.patterns);

  // Canonical reproductive mode migration. Older builds stored pregnancy only
  // in settings.pregnantSince. Convert that marker into pregnancy.lmp once and
  // never use it as a runtime source again. Postpartum wins if legacy data has
  // both modes active, preventing an impossible simultaneous state.
  const legacyPostpartumActive = rawProfile.postpartum === true || rawProfile.pregnancyStatus === "postpartum";
  const postpartumActive = Boolean(rawPostpartum.active || legacyPostpartumActive);
  const legacyPregnancyLmp = typeof rawSettings.pregnantSince === "string" && rawSettings.pregnantSince
    ? rawSettings.pregnantSince
    : undefined;
  const legacyPregnancyActive = rawProfile.pregnancyStatus === "pregnant";
  // Postpartum wins if an old backup contains conflicting reproductive flags.
  const pregnancyActive = !postpartumActive && Boolean(rawPregnancy.active || legacyPregnancyLmp || legacyPregnancyActive);
  const pregnancyLmp = typeof rawPregnancy.lmp === "string" && rawPregnancy.lmp
    ? rawPregnancy.lmp
    : legacyPregnancyLmp;

  const dayNotes: BixboData["dayNotes"] = {};
  for (const [date, notes] of Object.entries(safeRecord(parsed.dayNotes))) {
    if (!Array.isArray(notes)) continue;
    dayNotes[date] = notes.filter((item) => {
      if (typeof item === "string") return true;
      return isPlainRecord(item) && typeof item.text === "string";
    }) as BixboData["dayNotes"][string];
  }

  const todos: BixboData["todos"] = {};
  for (const [date, items] of Object.entries(safeRecord(parsed.todos))) {
    todos[date] = safeIdArray<Todo>(items);
  }

  const medLog: BixboData["medLog"] = {};
  for (const [date, values] of Object.entries(safeRecord(parsed.medLog))) {
    if (!isPlainRecord(values)) continue;
    medLog[date] = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Boolean(value)]));
  }

  const medLogTimes: BixboData["medLogTimes"] = {};
  for (const [date, values] of Object.entries(safeRecord(parsed.medLogTimes))) {
    if (!isPlainRecord(values)) continue;
    medLogTimes[date] = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => typeof value === "string")
        .map(([key, value]) => [key, value as string]),
    );
  }

  return {
    ...EMPTY,
    ...parsed,
    dayLogs,
    dayNotes,
    todos,
    medLog,
    medLogTimes,
    medNames: Object.fromEntries(
      Object.entries(safeRecord(parsed.medNames)).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    folders: safeIdArray<NoteFolder>(parsed.folders).length ? safeIdArray<NoteFolder>(parsed.folders) : DEFAULT_FOLDERS,
    cycle: {
      ...EMPTY.cycle,
      ...rawCycle,
      cycleLength: Number.isFinite(Number(rawCycle.cycleLength))
        ? Number(rawCycle.cycleLength)
        : EMPTY.cycle.cycleLength,
      periodLength: Number.isFinite(Number(rawCycle.periodLength))
        ? Number(rawCycle.periodLength)
        : EMPTY.cycle.periodLength,
    },
    custom,
    settings: {
      ...EMPTY.settings,
      ...rawSettings,
      language: rawSettings.language === "sk" ? "sk" : "en",
      gender:
        rawSettings.gender === "male" || rawSettings.gender === "female"
          ? rawSettings.gender
          : rawProfile.gender === "male"
            ? "male"
            : "female",
      savedTriggers: safeIdArray<NonNullable<Settings["savedTriggers"]>[number]>(rawSettings.savedTriggers),
      logOrder: safeArray<unknown>(rawSettings.logOrder).filter((item): item is string => typeof item === "string"),
      quickTagOrder: safeArray<unknown>(rawSettings.quickTagOrder).filter(
        (item): item is string => typeof item === "string",
      ),
      hiddenQuickTags: safeArray<unknown>(rawSettings.hiddenQuickTags).filter(
        (item): item is string => typeof item === "string",
      ),
      customQuickTags: safeIdArray<CustomQuickTag>(rawSettings.customQuickTags),
      tracking: {
        ...DEFAULT_TRACKING_PREFS,
        ...safeRecord(rawSettings.tracking),
      },
      units: {
        ...DEFAULT_UNIT_PREFS,
        ...safeRecord(rawSettings.units),
      },
      privacy: {
        ...DEFAULT_ACCOUNT_PRIVACY_PREFS,
        ...safeRecord(rawSettings.privacy),
      },
      backup: {
        ...DEFAULT_BACKUP_PREFS,
        ...safeRecord(rawSettings.backup),
      },
      notif: safeRecord(rawSettings.notif) as NotificationPrefs,
      // Legacy-only field is consumed above and deliberately removed.
      pregnantSince: undefined,
    },
    tasks: safeIdArray<TaskEntry>(parsed.tasks),
    events: safeIdArray<EventEntry>(parsed.events).map((event) => ({
      ...event,
      color: normalizeEventColor(event.color),
    })),
    meds: safeIdArray<Med>(parsed.meds).map((med) => ({
      ...med,
      times: safeArray<unknown>(med.times).filter((item): item is string => typeof item === "string"),
    })),
    notebook: safeIdArray<Note>(parsed.notebook).map((note) => ({
      ...note,
      folderId: typeof note.folderId === "string" && note.folderId ? note.folderId : "general",
    })),
    labs: safeIdArray<LabResult>(parsed.labs),
    docs: safeIdArray<DocEntry>(parsed.docs),
    diagnoses: safeIdArray<Diagnosis>(parsed.diagnoses),
    deletedIds: safeArray<unknown>(parsed.deletedIds).filter((item): item is string => typeof item === "string"),
    deletedCustom: (() => {
      const raw = safeRecord<Record<string, unknown>>(parsed.deletedCustom);
      const out: Partial<Record<keyof CustomLists, string[]>> = {};
      for (const key of Object.keys(EMPTY.custom) as Array<keyof CustomLists>) {
        const value = raw[key];
        if (!Array.isArray(value)) continue;
        const list = value.filter((item): item is string => typeof item === "string");
        if (list.length) out[key] = list;
      }
      return out;
    })(),
    syncMeta: normalizeSyncMetadata(parsed.syncMeta),
    profile: {
      ...rawProfile,
      pregnancyStatus:
        rawProfile.pregnancyStatus === "trying" || rawProfile.pregnancyStatus === "unsure"
          ? rawProfile.pregnancyStatus
          : "none",
      postpartum: undefined,
    },
    pregnancy: {
      ...EMPTY.pregnancy!,
      ...rawPregnancy,
      active: pregnancyActive,
      lmp: pregnancyLmp,
      hospitalBag: safeIdArray<ChecklistItem>(rawPregnancy.hospitalBag),
      vaccinations: safeIdArray<ChecklistItem>(rawPregnancy.vaccinations),
      supplements: safeIdArray<ChecklistItem>(rawPregnancy.supplements),
      appointments: safeIdArray<PregnancyAppointment>(rawPregnancy.appointments),
      endedAt: pregnancyActive
        ? undefined
        : typeof rawPregnancy.endedAt === "string"
          ? rawPregnancy.endedAt
          : undefined,
    },
    postpartum: {
      ...EMPTY.postpartum!,
      ...rawPostpartum,
      active: postpartumActive,
      visits: safeIdArray<PregnancyAppointment>(rawPostpartum.visits),
      endedAt: postpartumActive
        ? undefined
        : typeof rawPostpartum.endedAt === "string"
          ? rawPostpartum.endedAt
          : undefined,
    },
    patterns: rawPatterns,
  };
}

export function normalizeBixboBackup(value: unknown): BixboData {
  return migrate(value);
}

export function freshEmptyState(): BixboData {
  return migrate(structuredClone(EMPTY));
}
