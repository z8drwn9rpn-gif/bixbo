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
import type { BixboData, NoteFolder } from "./types";

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
  medLogNotes: {},
  medLogItems: {},
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
    language: "en",
    gender: "female",
    theme: "system",
    savedTriggers: [],
    tracking: { ...DEFAULT_TRACKING_PREFS },
    units: { ...DEFAULT_UNIT_PREFS },
    privacy: { ...DEFAULT_ACCOUNT_PRIVACY_PREFS },
    backup: { ...DEFAULT_BACKUP_PREFS },
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
  patterns: { treatmentArchive: [] },
};

export const BIXBO_STORAGE_KEY = "bixbo:v2";

export const BIXBO_LEGACY_STORAGE_KEY = "bixbo:v1";

export const KEY = BIXBO_STORAGE_KEY;

export const LEGACY_KEY = BIXBO_LEGACY_STORAGE_KEY;

export const LEGACY_HEALTH_PREFS_KEY = "bixbo:health-preferences";

export const INSTALL_ORIGIN_KEY = "bixbo:install-origin-v3";

export const SAFETY_BACKUP_KEY = "bixbo:safety-backup:v1";

export const SAFETY_BACKUP_MAX_BYTES = 2_000_000;
