import { useEffect, useSyncExternalStore } from "react";

/* ------------------- Types ------------------- */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "very-heavy";
export function periodLabel(level?: PeriodLevel | null): string {
  switch (level) {
    case "spotting":
      return "Spotting";
    case "light":
      return "Light";
    case "medium":
      return "Medium";
    case "heavy":
      return "Heavy";
    case "very-heavy":
      return "Very heavy";
    default:
      return "";
  }
}
export type SexKind =
  | "sex"
  | "fingering"
  | "suck_dick"
  | "oral"
  | "other"
  | "sex_with_condom"
  | "sex_without_condom"
  | "oral_giving"
  | "oral_receiving";
export type ThermoKind = "heat" | "cold" | "tens";
export type PainfulWhen = "no" | "before" | "during" | "after";
export type Gender = "female" | "male";

export interface PainEntry {
  id: string;
  time: string;
  score: number;
  parts: string[];
  quality: string[];
  symptoms: string[];
  note: string;
  bodyBattery?: number;
  stress?: number;
  mood?: string[];
  /** Hot flashes section (own Yes/No trigger) */
  hotFlashesOn?: boolean;
  hotFlashes?: number;
  /** Headache section (own Yes/No trigger) */
  headache?: boolean;
  headacheTypes?: string[];
  headacheIntensity?: number;
  headacheMed?: string;
  headacheMedTime?: string;
  /** Pressure detail, shown when "Pressure" quality is selected */
  pressureTypes?: string[];
  pressureIntensity?: number;
  /** Nausea section */
  nausea?: boolean;
  nauseaTypes?: string[];
  nauseaSeverity?: number;
  nauseaMinutes?: number;
  nauseaOngoing?: boolean;
  nauseaTriggers?: string[];
  nauseaSymptoms?: string[];
  nauseaHelped?: string[];
  /** Flu-specific note (separate from the general note) */
  fluNote?: string;
  pcosSymptoms?: string[];
}
export interface TetanyEpisode {
  id: string;
  time: string;
  types: string[];
  location: string[];
  intensity: number;
  minutes?: number;
  triggers: string[];
  timeSinceMagnerotMin?: number;
  helped: string[];
  rescueMed?: string;
  note?: string;
}
export interface PanicAttack {
  id: string;
  time: string;
  minutes?: number;
  intensity: number;
  physical: string[];
  cognitive: string[];
  trigger: string;
  place?: string;
  hyperventilation: "no" | "before" | "during" | "unknown";
  tetanyPresent: boolean;
  helped: string[];
  rescueMed?: string;
  note?: string;
}
export interface ThermoSession {
  id: string;
  kind: ThermoKind;
  start: string;
  minutes: number;
  ongoing?: boolean;
  note?: string;
}
export interface FoodEntry {
  id: string;
  time: string;
  what: string;
  feelings: string[];
  after?: string;
  hydrationMl?: number;
  caffeineMg?: number;
  alcoholDrinks?: number;
  symptomsAfter?: string[];
  histamineFlare?: boolean;
  histamineSymptoms?: string[];
  highHistamine?: boolean;
  allergensInMeal?: string[];
  allergicReaction?: boolean;
  reactionSeverity?: "mild" | "moderate" | "severe";
}
export interface BowelEntry {
  id: string;
  time: string;
  bristol: number;
  note?: string;
  feelings?: string[];
  symptoms?: string[];
  urinary?: string[];
}

export interface SexEntry {
  id: string;
  time: string;
  kind: SexKind;
  feelingAfter?: string | string[];
  painful?: PainfulWhen;
  note?: string;
}
export interface ExtraMed {
  id: string;
  time: string;
  name: string;
  dose?: string;
  note?: string;
}
export interface WorkoutExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
}
export interface WorkoutEntry {
  id: string;
  time: string;
  kind: string;
  minutes: number;
  /** Body weight measured after the workout — kept separate from the day's weight metric. */
  weightKg?: number;
  distanceKm?: number;
  elevationM?: number;
  exercises?: WorkoutExercise[];
  rpe?: number;
  magnesiumBefore?: boolean;
  triggeredSymptom?: { type: "tetany" | "pain"; id: string; label?: string };
  feeling?: string | string[];
  note?: string;
}
export interface EventEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  time?: string;
  timeEnd?: string;
  note?: string;
  color?: string;
}
export interface TaskEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  time?: string;
  timeEnd?: string;
  done: boolean;
  note?: string;
}
export interface PeriodEntry {
  level: PeriodLevel;
  discharge?: string;
  dischargeNote?: string;
  note?: string;
  cramps?: number;
}
export interface DayNote {
  text: string;
  time?: string;
}

export interface MoodEntry {
  id: string;
  time: string;
  value: "happy" | "neutral" | "sad" | "angry";
}
export interface EnergyEntry {
  id: string;
  time: string;
  value: "good" | "exhausted";
}
export interface HistamineEntry {
  id: string;
  time: string;
  flare: boolean;
  note?: string;
}

/** A single time-stamped weight or body-temperature measurement. */
export interface VitalMeasurement {
  id: string;
  time: string;
  value: number;
}

export interface DayLog {
  pain?: PainEntry[];
  tetany?: TetanyEpisode[];
  panic?: PanicAttack[];
  heat?: ThermoSession[];
  period?: PeriodLevel;
  periodInfo?: PeriodEntry;
  food?: FoodEntry[];
  bowel?: BowelEntry[];
  sex?: SexEntry[];
  /** Multiple time-stamped body-temperature measurements for this day. */
  temperatureEntries?: VitalMeasurement[];
  /** Multiple time-stamped weight measurements for this day. */
  weightEntries?: VitalMeasurement[];
  /** Legacy/current summary value kept for compatibility with older UI code. */
  temperature?: number;
  /** Legacy/current summary value kept for compatibility with older UI code. */
  weight?: number;
  sleepHours?: number;
  sleepQuality?: string | string[];
  extraMeds?: ExtraMed[];
  workout?: WorkoutEntry[];
  mood?: MoodEntry[];
  energy?: EnergyEntry[];
  histamine?: HistamineEntry[];
  /** Pregnancy-mode daily log (only used when pregnancy mode is on). */
  pregnancy?: PregnancyDayLog;
  /** Postpartum-mode daily log (only used when postpartum mode is on). */
  postpartum?: PostpartumDayLog;
}

/* ------------------- Pregnancy / postpartum ------------------- */
export interface KickSession {
  id: string;
  time: string;
  count: number;
  minutes?: number;
  note?: string;
}
export interface Contraction {
  id: string;
  start: string;
  durationSec: number;
  note?: string;
}
export interface BloodPressureEntry {
  id: string;
  time: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
}
export interface BloodSugarEntry {
  id: string;
  time: string;
  value: number;
  context?: "fasting" | "before-meal" | "after-meal" | "bedtime";
}
export interface PregnancyDayLog {
  symptoms?: string[];
  mood?: string[];
  energy?: number;
  swelling?: number;
  heartburn?: number;
  nausea?: number;
  vomiting?: number;
  sleepHours?: number;
  cravings?: string[];
  aversions?: string[];
  waterMl?: number;
  weightKg?: number;
  bloodPressure?: BloodPressureEntry[];
  bloodSugar?: BloodSugarEntry[];
  kicks?: KickSession[];
  contractions?: Contraction[];
  photos?: string[];
  note?: string;
}
export interface PostpartumDayLog {
  bleeding?: "" | "none" | "spotting" | "light" | "medium" | "heavy";
  /** Daily postpartum recovery symptoms selected by the user. */
  symptoms?: string[];
  recovery?: number;
  csectionRecovery?: number;
  perinealHealing?: number;
  mood?: string[];
  sleepHours?: number;
  breastfeeding?: { id: string; time: string; minutes?: number; side?: "left" | "right" | "both" }[];
  pumping?: { id: string; time: string; ml?: number; minutes?: number }[];
  bottle?: { id: string; time: string; ml?: number }[];
  diapers?: { id: string; time: string; kind: "wet" | "dirty" | "both" }[];
  babySleepHours?: number;
  note?: string;
}

