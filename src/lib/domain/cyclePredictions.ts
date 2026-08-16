import type { CyclePrefs } from "../storage/types";
import { predictPeriods as predictPeriodsRaw, todayKey, toKey } from "../storage/utilities";

export type PeriodPredictionWindow = { start: string; end: string };

/**
 * Keep period prediction paint honest once reality has disproved a forecast.
 *
 * The raw cycle calculator deliberately emits repeating theoretical windows.
 * UI surfaces must not keep a predicted purple window after its expected start
 * has passed without an actual period log. The one exception is the most recent
 * real period: when its exact end is known, use that exact end instead of the
 * configured typical period length.
 */
export function sanitizePeriodPredictions(
  cycle: Pick<CyclePrefs, "lastPeriodStart" | "lastPeriodEnd">,
  windows: PeriodPredictionWindow[],
  today: string,
): PeriodPredictionWindow[] {
  const actualStart = cycle.lastPeriodStart;
  const actualEnd = cycle.lastPeriodEnd;

  return windows.flatMap((window) => {
    if (actualStart && window.start === actualStart) {
      return [{ start: window.start, end: actualEnd ?? window.end }];
    }

    // A forecast whose start is already in the past and still has no real log
    // is a missed forecast. Remove the whole purple window instead of leaving
    // the remaining days coloured as though the prediction were still correct.
    if (window.start < today) return [];

    return [window];
  });
}

/** Period windows intended for Calendar/Couple display, not raw modelling. */
export function predictPeriodsForDisplay(
  cycle: CyclePrefs,
  from: Date,
  to: Date,
): PeriodPredictionWindow[] {
  const fromKey = toKey(from);
  const toKeyValue = toKey(to);

  return sanitizePeriodPredictions(cycle, predictPeriodsRaw(cycle, from, to), todayKey())
    .filter((window) => window.start <= toKeyValue && window.end >= fromKey);
}
