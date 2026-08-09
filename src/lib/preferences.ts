import type { BixboData, NotificationPrefs, Settings } from "./storage";

export type PainScaleMode = "whole" | "half";

export interface TrackingPreferences {
  pain: boolean;
  tetany: boolean;
  panic: boolean;
  bowel: boolean;
  cycle: boolean;
  painScale: PainScaleMode;
}

export interface UnitPreferences {
  weight: "kg" | "lb";
  temperature: "c" | "f";
  volume: "ml" | "oz";
  time: "24h" | "12h";
}

export interface AccountPrivacyPreferences {
  analytics: boolean;
  crashReports: boolean;
}

export interface BackupPreferences {
  autoBackup: boolean;
  lastBackupAt?: string;
}

export const DEFAULT_TRACKING_PREFS: TrackingPreferences = {
  pain: true,
  tetany: true,
  panic: true,
  bowel: true,
  cycle: true,
  painScale: "half",
};

export const DEFAULT_UNIT_PREFS: UnitPreferences = {
  weight: "kg",
  temperature: "c",
  volume: "ml",
  time: "24h",
};

export const DEFAULT_ACCOUNT_PRIVACY_PREFS: AccountPrivacyPreferences = {
  analytics: false,
  crashReports: true,
};

export const DEFAULT_BACKUP_PREFS: BackupPreferences = {
  autoBackup: false,
};

export function trackingPrefs(data: Pick<BixboData, "settings">): TrackingPreferences {
  return { ...DEFAULT_TRACKING_PREFS, ...(data.settings.tracking ?? {}) };
}

export function unitPrefs(data: Pick<BixboData, "settings">): UnitPreferences {
  return { ...DEFAULT_UNIT_PREFS, ...(data.settings.units ?? {}) };
}

export function accountPrivacyPrefs(data: Pick<BixboData, "settings">): AccountPrivacyPreferences {
  return { ...DEFAULT_ACCOUNT_PRIVACY_PREFS, ...(data.settings.privacy ?? {}) };
}

export function backupPrefs(data: Pick<BixboData, "settings">): BackupPreferences {
  return { ...DEFAULT_BACKUP_PREFS, ...(data.settings.backup ?? {}) };
}

export function trackingCategoryEnabled(
  data: Pick<BixboData, "settings">,
  category: keyof Omit<TrackingPreferences, "painScale">,
): boolean {
  return trackingPrefs(data)[category];
}

export function weightFromDisplay(value: number, units: UnitPreferences): number {
  return units.weight === "lb" ? value / 2.2046226218 : value;
}

export function weightToDisplay(valueKg: number, units: UnitPreferences): number {
  return units.weight === "lb" ? valueKg * 2.2046226218 : valueKg;
}

export function weightUnitLabel(units: UnitPreferences): string {
  return units.weight === "lb" ? "lb" : "kg";
}

export function temperatureFromDisplay(value: number, units: UnitPreferences): number {
  return units.temperature === "f" ? ((value - 32) * 5) / 9 : value;
}

export function temperatureToDisplay(valueC: number, units: UnitPreferences): number {
  return units.temperature === "f" ? (valueC * 9) / 5 + 32 : valueC;
}

export function temperatureUnitLabel(units: UnitPreferences): string {
  return units.temperature === "f" ? "°F" : "°C";
}

export function volumeFromDisplay(value: number, units: UnitPreferences): number {
  return units.volume === "oz" ? value * 29.5735295625 : value;
}

export function volumeToDisplay(valueMl: number, units: UnitPreferences): number {
  return units.volume === "oz" ? valueMl / 29.5735295625 : valueMl;
}

export function volumeUnitLabel(units: UnitPreferences): string {
  return units.volume === "oz" ? "oz" : "ml";
}

export function formatWeight(valueKg: number, units: UnitPreferences, digits = 1): string {
  return `${weightToDisplay(valueKg, units).toFixed(digits)} ${weightUnitLabel(units)}`;
}

export function formatTemperature(valueC: number, units: UnitPreferences, digits = 1): string {
  return `${temperatureToDisplay(valueC, units).toFixed(digits)}${temperatureUnitLabel(units)}`;
}

export function formatVolume(valueMl: number, units: UnitPreferences, digits = 0): string {
  return `${volumeToDisplay(valueMl, units).toFixed(digits)} ${volumeUnitLabel(units)}`;
}

/** Migrate old nested preference shapes that used to live under settings. */
export function settingsFromLegacyHealthPreferences(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== "object") return {};
  const legacy = raw as Record<string, unknown>;
  const result: Partial<Settings> = {};

  const painScale = legacy.painScale;
  const tracking = legacy.trackingPrefs;
  if (tracking && typeof tracking === "object") {
    const t = tracking as Record<string, unknown>;
    result.tracking = {
      ...DEFAULT_TRACKING_PREFS,
      pain: typeof t.pain === "boolean" ? t.pain : true,
      tetany: typeof t.tetany === "boolean" ? t.tetany : true,
      panic: typeof t.panic === "boolean" ? t.panic : true,
      bowel: typeof t.bowel === "boolean" ? t.bowel : true,
      cycle: typeof t.cycle === "boolean" ? t.cycle : true,
      painScale: painScale === "whole" ? "whole" : "half",
    };
  } else if (painScale === "whole" || painScale === "half") {
    result.tracking = { ...DEFAULT_TRACKING_PREFS, painScale };
  }

  const legacyUnits = legacy.units;
  if (legacyUnits && typeof legacyUnits === "object") {
    const u = legacyUnits as Record<string, unknown>;
    result.units = {
      weight: u.weight === "lb" ? "lb" : "kg",
      temperature: u.temperature === "f" ? "f" : "c",
      volume: u.volume === "oz" ? "oz" : "ml",
      time: u.time === "12h" ? "12h" : "24h",
    };
  }

  const legacyPrivacy = legacy.privacyPrefs;
  if (legacyPrivacy && typeof legacyPrivacy === "object") {
    const p = legacyPrivacy as Record<string, unknown>;
    result.privacy = {
      analytics: p.analytics === true,
      crashReports: p.crashReports !== false,
    };
  }

  const legacyBackup = legacy.backupPrefs;
  if (legacyBackup && typeof legacyBackup === "object") {
    const b = legacyBackup as Record<string, unknown>;
    result.backup = {
      autoBackup: b.autoBackup === true,
      lastBackupAt: typeof b.lastBackup === "string" && b.lastBackup ? b.lastBackup : undefined,
    };
  }

  const legacyReminders = legacy.reminderPrefs;
  if (legacyReminders && typeof legacyReminders === "object") {
    const r = legacyReminders as Record<string, unknown>;
    const notif: NotificationPrefs = {
      meds: r.medication !== false,
      dailyLog: r.dailyCheckIn === true,
      period: r.periodPrediction !== false,
      hydration: r.water === true,
      sleep: r.sleep === true,
      appointments: r.doctorAppointments !== false,
      quietHoursEnabled: r.quietHours === true,
      dailyLogTime: typeof r.dailyTime === "string" ? r.dailyTime : undefined,
      hydrationEveryHours: Number.isFinite(Number(r.waterIntervalHours))
        ? Math.min(12, Math.max(1, Number(r.waterIntervalHours)))
        : undefined,
      quietStart: typeof r.quietStart === "string" ? r.quietStart : undefined,
      quietEnd: typeof r.quietEnd === "string" ? r.quietEnd : undefined,
    };
    result.notif = notif;
  }

  return result;
}
