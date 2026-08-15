import { type BixboData, type DayLog, type PeriodLevel, addDays } from "@/lib/storage";

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function mostCommon<T extends string>(arr: T[]): T | null {
  if (!arr.length) return null;

  const counts = new Map<T, number>();

  arr.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let best: T | null = null;
  let bestCount = 0;

  counts.forEach((count, value) => {
    if (count > bestCount) {
      bestCount = count;
      best = value;
    }
  });

  return best;
}

export function thisAndLastMonthPrefixes(): [string, string] {
  const now = new Date();

  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const previous = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;

  return [current, previous];
}

export function daysOfMonth(prefix: string): string[] {
  const [year, month] = prefix.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return [];

  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => `${prefix}-${String(index + 1).padStart(2, "0")}`);
}

export interface HistoricCycle {
  start: string;
  end: string;
}

/**
 * All historic periods derived from logged period days.
 * Falls back to cycle preferences only when no logged period exists.
 */
export function historicCycles(data: BixboData): HistoricCycle[] {
  const keys = Object.keys(data.dayLogs).sort();

  const isPeriodDay = (key: string) => {
    const log = data.dayLogs[key];

    return Boolean(log?.period || log?.periodInfo?.level);
  };

  const cycles: HistoricCycle[] = [];

  let currentStart: string | null = null;
  let previousPeriodDay = "";

  for (const key of keys) {
    if (isPeriodDay(key)) {
      if (!currentStart) {
        currentStart = key;
      } else if (previousPeriodDay && addDays(previousPeriodDay, 1) !== key) {
        cycles.push({
          start: currentStart,
          end: previousPeriodDay,
        });

        currentStart = key;
      }

      previousPeriodDay = key;
      continue;
    }

    if (currentStart) {
      cycles.push({
        start: currentStart,
        end: previousPeriodDay,
      });

      currentStart = null;
      previousPeriodDay = "";
    }
  }

  if (currentStart) {
    cycles.push({
      start: currentStart,
      end: previousPeriodDay,
    });
  }

  if (cycles.length === 0 && data.cycle.lastPeriodStart && data.cycle.lastPeriodEnd) {
    cycles.push({
      start: data.cycle.lastPeriodStart,
      end: data.cycle.lastPeriodEnd,
    });
  }

  return cycles;
}

export interface PhaseBuckets {
  before: string[];
  during: string[];
  after: string[];
}

export function phaseDays(cycles: HistoricCycle[]): PhaseBuckets {
  const before: string[] = [];
  const during: string[] = [];
  const after: string[] = [];

  cycles.forEach((cycle) => {
    for (let index = 5; index >= 1; index -= 1) {
      before.push(addDays(cycle.start, -index));
    }

    let key = cycle.start;

    while (key <= cycle.end) {
      during.push(key);
      key = addDays(key, 1);
    }

    for (let index = 1; index <= 5; index += 1) {
      after.push(addDays(cycle.end, index));
    }
  });

  return {
    before,
    during,
    after,
  };
}

export function phaseAvg(
  days: string[],
  dayLogs: Record<string, DayLog>,
  valueFn: (log: DayLog) => number | null | undefined,
): number | null {
  const values = days
    .map((key) => valueFn(dayLogs[key] ?? {}))
    .filter((value): value is number => value != null && Number.isFinite(value));

  return avg(values);
}

export function phaseFlowMode(during: string[], dayLogs: Record<string, DayLog>): PeriodLevel | null {
  const levels = during
    .map((key) => dayLogs[key]?.periodInfo?.level ?? dayLogs[key]?.period)
    .filter((value): value is PeriodLevel => value != null && value !== "");

  return mostCommon(levels);
}

const NEGATIVE_MOOD_RE =
  /angry|annoyed|anxious|apathetic|bored|cranky|depressed|fatigued|indifferent|irritated|lonely|meh|pmdd|sad|self-deprecating|stressed|tired|all over the place/i;

export function negativeMoodCount(log: DayLog): number {
  return (log.pain ?? []).reduce(
    (total, entry) => total + (entry.mood ?? []).filter((mood) => NEGATIVE_MOOD_RE.test(mood)).length,
    0,
  );
}

export function dayEnergy(log: DayLog): number | null {
  const values = (log.pain ?? [])
    .map((entry) => entry.bodyBattery)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? avg(values) : null;
}

export function dayHotFlash(log: DayLog): number | null {
  const values = (log.pain ?? [])
    .map((entry) => entry.hotFlashes)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? Math.max(...values) : null;
}

/**
 * Daily bowel activity score.
 *
 * Every recorded bowel entry counts as at least 1, including Bristol Type 0.
 * Additional bowel symptom tags increase the score.
 *
 * This prevents Type 0 from disappearing from Patterns and trigger analysis
 * when it has no separate symptom tag.
 */
export function dayBowelSymptoms(log: DayLog): number | null {
  const bowelEntries = (log.bowel ?? []).filter((entry) => !entry.urinaryOnly && entry.bristol !== -2);
  if (!bowelEntries.length) return null;

  return bowelEntries.reduce((total, entry) => {
    const symptomCount = entry.symptoms?.length ?? 0;

    return total + Math.max(1, symptomCount);
  }, 0);
}

export function dayTetanyIntensity(log: DayLog): number | null {
  const values = (log.tetany ?? [])
    .map((entry) => entry.intensity)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? avg(values) : null;
}

export function dayPanicIntensity(log: DayLog): number | null {
  const values = (log.panic ?? [])
    .map((entry) => entry.intensity)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? avg(values) : null;
}

export function dayHeadacheIntensity(log: DayLog): number | null {
  const values = (log.pain ?? [])
    .map((entry) => entry.headacheIntensity)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? avg(values) : null;
}

export function dayPressureIntensity(log: DayLog): number | null {
  const values = (log.pain ?? [])
    .map((entry) => entry.pressureIntensity)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return values.length ? avg(values) : null;
}