export interface PregnancyAppointment {
  id: string;
  date: string;
  time?: string;
  kind: "checkup" | "ultrasound" | "test" | "class" | "other";
  title: string;
  doctor?: string;
  note?: string;
  /** ultrasound: measurements / findings */
  result?: string;
  photo?: string;
}
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}
export interface PregnancyState {
  active: boolean;
  /** ISO date of last menstrual period used for the due-date estimate. */
  lmp?: string;
  /** Manually set estimated due date; wins over the LMP estimate. */
  dueDate?: string;
  startWeightKg?: number;
  multiples?: number;
  hospitalBag: ChecklistItem[];
  vaccinations: ChecklistItem[];
  supplements: ChecklistItem[];
  appointments: PregnancyAppointment[];
  note?: string;
  endedAt?: string;
}
export interface PostpartumState {
  active: boolean;
  /** ISO date of birth. */
  birthDate?: string;
  deliveryType?: "vaginal" | "csection" | "assisted" | "other";
  babyName?: string;
  babyBirthWeightKg?: number;
  feedingMode?: "breast" | "bottle" | "mixed";
  visits: PregnancyAppointment[];
  note?: string;
  endedAt?: string;
}

/* ------------------- Health profile ------------------- */
export interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}
export interface Doctor {
  name?: string;
  clinic?: string;
  phone?: string;
  email?: string;
  note?: string;
}
export interface HealthProfile {
  /* Personal */
  name?: string;
  nickname?: string;
  birthDate?: string;
  heightCm?: number;
  /**
   * Optional profile snapshot only. Current weight belongs to dayLogs.weightEntries.
   * Keep this field for compatibility and for users who have not logged a dated weight yet.
   */
  weightKg?: number;
  targetWeightKg?: number;
  /**
   * @deprecated Use settings.gender as the single source of truth.
   * Kept so older backups continue to import safely.
   */
  gender?: string;
  pronouns?: string;
  /* Medical */
  diagnoses?: string[];
  chronicIllnesses?: string[];
  allergies?: string[];
  intolerances?: string[];
  surgeries?: string[];
  pregnancies?: string[];
  disabilities?: string[];
  /* Cycle */
  /**
   * Descriptive profile value only. Runtime mode is owned by pregnancy.active/postpartum.active.
   */
  pregnancyStatus?: "none" | "pregnant" | "postpartum" | "trying" | "unsure";
  tryingToConceive?: boolean;
  /**
   * @deprecated Use postpartum.active for runtime mode.
   */
  postpartum?: boolean;
  breastfeeding?: boolean;
  menopause?: "no" | "peri" | "post";
  birthControl?: string;
  fertilityGoals?: string;
  /* Lifestyle */
  smoker?: "no" | "occasionally" | "daily" | "quit";
  alcohol?: "none" | "rarely" | "weekly" | "daily";
  caffeine?: "none" | "low" | "medium" | "high";
  exercise?: "none" | "light" | "moderate" | "intense";
  sleepGoalHours?: number;
  hydrationGoalMl?: number;
  /* Emergency */
  bloodType?: string;
  emergencyContact?: EmergencyContact;
  gp?: Doctor;
  gynecologist?: Doctor;
  neurologist?: Doctor;
  endocrinologist?: Doctor;
  therapist?: Doctor;
  /* Medication */
  /**
   * @deprecated Medication reminder times belong to each Med.times entry.
   * Kept for compatibility with existing profile data.
   */
  reminderTimes?: string[];
  pharmacy?: string;
  medicationNotes?: string;
}

export function asArr(v: string | string[] | undefined | null): string[] {
  if (v == null || v === "") return [];
  return Array.isArray(v) ? v : [v];
}

/* ------------------- Canonical selectors ------------------- */

/** Gender has one runtime source: settings.gender. */
export function userGender(data: Pick<BixboData, "settings">): Gender {
  return data.settings.gender ?? "female";
}

/**
 * Active pregnancy selector. The legacy settings.pregnantSince fallback keeps
 * older backups working until every route has migrated to pregnancy.active.
 */
export function isPregnancyActive(data: Pick<BixboData, "pregnancy" | "settings">): boolean {
  return Boolean(data.pregnancy?.active || data.settings.pregnantSince);
}

/** Active postpartum selector. */
export function isPostpartumActive(data: Pick<BixboData, "postpartum">): boolean {
  return Boolean(data.postpartum?.active);
}

/**
 * Single shared rule for hiding period, ovulation and fertility UI.
 * Use this from Home, QuickTags, MonthCalendar, Insights and Patterns.
 */
export function isCycleTrackingHidden(data: Pick<BixboData, "settings" | "pregnancy" | "postpartum">): boolean {
  return userGender(data) === "male" || isPregnancyActive(data) || isPostpartumActive(data);
}

/**
 * Canonical allergen list. Health Profile owns the value; legacy Settings and
 * Custom lists are fallbacks for existing installations.
 */
export function userAllergens(data: Pick<BixboData, "profile" | "settings" | "custom">): string[] {
  const source = data.profile?.allergies?.length
    ? data.profile.allergies
    : data.settings.allergens?.length
      ? data.settings.allergens
      : data.custom.allergens;

  return Array.from(new Set((source ?? []).map((value) => value.trim()).filter(Boolean)));
}

/**
 * Latest dated body-weight measurement across all logs. Falls back to the
 * profile snapshot only when no dated measurement exists.
 */
export function latestRecordedWeight(data: Pick<BixboData, "dayLogs" | "profile">): number | undefined {
  const datedValues = Object.entries(data.dayLogs)
    .map(([date, log]) => ({ date, value: latestDayWeight(log) }))
    .filter((item): item is { date: string; value: number } => item.value != null && Number.isFinite(item.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  return datedValues.at(-1)?.value ?? data.profile?.weightKg;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}
export interface Med {
  id: string;
  name: string;
  dose?: string;
  times: string[];
  asNeeded?: boolean;
  color?: string;
  note?: string;
}
export interface NoteFolder {
  id: string;
  name: string;
  icon?: string;
}
export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}
export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  createdAt: number;
  updatedAt?: number;
  /** Optional UI metadata. Missing values keep older notes fully compatible. */
  pinned?: boolean;
  archived?: boolean;
  color?: "default" | "olive" | "sand" | "rose" | "blue";
}

