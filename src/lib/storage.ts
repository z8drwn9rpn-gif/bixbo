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
    case "spotting": return "Spotting";
    case "light": return "Light";
    case "medium": return "Medium";
    case "heavy": return "Heavy";
    case "very-heavy": return "Very heavy";
    default: return "";
  }
}
export type SexKind = "sex" | "fingering" | "suck_dick" | "oral" | "other" | "sex_with_condom" | "sex_without_condom" | "oral_giving" | "oral_receiving";
export type ThermoKind = "heat" | "cold" | "tens";
export type PainfulWhen = "no" | "before" | "during" | "after";
export type Gender = "female" | "male";

export interface PainEntry { id: string; time: string; score: number; parts: string[]; quality: string[]; other?: string[]; symptoms?: string[]; note?: string; bodyBattery?: number; stress?: number; mood?: string[]; hotFlashesOn?: boolean; hotFlashes?: number; headache?: boolean; headacheTypes?: string[]; headacheIntensity?: number; headacheMed?: string; headacheMedTime?: string; pressureTypes?: string[]; pressureIntensity?: number; nausea?: boolean; nauseaTypes?: string[]; nauseaSeverity?: number; nauseaMinutes?: number; nauseaOngoing?: boolean; nauseaTriggers?: string[]; nauseaSymptoms?: string[]; nauseaHelped?: string[]; fluNote?: string; pcosSymptoms?: string[]; }
export interface TetanyEpisode { id: string; time: string; types: string[]; location: string[]; intensity: number; minutes?: number; triggers: string[]; timeSinceMagnerotMin?: number; helped: string[]; rescueMed?: string; note?: string; }
export interface PanicAttack { id: string; time: string; minutes?: number; intensity: number; physical: string[]; cognitive: string[]; trigger?: string; place?: string; hyperventilation?: string; tetanyPresent?: boolean; helped: string[]; rescueMed?: string; note?: string; }
export interface ThermoSession { id: string; kind: ThermoKind; start: string; minutes: number; ongoing?: boolean; note?: string; }
export interface FoodEntry { id: string; time: string; what?: string; items?: string[]; feelings: string[]; after?: string; symptomsAfter?: string[]; note?: string; }
export interface BowelEntry { id: string; time: string; bristol?: number; feelings?: string[]; symptoms?: string[]; urinary?: string[]; note?: string; }
export interface SexEntry { id: string; time: string; kind: SexKind; feelingAfter?: string | string[]; painful?: PainfulWhen; note?: string; }
export interface WorkoutEntry { id: string; time: string; kind: string; minutes?: number; durationMin?: number; distanceKm?: number; weightKg?: number; note?: string; }
export interface MoodEntry { id: string; time: string; moods?: string[]; value?: string; note?: string; }
export interface VitalMeasurement { id: string; time: string; value: number; }
export interface DayLog {
  pain?: PainEntry[]; tetany?: TetanyEpisode[]; panic?: PanicAttack[]; heat?: ThermoSession[];
  period?: PeriodLevel; periodInfo?: { level: PeriodLevel; discharge?: string; note?: string; cramps?: number };
  food?: FoodEntry[]; bowel?: BowelEntry[]; sex?: SexEntry[]; workout?: WorkoutEntry[]; mood?: MoodEntry[];
  temperatureEntries?: VitalMeasurement[]; weightEntries?: VitalMeasurement[];
  temperature?: number; weight?: number; sleepHours?: number; sleepQuality?: string | string[];
  extraMeds?: { id: string; time: string; name: string; dose?: string; note?: string }[];
  bodyBattery?: { id: string; time: string; level: number; note?: string }[];
  note?: string; pregnancy?: unknown; postpartum?: unknown;
}
export interface NoteChecklistItem { id: string; text: string; done: boolean; }
export interface Note { id: string; folderId: string; title: string; content?: string; body?: string; checklist?: NoteChecklistItem[]; pinned?: boolean; createdAt: number | string; updatedAt?: number | string; }
export interface NoteFolder { id: string; name: string; icon?: string; }
export interface CyclePrefs { lastPeriodStart?: string; lastPeriodEnd?: string; cycleLength: number; periodLength: number; }
export interface Med { id: string; name: string; dose?: string; times?: string[]; schedule?: string; active?: boolean; asNeeded?: boolean; color?: string; note?: string; }
export interface EventEntry { id: string; title: string; startDate?: string; endDate?: string; date?: string; time?: string; timeEnd?: string; note?: string; color?: string; }
export interface TaskEntry { id: string; title: string; startDate?: string; endDate?: string; time?: string; timeEnd?: string; done: boolean; note?: string; }
export interface CustomLists {
  bodyParts: string[]; quality: string[]; symptoms: string[]; foodFeelings: string[]; foodQuickAdd: string[];
  workoutKinds: string[]; moods: string[]; tetanyTypes: string[]; tetanyLocations: string[]; tetanyTriggers: string[];
  tetanyHelped: string[]; panicPhysical: string[]; panicCognitive: string[]; panicHelped: string[];
  sexTypes: string[]; bowelFeelings: string[]; bowelSymptoms: string[]; pcosSymptoms: string[];
  headacheTypes: string[]; histamineSymptoms: string[]; foodSymptomsAfter: string[]; sexFeelings: string[];
  urinary: string[]; allergens: string[]; pressureTypes: string[]; nauseaTypes: string[];
  nauseaTriggers: string[]; nauseaSymptoms: string[]; nauseaHelped: string[]; labTests?: string[];
}
export interface Settings {
  textSize: "sm" | "md" | "lg" | "xl"; notifications: boolean; theme?: "light" | "dark" | "system";
  gender?: Gender; userName?: string; tracking?: TrackingPreferences; units?: UnitPreferences;
  privacy?: AccountPrivacyPreferences; backup?: BackupPreferences; notif?: NotificationPrefs;
  pregnantSince?: string; birthControlSince?: string; allergens?: string[];
  logOrder?: string[]; quickTagOrder?: string[]; hiddenQuickTags?: string[]; customQuickTags?: unknown[];
  savedTriggers?: { id: string; a: string; b: string }[]; scaleDescriptions?: Record<string, Record<number, string>>;
}
export interface NotificationPrefs { enabled?: boolean; meds?: boolean; period?: boolean; ovulation?: boolean; dailyLog?: boolean; [k: string]: unknown; }
export interface PregnancyAppointment { id: string; date: string; time?: string; kind?: string; title: string; doctor?: string; note?: string; }
export interface PregnancyState { active: boolean; lmp?: string; dueDate?: string; startWeightKg?: number; hospitalBag?: { id: string; text: string; done: boolean }[]; vaccinations?: { id: string; text: string; done: boolean }[]; supplements?: { id: string; text: string; done: boolean }[]; appointments?: PregnancyAppointment[]; note?: string; endedAt?: string; }
export interface PostpartumState { active: boolean; birthDate?: string; deliveryType?: string; babyName?: string; visits?: PregnancyAppointment[]; note?: string; endedAt?: string; }
export interface HealthProfile { name?: string; nickname?: string; birthDate?: string; heightCm?: number; weightKg?: number; gender?: string; allergies?: string[]; [k: string]: unknown; }
export interface SyncMetadata { updatedAt: Record<string, number>; deletedAt: Record<string, number>; }
export interface BixboData {
  dayLogs: Record<string, DayLog>; dayNotes?: Record<string, unknown>; todos?: Record<string, unknown>;
  tasks?: TaskEntry[]; events?: EventEntry[]; meds?: Med[]; medLog?: Record<string, Record<string, boolean>>;
  medLogTimes?: Record<string, Record<string, string>>; medNames?: Record<string, string>;
  folders: NoteFolder[]; notebook: Note[]; cycle: CyclePrefs; custom: CustomLists; settings: Settings;
  deletedIds?: string[]; deletedCustom?: Partial<Record<keyof CustomLists, string[]>>;
  syncMeta?: SyncMetadata; profile?: HealthProfile; pregnancy?: PregnancyState; postpartum?: PostpartumState;
  partner?: unknown; labs?: unknown[]; docs?: unknown[]; diagnoses?: unknown[];
}

