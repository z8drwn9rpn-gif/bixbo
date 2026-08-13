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
import { latestDayWeight } from "./utilities";
export type { PeriodLevel } from "../domain/cycle";
export { periodLabel } from "../domain/cycle";
export { painColor, avgDayPain } from "../domain/pain";

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
  /** Normal pain measurement vs. a symptom-only follow-up linked to an earlier pain log. */
  entryKind?: "pain" | "symptom-update";
  /** Source pain entry for symptom-only follow-ups. Older entries safely omit this. */
  sourcePainId?: string;
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
  /** True when this entry contains urinary data only and no bowel movement was logged. */
  urinaryOnly?: boolean;
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
  /** Stable ID for notes created by current versions; legacy notes may omit it. */
  id?: string;
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

export type CustomLogValue = string | number | boolean | string[];

export interface CustomLogEntry {
  id: string;
  time: string;
  values: Record<string, CustomLogValue>;
  note?: string;
  /** Optional link to the concrete built-in log entry this supplementary record belongs to. */
  sourceEntryId?: string;
}

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
  /** Admin-created generic logs. Keys are stable custom-log IDs. */
  customLogs?: Record<string, CustomLogEntry[]>;
  /** Supplementary values from admin-added fields on core logs. Keys are stable core feature IDs. */
  adminFields?: Record<string, CustomLogEntry[]>;
  /** Pregnancy-mode daily log (only used when pregnancy mode is on). */
  pregnancy?: PregnancyDayLog;
  /** Postpartum-mode daily log (only used when postpartum mode is on). */
  postpartum?: PostpartumDayLog;
}

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

export function userGender(data: Pick<BixboData, "settings">): Gender {
  return data.settings.gender ?? "female";
}

export function isPregnancyActive(data: Pick<BixboData, "pregnancy">): boolean {
  return Boolean(data.pregnancy?.active);
}

export function isPostpartumActive(data: Pick<BixboData, "postpartum">): boolean {
  return Boolean(data.postpartum?.active);
}

export function isCycleTrackingHidden(data: Pick<BixboData, "settings" | "pregnancy" | "postpartum">): boolean {
  return (
    data.settings.tracking?.cycle === false ||
    userGender(data) === "male" ||
    isPregnancyActive(data) ||
    isPostpartumActive(data)
  );
}

export function userAllergens(data: Pick<BixboData, "profile" | "settings" | "custom">): string[] {
  const source = data.profile?.allergies?.length
    ? data.profile.allergies
    : data.settings.allergens?.length
      ? data.settings.allergens
      : data.custom.allergens;

  return Array.from(new Set((source ?? []).map((value) => value.trim()).filter(Boolean)));
}

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

export function medScheduleItems(med: Pick<Med, "name">): string[] {
  const items = med.name.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length ? items : [med.name.trim()].filter(Boolean);
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
  /** App interface language. User-entered health data is never translated. */
  language?: "en" | "sk";
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
  /** Synced feature availability + pain-scale preference. */
  tracking?: TrackingPreferences;
  /** Synced display-unit preferences. Canonical data stays in kg/°C/ml. */
  units?: UnitPreferences;
  /** Account-wide diagnostics choices. Device lock stays device-only. */
  privacy?: AccountPrivacyPreferences;
  /** Historical backup preference/state. */
  backup?: BackupPreferences;
  /**
   * Web-push / reminder preferences. Optional so older backups migrate safely:
   * missing values fall back to DEFAULT_NOTIF_PREFS in src/lib/notifications.ts.
   */
  notif?: NotificationPrefs;
  /** Admin-editable registry overrides. Stable feature IDs protect historical data. */
  adminConfig?: import("../appRegistry").AdminConfig;
}

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
  sleep?: boolean;
  /** "HH:MM" sleep reminder time. */
  sleepTime?: string;
  quietHoursEnabled?: boolean;
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

export type PatternTreatmentKind = "medication" | "supplement" | "diet" | "therapy" | "exercise" | "other";

export type PatternTreatmentResult =
  | "pain"
  | "panicEpisodes"
  | "tetanyEpisodes"
  | "headache"
  | "hotFlashes"
  | "panicIntensity"
  | "tetanyIntensity"
  | "negativeMood";

export interface PatternTreatment {
  date: string;
  name: string;
  kind: PatternTreatmentKind;
  result: PatternTreatmentResult;
  notes: string;
  custom: boolean;
}

export interface ArchivedPatternTreatment {
  id: string;
  name: string;
  kind: PatternTreatmentKind;
  notes: string;
  startDate: string;
  archivedAt: string;
  custom: boolean;
  result?: PatternTreatmentResult;
}

export interface PatternPersistenceState {
  activeTreatment?: PatternTreatment;
  treatmentArchive: ArchivedPatternTreatment[];
}

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
  /** Optional user note attached to a concrete scheduled medication slot. */
  medLogNotes?: Record<string, Record<string, string>>;
  /** Granular taken items for a grouped scheduled medication slot. */
  medLogItems?: Record<string, Record<string, string[]>>;
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
  /** Pattern/treatment state lives in the main data model so backup + cloud sync protect it. */
  patterns?: PatternPersistenceState;
}
