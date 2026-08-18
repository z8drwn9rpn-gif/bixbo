import { average, mode, type ReportDaySummary } from "./healthReport";

export type ReportMonthSummary = {
  key: string;
  monthKey: string;
  days: ReportDaySummary[];
  recorded: boolean;
  recordedDayCount: number;
  pain?: number;
  headache?: number;
  hotFlashes?: number;
  nausea?: number;
  tetany?: number;
  panic?: number;
  sleep?: number;
  bowelMode?: number;
  bowelTypes: number[];
  bowelLogCount: number;
  noBowelMovementCount: number;
  hasNoBowelMovement: boolean;
  hasPain: boolean;
  hasHeadache: boolean;
  hasHotFlashes: boolean;
  hasTetany: boolean;
  hasPanic: boolean;
  hasNausea: boolean;
  extraMeds: Array<{ label: string; count: number }>;
  extraMedCount: number;
  tensCount: number;
  foodLogCount: number;
  workoutCount: number;
  noteCount: number;
  periodLogged: boolean;
  latestWeight?: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Current calendar month plus the previous 11 calendar months. */
export function twelveCalendarMonthRange(today: string): [string, string] {
  const [year, month] = today.split("-").map(Number);
  const zeroBased = (year * 12 + (month - 1)) - 11;
  const startYear = Math.floor(zeroBased / 12);
  const startMonth = (zeroBased % 12 + 12) % 12 + 1;
  return [`${startYear}-${pad2(startMonth)}-01`, today];
}

function latestMonthWeight(days: ReportDaySummary[]): number | undefined {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    const entries = day.log.weightEntries ?? [];
    const value = entries.length ? entries.at(-1)?.value : day.log.weight;
    if (value != null && Number.isFinite(value)) return value;
  }
  return undefined;
}

function symptomFlags(days: ReportDaySummary[]) {
  return {
    hasPain: days.some((day) => day.pain != null),
    hasHeadache: days.some((day) => (day.log.pain ?? []).some((entry) => entry.headache || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0)),
    hasHotFlashes: days.some((day) => (day.log.pain ?? []).some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)),
    hasTetany: days.some((day) => (day.log.tetany?.length ?? 0) > 0),
    hasPanic: days.some((day) => (day.log.panic?.length ?? 0) > 0),
    hasNausea: days.some((day) => (day.log.pain ?? []).some((entry) => entry.nausea || entry.nauseaSeverity != null || (entry.nauseaTypes?.length ?? 0) > 0)),
  };
}

/**
 * Collapse raw daily report summaries into calendar-month reporting units.
 * Monthly health values are averages of the available daily summaries. A later
 * yearly average therefore gives every month equal weight, regardless of how
 * many daily values happened to be recorded inside that month.
 */
export function aggregateReportMonths(days: ReportDaySummary[], recordedDayKeys = new Set<string>()): ReportMonthSummary[] {
  const groups = new Map<string, ReportDaySummary[]>();
  days.forEach((day) => {
    const monthKey = day.key.slice(0, 7);
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), day]);
  });

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, monthDays]) => {
    const bowelTypes = monthDays.flatMap((day) => day.bowelTypes);
    const noBowelMovementCount = monthDays.reduce((total, day) => total + day.noBowelMovementCount, 0);
    const extra = new Map<string, { label: string; count: number }>();
    monthDays.forEach((day) => (day.log.extraMeds ?? []).forEach((entry) => {
      const normalized = entry.name.trim().toLocaleLowerCase();
      const previous = extra.get(normalized);
      extra.set(normalized, { label: previous?.label ?? entry.name, count: (previous?.count ?? 0) + 1 });
    }));
    const recordedDayCount = monthDays.filter((day) => recordedDayKeys.has(day.key)).length;

    return {
      key: `${monthKey}-01`,
      monthKey,
      days: monthDays,
      recorded: recordedDayCount > 0,
      recordedDayCount,
      pain: average(monthDays.map((day) => day.pain)),
      headache: average(monthDays.map((day) => day.headache)),
      hotFlashes: average(monthDays.map((day) => day.hotFlashes)),
      nausea: average(monthDays.map((day) => day.nausea)),
      tetany: average(monthDays.map((day) => day.tetany)),
      panic: average(monthDays.map((day) => day.panic)),
      sleep: average(monthDays.map((day) => day.sleep)),
      bowelMode: mode(bowelTypes),
      bowelTypes,
      bowelLogCount: monthDays.reduce((total, day) => total + day.bowelLogCount, 0),
      noBowelMovementCount,
      hasNoBowelMovement: noBowelMovementCount > 0,
      ...symptomFlags(monthDays),
      extraMeds: [...extra.values()],
      extraMedCount: [...extra.values()].reduce((total, item) => total + item.count, 0),
      tensCount: monthDays.reduce((total, day) => total + (day.log.heat ?? []).filter((entry) => entry.kind === "tens").length, 0),
      foodLogCount: monthDays.reduce((total, day) => total + (day.log.food?.length ?? 0), 0),
      workoutCount: monthDays.reduce((total, day) => total + (day.log.workout?.length ?? 0), 0),
      noteCount: monthDays.reduce((total, day) => total + day.notes.length, 0),
      periodLogged: monthDays.some((day) => Boolean(day.log.periodInfo?.level ?? day.log.period)),
      latestWeight: latestMonthWeight(monthDays),
    };
  });
}