export interface CyclePrefs {
  lastPeriodStart?: string;
  lastPeriodEnd?: string;
  cycleLength: number;
  periodLength: number;
}

export interface CustomLists {
  bodyParts: string[];
  quality: string[];
  symptoms: string[];
  foodFeelings: string[];
  foodQuickAdd: string[];
  workoutKinds: string[];
  moods: string[];
  tetanyTypes: string[];
  tetanyLocations: string[];
  tetanyTriggers: string[];
  tetanyHelped: string[];
  panicPhysical: string[];
  panicCognitive: string[];
  panicHelped: string[];
  sexTypes: string[];
  bowelFeelings: string[];
  bowelSymptoms: string[];
  pcosSymptoms: string[];
  headacheTypes: string[];
  histamineSymptoms: string[];
  foodSymptomsAfter: string[];
  sexFeelings: string[];
  urinary: string[];
  allergens: string[];
  pressureTypes: string[];
  nauseaTypes: string[];
  nauseaTriggers: string[];
  nauseaSymptoms: string[];
  nauseaHelped: string[];
  labTests: string[];
}

export type QuickTagCategory =
  | "pain"
  | "tetany"
  | "panic"
  | "sex"
  | "food"
  | "meds"
  | "workout"
  | "period"
  | "bowel"
  | "thermo"
  | "headache"
  | "hotFlashes"
  | "mood"
  | "energy"
  | "histamine"
  | "sleep";
export interface CustomQuickTag {
  id: string;
  emoji: string;
  label: string;
  cat: QuickTagCategory;
  preset?: {
    score?: number; // pain
    intensity?: number; // tetany / panic
    what?: string; // food
    medId?: string; // meds
    kind?: string; // workout / sex / thermo / bowel / period level
    minutes?: number; // workout / thermo
    bristol?: number; // bowel
    level?: PeriodLevel; // period
    /** meds: mark a scheduled dose taken vs. log an extra/PRN dose */
    mode?: "scheduled" | "extra";
    /** meds: `${medId}@${time}` identifying the scheduled slot */
    scheduleKey?: string;
    /** meds: HH:MM of the scheduled slot to mark taken */
    scheduleTime?: string;
    thermoKind?: ThermoKind;
    thermoMinutes?: number;

    headacheType?: string;
    headacheIntensity?: number;

    hotFlashesIntensity?: number;

    sleepHours?: number;
    sleepQuality?: string;
  };
}

export interface Settings {
  textSize: "sm" | "md" | "lg" | "xl";
  notifications: boolean;
  /** Appearance preference; "system" follows the device. */
  theme?: "light" | "dark" | "system";
  pairingCode?: string;
  partnerName?: string;
  logOrder?: string[];
  gender?: Gender;
  birthControlSince?: string;
  /**
   * @deprecated Legacy pregnancy marker. New code should use pregnancy.active
   * together with pregnancy.lmp/dueDate.
   */
  pregnantSince?: string;
  /** Display name used for the "Hi, <name>" greeting on Home. */
  userName?: string;
  /**
   * @deprecated Use profile.allergies as the canonical allergen list.
   * Kept for compatibility while older UI is migrated.
   */
  allergens?: string[];
  /** Custom order of quick-log tags (ids of built-in + custom tags). */
  quickTagOrder?: string[];
  /** Ids of quick-log tags the user removed from the quick bar. */
  hiddenQuickTags?: string[];

  customQuickTags?: CustomQuickTag[];
  scaleDescriptions?: Partial<
    Record<
      "pain" | "stress" | "tetany" | "panic" | "hotFlashes" | "headache" | "nausea" | "pressure",
      Record<number, string>
    >
  >;
  /** Saved Trigger Comparison combos on the Patterns tab. */
  savedTriggers?: { id: string; a: string; b: string }[];
  /**
   * Web-push / reminder preferences. Optional so older backups migrate safely:
   * missing values fall back to DEFAULT_NOTIF_PREFS in src/lib/notifications.ts.
   */
  notif?: NotificationPrefs;
}

/** Per-category reminder preferences. All fields optional for safe migration. */
export interface NotificationPrefs {
  enabled?: boolean;
  meds?: boolean;
  period?: boolean;
  ovulation?: boolean;
  dailyLog?: boolean;
  symptom?: boolean;
  appointments?: boolean;
  mood?: boolean;
  hydration?: boolean;
  marketing?: boolean;
  /** "HH:MM" times. */
  dailyLogTime?: string;
  symptomTime?: string;
  moodTime?: string;
  hydrationStart?: string;
  hydrationEnd?: string;
  hydrationEveryHours?: number;
  quietStart?: string;
  quietEnd?: string;
  /** Epoch ms of the last "Maybe later" dismissal of the permission card. */
  promptSnoozedAt?: number;
  /** Set once the user has answered the permission card. */
  promptAnswered?: boolean;
}

export interface PartnerData {
  name?: string;
  dayLogs: Record<
    string,
    {
      pain?: PainEntry[];
      panic?: PanicAttack[];
      tetany?: TetanyEpisode[];
      extraMeds?: ExtraMed[];
      period?: PeriodLevel;
      periodInfo?: PeriodEntry;
    }
  >;
  dayNotes?: Record<string, DayNote[] | string[]>;
  meds?: Med[];
  medLog?: Record<string, Record<string, boolean>>;
  cycle?: CyclePrefs;
  gender?: Gender;
  importedAt: number;
}

/* ------------------- Lab results / documents / diagnoses ------------------- */
export interface LabResult {
  id: string;
  test: string;
  value: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  date: string;
  note?: string;
}

export interface DocEntry {
  id: string;
  name: string;
  date: string;
  mime?: string;
  /** data URL of the uploaded file (stored locally + synced) */
  dataUrl?: string;
  labId?: string;
}

export interface Diagnosis {
  id: string;
  name: string;
  date?: string;
  doctor?: string;
  note?: string;
  docId?: string;
}

/**
 * Conflict metadata used by cloud merge. Paths are encoded internal field paths;
 * timestamps are monotonically increasing epoch milliseconds generated on the
 * device that made the local edit. Keeping this separate from user-facing data
 * lets legacy entry shapes remain fully compatible.
 */
export interface SyncMetadata {
  updatedAt: Record<string, number>;
  deletedAt: Record<string, number>;
}

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes: Record<string, DayNote[] | string[]>;
  todos: Record<string, Todo[]>;
  tasks: TaskEntry[];
  events: EventEntry[];
  meds: Med[];
  medLog: Record<string, Record<string, boolean>>;
  medLogTimes: Record<string, Record<string, string>>;
  medNames?: Record<string, string>;
  folders: NoteFolder[];
  notebook: Note[];
  cycle: CyclePrefs;
  custom: CustomLists;
  settings: Settings;
  partner?: PartnerData;
  labs?: LabResult[];
  docs?: DocEntry[];
  diagnoses?: Diagnosis[];
  /** Ids of entries the user deleted — used by cloud merge so a union merge
   * doesn't resurrect them from another device. */
  deletedIds?: string[];
  /** Custom-list option values the user removed — kept so a cloud merge
   * (or another device) can't resurrect them. */
  deletedCustom?: Partial<Record<keyof CustomLists, string[]>>;
  /** Per-path last-write/delete metadata used by deterministic multi-device sync. */
  syncMeta?: SyncMetadata;
  /** Full health profile (personal, medical, lifestyle, emergency contacts). */
  profile?: HealthProfile;
  pregnancy?: PregnancyState;
  postpartum?: PostpartumState;
}

