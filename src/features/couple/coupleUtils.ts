import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { addDays, toKey, type ExtraMed, type Med, type PainEntry, type PanicAttack, type TetanyEpisode } from "@/lib/storage";

export type ComparableDayLog = {
  pain?: PainEntry[];
  panic?: PanicAttack[];
  tetany?: TetanyEpisode[];
  extraMeds?: ExtraMed[];
};

export type ComparisonTone = "rose" | "green" | "purple" | "blue" | "emerald";

export const TONES: Record<ComparisonTone, { solid: string; soft: string; text: string }> = {
  rose: { solid: "#ef4770", soft: "rgba(239, 71, 112, 0.10)", text: "#df315d" },
  green: { solid: "#6f9d16", soft: "rgba(111, 157, 22, 0.10)", text: "#5f8911" },
  purple: { solid: CHART_COLORS.panic, soft: CHART_TINTS.panic, text: CHART_COLORS.panic },
  blue: { solid: CHART_COLORS.tetany, soft: CHART_TINTS.tetany, text: CHART_COLORS.tetany },
  emerald: { solid: CHART_COLORS.medication, soft: CHART_TINTS.medication, text: CHART_COLORS.medication },
};

const COUPLE_PAIN_COLORS = [
  "#8DBF3A", "#A8C93A", "#C4D63A", "#E0D93A", "#F0C43A", "#F3A83A",
  "#F28A3A", "#EF6E42", "#E9534F", "#D93F55", "#C92F5A",
] as const;

export function couplePainColor(value: number): string {
  const clamped = Math.max(0, Math.min(10, value));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  if (lower === upper) return COUPLE_PAIN_COLORS[lower];
  return COUPLE_PAIN_COLORS[Math.round(clamped)];
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export type CouplePeriod = "W" | "M" | "Y";

export function coupleRangeFor(period: CouplePeriod, anchor: Date) {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  let start: Date;
  let end: Date;

  if (period === "W") {
    const mondayOffset = (base.getDay() + 6) % 7;
    start = new Date(base);
    start.setDate(base.getDate() - mondayOffset);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "M") {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  } else {
    start = new Date(base.getFullYear(), 0, 1);
    end = new Date(base.getFullYear(), 11, 31);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end > today) end = today;

  const startK = toKey(start);
  const endK = toKey(end);
  const days: string[] = [];
  let key = startK;
  while (key <= endK) {
    days.push(key);
    key = addDays(key, 1);
  }

  const label = period === "Y"
    ? String(base.getFullYear())
    : period === "M"
      ? base.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return { start, end, days, label };
}

export function hasSymptoms(log?: ComparableDayLog) {
  return Boolean(log?.pain?.length || log?.panic?.length || log?.tetany?.length);
}

export function countTakenScheduledDoses(days: string[], meds: Med[], medLog: Record<string, Record<string, boolean>>) {
  let taken = 0;
  days.forEach((day) => {
    meds.filter((med) => !med.asNeeded).forEach((med) => {
      med.times.forEach((time) => {
        if (medLog[day]?.[`${med.id}@${time}`]) taken += 1;
      });
    });
  });
  return taken;
}

export function formatValue(value: number | null, decimals = 0, unit = "") {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}${unit}`;
}
