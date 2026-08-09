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
} from "./preferences";

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
  other: string[];
  thermo?: ThermoKind;
  note?: string;
}

export interface MoodEntry {
  id: string;
  time: string;
  moods: string[];
  note?: string;
}

export interface FoodEntry {
  id: string;
  time: string;
  items: string[];
  feelings: string[];
  symptomsAfter?: string[];
  note?: string;
}

export interface WorkoutEntry {
  id: string;
  time: string;
  kind: string;
  durationMin?: number;
  distanceKm?: number;
  intensity?: number;
  note?: string;
}

export interface SexEntry {
  id: string;
  time: string;
  kind: SexKind;
  partner?: string;
  protection?: boolean;
  feelings?: string[];
  painful?: PainfulWhen;
  note?: string;
}

export interface SleepEntry {
  id: string;
  time: string;
  quality: number;
  durationHours?: number;
  note?: string;
}

export interface VitalEntry {
  id: string;
  time: string;
  weight?: number;
  temperature?: number;
  bpSys?: number;
  bpDia?: number;
  hr?: number;
  note?: string;
}

export interface NauseaEntry {
  id: string;
  time: string;
  severity: number;
  type?: string;
  triggers?: string[];
  symptoms?: string[];
  helped?: string[];
  note?: string;
}

export interface HeadacheEntry {
  id: string;
  time: string;
  severity: number;
  type?: string;
  location?: string;
  note?: string;
}

export interface TetanyEntry {
  id: string;
  time: string;
  type?: string;
  locations?: string[];
  triggers?: string[];
  helped?: string[];
  note?: string;
}

export interface PanicEntry {
  id: string;
  time: string;
  physical?: string[];
  cognitive?: string[];
  helped?: string[];
  note?: string;
}

export interface BowelEntry {
  id: string;
  time: string;
  bristol?: number;
  feelings?: string[];
  symptoms?: string[];
  note?: string;
}

export interface UrinaryEntry {
  id: string;
  time: string;
  symptoms?: string[];
  note?: string;
}

export interface DischargeEntry {
  id: string;
  time: string;
  amount?: string;
  color?: string;
  consistency?: string;
  note?: string;
}

export interface BodyBatteryEntry {
  id: string;
  time: string;
  level: number;
  note?: string;
}

export interface DayLog {
  period?: PeriodLevel;
  pain?: PainEntry[];
  mood?: MoodEntry[];
  food?: FoodEntry[];
  workout?: WorkoutEntry[];
  sex?: SexEntry[];
  sleep?: SleepEntry[];
  vitals?: VitalEntry[];
  nausea?: NauseaEntry[];
  headache?: HeadacheEntry[];
  tetany?: TetanyEntry[];
  panic?: PanicEntry[];
  bowel?: BowelEntry[];
  urinary?: UrinaryEntry[];
  discharge?: DischargeEntry[];
  bodyBattery?: BodyBatteryEntry[];
  note?: string;
  custom?: Record<string, unknown>;
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
  body: string;
  checklist?: NoteChecklistItem[];
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
}

export interface CyclePrefs {
  cycleLength: number;
  periodLength: number;
  lastPeriodStart?: string;
}

export interface Med {
  id: string;
  name: string;
  dose?: string;
  schedule?: string;
  active: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  color?: string;
  note?: string;
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
  headacheTypes: string[];
  sexTypes: string[];
  sexFeelings: string[];
  bowelFeelings: string[];
  bowelSymptoms: string[];
  urinary: string[];
  allergens: string[];
  pressureTypes: string[];
  nauseaTypes: string[];
  nauseaTriggers: string[];
  nauseaSymptoms: string[];
  nauseaHelped: string[];
  pcosSymptoms: string[];
  histamineSymptoms: string[];
  foodSymptomsAfter: string[];
}

export interface Settings {
  textSize: "sm" | "md" | "lg";
  notifications: boolean;
  gender: Gender;
  name?: string;
  tracking?: TrackingPreferences;
  units?: UnitPreferences;
  backup?: BackupPreferences;
  privacy?: AccountPrivacyPreferences;
  notificationPrefs?: NotificationPrefs;
}

export interface NotificationPrefs {
  periodReminder?: boolean;
  medReminder?: boolean;
  dailyCheckin?: boolean;
}

export interface PregnancyState {
  active: boolean;
  dueDate?: string;
  startDate?: string;
  appointments?: PregnancyAppointment[];
}

export interface PregnancyAppointment {
  id: string;
  date: string;
  title: string;
  note?: string;
}

export interface PostpartumState {
  active: boolean;
  birthDate?: string;
}