export const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "general", name: "General", icon: "note" },
  { id: "health", name: "Health", icon: "heart" },
  { id: "ideas", name: "Ideas", icon: "star" },
];

export const EMPTY: BixboData = {
  dayLogs: {}, dayNotes: {}, todos: {}, tasks: [], events: [], meds: [], medLog: {}, medLogTimes: {}, medNames: {},
  folders: DEFAULT_FOLDERS, notebook: [],
  cycle: { cycleLength: 28, periodLength: 5 },
  custom: {
    bodyParts: [], quality: [], symptoms: [], foodFeelings: [], foodQuickAdd: [], workoutKinds: [], moods: [],
    tetanyTypes: [], tetanyLocations: [], tetanyTriggers: [], tetanyHelped: [], panicPhysical: [], panicCognitive: [],
    panicHelped: [], sexTypes: [], bowelFeelings: [], bowelSymptoms: [], pcosSymptoms: [], headacheTypes: [],
    histamineSymptoms: [], foodSymptomsAfter: [], sexFeelings: [], urinary: [], allergens: [], pressureTypes: [],
    nauseaTypes: [], nauseaTriggers: [], nauseaSymptoms: [], nauseaHelped: [], labTests: [],
  },
  settings: { textSize: "md", notifications: true, gender: "female", theme: "system" },
  deletedIds: [], deletedCustom: {}, syncMeta: { updatedAt: {}, deletedAt: {} },
  profile: {}, pregnancy: { active: false, hospitalBag: [], vaccinations: [], supplements: [], appointments: [] },
  postpartum: { active: false, visits: [] },
};