export const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "general", name: "General", icon: "📓" },
  { id: "health", name: "Health", icon: "💚" },
  { id: "ideas", name: "Ideas", icon: "💡" },
];

export const EMPTY: BixboData = {
  dayLogs: {},
  dayNotes: {},
  todos: {},
  tasks: [],
  events: [],
  meds: [],
  medLog: {},
  medLogTimes: {},
  medNames: {},
  folders: DEFAULT_FOLDERS,
  notebook: [],
  cycle: {
    lastPeriodStart: "2026-07-15",
    lastPeriodEnd: "2026-07-19",
    cycleLength: 28,
    periodLength: 5,
  },
  custom: {
    bodyParts: [],
    quality: [],
    symptoms: [],
    foodFeelings: [],
    foodQuickAdd: [],
    workoutKinds: [],
    moods: [],
    tetanyTypes: [],
    tetanyLocations: [],
    tetanyTriggers: [],
    tetanyHelped: [],
    panicPhysical: [],
    panicCognitive: [],
    panicHelped: [],
    sexTypes: [],
    bowelFeelings: [],
    bowelSymptoms: [],
    pcosSymptoms: [],
    headacheTypes: [],
    histamineSymptoms: [],
    foodSymptomsAfter: [],
    sexFeelings: [],
    urinary: [],
    allergens: [],
    pressureTypes: [],
    nauseaTypes: [],
    nauseaTriggers: [],
    nauseaSymptoms: [],
    nauseaHelped: [],
    labTests: [],
  },
  settings: {
    textSize: "md",
    notifications: true,
    gender: "female",
    theme: "system",
    savedTriggers: [],
  },
  labs: [],
  docs: [],
  diagnoses: [],
  deletedIds: [],
  deletedCustom: {},
  syncMeta: { updatedAt: {}, deletedAt: {} },
  profile: {},
  pregnancy: { active: false, hospitalBag: [], vaccinations: [], supplements: [], appointments: [] },
  postpartum: { active: false, visits: [] },
};

export const BIXBO_STORAGE_KEY = "bixbo:v2";
export const BIXBO_LEGACY_STORAGE_KEY = "bixbo:v1";

const KEY = BIXBO_STORAGE_KEY;
const LEGACY_KEY = BIXBO_LEGACY_STORAGE_KEY;

/**
 * Clears only BIXBO's local data. Never call localStorage.clear(), because that
 * can also remove authentication/session data owned by other parts of the app.
 */
/**
 * Remove only BIXBO application data from localStorage.
 *
 * This is a named module export used by Settings. It deliberately avoids
 * localStorage.clear() so authentication and unrelated application data remain.
 */
export const clearBixboLocalStorage = (): void => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(BIXBO_STORAGE_KEY);
  window.localStorage.removeItem(BIXBO_LEGACY_STORAGE_KEY);
};

type VitalField = "weightEntries" | "temperatureEntries";

function normalizeVitalEntries(raw: unknown, dateKey: string, kind: "weight" | "temperature"): VitalMeasurement[] {
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

function latestVitalValue(entries?: VitalMeasurement[]): number | undefined {
  if (!entries?.length) return undefined;

  const sorted = entries
    .filter((entry) => Number.isFinite(entry.value))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

  return sorted.length ? sorted[sorted.length - 1].value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeRecord<T extends Record<string, unknown> = Record<string, unknown>>(value: unknown): T {
  return (isPlainRecord(value) ? value : {}) as T;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeIdArray<T extends { id: string }>(value: unknown): T[] {
  return safeArray<unknown>(value).filter(
    (item): item is T => isPlainRecord(item) && typeof item.id === "string" && item.id.trim().length > 0,
  );
}

function normalizeSyncTimestampMap(value: unknown): Record<string, number> {
  const raw = safeRecord<Record<string, unknown>>(value);
  const out: Record<string, number> = {};

  for (const [path, timestamp] of Object.entries(raw)) {
    const parsed = Number(timestamp);
    if (!path || !Number.isFinite(parsed) || parsed <= 0) continue;
    out[path] = parsed;
  }

  return out;
}

function normalizeSyncMetadata(value: unknown): SyncMetadata {
  const raw = safeRecord<Record<string, unknown>>(value);
  return {
    updatedAt: normalizeSyncTimestampMap(raw.updatedAt),
    deletedAt: normalizeSyncTimestampMap(raw.deletedAt),
  };
}

function normalizePostpartumDayLogForStorage(value: unknown): PostpartumDayLog | undefined {
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

const LEGACY_EVENT_COLOR_MAP: Record<string, string> = {
  "#22c55e": "#93A66A", // bright green -> sage
  "#3b82f6": "#7895B2", // blue -> dusty blue
  "#f97316": "#D89B72", // orange -> muted apricot
  "#eab308": "#C9A94D", // yellow -> soft mustard
  "#ec4899": "#C97D91", // pink -> dusty rose
  "#a855f7": "#9A82C4", // purple -> lavender
  "#06b6d4": "#76A9B7", // cyan -> muted sky
  "#ef4444": "#B96752", // red -> terracotta
};

function normalizeEventColor(color?: string): string {
  if (!color) return "#93A66A";
  return LEGACY_EVENT_COLOR_MAP[color.toLowerCase()] ?? color;
}

function migrate(raw: unknown): BixboData {
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
    profile: rawProfile,
    pregnancy: {
      ...EMPTY.pregnancy!,
      ...rawPregnancy,
      active: Boolean(rawPregnancy.active),
      hospitalBag: safeIdArray<ChecklistItem>(rawPregnancy.hospitalBag),
      vaccinations: safeIdArray<ChecklistItem>(rawPregnancy.vaccinations),
      supplements: safeIdArray<ChecklistItem>(rawPregnancy.supplements),
      appointments: safeIdArray<PregnancyAppointment>(rawPregnancy.appointments),
    },
    postpartum: {
      ...EMPTY.postpartum!,
      ...rawPostpartum,
      active: Boolean(rawPostpartum.active),
      visits: safeIdArray<PregnancyAppointment>(rawPostpartum.visits),
    },
  };
}

/* ------------------- Shared store ------------------- */
function freshEmptyState(): BixboData {
  return migrate(structuredClone(EMPTY));
}

let _state: BixboData = freshEmptyState();
let _hydrated = false;
const listeners = new Set<() => void>();
const changeListeners = new Set<(d: BixboData, reason: "local" | "remote") => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (_hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    _state = raw ? migrate(JSON.parse(raw)) : freshEmptyState();
  } catch (error) {
    console.error("BIXBO local data could not be loaded; using a safe empty state.", error);
    _state = freshEmptyState();
  }
  _hydrated = true;
  emit();
}

function persist() {
  if (typeof window === "undefined") return;
  // Never write before we've loaded what's already stored, otherwise an early
  // write (e.g. cloud sync clearing partner) would wipe saved data.
  if (!_hydrated) hydrate();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(_state));
  } catch (error) {
    console.error("BIXBO local data could not be saved.", error);
  }
}