export interface HealthProfile {
  personal?: Record<string, unknown>;
  medical?: Record<string, unknown>;
  lifestyle?: Record<string, unknown>;
  emergency?: Record<string, unknown>;
}

export interface SyncMetadata {
  [path: string]: { ts: number; device?: string };
}

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes?: Record<string, string>;
  todos?: Record<string, unknown>;
  tasks?: unknown[];
  events?: EventItem[];
  meds?: Med[];
  medLog?: Record<string, unknown>;
  medLogTimes?: Record<string, unknown>;
  medNames?: Record<string, string>;
  folders: NoteFolder[];
  notebook: Note[];
  cycle: CyclePrefs;
  custom: CustomLists;
  settings: Settings;
  deletedIds?: string[];
  deletedCustom?: Partial<Record<keyof CustomLists, string[]>>;
  syncMeta?: SyncMetadata;
  profile?: HealthProfile;
  pregnancy?: PregnancyState;
  postpartum?: PostpartumState;
}

export const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "general", name: "General", icon: "note" },
  { id: "health", name: "Health", icon: "heart" },
  { id: "ideas", name: "Ideas", icon: "star" },
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
    headacheTypes: [],
    sexTypes: [],
    sexFeelings: [],
    bowelFeelings: [],
    bowelSymptoms: [],
    urinary: [],
    allergens: [],
    pressureTypes: [],
    nauseaTypes: [],
    nauseaTriggers: [],
    nauseaSymptoms: [],
    nauseaHelped: [],
    pcosSymptoms: [],
    histamineSymptoms: [],
    foodSymptomsAfter: [],
  },
  settings: {
    textSize: "md",
    notifications: true,
    gender: "female",
  },
};

export const BIXBO_STORAGE_KEY = "bixbo:v2";
export const BIXBO_LEGACY_STORAGE_KEY = "bixbo:v1";

/* ------------------- Constants ------------------- */
export const PAIN_DESCRIPTIONS: Record<number, string> = {
  0: "No pain",
  1: "Very mild",
  2: "Mild",
  3: "Noticeable",
  4: "Moderate",
  5: "Strong",
  6: "Very strong",
  7: "Severe",
  8: "Very severe",
  9: "Almost unbearable",
  10: "Worst possible",
};

export const BODY_PARTS_DEFAULT = [
  "Head", "Neck", "Shoulders", "Chest", "Upper back", "Lower back",
  "Abdomen", "Pelvis", "Hips", "Thighs", "Knees", "Calves", "Feet", "Arms", "Wrists", "Hands",
];

export const PAIN_QUALITY_DEFAULT = [
  "Sharp", "Dull", "Aching", "Throbbing", "Burning", "Stabbing", "Cramping", "Shooting", "Pressure",
];

export const OTHER_SYMPTOMS_DEFAULT = [
  "Nausea", "Dizziness", "Fatigue", "Sweating", "Chills", "Shortness of breath",
];

export const FOOD_FEELINGS_DEFAULT = [
  "Satisfied", "Bloated", "Energized", "Heavy", "Light", "Craving more", "Nauseous",
];

export const WORKOUT_KINDS_DEFAULT = [
  "Walk", "Run", "Cycle", "Swim", "Yoga", "Strength", "Hike", "HIIT", "Stretch", "Other",
];

export const MOODS_DEFAULT = [
  "Happy", "Calm", "Anxious", "Irritable", "Sad", "Energetic", "Tired", "Motivated", "Overwhelmed", "Content",
];

export const TETANY_TYPES = ["Muscle spasm", "Cramps", "Tingling", "Numbness"];
export const TETANY_TYPE_DESC: Record<string, string> = {
  "Muscle spasm": "Sudden involuntary muscle contraction",
  Cramps: "Painful muscle tightening",
  Tingling: "Pins and needles sensation",
  Numbness: "Loss of sensation",
};
export const TETANY_LOCATIONS_DEFAULT = ["Hands", "Feet", "Legs", "Arms", "Face", "Jaw"];
export const TETANY_TRIGGERS = ["Stress", "Cold", "Exercise", "Hyperventilation", "Unknown"];
export const TETANY_HELPED_DEFAULT = ["Warmth", "Massage", "Rest", "Breathing", "Medication"];

export const PANIC_PHYSICAL = ["Heart racing", "Sweating", "Trembling", "Shortness of breath", "Chest pain", "Nausea", "Dizziness"];
export const PANIC_COGNITIVE = ["Fear of dying", "Fear of losing control", "Detachment", "Racing thoughts"];
export const PANIC_HELPED_DEFAULT = ["Breathing", "Grounding", "Walk", "Talking", "Medication"];

