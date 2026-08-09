import { useEffect, useSyncExternalStore } from "react";
// TEMP RESTORE - full file will be restored in follow-up if needed
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
export const DEFAULT_FOLDERS = [
  { id: "general", name: "General", icon: "note" },
  { id: "health", name: "Health", icon: "heart" },
  { id: "ideas", name: "Ideas", icon: "star" },
];
export const EMPTY = { folders: DEFAULT_FOLDERS, notebook: [], dayLogs: {}, settings: { textSize: "md", notifications: true, gender: "female" } } as any;
export function useBixbo() { return { data: EMPTY, update: () => {}, hydrated: true }; }
export function hasStoredBixboSnapshot() { return false; }
export function clearBixboLocalStorage() {}
export function getBixbo() { return EMPTY; }
export function setBixbo() {}
export function replaceBixbo() {}
export function setPartner() {}
export function subscribeBixboChanges() { return () => {}; }
export function updateDayLog() {}
export function hasAnyLog() { return false; }
export function toKey() { return ""; }
export function fromKey() { return new Date(); }
export function todayKey() { return ""; }
export function nowHHMM() { return "00:00"; }
export function daysBetween() { return 0; }
export function addDays() { return ""; }
export function isDateInRange() { return false; }
export function predictPeriods() { return []; }
export function nextPredictedPeriod() { return null; }
export function painColor() { return ""; }
export function avgDayPain() { return undefined; }
export function vitalEntriesFor() { return []; }
export function latestDayWeight() { return undefined; }
export function latestDayTemperature() { return undefined; }
export function averageDayTemperature() { return undefined; }
export function userGender() { return "female"; }
export function isPregnancyActive() { return false; }
export function isPostpartumActive() { return false; }
export function isCycleTrackingHidden() { return false; }
export function userAllergens() { return []; }
export function latestRecordedWeight() { return undefined; }
export function asArr(v: any) { return Array.isArray(v) ? v : v ? [v] : []; }
export function pregnancyInfo() { return null; }
export function workoutHasDistance() { return false; }
export function workoutIsHike() { return false; }
export function workoutIsStrength() { return false; }
export function isIntercourseKind() { return false; }
export function markDeleted() {}
export function withCustomTombstones(d: any) { return d; }
export function withoutCustomTombstones(d: any) { return d; }
export function normalizeBixboBackup(v: any) { return v; }
export function hasAuthoritativeLocalSnapshot() { return false; }
export const BIXBO_STORAGE_KEY = "bixbo:v2";
export const BIXBO_LEGACY_STORAGE_KEY = "bixbo:v1";
export const PAIN_DESCRIPTIONS = {};
export const BODY_PARTS_DEFAULT = [];
export const PAIN_QUALITY_DEFAULT = [];
export const OTHER_SYMPTOMS_DEFAULT = [];
export const FOOD_FEELINGS_DEFAULT = [];
export const WORKOUT_KINDS_DEFAULT = [];
export const MOODS_DEFAULT = [];
export const TETANY_TYPES = [];
export const TETANY_TYPE_DESC = {};
export const TETANY_LOCATIONS_DEFAULT = [];
export const TETANY_TRIGGERS = [];
export const TETANY_HELPED_DEFAULT = [];
export const PANIC_PHYSICAL = [];
export const PANIC_COGNITIVE = [];
export const PANIC_HELPED_DEFAULT = [];
export const HEADACHE_TYPES = [];
export const HEADACHE_TYPE_DESC = {};
export const SEX_TYPES_DEFAULT = [];
export const DISCHARGE_OPTS = [];
export const BRISTOL = [];
export const BOWEL_FEELINGS_DEFAULT = [];
export const BOWEL_SYMPTOMS_DEFAULT = [];
export const EVENT_COLORS = [];
export const BODY_BATTERY = [];
export const SLEEP_QUALITY = [];
export const SEX_FEELINGS_DEFAULT = [];
export const PCOS_SYMPTOMS = [];
export const HISTAMINE_SYMPTOMS = [];
export const FOOD_SYMPTOMS_AFTER = [];
export const URINARY_DEFAULT = [];
export const ALLERGENS_DEFAULT = [];
export const PRESSURE_TYPES = [];
export const NAUSEA_TYPES = [];
export const NAUSEA_TYPE_DESC = {};
export const NAUSEA_SEVERITY_DESC = {};
export const NAUSEA_TRIGGERS = [];
export const NAUSEA_SYMPTOMS = [];
export const NAUSEA_HELPED = [];
