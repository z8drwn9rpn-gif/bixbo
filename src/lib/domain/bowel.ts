/** Bowel domain helpers (calculations only — data stays in src/lib/storage.ts). */
import type { DayLog } from "@/lib/storage";

export { BRISTOL } from "@/lib/storage";
export type { BowelEntry } from "@/lib/storage";

/** Count explicit "No bowel movement" records in the supplied visible date range. */
export function countNoBowelMovements(days: string[], dayLogs: Record<string, DayLog>): number {
  return days.reduce(
    (total, day) =>
      total +
      (dayLogs[day]?.bowel ?? []).filter(
        (entry) => !entry.urinaryOnly && Number(entry.bristol) === -1,
      ).length,
    0,
  );
}