export const HEADACHE_TYPES = ["Tension", "Migraine", "Cluster", "Sinus", "Other"];
export const HEADACHE_TYPE_DESC: Record<string, string> = {
  Tension: "Dull, pressure-like pain",
  Migraine: "Throbbing, often one-sided, with sensitivity",
  Cluster: "Severe, around one eye",
  Sinus: "Pressure in face/forehead",
  Other: "Other type",
};

export const SEX_TYPES_DEFAULT = ["Sex", "Oral", "Fingering", "Other"];
export const DISCHARGE_OPTS = ["None", "Spotting", "Light", "Medium", "Heavy"];
export const BRISTOL = [
  { n: 1, label: "Hard lumps" },
  { n: 2, label: "Lumpy sausage" },
  { n: 3, label: "Cracked sausage" },
  { n: 4, label: "Smooth sausage" },
  { n: 5, label: "Soft blobs" },
  { n: 6, label: "Mushy" },
  { n: 7, label: "Liquid" },
];
export const BOWEL_FEELINGS_DEFAULT = ["Normal", "Constipated", "Urgent", "Incomplete", "Painful"];
export const BOWEL_SYMPTOMS_DEFAULT = ["Bloating", "Gas", "Cramps", "Blood", "Mucus"];

export const EVENT_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

export const BODY_BATTERY = [
  { n: 1, label: "Exhausted", color: "#ef4444", emoji: "1" },
  { n: 2, label: "Very low", color: "#f97316", emoji: "2" },
  { n: 3, label: "Low", color: "#eab308", emoji: "3" },
  { n: 4, label: "Okay", color: "#84cc16", emoji: "4" },
  { n: 5, label: "Good", color: "#22c55e", emoji: "5" },
  { n: 6, label: "Great", color: "#10b981", emoji: "6" },
  { n: 7, label: "Full", color: "#06b6d4", emoji: "7" },
];

export const SLEEP_QUALITY = [
  { n: 1, label: "Terrible" },
  { n: 2, label: "Poor" },
  { n: 3, label: "Fair" },
  { n: 4, label: "Good" },
  { n: 5, label: "Excellent" },
];

export const SEX_FEELINGS_DEFAULT = ["Good", "Okay", "Uncomfortable", "Painful", "Great"];
export const PCOS_SYMPTOMS = ["Irregular cycle", "Acne", "Hair growth", "Weight gain", "Fatigue"];
export const HISTAMINE_SYMPTOMS = ["Itching", "Flushing", "Hives", "Runny nose", "Headache"];
export const FOOD_SYMPTOMS_AFTER = ["Bloating", "Gas", "Nausea", "Cramps", "Fatigue", "Brain fog"];
export const URINARY_DEFAULT = ["Frequent", "Urgent", "Painful", "Burning", "Incontinence"];
export const ALLERGENS_DEFAULT = ["Gluten", "Dairy", "Nuts", "Eggs", "Soy", "Shellfish"];
export const PRESSURE_TYPES = ["High", "Low", "Normal"];

export const NAUSEA_TYPES = ["Queasy", "Retching", "Vomiting"];
export const NAUSEA_TYPE_DESC: Record<string, string> = {
  Queasy: "Mild unsettled stomach",
  Retching: "Gagging without vomit",
  Vomiting: "Throwing up",
};
export const NAUSEA_SEVERITY_DESC: Record<number, string> = {
  1: "Very mild — barely notice",
  2: "Mild — can ignore most of the time",
  3: "Mild — distracting but manageable",
  4: "Moderate — unpleasant, but I can function and eat normally",
  5: "Moderate — need to sit or rest, food is very unappealing",
  6: "Moderate — need to sit or rest, food is very unappealing",
  7: "Strong — hard to concentrate, feel like I'll vomit",
  8: "Strong — hard to concentrate, feel like I'll vomit",
  9: "Very strong — almost unbearable, vomiting likely or already started",
  10: "Extreme — constant vomiting or the worst nausea imaginable",
};
export const NAUSEA_TRIGGERS = [
  "After food", "Car ride", "Smell", "Medication", "Hormonal", "Stress", "Hunger", "Unknown",
];
export const NAUSEA_SYMPTOMS = ["Dizziness", "Cold sweat", "Bloating", "Headache", "Weakness", "Vomiting"];
export const NAUSEA_HELPED = ["Lying down", "Ginger tea", "Fresh air", "Medication", "Food", "Nothing helped"];