const SYNC_META_MAX_KEYS = 12000;
let _lastLocalSyncTimestamp = 0;

function encodeSyncSegment(value: string): string {
  return encodeURIComponent(value);
}

function syncChildPath(base: string, key: string): string {
  const segment = encodeSyncSegment(key);
  return base ? `${base}/${segment}` : segment;
}

function syncValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => syncValuesEqual(value, b[index]));
  }

  if (isPlainRecord(a) || isPlainRecord(b)) {
    if (!isPlainRecord(a) || !isPlainRecord(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) return false;
    return aKeys.every((key) => syncValuesEqual(a[key], b[key]));
  }

  return false;
}

function isIdObject(value: unknown): value is { id: string } {
  return isPlainRecord(value) && typeof value.id === "string" && Boolean(value.id.trim());
}

function arraysUseIds(previous: unknown, next: unknown): boolean {
  const arrays = [previous, next].filter(Array.isArray) as unknown[][];
  const populated = arrays.filter((items) => items.length > 0);
  return populated.length > 0 && populated.every((items) => items.every(isIdObject));
}

function mergeSyncTimestampMaps(
  previous: Record<string, number> | undefined,
  next: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...(previous ?? {}) };
  for (const [path, timestamp] of Object.entries(next ?? {})) {
    const parsed = Number(timestamp);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    out[path] = Math.max(out[path] ?? 0, parsed);
  }
  return out;
}

function nextLocalSyncTimestamp(meta: SyncMetadata): number {
  let seen = 0;
  for (const timestamp of Object.values(meta.updatedAt)) seen = Math.max(seen, timestamp);
  for (const timestamp of Object.values(meta.deletedAt)) seen = Math.max(seen, timestamp);
  const next = Math.max(Date.now(), _lastLocalSyncTimestamp + 1, seen + 1);
  _lastLocalSyncTimestamp = next;
  return next;
}

function pruneSyncTimestampMap(map: Record<string, number>): Record<string, number> {
  const entries = Object.entries(map);
  if (entries.length <= SYNC_META_MAX_KEYS) return map;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, SYNC_META_MAX_KEYS));
}

type LocalSyncDiffContext = {
  meta: SyncMetadata;
  now: number;
  deletedIds: Set<string>;
  restoredIds: Set<string>;
};

function stampLocalUpdate(ctx: LocalSyncDiffContext, path: string): void {
  if (!path) return;
  ctx.meta.updatedAt[path] = ctx.now;
  delete ctx.meta.deletedAt[path];
}

function stampLocalDelete(ctx: LocalSyncDiffContext, path: string): void {
  if (!path) return;
  ctx.meta.deletedAt[path] = ctx.now;
  delete ctx.meta.updatedAt[path];
}

function recordLocalSyncDiff(
  previous: unknown,
  next: unknown,
  path: string,
  ctx: LocalSyncDiffContext,
): void {
  if (syncValuesEqual(previous, next)) return;

  if (Array.isArray(previous) || Array.isArray(next)) {
    if (arraysUseIds(previous, next)) {
      const previousItems = new Map(
        (Array.isArray(previous) ? previous : []).filter(isIdObject).map((item) => [item.id, item] as const),
      );
      const nextItems = new Map(
        (Array.isArray(next) ? next : []).filter(isIdObject).map((item) => [item.id, item] as const),
      );
      const ids = new Set([...previousItems.keys(), ...nextItems.keys()]);

      for (const id of ids) {
        const before = previousItems.get(id);
        const after = nextItems.get(id);
        const itemPath = syncChildPath(path, id);

        if (before && !after) {
          stampLocalDelete(ctx, itemPath);
          ctx.deletedIds.add(id);
          continue;
        }

        if (!before && after) {
          stampLocalUpdate(ctx, itemPath);
          ctx.restoredIds.add(id);
          continue;
        }

        if (before && after && !syncValuesEqual(before, after)) {
          stampLocalUpdate(ctx, itemPath);
          ctx.restoredIds.add(id);
        }
      }
      return;
    }

    if (next === undefined) stampLocalDelete(ctx, path);
    else stampLocalUpdate(ctx, path);
    return;
  }

  const previousRecord = isPlainRecord(previous) ? previous : undefined;
  const nextRecord = isPlainRecord(next) ? next : undefined;

  if (previousRecord || nextRecord) {
    if (!nextRecord) stampLocalDelete(ctx, path);
    else if (!previousRecord) stampLocalUpdate(ctx, path);

    const keys = new Set([...Object.keys(previousRecord ?? {}), ...Object.keys(nextRecord ?? {})]);

    for (const key of keys) {
      if (!path && (key === "syncMeta" || key === "deletedIds" || key === "deletedCustom" || key === "partner")) {
        continue;
      }

      recordLocalSyncDiff(previousRecord?.[key], nextRecord?.[key], syncChildPath(path, key), ctx);
    }
    return;
  }

  if (next === undefined) stampLocalDelete(ctx, path);
  else stampLocalUpdate(ctx, path);
}

function withLocalSyncMetadata(previous: BixboData, next: BixboData): BixboData {
  const previousMeta = normalizeSyncMetadata(previous.syncMeta);
  const nextMeta = normalizeSyncMetadata(next.syncMeta);
  const meta: SyncMetadata = {
    updatedAt: mergeSyncTimestampMaps(previousMeta.updatedAt, nextMeta.updatedAt),
    deletedAt: mergeSyncTimestampMaps(previousMeta.deletedAt, nextMeta.deletedAt),
  };
  const deletedIds = new Set([...(previous.deletedIds ?? []), ...(next.deletedIds ?? [])]);
  const restoredIds = new Set<string>();
  const ctx: LocalSyncDiffContext = {
    meta,
    now: nextLocalSyncTimestamp(meta),
    deletedIds,
    restoredIds,
  };

  recordLocalSyncDiff(previous, next, "", ctx);

  // A deliberate re-add/edit of an id after a tombstone is allowed to win.
  // Path-level metadata remains authoritative; removing the legacy global id
  // keeps older sync clients from immediately deleting the restored entry.
  for (const id of restoredIds) deletedIds.delete(id);

  return {
    ...next,
    deletedIds: Array.from(deletedIds).slice(-2000),
    syncMeta: {
      updatedAt: pruneSyncTimestampMap(meta.updatedAt),
      deletedAt: pruneSyncTimestampMap(meta.deletedAt),
    },
  };
}

export function setBixbo(updater: (d: BixboData) => BixboData) {
  hydrate();
  const previous = _state;
  const next = migrate(updater(_state));
  _state = migrate(withLocalSyncMetadata(previous, next));
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, "local"));
}
export function replaceBixbo(d: BixboData, reason: "local" | "remote" = "local") {
  hydrate();
  const next = migrate(d);
  _state = reason === "local" ? migrate(withLocalSyncMetadata(_state, next)) : next;
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, reason));
}
export function setPartner(partner: PartnerData | undefined) {
  hydrate();
  _state = { ..._state, partner };
  persist();
  emit();
}
export function getBixbo(): BixboData {
  hydrate();
  return _state;
}
export function subscribeBixboChanges(fn: (d: BixboData, reason: "local" | "remote") => void) {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

export function useBixbo() {
  useEffect(() => {
    hydrate();
  }, []);
  const data = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => _state,
    () => EMPTY,
  );
  useEffect(() => {
    if (!_hydrated) return;
    const map = { sm: "14px", md: "16px", lg: "18px", xl: "20px" } as const;
    document.documentElement.style.fontSize = map[data.settings.textSize] ?? "16px";
  }, [data.settings.textSize]);
  return { data, update: setBixbo, replace: (d: BixboData) => replaceBixbo(d, "local"), hydrated: _hydrated };
}

