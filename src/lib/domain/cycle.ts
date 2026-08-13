/** Cycle domain helpers (calculations only — data stays in src/lib/storage.ts). */
export {
  periodLabel,
  predictPeriods,
  nextPredictedPeriod,
  isCycleTrackingHidden,
  isIntercourseKind,
} from "@/lib/storage";
export type { CyclePrefs, PeriodLevel, SexEntry } from "@/lib/storage";
export { showCyclePredictions } from "@/lib/health";