/* ------------------- Helpers ------------------- */
export function asArr<T>(v: T | T[] | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

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

export function todayKey(): string {
  return toKey(new Date());
}

export function nowHHMM(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 86400000;
  return Math.round((b.getTime() - a.getTime()) / ms);
}

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function isDateInRange(k: string, start: string, end: string): boolean {
  return k >= start && k <= end;
}

export function painColor(score?: number): string {
  if (score == null) return "#94a3b8";
  if (score <= 2) return "#22c55e";
  if (score <= 4) return "#84cc16";
  if (score <= 6) return "#eab308";
  if (score <= 8) return "#f97316";
  return "#ef4444";
}

export function avgDayPain(log?: DayLog): number | undefined {
  const pains = log?.pain;
  if (!pains?.length) return undefined;
  const sum = pains.reduce((a, p) => a + (p.score ?? 0), 0);
  return Math.round((sum / pains.length) * 10) / 10;
}

export function vitalEntriesFor(log?: DayLog): VitalEntry[] {
  return log?.vitals ?? [];
}

export function latestDayWeight(log?: DayLog): number | undefined {
  const v = log?.vitals;
  if (!v?.length) return undefined;
  for (let i = v.length - 1; i >= 0; i--) {
    if (v[i].weight != null) return v[i].weight;
  }
  return undefined;
}

export function latestDayTemperature(log?: DayLog): number | undefined {
  const v = log?.vitals;
  if (!v?.length) return undefined;
  for (let i = v.length - 1; i >= 0; i--) {
    if (v[i].temperature != null) return v[i].temperature;
  }
  return undefined;
}

export function averageDayTemperature(log?: DayLog): number | undefined {
  const temps = (log?.vitals ?? []).map((v) => v.temperature).filter((t): t is number => t != null);
  if (!temps.length) return undefined;
  return Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
}

export function userGender(data: BixboData): Gender {
  return data.settings?.gender ?? "female";
}

export function isPregnancyActive(data: BixboData): boolean {
  return !!data.pregnancy?.active;
}

export function isPostpartumActive(data: BixboData): boolean {
  return !!data.postpartum?.active;
}

export function isCycleTrackingHidden(data: BixboData): boolean {
  return isPregnancyActive(data) || isPostpartumActive(data);
}

export function userAllergens(data: BixboData): string[] {
  return data.custom?.allergens ?? [];
}

export function latestRecordedWeight(data: BixboData): number | undefined {
  const keys = Object.keys(data.dayLogs).sort().reverse();
  for (const k of keys) {
    const w = latestDayWeight(data.dayLogs[k]);
    if (w != null) return w;
  }
  return undefined;
}

export function pregnancyInfo(data: BixboData) {
  const p = data.pregnancy;
  if (!p?.active) return null;
  return p;
}

export function workoutHasDistance(kind: string): boolean {
  const k = kind.toLowerCase();
  return ["walk", "run", "cycle", "hike", "swim"].some((x) => k.includes(x));
}

export function workoutIsHike(kind: string): boolean {
  return kind.toLowerCase().includes("hike");
}

export function workoutIsStrength(kind: string): boolean {
  return kind.toLowerCase().includes("strength") || kind.toLowerCase().includes("weight");
}

export function isIntercourseKind(kind: string): boolean {
  const k = kind.toLowerCase();
  return k.includes("sex") || k.includes("intercourse") || k === "oral" || k.includes("fingering");
}

export function predictPeriods(cycle: CyclePrefs, from: Date, to: Date): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = [];
  if (!cycle.lastPeriodStart) return result;
  let cur = fromKey(cycle.lastPeriodStart);
  const endLimit = to.getTime();
  const startLimit = from.getTime();
  // walk forward
  while (cur.getTime() <= endLimit + 90 * 86400000) {
    const start = toKey(cur);
    const endD = new Date(cur);
    endD.setDate(endD.getDate() + (cycle.periodLength || 5) - 1);
    const end = toKey(endD);
    if (endD.getTime() >= startLimit) result.push({ start, end });
    cur.setDate(cur.getDate() + (cycle.cycleLength || 28));
  }
  return result.filter((r) => r.start <= toKey(to) && r.end >= toKey(from));
}

export function nextPredictedPeriod(cycle: CyclePrefs, from = new Date()): { start: string; end: string } | null {
  const preds = predictPeriods(cycle, from, addDays(toKey(from), 60) as any);
  // fix: addDays returns string, need Date
  const to = new Date(from);
  to.setDate(to.getDate() + 60);
  const list = predictPeriods(cycle, from, to);
  return list.find((p) => fromKey(p.start) >= from) ?? null;
}

/* ------------------- Storage core ------------------- */
function safeParse(raw: string | null): BixboData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BixboData;
  } catch {
    return null;
  }
}