/* ------------------- Day helpers ------------------- */
export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("BIXBO rejected an invalid day-log date key:", date);
    return;
  }

  update((d) => ({
    ...d,
    dayLogs: {
      ...d.dayLogs,
      [date]: patch(d.dayLogs[date] ?? {}),
    },
  }));
}

export function hasAnyLog(l?: DayLog): boolean {
  if (!l) return false;
  return !!(
    l.pain?.length ||
    l.tetany?.length ||
    l.panic?.length ||
    l.heat?.length ||
    l.period ||
    l.periodInfo?.level ||
    l.food?.length ||
    l.bowel?.length ||
    l.sex?.length ||
    l.temperatureEntries?.length ||
    l.weightEntries?.length ||
    l.temperature != null ||
    l.weight != null ||
    l.sleepHours != null ||
    l.extraMeds?.length ||
    l.workout?.length ||
    l.mood?.length ||
    l.energy?.length ||
    l.histamine?.length ||
    l.pregnancy != null ||
    l.postpartum != null
  );
}

/* ------------------- Date helpers ------------------- */
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayKey() {
  return toKey(new Date());
}
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}
export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
export function isDateInRange(k: string, start: string, end: string): boolean {
  return k >= start && k <= end;
}

/* ------------------- Cycle prediction ------------------- */
export function predictPeriods(cycle: CyclePrefs, from: Date, to: Date): { start: string; end: string }[] {
  if (!cycle.lastPeriodStart) return [];
  const out: { start: string; end: string }[] = [];
  const fromK = toKey(from),
    toK = toKey(to);
  let curStart = cycle.lastPeriodStart;
  while (curStart <= toK) {
    const end = addDays(curStart, Math.max(0, cycle.periodLength - 1));
    if (end >= fromK) out.push({ start: curStart, end });
    curStart = addDays(curStart, cycle.cycleLength);
    if (out.length > 24) break;
  }
  if (cycle.lastPeriodStart && cycle.lastPeriodEnd) {
    const s = cycle.lastPeriodStart,
      e = cycle.lastPeriodEnd;
    if (s <= toK && e >= fromK && !out.some((o) => o.start === s)) out.unshift({ start: s, end: e });
  }
  return out;
}
export function nextPredictedPeriod(cycle: CyclePrefs): { start: string; end: string } | null {
  if (!cycle.lastPeriodStart) return null;
  const todayK = todayKey();
  let s = cycle.lastPeriodStart;
  while (s <= todayK) s = addDays(s, cycle.cycleLength);
  return { start: s, end: addDays(s, Math.max(0, cycle.periodLength - 1)) };
}

/* ------------------- Constants ------------------- */
export const PAIN_DESCRIPTIONS: Record<number, string> = {
  0: "Pain free",
  1: "Very minor annoyance",
  2: "Minor annoyance",
  3: "Annoying, distracting",
  4: "Bearable if involved in work",
  5: "Can't be ignored > 30 min",
  6: "Can't be ignored for long",
  7: "Hard to concentrate",
  8: "Physical activity limited",
  9: "Unable to speak, crying out",
  10: "Unconscious — passes out",
};
export function painColor(score: number): string {
  const n = Math.max(0, Math.min(10, Math.round(score)));
  return `var(--pain-${n})`;
}
export function avgDayPain(log?: DayLog): number | undefined {
  if (!log?.pain?.length) return undefined;
  const sum = log.pain.reduce((s, p) => s + p.score, 0);
  return sum / log.pain.length;
}

/** Return valid vital measurements sorted from earliest to latest. */
export function vitalEntriesFor(log: DayLog | undefined, field: VitalField): VitalMeasurement[] {
  return (log?.[field] ?? [])
    .filter((entry) => Number.isFinite(entry.value))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
}

/** Latest weight measurement of the day, with legacy scalar fallback. */
export function latestDayWeight(log?: DayLog): number | undefined {
  return latestVitalValue(vitalEntriesFor(log, "weightEntries")) ?? log?.weight;
}

/** Latest body-temperature measurement of the day, with legacy scalar fallback. */
export function latestDayTemperature(log?: DayLog): number | undefined {
  return latestVitalValue(vitalEntriesFor(log, "temperatureEntries")) ?? log?.temperature;
}

/** Average body temperature across all measurements of the day. */
export function averageDayTemperature(log?: DayLog): number | undefined {
  const entries = vitalEntriesFor(log, "temperatureEntries");
  if (!entries.length) return log?.temperature;
  return entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
}

