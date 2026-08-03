import { type BixboData, type DayLog, type PeriodLevel, addDays } from "@/lib/storage";

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function mostCommon<T extends string>(arr: T[]): T | null {
  if (!arr.length) return null;
  const counts = new Map<T, number>();
  arr.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best: T | null = null, bestC = 0;
  counts.forEach((c, v) => { if (c > bestC) { bestC = c; best = v; } });
  return best;
}

export function thisAndLastMonthPrefixes(): [string, string] {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  return [cur, last];
}

export function daysOfMonth(prefix: string): string[] {
  const [y, m] = prefix.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`);
}

export interface HistoricCycle { start: string; end: string }

/** All historic periods, derived from logged period days (+ cycle prefs fallback). */
export function historicCycles(data: BixboData): HistoricCycle[] {
  const keys = Object.keys(data.dayLogs).sort();
  const isPeriodDay = (k: string) => {
    const l = data.dayLogs[k];
    return !!(l?.period || l?.periodInfo?.level);
  };
  const cycles: HistoricCycle[] = [];
  let curStart: string | null = null;
  let prev = "";
  for (const k of keys) {
    if (isPeriodDay(k)) {
      if (!curStart) curStart = k;
      else if (addDays(prev, 1) !== k) { cycles.push({ start: curStart, end: prev }); curStart = k; }
      prev = k;
    } else if (curStart) { cycles.push({ start: curStart, end: prev }); curStart = null; }
  }
  if (curStart) cycles.push({ start: curStart, end: prev });
  if (!cycles.length && data.cycle.lastPeriodStart && data.cycle.lastPeriodEnd) {
    cycles.push({ start: data.cycle.lastPeriodStart, end: data.cycle.lastPeriodEnd });
  }
  return cycles;
}

export interface PhaseBuckets { before: string[]; during: string[]; after: string[] }

export function phaseDays(cycles: HistoricCycle[]): PhaseBuckets {
  const before: string[] = [], during: string[] = [], after: string[] = [];
  cycles.forEach((c) => {
    for (let i = 5; i >= 1; i--) before.push(addDays(c.start, -i));
    let k = c.start;
    while (k <= c.end) { during.push(k); k = addDays(k, 1); }
    for (let i = 1; i <= 5; i++) after.push(addDays(c.end, i));
  });
  return { before, during, after };
}

export function phaseAvg(
  days: string[], dayLogs: Record<string, DayLog>,
  valueFn: (l: DayLog) => number | null | undefined,
): number | null {
  const vals = days.map((k) => valueFn(dayLogs[k] ?? {})).filter((v): v is number => v != null);
  return avg(vals);
}

export function phaseFlowMode(during: string[], dayLogs: Record<string, DayLog>): PeriodLevel | null {
  const levels = during
    .map((k) => (dayLogs[k]?.periodInfo?.level || dayLogs[k]?.period || "") as PeriodLevel)
    .filter((v): v is PeriodLevel => !!v);
  return mostCommon(levels);
}

const NEGATIVE_MOOD_RE = /angry|annoyed|anxious|apathetic|bored|cranky|depressed|fatigued|indifferent|irritated|lonely|meh|pmdd|sad|self-deprecating|stressed|tired|all over the place/i;
export function negativeMoodCount(l: DayLog): number {
  return (l.pain ?? []).reduce((s, p) => s + (p.mood ?? []).filter((m) => NEGATIVE_MOOD_RE.test(m)).length, 0);
}

export function dayEnergy(l: DayLog): number | null {
  const vals = (l.pain ?? []).map((p) => p.bodyBattery).filter((v): v is number => v != null);
  return vals.length ? avg(vals) : null;
}
export function dayHotFlash(l: DayLog): number | null {
  const vals = (l.pain ?? []).map((p) => p.hotFlashes).filter((v): v is number => v != null);
  return vals.length ? Math.max(...vals) : null;
}
export function dayBowelSymptoms(l: DayLog): number | null {
  if (!l.bowel?.length) return null;
  return l.bowel.reduce((s, b) => s + (b.symptoms?.length ?? 0), 0);
}
export function dayTetanyIntensity(l: DayLog): number | null {
  const vals = (l.tetany ?? []).map((t) => t.intensity).filter((v): v is number => v != null);
  return vals.length ? avg(vals) : null;
}
export function dayPanicIntensity(l: DayLog): number | null {
  const vals = (l.panic ?? []).map((p) => p.intensity).filter((v): v is number => v != null);
  return vals.length ? avg(vals) : null;
}
export function dayHeadacheIntensity(l: DayLog): number | null {
  const vals = (l.pain ?? []).map((p) => p.headacheIntensity).filter((v): v is number => v != null);
  return vals.length ? avg(vals) : null;
}