function safeIdArray<T extends { id: string }>(arr: unknown): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && typeof x === "object" && typeof (x as any).id === "string") as T[];
}

function normalize(data: BixboData): BixboData {
  const d = { ...EMPTY, ...data };
  d.folders = safeIdArray<NoteFolder>(d.folders).length ? safeIdArray<NoteFolder>(d.folders) : DEFAULT_FOLDERS;
  d.notebook = safeIdArray<Note>(d.notebook);
  d.dayLogs = d.dayLogs && typeof d.dayLogs === "object" ? d.dayLogs : {};
  d.cycle = { cycleLength: 28, periodLength: 5, ...d.cycle };
  d.custom = { ...EMPTY.custom, ...d.custom };
  d.settings = {
    textSize: "md",
    notifications: true,
    gender: "female",
    ...d.settings,
  };
  return d;
}

function load(): BixboData {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(BIXBO_STORAGE_KEY) ?? localStorage.getItem(BIXBO_LEGACY_STORAGE_KEY);
    const parsed = safeParse(raw);
    if (!parsed) return { ...EMPTY };
    return normalize(parsed);
  } catch {
    return { ...EMPTY };
  }
}

function save(data: BixboData) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BIXBO_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[bixbo] storage save failed", e);
  }
}

let cache: BixboData | null = null;
let listeners = new Set<() => void>();

function getSnapshot(): BixboData {
  if (!cache) cache = load();
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getBixbo(): BixboData {
  return getSnapshot();
}

export function setBixbo(data: BixboData) {
  cache = normalize(data);
  save(cache);
  emit();
}

export function replaceBixbo(data: BixboData) {
  setBixbo(data);
}

export function updateDayLog(key: string, updater: (log: DayLog) => DayLog) {
  const d = getSnapshot();
  const prev = d.dayLogs[key] ?? {};
  const next = updater(prev);
  setBixbo({ ...d, dayLogs: { ...d.dayLogs, [key]: next } });
}

export function hasAnyLog(log?: DayLog): boolean {
  if (!log) return false;
  return !!(log.period || log.pain?.length || log.mood?.length || log.food?.length || log.workout?.length || log.sex?.length || log.sleep?.length || log.vitals?.length || log.nausea?.length || log.headache?.length || log.tetany?.length || log.panic?.length || log.bowel?.length || log.urinary?.length || log.discharge?.length || log.bodyBattery?.length || log.note);
}

export function subscribeBixboChanges(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hasStoredBixboSnapshot(): boolean {
  if (typeof localStorage === "undefined") return false;
  return !!(localStorage.getItem(BIXBO_STORAGE_KEY) || localStorage.getItem(BIXBO_LEGACY_STORAGE_KEY));
}

export function clearBixboLocalStorage() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(BIXBO_STORAGE_KEY);
  localStorage.removeItem(BIXBO_LEGACY_STORAGE_KEY);
  cache = null;
  emit();
}

export function hasAuthoritativeLocalSnapshot(): boolean {
  return hasStoredBixboSnapshot();
}

export function setPartner(_p: unknown) {
  // no-op placeholder for partner features
}

export function markDeleted(update: (u: (d: BixboData) => BixboData) => void, ...ids: string[]) {
  update((d) => ({
    ...d,
    deletedIds: Array.from(new Set([...(d.deletedIds ?? []), ...ids])).slice(-2000),
  }));
}

export function withCustomTombstones<K extends keyof CustomLists>(
  d: BixboData,
  key: K,
  removed: string[],
): BixboData {
  if (!removed.length) return d;
  const prev = d.deletedCustom?.[key] ?? [];
  return {
    ...d,
    deletedCustom: {
      ...(d.deletedCustom ?? {}),
      [key]: Array.from(new Set([...prev, ...removed])),
    },
  };
}

export function withoutCustomTombstones(d: BixboData): BixboData {
  return d;
}

export function normalizeBixboBackup(v: any): BixboData {
  return normalize(v as BixboData);
}

/* ------------------- React hook ------------------- */
export function useBixbo() {
  const data = useSyncExternalStore(subscribeBixboChanges, getSnapshot, () => EMPTY);
  const update = (fn: (d: BixboData) => BixboData) => {
    setBixbo(fn(getSnapshot()));
  };
  const [hydrated, setHydrated] = useStateSafe(true);
  return { data, update, hydrated };
}

function useStateSafe(init: boolean) {
  // lightweight to avoid import cycle; real React useState is fine in component
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useState } = require("react");
    return useState(init);
  } catch {
    return [init, () => {}] as const;
  }
}

// storage migration hardened for cloud data