export const BODY_PARTS_DEFAULT = [
  "Abdomen",
  "Lower abdomen",
  "Lower belly",
  "Pelvis",
  "Ovaries",
  "Uterus",
  "Vagina",
  "Groin",
  "Back",
  "Head",
  "Legs",
  "Chest",
];
export const PAIN_QUALITY_DEFAULT = [
  "Cramping",
  "Stabbing",
  "Burning",
  "Dull",
  "Sharp",
  "Throbbing",
  "Pressure",
  "Shooting",
  "Aching",
];
export const OTHER_SYMPTOMS_DEFAULT = [
  "Dizziness",
  "Fatigue",
  "Bloating",
  "Diarrhea",
  "Constipation",
  "Cold sweats",
  "Fainting",
  "Mood swings",
  "Flu",
];
export const FOOD_FEELINGS_DEFAULT = [
  "😊 Great",
  "🙂 Fine",
  "😐 Neutral",
  "😕 Off",
  "😖 Bloated",
  "🤢 Nauseous",
  "🤕 Stomach pain",
  "😴 Sleepy",
  "🥵 Flushed",
  "⚡ Energy up",
];
export const WORKOUT_KINDS_DEFAULT = [
  "Yoga",
  "Walk",
  "Run",
  "Hike",
  "Cycling",
  "Strength",
  "Stretching",
  "Swim",
  "Meditation",
];
export function workoutHasDistance(kind: string) {
  return /walk|run|hike/i.test(kind);
}
export function workoutIsHike(kind: string) {
  return /hike/i.test(kind);
}
export function workoutIsStrength(kind: string) {
  return /strength/i.test(kind);
}
export const MOODS_DEFAULT = [
  "🌀 All over the place",
  "😠 Angry",
  "😤 Annoyed",
  "😰 Anxious",
  "😑 Apathetic",
  "🥱 Bored",
  "🏃 Busy",
  "😌 Calm",
  "🥺 Clingy",
  "😾 Cranky",
  "😔 Depressed",
  "🤩 Excited",
  "😪 Fatigued",
  "🙏 Grateful",
  "😊 Happy",
  "🥰 In love",
  "🤕 In pain",
  "😐 Indifferent",
  "😒 Irritated",
  "😎 Just chillin",
  "🥲 Lonely",
  "😕 Meh",
  "🌩️ PMDD",
  "💪 Productive",
  "😴 Restful",
  "😢 Sad",
  "🫥 Self-deprecating",
  "😴 Sleepy",
  "😖 Stressed",
  "🥱 Tired",
];
export const TETANY_TYPES = [
  "Carpopedal spasm",
  "Calf cramps",
  "Twitches around mouth/face",
  "Tingling / numbness",
  "Fasciculations",
  "Eyelid twitching",
  "Jaw clenching",
  "Chvostek sign",
  "Trousseau sign",
  "Whole body tremor",
];
export const TETANY_TYPE_DESC: Record<string, string> = {
  "Carpopedal spasm": "Cramp of hands/feet — fingers pulled into an “obstetrician's hand” or feet arched like a bow.",
  "Calf cramps": "Painful cramps in the calves, often at night or after exertion.",
  "Twitches around mouth/face": "Small twitches around the mouth or face.",
  "Tingling / numbness": "Pins and needles or numbness (lips, fingers, limbs).",
  Fasciculations: "Fine muscle rippling under the skin without limb movement.",
  "Eyelid twitching": "Eyelid twitch — often with fatigue or low magnesium.",
  "Jaw clenching": "Jaw clenching, teeth grinding.",
  "Chvostek sign": "Facial twitch when tapping the facial nerve (in front of the ear).",
  "Trousseau sign": "Hand cramp after inflating a BP cuff above systolic pressure.",
  "Whole body tremor": "Whole-body tremor or shaking from within.",
};
export const TETANY_LOCATIONS_DEFAULT = ["Lips", "Fingers", "Toes", "Hands", "Calves", "Face", "Around mouth"];
export const TETANY_TRIGGERS = ["Hyperventilation / stress", "Exercise", "Cold", "Cycle phase", "Other"];
export const TETANY_HELPED_DEFAULT = ["Slow breathing", "Breathe into bag/hands", "Warmth", "Extra magnesium", "Rest"];
export const PANIC_PHYSICAL = [
  "Racing heart",
  "Shortness of breath",
  "Chest pressure",
  "Dizziness",
  "Tingling / numbness",
  "Trembling",
  "Nausea",
  "Hot flashes / chills",
];
export const PANIC_COGNITIVE = ["Loss of control", "Derealization", "Fear of dying", "Fear of collapse"];
export const PANIC_HELPED_DEFAULT = ["Slow exhale", "Frontin", "Grounding", "Someone with me", "Fresh air"];

export const HEADACHE_TYPES = [
  "Tension",
  "Migraine",
  "Cluster",
  "Sinus",
  "Cervicogenic",
  "Hormonal",
  "Dehydration",
  "Hangover",
  "Eye strain",
  "Caffeine withdrawal",
  "Ice-pick",
  "Thunderclap",
];
export const HEADACHE_TYPE_DESC: Record<string, string> = {
  Tension:
    "Tension headache — dull, pressing pain on both sides, like a band around the head. Often from stress, fatigue, or poor posture.",
  Migraine:
    "Migraine — throbbing pain (often one-sided), sensitivity to light/sound, nausea. May include aura (flashes, tingling).",
  Cluster: "Cluster — extremely severe pain behind/around one eye, in bouts; watery eye, blocked nose on that side.",
  Sinus:
    "Sinus — pressure in the face/behind the eyes/forehead, worse when bending forward; typically with a cold or sinusitis.",
  Cervicogenic:
    "Cervicogenic — originates in the neck; pain rises from the nape up into the head, worse with neck movement.",
  Hormonal: "Hormonal — linked to the cycle (before/during period), ovulation, or contraception.",
  Dehydration: "Dehydration — dull, whole-head pain from low fluid intake, worse with movement.",
  Hangover: "Hangover — throbbing pain with nausea after drinking alcohol.",
  "Eye strain": "Eye strain — after long screen time; pressure behind the eyes, blurred vision.",
  "Caffeine withdrawal": "Caffeine withdrawal — dull pain with fatigue after skipping coffee.",
  "Ice-pick": "“Ice-pick” — brief, sharp stabbing jabs of pain lasting seconds.",
  Thunderclap:
    "“Thunderclap” — sudden, extremely severe pain peaking within 1 minute. WARNING: seek medical help, can be serious.",
};

export const SEX_TYPES_DEFAULT: { value: SexKind; label: string }[] = [
  { value: "sex", label: "Sex" },
  { value: "fingering", label: "Fingering" },
  { value: "suck_dick", label: "Suck dick" },
  { value: "oral", label: "Oral (receiving)" },
];

export function isIntercourseKind(kind: unknown): boolean {
  const raw = String(kind ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^other:/, "");
  return ["sex", "sex_with_condom", "sex_without_condom", "with_condom", "without_condom"].includes(raw);
}

export const DISCHARGE_OPTS: { value: string; label: string; color: string }[] = [
  { value: "clear", label: "Clear / egg-white", color: "#dbeafe" },
  { value: "white", label: "White / creamy", color: "#f5f5f4" },
  { value: "yellow", label: "Yellow", color: "#fde68a" },
  { value: "brown", label: "Brown / spotting", color: "#a16207" },
  { value: "other", label: "Other", color: "#c084fc" },
];

export const BRISTOL: { n: number; label: string; sub: string; color: string; shape: string }[] = [
  { n: 1, label: "Type 1 — Constipation", sub: "Separate hard lumps", color: "#7c3aed", shape: "lumps" },
  { n: 2, label: "Type 2 — Constipation", sub: "Sausage-shaped but firm and lumpy", color: "#2563eb", shape: "lumpy" },
  { n: 3, label: "Type 3 — Normal", sub: "Thicker but soft, with cracks", color: "#16a34a", shape: "cracked" },
  { n: 4, label: "Type 4 — Normal", sub: "Smooth, soft, uniform", color: "#eab308", shape: "smooth" },
  { n: 5, label: "Type 5 — Lacks fiber", sub: "Soft blobs with clear-cut edges", color: "#f97316", shape: "blobs" },
  { n: 6, label: "Type 6 — Diarrhea", sub: "Fluffy, mushy, ragged edges", color: "#ec4899", shape: "mushy" },
  { n: 7, label: "Type 7 — Diarrhea", sub: "Watery, no solid pieces", color: "#dc2626", shape: "liquid" },
];

export const BOWEL_FEELINGS_DEFAULT = [
  "Relief",
  "Normal",
  "Neutral",
  "Painful",
  "Cramping",
  "Urgent",
  "Gassy",
  "Incomplete",
];
export const BOWEL_SYMPTOMS_DEFAULT = [
  "Bloating",
  "Cramps",
  "Straining",
  "Blood",
  "Mucus",
  "Burning",
  "Nausea",
  "Urgency",
];

export const EVENT_COLORS = [
  "#93A66A", // sage
  "#7F8A45", // olive
  "#7895B2", // dusty blue
  "#D89B72", // muted apricot
  "#C9A94D", // soft mustard
  "#C97D91", // dusty rose
  "#9A82C4", // lavender
  "#76A9B7", // muted sky
  "#B96752", // terracotta
];

