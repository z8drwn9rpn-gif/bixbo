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
