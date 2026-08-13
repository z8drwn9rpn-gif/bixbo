/** Pregnancy domain helpers (calculations only — data stays in src/lib/storage.ts). */
export { isPregnancyActive } from "@/lib/storage";
export type { PregnancyState } from "@/lib/storage";
export {
  dueDateOf,
  pregnancyStart,
  pregnancyProgress,
  babySize,
  isPregnancyMode,
  BABY_SIZE_BY_WEEK,
  PREGNANCY_SYMPTOMS,
  DEFAULT_HOSPITAL_BAG,
  DEFAULT_PREGNANCY_VACCINES,
  DEFAULT_SUPPLEMENTS,
} from "@/lib/health";
