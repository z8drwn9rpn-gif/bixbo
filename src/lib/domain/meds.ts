/**
 * Medication domain helpers.
 * Single source of truth for scheduled-dose and adherence calculations shared by
 * Home, Insights and the PDF Health Report. Storage stays canonical in src/lib/storage.ts.
 */
export { medScheduleItems } from "@/lib/storage";
export type { Med } from "@/lib/storage";
export {
  scheduledDoseKey,
  resolveScheduledDose,
  getTakenScheduledItems,
  getMissedScheduledItems,
  isScheduledDoseTaken,
  isMedicationDoseEligibleNow,
  scheduledTimeMinutes,
  summarizeMedicationAdherence,
  calculateMedicationAdherence,
} from "@/lib/medicationAdherence";
export type { MedicationLog, MedicationLogItems, ScheduledDoseState } from "@/lib/medicationAdherence";