export const BIXBO_STORAGE_KEY = "bixbo:v2";
export const BIXBO_LEGACY_STORAGE_KEY = "bixbo:v1";

export function asArr(v: any): any[] { return Array.isArray(v) ? v : v != null && v !== "" ? [v] : []; }
export function toKey(d: Date): string { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
export function fromKey(k: string): Date { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); }
export function todayKey() { return toKey(new Date()); }
export function nowHHMM(): string { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
export function daysBetween(a: string | Date, b?: string | Date): number {
  if (typeof a === "string" && typeof b === "string") return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
  if (a instanceof Date && b instanceof Date) return Math.round((b.getTime() - a.getTime()) / 86400000);
  return 0;
}
export function addDays(k: string, n: number): string { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); }
export function isDateInRange(k: string, start: string, end: string): boolean { return k >= start && k <= end; }
export function painColor(score?: number): string {
  if (score == null) return "#94a3b8";
  if (score <= 2) return "#22c55e"; if (score <= 4) return "#84cc16"; if (score <= 6) return "#eab308"; if (score <= 8) return "#f97316"; return "#ef4444";
}
export function avgDayPain(log?: DayLog): number | undefined {
  const pains = log?.pain; if (!pains?.length) return undefined;
  return Math.round((pains.reduce((s, p) => s + (p.score ?? 0), 0) / pains.length) * 10) / 10;
}
export function vitalEntriesFor(log?: DayLog, field?: string): VitalMeasurement[] {
  if (!log) return [];
  if (field === "weightEntries") return log.weightEntries ?? [];
  if (field === "temperatureEntries") return log.temperatureEntries ?? [];
  return [];
}
export function latestDayWeight(log?: DayLog): number | undefined {
  const e = log?.weightEntries; if (e?.length) return e[e.length-1]?.value; return log?.weight;
}
export function latestDayTemperature(log?: DayLog): number | undefined {
  const e = log?.temperatureEntries; if (e?.length) return e[e.length-1]?.value; return log?.temperature;
}
export function averageDayTemperature(log?: DayLog): number | undefined {
  const e = log?.temperatureEntries; if (!e?.length) return log?.temperature;
  return e.reduce((s, x) => s + x.value, 0) / e.length;
}
export function userGender(data: Pick<BixboData, "settings">): Gender { return data.settings?.gender ?? "female"; }
export function isPregnancyActive(data: Pick<BixboData, "pregnancy" | "settings">): boolean { return Boolean(data.pregnancy?.active || data.settings?.pregnantSince); }
export function isPostpartumActive(data: Pick<BixboData, "postpartum">): boolean { return Boolean(data.postpartum?.active); }
export function isCycleTrackingHidden(data: Pick<BixboData, "settings" | "pregnancy" | "postpartum">): boolean {
  return data.settings?.tracking?.cycle === false || userGender(data) === "male" || isPregnancyActive(data) || isPostpartumActive(data);
}
export function userAllergens(data: Pick<BixboData, "profile" | "settings" | "custom">): string[] {
  const source = data.profile?.allergies?.length ? data.profile.allergies : data.settings?.allergens?.length ? data.settings.allergens : data.custom?.allergens;
  return Array.from(new Set((source ?? []).map((v) => String(v).trim()).filter(Boolean)));
}
export function latestRecordedWeight(data: Pick<BixboData, "dayLogs" | "profile">): number | undefined {
  const keys = Object.keys(data.dayLogs ?? {}).sort().reverse();
  for (const k of keys) { const w = latestDayWeight(data.dayLogs[k]); if (w != null) return w; }
  return data.profile?.weightKg;
}
export function pregnancyInfo(since?: string | BixboData): { week: number; trimester: 1 | 2 | 3 } | null {
  if (!since) return null;
  if (typeof since !== "string") { const p = since.pregnancy; if (!p?.active) return null; since = p.lmp || p.dueDate; if (!since) return null; }
  const days = daysBetween(since as string, todayKey()); if (days < 0) return null;
  const week = Math.floor(days / 7) + 1; const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return { week, trimester };
}
export function workoutHasDistance(kind: string) { return /walk|run|hike|cycle|swim/i.test(kind); }
export function workoutIsHike(kind: string) { return /hike/i.test(kind); }
export function workoutIsStrength(kind: string) { return /strength|weight/i.test(kind); }
export function isIntercourseKind(kind: unknown): boolean {
  const raw = String(kind ?? "").toLowerCase(); return ["sex", "sex_with_condom", "sex_without_condom", "with_condom", "without_condom"].includes(raw);
}
export function predictPeriods(cycle: CyclePrefs, from: Date, to: Date): { start: string; end: string }[] {
  if (!cycle.lastPeriodStart) return [];
  const out: { start: string; end: string }[] = [];
  const fromK = toKey(from), toK = toKey(to);
  let curStart = cycle.lastPeriodStart;
  while (curStart <= toK) {
    const end = addDays(curStart, Math.max(0, (cycle.periodLength || 5) - 1));
    if (end >= fromK) out.push({ start: curStart, end });
    curStart = addDays(curStart, cycle.cycleLength || 28);
    if (out.length > 24) break;
  }
  return out;
}
export function nextPredictedPeriod(cycle: CyclePrefs): { start: string; end: string } | null {
  if (!cycle.lastPeriodStart) return null;
  const todayK = todayKey(); let s = cycle.lastPeriodStart;
  while (s <= todayK) s = addDays(s, cycle.cycleLength || 28);
  return { start: s, end: addDays(s, Math.max(0, (cycle.periodLength || 5) - 1)) };
}

