import { avgDayPain, type DayLog, type DayNote, type Med } from "./storage";

export type ReportDaySummary = {
  key: string;
  log: DayLog;
  notes: string[];
  pain?: number;
  headache?: number;
  hotFlashes?: number;
  nausea?: number;
  tetany?: number;
  panic?: number;
  bowelTypes: number[];
  bowelLogCount: number;
  noBowelMovementCount: number;
  urinaryOnlyCount: number;
  sleep?: number;
};

function finiteNumbers(values: unknown[]): number[] {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function maxOrUndefined(values: unknown[]): number | undefined {
  const numbers = finiteNumbers(values);
  return numbers.length ? Math.max(...numbers) : undefined;
}

export function reportNoteTexts(raw: DayNote[] | string | undefined): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  return raw.map((note) => note.text?.trim()).filter((text): text is string => Boolean(text));
}

/**
 * Canonical per-day adapter for the PDF report.
 *
 * Important semantics:
 * - Pain uses avgDayPain(), so symptom-only follow-ups never become duplicate
 *   pain measurements.
 * - Headache / hot-flash / nausea use the maximum recorded intensity for the
 *   day because those values can legitimately be added in symptom follow-ups.
 * - Bristol Type 0 is valid. "No bowel movement" (-1) and urinary-only (-2)
 *   are tracked separately and never masquerade as Bristol values.
 */
export function summarizeReportDay(
  key: string,
  log: DayLog,
  rawNotes?: DayNote[] | string,
): ReportDaySummary {
  const painEntries = log.pain ?? [];
  const bowel = log.bowel ?? [];
  const bowelTypes = bowel
    .filter((entry) => !entry.urinaryOnly)
    .map((entry) => Number(entry.bristol))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 7);

  return {
    key,
    log,
    notes: reportNoteTexts(rawNotes),
    pain: avgDayPain(log),
    headache: maxOrUndefined(painEntries.map((entry) => entry.headacheIntensity)),
    hotFlashes: maxOrUndefined(painEntries.map((entry) => entry.hotFlashes)),
    nausea: maxOrUndefined(painEntries.map((entry) => entry.nauseaSeverity)),
    tetany: maxOrUndefined((log.tetany ?? []).map((entry) => entry.intensity)),
    panic: maxOrUndefined((log.panic ?? []).map((entry) => entry.intensity)),
    bowelTypes,
    bowelLogCount: bowel.length,
    noBowelMovementCount: bowel.filter((entry) => !entry.urinaryOnly && Number(entry.bristol) === -1).length,
    urinaryOnlyCount: bowel.filter((entry) => entry.urinaryOnly).length,
    sleep: Number.isFinite(log.sleepHours) ? log.sleepHours : undefined,
  };
}

function hasDeepValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0 && value.some(hasDeepValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasDeepValue);
  return false;
}

/** A logged 0 is data; an empty object/array is not. */
export function hasMeaningfulReportDay(day: Pick<ReportDaySummary, "log" | "notes">): boolean {
  return day.notes.length > 0 || Object.values(day.log).some(hasDeepValue);
}

export function average(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : undefined;
}

export function minValue(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  return nums.length ? Math.min(...nums) : undefined;
}

export function maxValue(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  return nums.length ? Math.max(...nums) : undefined;
}

export function mode(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
}

function normalizedMedName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Count explicit PRN uses recorded through the Meds surface.
 * Both current @asneeded checkboxes and one-off extraMeds entries are valid
 * sources. Symptom rescue-med free text is deliberately not inferred here to
 * avoid double-counting the same dose.
 */
export function countRecordedPrnUses(
  med: Pick<Med, "id" | "name">,
  dateKeys: string[],
  dayLogs: Record<string, DayLog>,
  medLog: Record<string, Record<string, boolean>>,
): number {
  const wanted = normalizedMedName(med.name);
  return dateKeys.reduce((total, dateKey) => {
    const checkboxUse = medLog[dateKey]?.[`${med.id}@asneeded`] === true ? 1 : 0;
    const extraUses = (dayLogs[dateKey]?.extraMeds ?? []).filter(
      (entry) => normalizedMedName(entry.name) === wanted,
    ).length;
    return total + checkboxUse + extraUses;
  }, 0);
}
