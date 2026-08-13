import { medScheduleItems, toKey, type Med } from "./storage";

export type MedicationLog = Record<string, Record<string, boolean>>;
export type MedicationLogItems = Record<string, Record<string, string[]>>;

export type ScheduledDoseState = {
  key: string;
  eligible: boolean;
  allItems: string[];
  selectedItems: string[];
  missedItems: string[];
};

export function scheduledTimeMinutes(time: string): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function isMedicationDoseEligibleNow(
  dateKey: string,
  time: string,
  taken: boolean,
  now: Date,
): boolean {
  const today = toKey(now);
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  if (taken) return true;

  const scheduled = scheduledTimeMinutes(time);
  if (scheduled == null) return false;
  return scheduled <= now.getHours() * 60 + now.getMinutes();
}

/**
 * Canonical grouped-scheduled-med resolver.
 * Legacy records that only have medLog=true mean the entire group was taken.
 * Modern medLogItems records mean only the explicitly selected items were taken.
 */
export function resolveScheduledDose(
  med: Med,
  dateKey: string,
  time: string,
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
  now: Date,
): ScheduledDoseState {
  const key = `${med.id}@${time}`;
  const allItems = medScheduleItems(med);
  const legacyTaken = medLog[dateKey]?.[key] === true;
  const rawSelected = medLogItems[dateKey]?.[key] ?? (legacyTaken ? allItems : []);
  const rawSet = new Set(rawSelected.filter((item) => allItems.includes(item)));
  const selectedItems = allItems.filter((item) => rawSet.has(item));
  const missedItems = allItems.filter((item) => !rawSet.has(item));

  return {
    key,
    eligible: isMedicationDoseEligibleNow(dateKey, time, legacyTaken || selectedItems.length > 0, now),
    allItems,
    selectedItems,
    missedItems,
  };
}

export function summarizeMedicationAdherence(
  med: Med,
  dates: string[],
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
  now: Date,
): { taken: number; expected: number; pct: number } | null {
  let expected = 0;
  let taken = 0;

  dates.forEach((dateKey) => {
    (med.times ?? []).forEach((time) => {
      const state = resolveScheduledDose(med, dateKey, time, medLog, medLogItems, now);
      if (!state.eligible) return;
      expected += state.allItems.length;
      taken += state.selectedItems.length;
    });
  });

  return expected
    ? { taken, expected, pct: Math.round((taken / expected) * 100) }
    : null;
}

/** Canonical key for a scheduled dose of a medication at a given time. */
export function scheduledDoseKey(med: Med, time: string): string {
  return `${med.id}@${time}`;
}

/**
 * Items of a scheduled group that count as taken.
 * Legacy records (medLog=true, no medLogItems) mean the whole group was taken.
 */
export function getTakenScheduledItems(
  med: Med,
  dateKey: string,
  time: string,
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
): string[] {
  const allItems = medScheduleItems(med);
  const key = scheduledDoseKey(med, time);
  const legacyTaken = medLog[dateKey]?.[key] === true;
  const raw = medLogItems[dateKey]?.[key] ?? (legacyTaken ? allItems : []);
  const set = new Set(raw);
  return allItems.filter((item) => set.has(item));
}

/** Items of a scheduled group that were not marked as taken. */
export function getMissedScheduledItems(
  med: Med,
  dateKey: string,
  time: string,
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
): string[] {
  const taken = new Set(getTakenScheduledItems(med, dateKey, time, medLog, medLogItems));
  return medScheduleItems(med).filter((item) => !taken.has(item));
}

/** True when at least one item of the scheduled dose is recorded as taken. */
export function isScheduledDoseTaken(
  med: Med,
  dateKey: string,
  time: string,
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
): boolean {
  return getTakenScheduledItems(med, dateKey, time, medLog, medLogItems).length > 0;
}

/** Alias of {@link summarizeMedicationAdherence} kept for a stable public name. */
export const calculateMedicationAdherence = summarizeMedicationAdherence;

export type MedicationProgressSummary = { taken: number; expected: number; pct?: number };

/**
 * Canonical cross-medication progress summary. Counts individual items inside grouped
 * scheduled doses via medLogItems and preserves legacy whole-group records.
 * Set includeFutureScheduled=true for a full-day plan (for example the Home header);
 * otherwise only eligible/due doses are counted.
 */
export function summarizeMedicationProgress(
  meds: Med[],
  dates: string[],
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
  now: Date,
  includeFutureScheduled = false,
): MedicationProgressSummary {
  let taken = 0;
  let expected = 0;

  meds.filter((med) => !med.asNeeded).forEach((med) => {
    dates.forEach((dateKey) => {
      (med.times ?? []).forEach((time) => {
        const state = resolveScheduledDose(med, dateKey, time, medLog, medLogItems, now);
        if (!includeFutureScheduled && !state.eligible) return;
        expected += state.allItems.length;
        taken += state.selectedItems.length;
      });
    });
  });

  return {
    taken,
    expected,
    pct: expected > 0 ? Math.round((taken / expected) * 100) : undefined,
  };
}