export const PAIN_DESCRIPTIONS: Record<number, string> = { 0: "Pain free", 1: "Very minor", 2: "Minor", 3: "Annoying", 4: "Bearable", 5: "Can't ignore", 6: "Hard to ignore", 7: "Hard to concentrate", 8: "Limited activity", 9: "Unable to speak", 10: "Unconscious" };
export const BODY_PARTS_DEFAULT = ["Abdomen", "Lower abdomen", "Pelvis", "Ovaries", "Back", "Head", "Legs", "Chest"];
export const PAIN_QUALITY_DEFAULT = ["Cramping", "Stabbing", "Burning", "Dull", "Sharp", "Throbbing", "Pressure"];
export const OTHER_SYMPTOMS_DEFAULT = ["Dizziness", "Fatigue", "Bloating", "Diarrhea", "Constipation", "Cold sweats"];
export const FOOD_FEELINGS_DEFAULT = ["Great", "Fine", "Neutral", "Off", "Bloated", "Nauseous"];
export const WORKOUT_KINDS_DEFAULT = ["Yoga", "Walk", "Run", "Hike", "Cycling", "Strength", "Stretching", "Swim"];
export const MOODS_DEFAULT = ["Happy", "Calm", "Anxious", "Irritable", "Sad", "Energetic", "Tired", "Motivated"];
export const TETANY_TYPES = ["Carpopedal spasm", "Calf cramps", "Tingling / numbness", "Fasciculations"];
export const TETANY_TYPE_DESC: Record<string, string> = {};
export const TETANY_LOCATIONS_DEFAULT = ["Lips", "Fingers", "Toes", "Hands", "Calves", "Face"];
export const TETANY_TRIGGERS = ["Hyperventilation / stress", "Exercise", "Cold", "Cycle phase", "Other"];
export const TETANY_HELPED_DEFAULT = ["Slow breathing", "Warmth", "Extra magnesium", "Rest"];
export const PANIC_PHYSICAL = ["Racing heart", "Shortness of breath", "Chest pressure", "Dizziness", "Trembling", "Nausea"];
export const PANIC_COGNITIVE = ["Loss of control", "Derealization", "Fear of dying"];
export const PANIC_HELPED_DEFAULT = ["Slow exhale", "Grounding", "Fresh air"];
export const HEADACHE_TYPES = ["Tension", "Migraine", "Cluster", "Sinus", "Hormonal"];
export const HEADACHE_TYPE_DESC: Record<string, string> = {};
export const SEX_TYPES_DEFAULT = [{ value: "sex" as SexKind, label: "Sex" }, { value: "oral" as SexKind, label: "Oral" }];
export const DISCHARGE_OPTS = [{ value: "clear", label: "Clear", color: "#dbeafe" }, { value: "white", label: "White", color: "#f5f5f4" }, { value: "brown", label: "Brown", color: "#a16207" }];
export const BRISTOL = [
  { n: 1, label: "Type 1", sub: "Hard lumps", color: "#7c3aed", shape: "lumps" },
  { n: 2, label: "Type 2", sub: "Lumpy", color: "#2563eb", shape: "lumpy" },
  { n: 3, label: "Type 3", sub: "Cracked", color: "#16a34a", shape: "cracked" },
  { n: 4, label: "Type 4", sub: "Smooth", color: "#eab308", shape: "smooth" },
  { n: 5, label: "Type 5", sub: "Soft blobs", color: "#f97316", shape: "blobs" },
  { n: 6, label: "Type 6", sub: "Mushy", color: "#ec4899", shape: "mushy" },
  { n: 7, label: "Type 7", sub: "Liquid", color: "#dc2626", shape: "liquid" },
];
export const BOWEL_FEELINGS_DEFAULT = ["Relief", "Normal", "Painful", "Urgent"];
export const BOWEL_SYMPTOMS_DEFAULT = ["Bloating", "Cramps", "Blood", "Mucus"];
export const EVENT_COLORS = ["#93A66A", "#7895B2", "#D89B72", "#C97D91", "#9A82C4"];
export const BODY_BATTERY = [
  { n: 1, label: "Drained", color: "#ef4444", emoji: "😴" },
  { n: 2, label: "Low", color: "#f97316", emoji: "🙁" },
  { n: 3, label: "Ok", color: "#eab308", emoji: "😐" },
  { n: 4, label: "Good", color: "#22c55e", emoji: "🙂" },
  { n: 5, label: "Fully charged", color: "#16a34a", emoji: "⚡" },
];
export const SLEEP_QUALITY = ["Awful", "Poor", "Ok", "Good", "Great"];
export const SEX_FEELINGS_DEFAULT = ["Great", "Good", "Meh", "Sore"];
export const PCOS_SYMPTOMS = ["Acne", "Hirsutism", "Weight gain", "Fatigue"];
export const HISTAMINE_SYMPTOMS = ["Flushing", "Hives", "Itching", "Headache"];
export const FOOD_SYMPTOMS_AFTER = ["Bloating", "Gas", "Nausea", "Cramps", "Fatigue"];
export const URINARY_DEFAULT = ["Frequent", "Painful", "Urgency"];
export const ALLERGENS_DEFAULT = ["Nuts", "Dairy", "Gluten", "Eggs"];
export const PRESSURE_TYPES = ["Pelvic", "Abdominal", "Head / sinus"];
export const NAUSEA_TYPES = ["Mild nausea", "Moderate nausea", "Severe nausea"];
export const NAUSEA_TYPE_DESC: Record<string, string> = {};
export const NAUSEA_SEVERITY_DESC: Record<number, string> = { 0: "None", 5: "Moderate", 10: "Extreme" };
export const NAUSEA_TRIGGERS = ["After food", "Smell", "Hormonal", "Stress", "Unknown"];
export const NAUSEA_SYMPTOMS = ["Dizziness", "Cold sweat", "Vomiting"];
export const NAUSEA_HELPED = ["Lying down", "Ginger tea", "Fresh air", "Medication"];