export const BODY_BATTERY: { n: number; label: string; color: string; emoji: string }[] = [
  { n: 1, label: "Drained", color: "#ef4444", emoji: "😴" },
  { n: 2, label: "Low", color: "#f97316", emoji: "🙁" },
  { n: 3, label: "Ok", color: "#eab308", emoji: "😐" },
  { n: 4, label: "Good", color: "#22c55e", emoji: "🙂" },
  { n: 5, label: "Fully charged", color: "#16a34a", emoji: "⚡" },
];

export const SLEEP_QUALITY = [
  "😩 Awful",
  "😴 Terrible",
  "🥱 Restless",
  "🙁 Poor",
  "😐 Ok",
  "🌙 Broken sleep",
  "😪 Woke up a lot",
  "🙂 Good",
  "😌 Refreshed",
  "😀 Great",
  "🤩 Perfect",
  "💤 Slept in",
  "⏰ Too short",
  "🛌 Too long",
  "🥴 Groggy",
  "😵‍💫 Foggy head",
  "😰 Nightmares",
  "💭 Vivid dreams",
  "🌡️ Sweaty night",
  "🥶 Cold night",
  "🤕 Woke with headache",
  "🦵 Cramps at night",
  "🚽 Up to the toilet",
  "📱 Fell asleep late",
  "☀️ Woke up early",
  "🐢 Hard to get up",
  "🧘 Deep & calm",
  "😻 Best sleep ever",
];

/* ------------------- Pregnancy ------------------- */
export function pregnancyInfo(since?: string): { week: number; trimester: 1 | 2 | 3 } | null {
  if (!since) return null;
  const days = daysBetween(since, todayKey());
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return { week, trimester };
}

export const SEX_FEELINGS_DEFAULT = [
  "😊 Great",
  "🥰 Loved",
  "🤩 Amazing",
  "😌 Relaxed",
  "🙂 Good",
  "😐 Meh",
  "😞 Down",
  "😢 Sad",
  "😤 Frustrated",
  "🤕 Sore",
  "😴 Sleepy",
  "💦 Sweaty",
  "🥵 Hot",
  "🥶 Cold",
  "😵‍💫 Dizzy",
  "🤢 Nauseous",
  "💪 Energized",
  "🫠 Drained",
];

export const PCOS_SYMPTOMS = [
  "Acne",
  "Hirsutism (excess hair)",
  "Hair thinning / crown loss",
  "Sugar cravings / energy swings after meals",
  "Oily skin",
  "Dark skin patches (acanthosis nigricans)",
  "Skin tags",
  "Weight gain / hard to lose",
  "Heavy sweating",
  "Fatigue / low energy",
  "Hunger soon after eating",
];

export const HISTAMINE_SYMPTOMS = [
  "Flushing / redness",
  "Hives / rash",
  "Itching",
  "Stuffy nose",
  "Headache",
  "GI issues",
  "Rapid heart rate",
  "Swelling",
  "Fatigue after food",
];

export const FOOD_SYMPTOMS_AFTER = [
  "Bloating",
  "Gas",
  "Abdominal pain / cramps",
  "Nausea",
  "Diarrhea",
  "Constipation",
  "Heartburn / reflux",
  "Burping",
  "Fatigue after food",
  "Headache",
  "Flushing / redness",
  "Itching / hives",
  "Rapid heart rate",
];

export const URINARY_DEFAULT = [
  "Frequent urination",
  "Painful urination",
  "Urgency",
  "Incomplete emptying",
  "Night urination",
  "Blood in urine",
];

export const ALLERGENS_DEFAULT = ["Nuts", "Casein / dairy", "Gluten", "Eggs", "Fish", "Soy", "Shellfish", "Peanuts"];

/* ------------------- Pressure (pain quality expansion) ------------------- */
export const PRESSURE_TYPES = ["Pelvic", "Abdominal", "Chest", "Head / sinus", "Vaginal", "Rectal", "Lower back"];

/* ------------------- Nausea ------------------- */
export const NAUSEA_TYPES = [
  "Mild nausea",
  "Moderate nausea",
  "Severe nausea",
  "Constant nausea",
  "Intermittent nausea",
  "Morning nausea",
  "Post-meal nausea",
  "Motion-induced nausea",
];
export const NAUSEA_TYPE_DESC: Record<string, string> = {
  "Mild nausea": "Slight queasiness you can easily ignore.",
  "Moderate nausea": "Clearly unpleasant, but you can still eat and function.",
  "Severe nausea": "Hard to function; vomiting feels likely.",
  "Constant nausea": "Present all day without letting up.",
  "Intermittent nausea": "Comes and goes in waves through the day.",
  "Morning nausea": "Worst right after waking, before eating.",
  "Post-meal nausea": "Starts shortly after eating.",
  "Motion-induced nausea": "Triggered by travel or movement (car, bus, boat).",
};
export const NAUSEA_SEVERITY_DESC: Record<number, string> = {
  0: "No nausea — feeling completely normal",
  1: "Very mild — occasionally noticeable, doesn't bother me",
  2: "Very mild — occasionally noticeable, doesn't bother me",
  3: "Mild — unpleasant, but I can function and eat normally",
  4: "Mild — unpleasant, but I can function and eat normally",
  5: "Moderate — need to sit or rest, food is very unappealing",
  6: "Moderate — need to sit or rest, food is very unappealing",
  7: "Strong — hard to concentrate, feel like I'll vomit",
  8: "Strong — hard to concentrate, feel like I'll vomit",
  9: "Very strong — almost unbearable, vomiting likely or already started",
  10: "Extreme — constant vomiting or the worst nausea imaginable",
};
export const NAUSEA_TRIGGERS = [
  "After food",
  "Car ride",
  "Smell",
  "Medication",
  "Hormonal",
  "Stress",
  "Hunger",
  "Unknown",
];
export const NAUSEA_SYMPTOMS = ["Dizziness", "Cold sweat", "Bloating", "Headache", "Weakness", "Vomiting"];
export const NAUSEA_HELPED = ["Lying down", "Ginger tea", "Fresh air", "Medication", "Food", "Nothing helped"];

/* ------------------- Deletion tombstones ------------------- */
export function markDeleted(update: (u: (d: BixboData) => BixboData) => void, ...ids: string[]) {
  update((d) => ({ ...d, deletedIds: Array.from(new Set([...(d.deletedIds ?? []), ...ids])).slice(-2000) }));
}

/** Add tombstones for removed custom-list options so merges can't restore them. */
export function withCustomTombstones<K extends keyof CustomLists>(
  d: BixboData,
  key: K,
  removed: string[],
): BixboData {
  if (!removed.length) return d;
  const prev = d.deletedCustom?.[key] ?? [];
  return {
    ...d,
    deletedCustom: { ...(d.deletedCustom ?? {}), [key]: Array.from(new Set([...prev, ...removed])) },
  };
}

/** Drop tombstones for options the user deliberately re-added. */
export function withoutCustomTombstones<K extends keyof CustomLists>(
  d: BixboData,
  key: K,
  restored: string[],
): BixboData {
  const prev = d.deletedCustom?.[key];
  if (!prev?.length || !restored.length) return d;
  const next = prev.filter((v) => !restored.includes(v));
  return { ...d, deletedCustom: { ...(d.deletedCustom ?? {}), [key]: next } };
}

// storage migration hardened for cloud data