function load(): BixboData {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(BIXBO_STORAGE_KEY) ?? localStorage.getItem(BIXBO_LEGACY_STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed, folders: parsed.folders?.length ? parsed.folders : DEFAULT_FOLDERS, settings: { ...EMPTY.settings, ...parsed.settings } };
  } catch { return { ...EMPTY }; }
}
function save(data: BixboData) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(BIXBO_STORAGE_KEY, JSON.stringify(data)); } catch {}
}
let cache: BixboData | null = null;
const listeners = new Set<() => void>();
function getSnapshot(): BixboData { if (!cache) cache = load(); return cache; }
function emit() { listeners.forEach((l) => l()); }

export function getBixbo(): BixboData { return getSnapshot(); }
export function setBixbo(dataOrFn: BixboData | ((d: BixboData) => BixboData)) {
  const next = typeof dataOrFn === "function" ? dataOrFn(getSnapshot()) : dataOrFn;
  cache = { ...EMPTY, ...next };
  save(cache);
  emit();
}
export function replaceBixbo(d: BixboData) { setBixbo(d); }
export function setPartner(_p?: unknown) {}
export function subscribeBixboChanges(fn: (d?: BixboData, reason?: string) => void) {
  const cb = () => fn(getSnapshot(), "local");
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export function updateDayLog(a: any, b?: any, c?: any) {
  if (typeof a === "function") {
    // update((u) => ...) style from some callers
    return;
  }
  const date = typeof a === "string" ? a : b;
  const patch = typeof a === "string" ? b : c;
  if (typeof date !== "string" || typeof patch !== "function") return;
  setBixbo((d) => ({
    ...d,
    dayLogs: { ...d.dayLogs, [date]: patch(d.dayLogs[date] ?? {}) },
  }));
}
export function hasAnyLog(l?: DayLog): boolean {
  if (!l) return false;
  return !!(l.pain?.length || l.period || l.food?.length || l.mood?.length || l.workout?.length || l.sex?.length || l.note || l.bowel?.length || l.temperature != null || l.weight != null);
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
export function hasAuthoritativeLocalSnapshot(): boolean { return hasStoredBixboSnapshot(); }
export function markDeleted(update: (u: (d: BixboData) => BixboData) => void, ...ids: string[]) {
  update((d) => ({ ...d, deletedIds: Array.from(new Set([...(d.deletedIds ?? []), ...ids])).slice(-2000) }));
}
export function withCustomTombstones<K extends keyof CustomLists>(d: BixboData, key: K, removed: string[]): BixboData {
  if (!removed.length) return d;
  const prev = d.deletedCustom?.[key] ?? [];
  return { ...d, deletedCustom: { ...(d.deletedCustom ?? {}), [key]: Array.from(new Set([...prev, ...removed])) } };
}
export function withoutCustomTombstones(d: BixboData, key?: keyof CustomLists, restored?: string[]): BixboData { return d; }
export function normalizeBixboBackup(v: any): BixboData { return { ...EMPTY, ...v }; }

export function useBixbo() {
  const data = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getSnapshot,
    () => EMPTY,
  );
  return { data, update: setBixbo, replace: (d: BixboData) => replaceBixbo(d), hydrated: true };
}
